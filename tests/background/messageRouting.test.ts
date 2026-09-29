/**
 * Behavioral tests for the background service worker (`src/background/index.ts`).
 *
 * The worker is a side-effectful entry point: importing it registers
 * `chrome.runtime.onMessage`, `chrome.action.onClicked`, the tab listeners, and
 * fires a session-storage sweep. These tests therefore install a complete
 * `chrome` mock, then `vi.resetModules()` + dynamic-import the worker inside
 * each test so every case gets a freshly evaluated worker against fresh state.
 *
 * Every assertion is on observable behavior — what lands in storage, what tab
 * URL is opened, what `sendResponse` receives — never on the source text.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MESSAGE_TYPES, STORAGE_KEYS } from '../../src/shared/constants';
import type { Message, PrintPayload } from '../../src/shared/types';

const EXTENSION_ORIGIN = 'chrome-extension://reader-test-id';
/** `crypto.randomUUID()` with the dashes stripped, as the worker builds it. */
const TOKEN_IN_URL_RE = /^chrome-extension:\/\/reader-test-id\/print\.html#([0-9a-f]{32})$/;

type SendResponse = (response: unknown) => void;
type MessageListener = (
  message: Message,
  sender: { id?: string },
  sendResponse: SendResponse
) => boolean | undefined;
type ActionListener = (tab: { id?: number; url?: string }) => Promise<void>;

/* ------------------------------------------------------------------ */
/* Chrome mock                                                        */
/* ------------------------------------------------------------------ */

function createStorageArea() {
  const store: Record<string, unknown> = {};
  return {
    store,
    get: vi.fn((keys: string | string[] | null | undefined) => {
      if (keys === null || keys === undefined) return Promise.resolve({ ...store });
      if (typeof keys === 'string') {
        return Promise.resolve(keys in store ? { [keys]: store[keys] } : {});
      }
      const out: Record<string, unknown> = {};
      for (const key of keys) if (key in store) out[key] = store[key];
      return Promise.resolve(out);
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      for (const key of typeof keys === 'string' ? [keys] : keys) delete store[key];
      return Promise.resolve();
    }),
  };
}

type StorageArea = ReturnType<typeof createStorageArea>;

let session: StorageArea;
let local: StorageArea;
let messageListener: MessageListener | undefined;
let actionListener: ActionListener | undefined;
let onTabsSendMessage: (tabId: number, message: Message) => unknown;
let tabsQueryResult: Array<{ id?: number; url?: string }>;
let chromeMock: ReturnType<typeof createChromeMock>;

function createChromeMock() {
  return {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: vi.fn((listener: MessageListener) => {
          messageListener = listener;
        }),
      },
      getURL: vi.fn((path: string) => `${EXTENSION_ORIGIN}/${path}`),
      sendMessage: vi.fn(),
    },
    action: {
      onClicked: {
        addListener: vi.fn((listener: ActionListener) => {
          actionListener = listener;
        }),
      },
    },
    tabs: {
      query: vi.fn(() => Promise.resolve(tabsQueryResult)),
      get: vi.fn((tabId: number) =>
        Promise.resolve(
          tabsQueryResult.find((tab) => tab.id === tabId) ?? { id: tabId, url: undefined }
        )
      ),
      create: vi.fn(() => Promise.resolve({ id: 99 })),
      sendMessage: vi.fn((tabId: number, message: Message) => onTabsSendMessage(tabId, message)),
      onRemoved: { addListener: vi.fn() },
      onUpdated: { addListener: vi.fn() },
    },
    scripting: { executeScript: vi.fn(() => Promise.resolve([])) },
    storage: { local, session },
  };
}

function installChromeMock(): void {
  messageListener = undefined;
  actionListener = undefined;
  session = createStorageArea();
  local = createStorageArea();
  tabsQueryResult = [{ id: 42, url: 'https://example.com/article' }];
  onTabsSendMessage = () => {
    throw new Error('Receiving end does not exist');
  };
  chromeMock = createChromeMock();
  vi.stubGlobal('chrome', chromeMock);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Re-evaluate the worker so its module-scope registrations run again. */
async function loadWorker(): Promise<void> {
  vi.resetModules();
  await import('../../src/background/index');
  if (!messageListener) {
    throw new Error('background/index.ts registered no chrome.runtime.onMessage listener');
  }
}

/** Send a message and resolve with whatever the worker answers. */
function dispatch(message: Message): Promise<unknown> {
  if (!messageListener) throw new Error('worker not loaded');
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) reject(new Error(`worker never answered ${message.type}`));
    }, 2000);

    const keptAlive = messageListener(message, { id: 'test-sender' }, (response) => {
      settled = true;
      clearTimeout(timer);
      resolve(response);
    });

    // `false` means the worker did not take over the response channel, so it
    // must already have called sendResponse synchronously.
    if (keptAlive !== true) {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new Error(`worker declined ${message.type} without answering synchronously`));
      }
    }
  });
}

