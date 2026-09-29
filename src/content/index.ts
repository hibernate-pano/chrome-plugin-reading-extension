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
import { getSettings, saveSettings, resetSettings, validateSettings } from '../shared/storage';
import { extractContent, clearCache } from './extractor';
import { ReaderView } from './ReaderView';
import { ErrorBoundary, handleError } from './errorHandling';
import { addToHistory, getReadingHistory, deleteFromHistory, clearHistory } from '../shared/history';
import type { ReadingRecord } from '../shared/history';

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
 * The enable turn currently in progress, or null when none is.
 *
 * `state.isActive` is only set once the reader is mounted, so it cannot guard
 * the two awaits `enableReadingMode` performs first: two overlapping messages
 * both pass it, the second removes the host the first root is bound to, and
 * `renderReaderView` then reuses that root against a detached mount node —
 * a reader that is on screen, permanently blank, and reported active twice.
 * Holding the promise itself claims the turn before the first await.
 */
let enableInFlight: Promise<void> | null = null;

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
  // Claim the turn before the first await, not after the last: a second message
  // arriving mid-extraction joins the one already running instead of mounting a
  // second reader over the first. Both callers see the same outcome, and a
  // failure is reported once rather than twice.
  if (enableInFlight) return enableInFlight;

  enableInFlight = runEnableReadingMode();
  try {
    return await enableInFlight;
  } finally {
    enableInFlight = null;
  }
}

async function runEnableReadingMode(): Promise<void> {
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

/**
 * Apply a settings change, then persist it.
 *
 * The reader renders from `state.settings` before storage answers, so memory
 * leads and every other layer follows it: validate the merged result so
 * out-of-range values arriving over the message channel never reach the reader
 * view, repaint, and only then write. A refused write rolls memory *and* the
 * DOM back to the previous values and rethrows, because swallowing it would
 * leave the three layers disagreeing — the next unrelated settings change
 * would repaint to a value that was never saved, and `handleMessage` would have
 * answered `success: true` over a setting the user believes is kept.
 */
async function updateSettings(newSettings: Partial<Settings>): Promise<void> {
  const previous = state.settings;
  const next = validateSettings({ ...previous, ...newSettings });

  state.settings = next;
  repaintReader();

  try {
    await saveSettings(next);
  } catch (error) {
    // Compare-and-swap before rolling back. Sliders fire a change per step, so
    // several of these run at once against the same `state.settings`. Restoring
    // the snapshot taken on entry would undo a *later* call that already
    // succeeded and persisted — the view would snap back to values storage
    // never held, which is the very symptom this rollback exists to prevent.
    // So only undo this call when nothing landed on top of it; otherwise
    // re-read storage and repaint from the truth.
    if (state.settings === next) {
      state.settings = previous;
    } else {
      state.settings = await getSettings();
    }
    repaintReader();
    handleError(error, 'storage');
    throw error;
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
 * Read the stored reading records for the history panel.
 */
async function loadHistory(): Promise<ReadingRecord[]> {
  return getReadingHistory();
}

/**
 * Drop one reading record and report what storage still holds.
 *
 * The result is re-read rather than patched: `deleteFromHistory` does the
 * filtering and the writing itself, so storage is the only authority on what
 * is left, and the panel never has to guess. A failed delete resolves as a
 * rejection carrying the record still in place — showing the user an entry
 * they just deleted would be a lie.
 */
async function deleteHistoryEntry(recordId: string): Promise<ReadingRecord[]> {
  const deleted = await deleteFromHistory(recordId);
  if (!deleted) {
    throw new Error('删除失败，请重试');
  }
  return getReadingHistory();
}

/**
 * Erase every reading record. Same contract as `deleteHistoryEntry`.
 */
async function clearReadingHistory(): Promise<ReadingRecord[]> {
  const cleared = await clearHistory();
  if (!cleared) {
    throw new Error('清空失败，请重试');
  }
  return getReadingHistory();
}

/**
 * Restore the built-in reading settings and repaint.
 *
 * `resetSettings` throws when storage refuses the write; that rejection is
 * deliberately left to reach the panel, which reports it rather than pretending
 * the settings moved back.
 */
async function resetReaderSettings(): Promise<void> {
  await resetSettings();
  state.settings = await getSettings();
  repaintReader();
}

/**
 * Re-render the mounted reader, if one is on screen.
 */
function repaintReader(): void {
  if (state.isActive && currentContent) {
    const host = document.getElementById(READER_HOST_ID);
    const mount = host?.shadowRoot?.querySelector<HTMLElement>('[data-reader-mount]');
    if (mount) renderReaderView(mount);
  }
}

/**
 * Create an isolated Shadow DOM container.
 * Returns the mount point inside the shadow root.
 */
function createReaderContainer(): HTMLElement {
  const existing = document.getElementById(READER_HOST_ID);
  if (existing) {
    // Unmount before removing the host. A root left bound to the mount node
    // inside this host keeps rendering into a detached node forever: `render`
    // succeeds, the host is gone, and re-mounting reuses the dead root — a
    // reader that is on screen and permanently blank.
    if (reactRoot) {
      reactRoot.unmount();
      reactRoot = null;
    }
    existing.remove();
  }

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
          // A retry re-extracts the article, and `enableReadingMode` reports the
          // failure through `handleError` before rethrowing. The promise is
          // returned rather than dropped so the callback is no longer typed as
          // synchronous and the compiler can see what the boundary discards.
          return enableReadingMode();
        },
        children: React.createElement(ReaderView, {
          content: currentContent,
          settings: state.settings,
          onClose: disableReadingMode,
          // The panel calls this synchronously and has nowhere to surface a
          // rejected promise, while `updateSettings` has already raised the
          // toast. Absorbing it here keeps the panel's contract honest —
          // a refused write simply means the settings did not change — without
          // hiding the failure from the message channel, which awaits
          // `updateSettings` directly and gets its `success: false`.
          onSettingsChange: (settings: Partial<Settings>) => {
            void updateSettings(settings).catch(() => {});
          },
          onExportPdf: exportToPdf,
          onResetSettings: resetReaderSettings,
          onLoadHistory: loadHistory,
          onDeleteHistory: deleteHistoryEntry,
          onClearHistory: clearReadingHistory,
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
