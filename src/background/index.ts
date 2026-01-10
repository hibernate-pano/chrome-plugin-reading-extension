/**
 * Background Script (Service Worker) for AI Reading Extension
 * Handles message routing and content script injection
 * Requirements: 1.2, 7.1
 */

import type { Message, MessageType } from '../shared/types';
import { MESSAGE_TYPES } from '../shared/constants';

// Track tabs with injected content scripts
const injectedTabs = new Set<number>();

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
 * Handle messages from popup or content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Log non-trivial messages
  if (message.type !== MESSAGE_TYPES.PING) {
    console.log('[Background] Received message:', message.type);
  }

  // Handle PING for health check
  if (message.type === MESSAGE_TYPES.PING) {
    sendResponse({ pong: true });
    return false;
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