/** Send a message that is expected to be answered synchronously. */
function dispatchSync(message: Message): { keptAlive: boolean | undefined; response: unknown } {
  if (!messageListener) throw new Error('worker not loaded');
  let response: unknown;
  const keptAlive = messageListener(message, { id: 'test-sender' }, (value) => {
    response = value;
  });
  return { keptAlive, response };
}

/** Let the module-scope startup sweep settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function articlePayload(overrides: Partial<PrintPayload> = {}): PrintPayload {
  return {
    title: 'On Reading Well',
    byline: 'A Writer',
    siteName: 'Example',
    content: '<p>' + 'body text '.repeat(50) + '</p>',
    sourceUrl: 'https://example.com/article',
    exportedAt: 1_700_000_000_000,
    ...overrides,
  };
}

const stagedKeys = (): string[] =>
  Object.keys(session.store).filter((key) => key.startsWith(STORAGE_KEYS.PRINT_PAYLOAD));

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe('background service worker', () => {
  beforeEach(() => {
    installChromeMock();
  });

  describe('module registration', () => {
    it('registers a message listener and an icon click handler on import', async () => {
      await loadWorker();

      expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
      expect(chromeMock.action.onClicked.addListener).toHaveBeenCalledTimes(1);
      expect(typeof messageListener).toBe('function');
      expect(typeof actionListener).toBe('function');
    });

    it('answers PING synchronously without holding the response channel', async () => {
      await loadWorker();

      const { keptAlive, response } = dispatchSync({ type: MESSAGE_TYPES.PING });

      expect(keptAlive).toBe(false);
      expect(response).toEqual({ pong: true });
    });

    it('answers an unknown message type synchronously', async () => {
      await loadWorker();

      const { keptAlive, response } = dispatchSync({
        type: 'NOT_A_REAL_TYPE' as Message['type'],
      });

      expect(keptAlive).toBe(false);
      expect(response).toEqual({ success: false, error: 'Unknown message type' });
    });
  });

  describe('EXPORT_PDF validation', () => {
    it('rejects a payload-less export loudly, without staging or opening a tab', async () => {
      await loadWorker();

      const response = await dispatch({ type: MESSAGE_TYPES.EXPORT_PDF });

      expect(response).toEqual({ success: false, error: 'Invalid payload' });
      expect(session.set).not.toHaveBeenCalled();
      expect(chromeMock.tabs.create).not.toHaveBeenCalled();
      expect(stagedKeys()).toEqual([]);
    });

    it('rejects a non-object payload', async () => {
      await loadWorker();

      const response = await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: 'just a string' as unknown,
      });

      expect(response).toEqual({ success: false, error: 'Invalid payload' });
      expect(chromeMock.tabs.create).not.toHaveBeenCalled();
    });

    it('refuses an export whose content is empty', async () => {
      await loadWorker();

      const response = await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload({ content: '' }),
      });

      expect(response).toEqual({ success: false, error: 'Nothing to export' });
      expect(chromeMock.tabs.create).not.toHaveBeenCalled();
    });

    it('refuses an export whose content is not a string', async () => {
      await loadWorker();

      const response = await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: { content: { html: '<p>hi</p>' } },
      });

      expect(response).toEqual({ success: false, error: 'Nothing to export' });
      expect(chromeMock.tabs.create).not.toHaveBeenCalled();
    });

    it('refuses an article over the size ceiling and says what the limit is', async () => {
      await loadWorker();

      const response = (await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload({ content: 'x'.repeat(2_000_001) }),
      })) as { success: boolean; error?: string };

      expect(response.success).toBe(false);
      expect(response.error).toMatch(/too large/i);
      expect(response.error).toContain('2000001');
      expect(response.error).toContain('2000000');
      expect(session.set).not.toHaveBeenCalled();
      expect(chromeMock.tabs.create).not.toHaveBeenCalled();
    });

    it('accepts an article sitting exactly on the size ceiling', async () => {
      await loadWorker();

      const response = await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload({ content: 'x'.repeat(2_000_000) }),
      });

      expect(response).toEqual({ success: true });
      expect(chromeMock.tabs.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('EXPORT_PDF hand-off', () => {
    it('stages the article under a one-shot token and opens the print page on that same token', async () => {
      await loadWorker();
      const payload = articlePayload();

      const response = await dispatch({ type: MESSAGE_TYPES.EXPORT_PDF, payload });

      expect(response).toEqual({ success: true });

      // Exactly one key, shaped `print_payload_<32 hex>`, holding the article.
      const keys = stagedKeys();
      expect(keys).toHaveLength(1);
      const key = keys[0];
      expect(key).toMatch(new RegExp(`^${STORAGE_KEYS.PRINT_PAYLOAD}[0-9a-f]{32}$`));
      expect(session.store[key]).toEqual(payload);

      // The tab URL is the print page with the token in the fragment, and it
      // is the *same* token the payload was staged under — otherwise the print
      // page boots to an empty article.
      expect(chromeMock.runtime.getURL).toHaveBeenCalledWith('print.html');
      expect(chromeMock.tabs.create).toHaveBeenCalledTimes(1);
      const opened = chromeMock.tabs.create.mock.calls[0][0] as { url: string; active: boolean };
      const match = TOKEN_IN_URL_RE.exec(opened.url);
      expect(match, `unexpected print page url: ${opened.url}`).not.toBeNull();
      expect(match?.[1]).toBe(key.slice(STORAGE_KEYS.PRINT_PAYLOAD.length));
      expect(opened.active).toBe(true);
    });

    it('uses a fresh token for every export', async () => {
      await loadWorker();

      await dispatch({ type: MESSAGE_TYPES.EXPORT_PDF, payload: articlePayload() });
      await dispatch({ type: MESSAGE_TYPES.EXPORT_PDF, payload: articlePayload() });

      expect(stagedKeys()).toHaveLength(2);
      const [first, second] = chromeMock.tabs.create.mock.calls.map(
        (call) => (call[0] as { url: string }).url
      );
      expect(first).not.toBe(second);
    });

    it('reports a storage failure instead of opening a print page with nothing in it', async () => {
      await loadWorker();
      session.set.mockImplementationOnce(() =>
        Promise.reject(new Error('QUOTA_BYTES quota exceeded'))
      );

      const response = (await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload(),
      })) as { success: boolean; error?: string };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to stage article: QUOTA_BYTES quota exceeded');
      expect(chromeMock.tabs.create).not.toHaveBeenCalled();
      expect(stagedKeys()).toEqual([]);
    });

    it('drops the staged article when the print tab cannot be opened', async () => {
      await loadWorker();
      chromeMock.tabs.create.mockRejectedValueOnce(new Error('No window available'));

      const response = (await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload(),
      })) as { success: boolean; error?: string };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to open the print page: No window available');
      // Nothing will ever read this article, so it must not sit in session
      // storage until the next sweep.
      expect(stagedKeys()).toEqual([]);
    });
  });

  describe('stranded payload sweeping', () => {
    it('collects payloads stranded by an earlier worker on startup', async () => {
      session.store[`${STORAGE_KEYS.PRINT_PAYLOAD}stranded`] = articlePayload({ title: 'Old' });
      session.store['unrelated_key'] = { keep: 'me' };

      await loadWorker();
      await flush();

      expect(stagedKeys()).toEqual([]);
      expect(session.store.unrelated_key).toEqual({ keep: 'me' });
    });

    it('collects a stranded payload when a new export is staged', async () => {
      await loadWorker();
      await flush();
      session.store[`${STORAGE_KEYS.PRINT_PAYLOAD}stranded`] = articlePayload({ title: 'Old' });

      const response = await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload(),
      });

      expect(response).toEqual({ success: true });
      expect(stagedKeys()).toHaveLength(1);
      expect(stagedKeys()[0]).not.toContain('stranded');
    });

    it('leaves a payload staged moments earlier alone', async () => {
      await loadWorker();
      await flush();

      const first = await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload({ title: 'First' }),
      });
      expect(first).toEqual({ success: true });
      const firstKey = stagedKeys()[0];

      const second = await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload({ title: 'Second' }),
      });
      expect(second).toEqual({ success: true });

      // The second export's sweep must not collect the first: that article's
      // print page has not booted yet.
      expect(stagedKeys()).toHaveLength(2);
      expect(session.store[firstKey]).toEqual(articlePayload({ title: 'First' }));
    });

    it('still exports when the sweep itself fails', async () => {
      await loadWorker();
      await flush();
      session.get.mockRejectedValueOnce(new Error('session storage unavailable'));

      const response = await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload(),
      });

      // A sweep that throws must never be the reason a reader cannot print.
      expect(response).toEqual({ success: true });
      expect(stagedKeys()).toHaveLength(1);
    });
  });

  describe('forwarding to the active tab', () => {
    it('reports "No active tab found" instead of forwarding into the void', async () => {
      await loadWorker();
      tabsQueryResult = [];

      const response = await dispatch({ type: MESSAGE_TYPES.GET_STATE });

      expect(response).toEqual({ success: false, error: 'No active tab found' });
      expect(chromeMock.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it('forwards a reading-mode message to the active tab and returns its answer', async () => {
      await loadWorker();
      onTabsSendMessage = (_tabId, message) =>
        message.type === MESSAGE_TYPES.PING ? { pong: true } : { success: true, isActive: true };

      const response = await dispatch({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      expect(response).toEqual({ success: true, isActive: true });
      const forwarded = chromeMock.tabs.sendMessage.mock.calls.map((call) => call[1]);
      expect(forwarded).toContainEqual({ type: MESSAGE_TYPES.PING });
      expect(forwarded).toContainEqual({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
    });

    it('refuses to inject the content script into a restricted url', async () => {
      await loadWorker();
      tabsQueryResult = [{ id: 42, url: 'chrome://settings' }];
      onTabsSendMessage = () => ({ pong: true });

      const response = await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT });

      expect(response).toEqual({ success: true, injected: false });
      expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('injects the content script when the tab has no live one', async () => {
      await loadWorker();
      // First PING has no receiver — that is what tells the worker nothing is
      // there yet. The verification PING after injection succeeds.
      let pings = 0;
      onTabsSendMessage = (_tabId, message) => {
        if (message.type === MESSAGE_TYPES.PING) {
          pings += 1;
          if (pings === 1) throw new Error('Receiving end does not exist');
          return { pong: true };
        }
        return { success: true };
      };

      const response = await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT });

      expect(response).toEqual({ success: true, injected: true });
      expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 42 },
        files: ['content.js'],
      });
    });
  });

  describe('icon click', () => {
    it('enables reading mode when the page is not in reading mode', async () => {
      await loadWorker();
      onTabsSendMessage = (_tabId, message) => {
        if (message.type === MESSAGE_TYPES.PING) return { pong: true };
        if (message.type === MESSAGE_TYPES.GET_STATE) return { isActive: false, canExtract: true };
        return { success: true, isActive: true };
      };

      await actionListener?.({ id: 42 });

      const forwarded = chromeMock.tabs.sendMessage.mock.calls.map((call) => call[1]);
      expect(forwarded[forwarded.length - 1]).toEqual({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
    });

    it('turns reading mode back off when the page is already reading', async () => {
      await loadWorker();
      onTabsSendMessage = (_tabId, message) => {
        if (message.type === MESSAGE_TYPES.PING) return { pong: true };
        if (message.type === MESSAGE_TYPES.GET_STATE) return { isActive: true, canExtract: true };
        return { success: true, isActive: false };
      };

      await actionListener?.({ id: 42 });

      const forwarded = chromeMock.tabs.sendMessage.mock.calls.map((call) => call[1]);
      expect(forwarded[forwarded.length - 1]).toEqual({ type: MESSAGE_TYPES.DISABLE_READING_MODE });
    });
  });

  describe('isInjectableUrl', () => {
    it('accepts ordinary web pages and rejects privileged schemes', async () => {
      await loadWorker();
      const { isInjectableUrl } = await import('../../src/background/index');

      expect(isInjectableUrl('https://example.com/a')).toBe(true);
      expect(isInjectableUrl('http://example.com/a')).toBe(true);
      expect(isInjectableUrl('file:///tmp/a.html')).toBe(false);
      expect(isInjectableUrl('chrome://extensions')).toBe(false);
      expect(isInjectableUrl('about:blank')).toBe(false);
      expect(isInjectableUrl('chrome-extension://abc/page.html')).toBe(false);
      expect(isInjectableUrl(undefined)).toBe(false);
    });
  });
});
