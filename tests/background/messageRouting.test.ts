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
type InstalledListener = (details: { reason: string }) => void;
type UpdatedListener = (tabId: number, changeInfo: { url?: string; status?: string }) => void;
type RemovedListener = (tabId: number) => void;

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
let installedListener: InstalledListener | undefined;
let updatedListener: UpdatedListener | undefined;
let removedListener: RemovedListener | undefined;
let onTabsSendMessage: (tabId: number, message: Message) => unknown;
let tabsQueryResult: Array<{ id?: number; url?: string }>;
let chromeMock: ReturnType<typeof createChromeMock>;

function createChromeMock() {
  return {
    runtime: {
      onInstalled: {
        addListener: vi.fn((listener: InstalledListener) => {
          installedListener = listener;
        }),
      },
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
      onRemoved: {
        addListener: vi.fn((listener: RemovedListener) => {
          removedListener = listener;
        }),
      },
      onUpdated: {
        addListener: vi.fn((listener: UpdatedListener) => {
          updatedListener = listener;
        }),
      },
    },
    scripting: { executeScript: vi.fn(() => Promise.resolve([])) },
    storage: { local, session },
  };
}

function installChromeMock(): void {
  messageListener = undefined;
  actionListener = undefined;
  installedListener = undefined;
  updatedListener = undefined;
  removedListener = undefined;
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

/**
 * Model the real world for an injection race: the tab has no responder until
 * `executeScript` has actually run, and answers every PING after that.
 *
 * A PING counter cannot stand in for this — it lets a second caller take the
 * "a script is already there" path, which is a legitimate outcome and hides the
 * very race the overlapping-caller tests are meant to provoke.
 */
let scriptHasRun = false;

function installScriptArrivesOnInjection(): void {
  scriptHasRun = false;
  chromeMock.scripting.executeScript.mockImplementation(
    () =>
      // The injected script starts answering on a macrotask, so a second caller
      // is still inside its own PING when the first injection lands — that is
      // the window the race lives in. Flipping the flag synchronously (or on a
      // microtask) would let the second caller take the "a script is already
      // there" path instead, and the race would never be provoked.
      new Promise((resolve) =>
        setTimeout(() => {
          scriptHasRun = true;
          resolve([]);
        }, 0)
      )
  );
  onTabsSendMessage = (_tabId, message) => {
    if (message.type === MESSAGE_TYPES.PING) {
      if (!scriptHasRun) throw new Error('Receiving end does not exist');
      return { pong: true };
    }
    return { success: true };
  };
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

/** Every print token staged so far, in the order the sweep would see them. */

/** Answer PING with `{ pong: true }` and every other message with a state. */
function installLiveContentScript(): void {
  onTabsSendMessage = (_tabId, message) =>
    message.type === MESSAGE_TYPES.PING ? { pong: true } : { success: true, isActive: false };
}

/** Get the content script into the active tab and leave it memoized there. */
async function injectOnce(): Promise<void> {
  const response = await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT });
  expect(response, 'setup: the first injection should succeed').toEqual({
    success: true,
    injected: true,
  });
}

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

    // Regression: an attempt spans tabs.get → PING → executeScript → a 100 ms
    // settle → a second PING, and `injectedTabs` is only populated at the end.
    // Two overlapping callers both saw an empty set, both found no responder,
    // and both ran executeScript — leaving two copies of content.js in one tab,
    // each with a permanent onMessage listener and its own module-level
    // state/reactRoot, which then collide with the reader mount.
    it('collapses two overlapping requests onto a single injection', async () => {
      await loadWorker();
      installScriptArrivesOnInjection();

      const [first, second] = await Promise.all([
        dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT }),
        dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT }),
      ]);

      // Both callers get the real answer, not a second guess.
      expect(first).toEqual({ success: true, injected: true });
      expect(second).toEqual({ success: true, injected: true });
      expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(1);
    });

    it('collapses an icon click racing a forwarded message onto one injection', async () => {
      await loadWorker();
      installScriptArrivesOnInjection();
      onTabsSendMessage = (_tabId, message) => {
        if (message.type === MESSAGE_TYPES.PING) {
          if (!scriptHasRun) throw new Error('Receiving end does not exist');
          return { pong: true };
        }
        if (message.type === MESSAGE_TYPES.GET_STATE) return { isActive: false, canExtract: true };
        return { success: true, isActive: true };
      };

      const [, forwarded] = await Promise.all([
        actionListener?.({ id: 42 }),
        dispatch({ type: MESSAGE_TYPES.ENABLE_READING_MODE }),
      ]);

      expect(forwarded).toEqual({ success: true, isActive: true });
      expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(1);
    });

    it('injects again in a tab whose first injection failed', async () => {
      await loadWorker();
      // Every PING fails, so the attempt reports `injected: false` and nothing is
      // memoized — a later request has to be free to try again.
      onTabsSendMessage = () => {
        throw new Error('Receiving end does not exist');
      };

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: false,
      });
      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: false,
      });

      expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(2);
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

  /* ---------------------------------------------------------------- */
  /* Injection cache lifecycle                                        */
  /* ---------------------------------------------------------------- */

  describe('injection cache invalidation', () => {
    it('does not inject a second copy of the content script into the same tab', async () => {
      await loadWorker();
      installScriptArrivesOnInjection();

      await injectOnce();
      expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(1);

      // Sequential, not overlapping: the second call lands after the first has
      // memoized the tab, so this is the cache-hit path rather than the
      // in-flight one. Running executeScript again would put a second content
      // script — and a second onMessage listener — in the same tab.
      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: true,
      });
      // `executeScript` alone cannot tell the two apart: once the script is
      // live, a second injection attempt would find it by PING and skip the
      // write anyway. `tabs.get` is the honest signal — a cache hit answers
      // without ever looking the tab up.
      expect(chromeMock.tabs.get).toHaveBeenCalledTimes(1);
      expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(1);
    });

    it('injects again in a tab that has navigated to a new url', async () => {
      await loadWorker();
      installScriptArrivesOnInjection();
      await injectOnce();

      // Navigation tears the old content script down. Keeping the memoized entry
      // would leave the worker believing a script that no longer exists is live,
      // and the reader would never open.
      updatedListener?.(42, { url: 'https://example.com/next' });

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: true,
      });
      // The entry was dropped, so this ENSURE had to look the tab up again.
      expect(chromeMock.tabs.get).toHaveBeenCalledTimes(2);
    });

    it('injects again in a tab that is still loading after a reload', async () => {
      await loadWorker();
      installScriptArrivesOnInjection();
      await injectOnce();

      // A reload reports `loading` without ever reporting a url, so the url half
      // of the condition cannot be what catches it.
      updatedListener?.(42, { status: 'loading' });

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: true,
      });
      expect(chromeMock.tabs.get).toHaveBeenCalledTimes(2);
    });

    it('keeps the memoized injection through a change that is not a navigation', async () => {
      await loadWorker();
      installScriptArrivesOnInjection();
      await injectOnce();

      // `faviconUrl` and a finished `complete` status say nothing about whether
      // the content script survived, so the entry has to stay put.
      updatedListener?.(42, { status: 'complete' });
      updatedListener?.(42, {});

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: true,
      });
      expect(chromeMock.tabs.get).toHaveBeenCalledTimes(1);
      expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(1);
    });

    it('injects again in a tab that was closed and reopened as a new id', async () => {
      await loadWorker();
      let freshTabHasScript = false;
      onTabsSendMessage = (tabId, message) => {
        if (message.type !== MESSAGE_TYPES.PING) return { success: true };
        if (tabId === 77 && !freshTabHasScript) throw new Error('Receiving end does not exist');
        return { pong: true };
      };
      chromeMock.scripting.executeScript.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              freshTabHasScript = true;
              resolve([]);
            }, 0)
          )
      );
      await injectOnce();

      removedListener?.(42);
      tabsQueryResult = [{ id: 77, url: 'https://example.com/fresh' }];

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: true,
      });
      // The new id is a different tab, so it has to be injected for itself.
      expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 77 },
        files: ['content.js'],
      });
    });

    it('forgets every memoized injection when the extension is updated', async () => {
      await loadWorker();
      installScriptArrivesOnInjection();
      await injectOnce();

      installedListener?.({ reason: 'update' });

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: true,
      });
      // The update wiped the cache, so this ENSURE had to re-check the tab.
      expect(chromeMock.tabs.get).toHaveBeenCalled();
    });

    it('announces a fresh install without touching the injection cache', async () => {
      await loadWorker();
      installScriptArrivesOnInjection();
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await injectOnce();

        installedListener?.({ reason: 'install' });

        expect(log).toHaveBeenCalledWith('[Background] Extension installed');
        // A fresh install has nothing to forget, so the live entry must survive.
        expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
          success: true,
          injected: true,
        });
        expect(chromeMock.tabs.get).toHaveBeenCalledTimes(1);
      } finally {
        log.mockRestore();
      }
    });

    it('does nothing on an install reason it does not know', async () => {
      await loadWorker();
      installScriptArrivesOnInjection();
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await injectOnce();
        log.mockClear();

        installedListener?.({ reason: 'chrome_update' });

        // `chrome_update` and `shared_module_update` are not ours: announcing an
        // extension install for a browser update would be a lie, and there is
        // nothing to clear.
        expect(log).not.toHaveBeenCalled();
        expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
          success: true,
          injected: true,
        });
        expect(chromeMock.tabs.get).toHaveBeenCalledTimes(1);
      } finally {
        log.mockRestore();
      }
    });
  });

  /* ---------------------------------------------------------------- */
  /* Injection: answers the worker cannot trust                       */
  /* ---------------------------------------------------------------- */

  describe('injection verification', () => {
    it('still injects when the first PING is answered by something that is not a pong', async () => {
      await loadWorker();
      // A stale or unrelated listener in the tab can answer the PING with
      // anything at all. Trusting that answer would skip the injection and
      // leave the tab with no reader.
      let pings = 0;
      onTabsSendMessage = (_tabId, message) => {
        if (message.type === MESSAGE_TYPES.PING) {
          pings += 1;
          return pings === 1 ? { unexpected: true } : { pong: true };
        }
        return { success: true };
      };

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: true,
      });
      expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(1);
    });

    it('reports the injection as failed when verification never gets a pong', async () => {
      await loadWorker();
      // executeScript resolved, but nothing in the tab answers afterwards — the
      // script failed to take. Reporting success here would tell the toolbar
      // the reader is available when no reader exists.
      let pings = 0;
      onTabsSendMessage = (_tabId, message) => {
        if (message.type === MESSAGE_TYPES.PING) {
          pings += 1;
          if (pings === 1) throw new Error('Receiving end does not exist');
          return { unexpected: true };
        }
        return { success: true };
      };

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: true,
        injected: false,
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* Failure reporting                                                */
  /* ---------------------------------------------------------------- */

  describe('failures the worker cannot attribute to an Error', () => {
    it('reports a non-Error storage rejection verbatim', async () => {
      await loadWorker();
      // Chrome API rejections are not guaranteed to be Error instances, and a
      // reporter that assumes they are throws inside the catch and answers
      // nothing at all — the content script would hang waiting for a response.
      session.set.mockRejectedValueOnce('quota blown');

      const response = (await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload(),
      })) as { success: boolean; error?: string };

      expect(response).toEqual({ success: false, error: 'Failed to stage article: quota blown' });
      expect(chromeMock.tabs.create).not.toHaveBeenCalled();
    });

    it('reports a non-Error tab-creation rejection verbatim', async () => {
      await loadWorker();
      chromeMock.tabs.create.mockRejectedValueOnce('no window');

      const response = (await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload(),
      })) as { success: boolean; error?: string };

      expect(response).toEqual({ success: false, error: 'Failed to open the print page: no window' });
      expect(stagedKeys()).toEqual([]);
    });

    it('answers an export whose own hand-off blows up after the article is staged', async () => {
      await loadWorker();
      chromeMock.runtime.getURL.mockImplementationOnce(() => {
        throw new Error('extension origin is gone');
      });

      const response = (await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload(),
      })) as { success: boolean; error?: string };

      // `getURL` runs outside the staging try/catch, so this is the only thing
      // standing between a failed hand-off and a content script waiting forever.
      expect(response).toEqual({ success: false, error: 'extension origin is gone' });
    });

    it('answers an export whose hand-off rejects with a non-Error', async () => {
      await loadWorker();
      chromeMock.runtime.getURL.mockImplementationOnce(() => {
        throw 'origin gone';
      });

      const response = (await dispatch({
        type: MESSAGE_TYPES.EXPORT_PDF,
        payload: articlePayload(),
      })) as { success: boolean; error?: string };

      expect(response).toEqual({ success: false, error: 'origin gone' });
    });

    it('reports a non-Error tab-query rejection on the ensure path', async () => {
      await loadWorker();
      chromeMock.tabs.query.mockRejectedValueOnce('window service is down');

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: false,
        error: 'window service is down',
      });
    });

    it('reports an Error tab-query rejection on the ensure path', async () => {
      await loadWorker();
      chromeMock.tabs.query.mockRejectedValueOnce(new Error('no current window'));

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: false,
        error: 'no current window',
      });
    });

    it('reports a non-Error tab-query rejection on the forwarding path', async () => {
      await loadWorker();
      chromeMock.tabs.query.mockRejectedValueOnce('window service is down');

      expect(await dispatch({ type: MESSAGE_TYPES.GET_STATE })).toEqual({
        success: false,
        error: 'window service is down',
      });
    });

    it('reports an Error tab-query rejection on the forwarding path', async () => {
      await loadWorker();
      chromeMock.tabs.query.mockRejectedValueOnce(new Error('no current window'));

      expect(await dispatch({ type: MESSAGE_TYPES.GET_STATE })).toEqual({
        success: false,
        error: 'no current window',
      });
    });
  });

  describe('requests that have nowhere to go', () => {
    it('reports "No active tab found" on the ensure path too', async () => {
      await loadWorker();
      tabsQueryResult = [];

      expect(await dispatch({ type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT })).toEqual({
        success: false,
        error: 'No active tab found',
      });
      expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('reports a forwarded message that could not be delivered', async () => {
      await loadWorker();
      // A restricted page refuses injection, so the message never reaches a
      // content script. The worker must say so rather than answering with the
      // `null` that `forwardToContentScript` returns.
      tabsQueryResult = [{ id: 42, url: 'chrome://settings' }];

      expect(await dispatch({ type: MESSAGE_TYPES.ENABLE_READING_MODE })).toEqual({
        success: false,
        error: 'No response from content script',
      });
      expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('does nothing when the clicked tab has no id', async () => {
      await loadWorker();
      installLiveContentScript();

      // A tab with no id cannot be messaged at all; `chrome.tabs.sendMessage`
      // would throw on `undefined`, and the toolbar click would do nothing but
      // log.
      await expect(actionListener?.({})).resolves.toBeUndefined();

      expect(chromeMock.tabs.sendMessage).not.toHaveBeenCalled();
      expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('leaves the page alone when the icon click cannot inject', async () => {
      await loadWorker();
      tabsQueryResult = [{ id: 42, url: 'chrome://settings' }];
      onTabsSendMessage = () => ({ pong: true });

      await actionListener?.({ id: 42 });

      // No reading-mode message may be sent: the tab has no content script, so
      // one would be lost, and the toolbar would appear to have done nothing.
      expect(chromeMock.tabs.sendMessage).not.toHaveBeenCalled();
      expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
    });
  });

  describe('staged payload bookkeeping cap', () => {
    it('keeps the in-memory hand-off set finite', async () => {
      await loadWorker();
      await flush();

      for (let i = 0; i < 9; i += 1) {
        expect(
          await dispatch({ type: MESSAGE_TYPES.EXPORT_PDF, payload: articlePayload() })
        ).toEqual({ success: true });
      }

      // Nine live payloads: the cap is eight, so the oldest has been dropped
      // from the in-memory set even though its print tab has not booted yet.
      // The tenth export's sweep is the first one that can collect it.
      const beforeSweep = stagedKeys();
      expect(beforeSweep).toHaveLength(9);
      const oldestKey = beforeSweep[0];

      await dispatch({ type: MESSAGE_TYPES.EXPORT_PDF, payload: articlePayload() });

      expect(stagedKeys()).not.toContain(oldestKey);
      expect(stagedKeys()).toHaveLength(9);
    });
  });
});
