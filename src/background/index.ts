/**
 * Background Script (Service Worker) for AI Reading Extension
 * Handles message routing and content script injection
 * Requirements: 1.2, 7.1
 */

import type { Message, MessageType, PrintPayload } from '../shared/types';
import { MESSAGE_TYPES, STORAGE_KEYS } from '../shared/constants';

// Track tabs with injected content scripts
const injectedTabs = new Set<number>();

/**
 * Upper bound on the article HTML we are willing to stage.
 *
 * chrome.storage.session caps the entire area at 10 MB (QUOTA_BYTES
 * 10485760), shared by every article staged in this browser session. Counting
 * UTF-16 code units is a conservative proxy for the serialized byte size: a
 * CJK article costs up to three bytes per character once JSON-encoded. At this
 * ceiling the worst case still leaves headroom, and a genuine article is
 * measured in hundreds of kilobytes — two million characters is roughly a
 * million-word novel. Rejecting here gives the reader a real reason instead of
 * an opaque quota rejection from deep inside Chrome.
 */
const MAX_PRINT_PAYLOAD_CHARS = 2_000_000;

/**
 * Keys this worker instance has staged and not yet handed off, kept in memory
 * so a sweep can tell a live payload from a stranded one.
 *
 * The set dies with the worker, which is the correct lifetime: a payload
 * staged by an earlier worker is collectible by the next sweep, and that is
 * precisely what a restart sweep is for. The window where that is wrong — a
 * print tab still booting across a worker restart — is a few milliseconds,
 * because staging and tabs.create share one event loop turn and the print page
 * reads immediately on boot.
 */
const stagedPayloadKeys = new Set<string>();

/**
 * Drop the oldest bookkeeping entries so the set cannot grow without bound.
 * Exports are user-initiated and a worker lives minutes at a time, so eight
 * covers any realistic overlap; the cap is here to make that obviously finite.
 */
function trimStagedPayloadKeys(): void {
  while (stagedPayloadKeys.size > 8) {
    const oldest = stagedPayloadKeys.values().next();
    if (oldest.done) return;
    stagedPayloadKeys.delete(oldest.value);
  }
}

/**
 * Remove print payloads that nothing will read again.
 *
 * The print page deletes its own key only on the success path, so a tab closed
 * before it boots — or a read that throws — strands the article for the rest of
 * the session. Session storage caps at 10 MB, so a handful of abandoned exports
 * is enough to make every later export fail.
 *
 * Must run BEFORE staging, never after: afterwards it would race the hand-off
 * the very next lines perform. `keepKey` is belt and braces for the token this
 * call is about to write; stagedPayloadKeys covers exports that staged
 * moments earlier and are still handing off.
 */
async function sweepStalePrintPayloads(keepKey?: string): Promise<void> {
  try {
    const entries = await chrome.storage.session.get(null);
    const stale = Object.keys(entries).filter(
      (key) =>
        key.startsWith(STORAGE_KEYS.PRINT_PAYLOAD) &&
        key !== keepKey &&
        !stagedPayloadKeys.has(key)
    );
    if (stale.length > 0) {
      await chrome.storage.session.remove(stale);
    }
  } catch (error) {
    // A sweep that fails must never block an export.
    console.warn('[Background] Payload sweep failed:', error);
  }
}

// Sweep on every worker startup. A worker is torn down after roughly 30s idle,
// so this fires repeatedly within a session and is where payloads stranded by
// an earlier worker get collected.
void sweepStalePrintPayloads();

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Background] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[Background] Extension updated');
    // Clear injection cache on update
    injectedTabs.clear();
  }
});

/**
 * Clean up when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

/**
 * Clean up when tab URL changes or reloads
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'loading') {
    injectedTabs.delete(tabId);
  }
});

/**
 * Check if a URL is injectable (not chrome://, edge://, etc.)
 */
function isInjectableUrl(url: string | undefined): boolean {
  if (!url) return false;
  
  const restrictedProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'moz-extension://',
    'file://',
  ];
  
  return !restrictedProtocols.some(protocol => url.startsWith(protocol));
}

/**
 * Inject content script into a tab
 */
async function injectContentScript(tabId: number): Promise<boolean> {
  // Check if already injected
  if (injectedTabs.has(tabId)) {
    return true;
  }

  try {
    // Get tab info to check URL
    const tab = await chrome.tabs.get(tabId);
    
    if (!isInjectableUrl(tab.url)) {
      console.log(`[Background] Cannot inject into restricted URL: ${tab.url}`);
      return false;
    }

    // Try to ping existing content script first
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.PING });
      if (response?.pong) {
        injectedTabs.add(tabId);
        return true;
      }
    } catch {
      // Content script not present, need to inject
    }

    // Inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });

    // Wait for script initialization
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify injection
    try {
      const verifyResponse = await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.PING });
      if (verifyResponse?.pong) {
        injectedTabs.add(tabId);
        console.log(`[Background] Content script injected into tab ${tabId}`);
        return true;
      }
    } catch {
      console.error(`[Background] Injection verification failed for tab ${tabId}`);
    }

    return false;
  } catch (error) {
    console.error(`[Background] Failed to inject content script:`, error);
    injectedTabs.delete(tabId);
    return false;
  }
}

