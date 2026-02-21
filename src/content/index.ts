/**
 * Content Script Entry Point
 * Handles message listening, reading mode lifecycle, and state management
 * Requirements: 1.2, 1.3, 7.1, 7.5
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  Message,
  Settings,
  ContentScriptState,
  StateResponse,
  ExtractedContent,
} from '../shared/types';
import { MESSAGE_TYPES, DEFAULT_SETTINGS } from '../shared/constants';
import { getSettings, saveSettings } from '../shared/storage';
import { extractContent, clearCache } from './extractor';
import { ReaderView } from './ReaderView';
import { ErrorBoundary, handleError } from './errorHandling';
import { addToHistory } from '../shared/history';

// Reader container ID
const READER_CONTAINER_ID = 'ai-reader-root';

// Content script state
let state: ContentScriptState = {
  isActive: false,
  settings: { ...DEFAULT_SETTINGS },
  originalContent: null,
};

// React root for reader view
let reactRoot: Root | null = null;

// Extracted content cache
let currentContent: ExtractedContent | null = null;

/**
 * Initialize the content script
 * Sets up message listeners and loads settings
 */
async function initialize(): Promise<void> {
  try {
    // Load saved settings
    state.settings = await getSettings();
    
    // Set up message listener
    chrome.runtime.onMessage.addListener(handleMessage);
    
    console.log('[Reader] Content script initialized');
  } catch (error) {
    handleError(error, 'initialization');
  }
}

/**
 * Handle incoming messages from popup or background script
 */
function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  // Handle PING synchronously for health checks
  if (message.type === MESSAGE_TYPES.PING) {
    sendResponse({ pong: true });
    return false;
  }

  // Handle async operations
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

  // Return true to indicate async response
  return true;
}

/**
 * Check if content can be extracted from the current page
 */
function canExtractContent(): boolean {
  // Check if document has a body
  if (!document.body) return false;
  
  // Check if there's meaningful content
  const textLength = document.body.innerText?.length ?? 0;
  return textLength > 100;
}

/**
 * Enable reading mode
 * Extracts content and renders the reader view
 */
async function enableReadingMode(): Promise<void> {
  if (state.isActive) {
    console.log('[Reader] Reading mode already active');
    return;
  }

  try {
    // Store original content for restoration
    state.originalContent = document.body.innerHTML;

    // Extract content
    const result = extractContent(document);
    
    if (!result.success) {
      // Restore original content on failure
      state.originalContent = null;
      throw new Error(result.error);
    }

    currentContent = result.data;

    // Record reading history
    if (result.data) {
      addToHistory(
        window.location.href,
        result.data.title,
        {
          excerpt: result.data.excerpt,
          byline: result.data.byline,
          siteName: result.data.siteName,
          length: result.data.length,
        },
        {
          theme: state.settings.theme,
          fontSize: state.settings.fontSize,
        }
      );
    }

    // Load latest settings
    state.settings = await getSettings();

    // Create reader container
    const container = createReaderContainer();

    // Render React component
    renderReaderView(container);

    // Update state
    state.isActive = true;

    console.log('[Reader] Reading mode enabled');
  } catch (error) {
    handleError(error, 'extraction');
    throw error;
  }
}

/**
 * Disable reading mode
 * Restores original page content and cleans up resources
 */
function disableReadingMode(): void {
  if (!state.isActive) {
    console.log('[Reader] Reading mode not active');
    return;
  }

  try {
    // Unmount React component
    if (reactRoot) {
      reactRoot.unmount();
      reactRoot = null;
    }

    // Remove reader container
    const container = document.getElementById(READER_CONTAINER_ID);
    if (container) {
      container.remove();
    }

    // Restore original content if available
    if (state.originalContent) {
      document.body.innerHTML = state.originalContent;
      state.originalContent = null;
    }

    // Clear cached content
    currentContent = null;
    clearCache();

    // Remove body class
    document.body.classList.remove('reader-mode-active');

    // Update state
    state.isActive = false;

    console.log('[Reader] Reading mode disabled');
  } catch (error) {
    handleError(error, 'disable');
    // Force state reset even on error
    state.isActive = false;
    state.originalContent = null;
  }
}

/**
 * Update settings and re-render if active
 */
async function updateSettings(newSettings: Partial<Settings>): Promise<void> {
  try {
    // Merge with current settings
    state.settings = { ...state.settings, ...newSettings };
    
    // Save to storage
    await saveSettings(newSettings);

    // Re-render if reading mode is active
    if (state.isActive && currentContent) {
      const container = document.getElementById(READER_CONTAINER_ID);
      if (container) {
        renderReaderView(container);
      }
    }
  } catch (error) {
    handleError(error, 'storage');
  }
}

/**
 * Create the reader container element
 */
function createReaderContainer(): HTMLElement {
  // Remove existing container if present
  const existing = document.getElementById(READER_CONTAINER_ID);
  if (existing) {
    existing.remove();
  }

  // Create new container
  const container = document.createElement('div');
  container.id = READER_CONTAINER_ID;
  container.setAttribute('data-reader', 'true');
  
  // Insert at the beginning of body
  document.body.insertBefore(container, document.body.firstChild);

  return container;
}

/**
 * Render the reader view React component
 */
function renderReaderView(container: HTMLElement): void {
  if (!currentContent) {
    console.error('[Reader] No content to render');
    return;
  }

  // Create or reuse React root
  if (!reactRoot) {
    reactRoot = createRoot(container);
  }

  // Render with error boundary
  reactRoot.render(
    React.createElement(
      ErrorBoundary,
      {
        onError: (error: Error) => handleError(error, 'render'),
        onRetry: () => {
          // Re-enable reading mode on retry
          disableReadingMode();
          enableReadingMode();
        },
        children: React.createElement(ReaderView, {
          content: currentContent,
          settings: state.settings,
          onClose: disableReadingMode,
          onSettingsChange: updateSettings,
        }),
      }
    )
  );
}

/**
 * Get current state (for testing/debugging)
 */
export function getState(): ContentScriptState {
  return { ...state };
}

/**
 * Check if reading mode is active (for testing/debugging)
 */
export function isReadingModeActive(): boolean {
  return state.isActive;
}

// Initialize on load
initialize();

// Export for testing
export {
  initialize,
  enableReadingMode,
  disableReadingMode,
  updateSettings,
  handleMessage,
  canExtractContent,
};
