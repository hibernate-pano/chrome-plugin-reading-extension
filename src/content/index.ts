/**
 * Content Script Entry Point
 * Uses Shadow DOM for complete CSS isolation from the host page
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  Message,
  Settings,
  ContentScriptState,
  StateResponse,
  ExtractedContent,
  PrintPayload,
} from '../shared/types';
import { MESSAGE_TYPES, DEFAULT_SETTINGS } from '../shared/constants';
import { getSettings, saveSettings, validateSettings } from '../shared/storage';
import { extractContent, clearCache } from './extractor';
import { ReaderView } from './ReaderView';
import { ErrorBoundary, handleError } from './errorHandling';
import { addToHistory } from '../shared/history';

// Import CSS as a string — injected into Shadow DOM, not the page
import readerCSS from './styles.css?inline';

const READER_HOST_ID = 'ai-reader-host';

let state: ContentScriptState = {
  isActive: false,
  settings: { ...DEFAULT_SETTINGS },
};

let reactRoot: Root | null = null;
let currentContent: ExtractedContent | null = null;

/**
 * Boot the content script.
 *
 * The message listener is registered first and synchronously. Loading settings is
 * an async storage read; gating the listener on it would mean any failure before
 * the `addListener` call leaves the script permanently deaf — no toolbar toggle,
 * no PDF export, and nothing on screen to explain why.
 */
async function initialize(): Promise<void> {
  chrome.runtime.onMessage.addListener(handleMessage);

  try {
    state.settings = await getSettings();
  } catch (error) {
    // Settings are unreadable, but the script must stay responsive: fall back to
    // defaults so reading mode still works, and surface the failure.
    state.settings = { ...DEFAULT_SETTINGS };
    handleError(error, 'initialization');
  }
}

function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  if (message.type === MESSAGE_TYPES.PING) {
    sendResponse({ pong: true });
    return false;
  }

  (async () => {
    try {
      switch (message.type) {
        case MESSAGE_TYPES.ENABLE_READING_MODE:
          await enableReadingMode();
          sendResponse({ success: true, isActive: state.isActive });
          break;

        case MESSAGE_TYPES.DISABLE_READING_MODE:
          disableReadingMode();
          sendResponse({ success: true, isActive: state.isActive });
          break;

        case MESSAGE_TYPES.GET_STATE: {
          const stateResponse: StateResponse = {
            isActive: state.isActive,
            canExtract: canExtractContent(),
          };
          sendResponse(stateResponse);
          break;
        }

        case MESSAGE_TYPES.UPDATE_SETTINGS:
          if (message.payload && typeof message.payload === 'object') {
            await updateSettings(message.payload as Partial<Settings>);
          }
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sendResponse({ success: false, error: errorMessage });
    }
  })();

  return true;
}

function canExtractContent(): boolean {
  if (!document.body) return false;
  const textLength = document.body.innerText?.length ?? 0;
  return textLength > 100;
}

async function enableReadingMode(): Promise<void> {
  if (state.isActive) return;

  try {
    const result = extractContent(document);

    if (!result.success) {
      throw new Error(result.error);
    }

    currentContent = result.data;

    // Refresh settings before recording history. Otherwise the record is written
    // from the DEFAULT_SETTINGS bootstrap that is still in state on first run, and
    // the user reopens a page they read with different font/theme settings.
    state.settings = await getSettings();

    // Record reading history
    addToHistory(
      window.location.href,
      result.data.title,
      {
        excerpt: result.data.excerpt,
        byline: result.data.byline ?? undefined,
        siteName: result.data.siteName ?? undefined,
        length: result.data.wordCount,
      },
      {
        theme: state.settings.theme,
        fontSize: state.settings.fontSize,
      }
    );

    // Create isolated Shadow DOM container and mount React inside it
    const mount = createReaderContainer();
    renderReaderView(mount);

    state.isActive = true;
  } catch (error) {
    handleError(error, 'extraction');
    throw error;
  }
}

function disableReadingMode(): void {
  if (!state.isActive) return;

  try {
    if (reactRoot) {
      reactRoot.unmount();
      reactRoot = null;
    }

    // Simply remove the host element — original page is untouched
    const host = document.getElementById(READER_HOST_ID);
    if (host) host.remove();

    document.body.classList.remove('reader-mode-active');
    currentContent = null;
    clearCache();
    state.isActive = false;
  } catch (error) {
    handleError(error, 'disable');
    state.isActive = false;
  }
}

async function updateSettings(newSettings: Partial<Settings>): Promise<void> {
  try {
    // `state.settings` drives rendering immediately, before storage round-trips.
    // Validate the merged result so out-of-range or wrong-typed values arriving
    // over the message channel never reach the reader view.
    state.settings = validateSettings({ ...state.settings, ...newSettings });
    await saveSettings(newSettings);

    if (state.isActive && currentContent) {
      const host = document.getElementById(READER_HOST_ID);
      const mount = host?.shadowRoot?.querySelector<HTMLElement>('[data-reader-mount]');
      if (mount) renderReaderView(mount);
    }
  } catch (error) {
    handleError(error, 'storage');
  }
}

/**
 * Hand the current article to the background, which opens the print page.
 *
 * The HTML is sent as a string; nothing is fetched and no code executes.
 */
async function exportToPdf(): Promise<{ success: boolean; error?: string }> {
  if (!currentContent) {
    return { success: false, error: '阅读模式未开启' };
  }

  const payload: PrintPayload = {
    title: currentContent.title,
    byline: currentContent.byline,
    siteName: currentContent.siteName,
    content: currentContent.content,
    sourceUrl: window.location.href,
    exportedAt: Date.now(),
  };

  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.EXPORT_PDF,
      payload,
    });
    return (response as { success: boolean; error?: string }) ?? { success: false, error: 'No response' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Create an isolated Shadow DOM container.
 * Returns the mount point inside the shadow root.
 */
function createReaderContainer(): HTMLElement {
  const existing = document.getElementById(READER_HOST_ID);
  if (existing) existing.remove();

  // Host element — appended to body, does not interfere with page layout
  const host = document.createElement('div');
  host.id = READER_HOST_ID;

  // Shadow DOM: page CSS cannot penetrate this boundary
  const shadow = host.attachShadow({ mode: 'open' });

  // Inject our styles as a <style> tag inside the shadow root
  const style = document.createElement('style');
  style.textContent = readerCSS;
  shadow.appendChild(style);

  // Mount point for React
  const mount = document.createElement('div');
  mount.setAttribute('data-reader-mount', 'true');
  shadow.appendChild(mount);

  document.body.appendChild(host);

  return mount;
}

function renderReaderView(mount: HTMLElement): void {
  if (!currentContent) return;

  if (!reactRoot) {
    reactRoot = createRoot(mount);
  }

  reactRoot.render(
    React.createElement(
      ErrorBoundary,
      {
        onError: (error: Error) => handleError(error, 'render'),
        onRetry: () => {
          disableReadingMode();
          enableReadingMode();
        },
        children: React.createElement(ReaderView, {
          content: currentContent,
          settings: state.settings,
          onClose: disableReadingMode,
          onSettingsChange: updateSettings,
          onExportPdf: exportToPdf,
        }),
      }
    )
  );
}

// Side-effectful entry point: registers the message listener and loads settings.
// `.catch()` keeps a boot failure from surfacing as an unhandled rejection.
initialize().catch((error: unknown) => {
  console.error('[Reader] Content script initialization failed:', error);
});