/**
 * Forward message to content script
 */
async function forwardToContentScript<T>(
  tabId: number,
  message: Message
): Promise<T | null> {
  try {
    // Ensure content script is injected
    const injected = await injectContentScript(tabId);
    if (!injected) {
      return null;
    }

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response as T;
  } catch (error) {
    console.error(`[Background] Failed to forward message:`, error);
    return null;
  }
}

/**
 * Handle EXPORT_PDF — hand the article to a new print page.
 *
 * The write and the tab creation happen in the same event loop turn so a
 * Service Worker shutdown cannot land between them and strand the payload.
 * The token travels in the URL fragment, which is never sent to a server.
 */
async function handleExportPdf(payload: unknown): Promise<{ success: boolean; error?: string }> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Invalid payload' };
  }

  const article = payload as PrintPayload;
  if (typeof article.content !== 'string' || article.content.length === 0) {
    return { success: false, error: 'Nothing to export' };
  }

  if (article.content.length > MAX_PRINT_PAYLOAD_CHARS) {
    return {
      success: false,
      error:
        `Article is too large to export: ${article.content.length} characters, ` +
        `limit ${MAX_PRINT_PAYLOAD_CHARS}`,
    };
  }

  const token = crypto.randomUUID().replace(/-/g, '');
  const key = `${STORAGE_KEYS.PRINT_PAYLOAD}${token}`;

  // Sweep first. After the write it would race the hand-off just below.
  await sweepStalePrintPayloads(key);

  try {
    await chrome.storage.session.set({ [key]: article });
    stagedPayloadKeys.add(key);
    trimStagedPayloadKeys();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to stage article: ${message}` };
  }

  const page = await chrome.runtime.getURL('print.html');
  try {
    await chrome.tabs.create({ url: `${page}#${token}`, active: true });
  } catch (error) {
    // No tab means no reader. Drop the payload now instead of leaving it for
    // the next sweep to collect.
    stagedPayloadKeys.delete(key);
    try {
      await chrome.storage.session.remove(key);
    } catch {
      // Nothing further to do — a later sweep still collects it.
    }
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to open the print page: ${message}` };
  }

  return { success: true };
}

/**
 * Handle messages from popup or content script
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Log non-trivial messages
  if (message.type !== MESSAGE_TYPES.PING) {
    console.log('[Background] Received message:', message.type);
  }

  // Handle PING for health check
  if (message.type === MESSAGE_TYPES.PING) {
    sendResponse({ pong: true });
    return false;
  }

  // Content script hands over the article; open the print page for it.
  if (message.type === MESSAGE_TYPES.EXPORT_PDF) {
    handleExportPdf(message.payload)
      .then(sendResponse)
      .catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMessage });
      });
    return true; // Async response
  }

  // Handle ENSURE_CONTENT_SCRIPT request from popup
  if (message.type === MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT) {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        
        if (!tab?.id) {
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }

        const injected = await injectContentScript(tab.id);
        sendResponse({ success: true, injected });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMessage });
      }
    })();
    return true; // Async response
  }

  // Handle forwarding messages to content script
  const forwardableTypes: MessageType[] = [
    MESSAGE_TYPES.ENABLE_READING_MODE,
    MESSAGE_TYPES.DISABLE_READING_MODE,
    MESSAGE_TYPES.GET_STATE,
    MESSAGE_TYPES.UPDATE_SETTINGS,
  ];

  if (forwardableTypes.includes(message.type as MessageType)) {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        
        if (!tab?.id) {
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }

        const response = await forwardToContentScript(tab.id, message);
        sendResponse(response ?? { success: false, error: 'No response from content script' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMessage });
      }
    })();
    return true; // Async response
  }

  // Unknown message type
  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

/**
 * Handle extension icon click (when popup is not configured)
 * This provides a fallback for toggling reading mode directly
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // Ensure content script is injected
    const injected = await injectContentScript(tab.id);
    if (!injected) {
      console.error('[Background] Cannot inject content script');
      return;
    }

    // Get current state
    const stateResponse = await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.GET_STATE,
    });

    // Toggle reading mode based on current state
    const toggleType = stateResponse?.isActive
      ? MESSAGE_TYPES.DISABLE_READING_MODE
      : MESSAGE_TYPES.ENABLE_READING_MODE;

    await chrome.tabs.sendMessage(tab.id, { type: toggleType });
    
    console.log('[Background] Toggled reading mode via icon click');
  } catch (error) {
    console.error('[Background] Failed to toggle reading mode:', error);
  }
});

// Export for testing
export {
  injectContentScript,
  forwardToContentScript,
  isInjectableUrl,
};
