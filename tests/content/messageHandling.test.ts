/**
 * Behavioral tests for the content script entry point (`src/content/index.ts`).
 *
 * The module is a side-effectful entry point: importing it boots `initialize()`
 * at module scope, which registers `chrome.runtime.onMessage` synchronously
 * before it awaits settings. These tests install a complete `chrome` mock, then
 * `vi.resetModules()` + dynamic-import the script inside each test so every
 * case gets a freshly booted script against fresh state.
 *
 * The script exports nothing, so it is driven the way Chrome drives it: through
 * the function it hands to `chrome.runtime.onMessage.addListener`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { MESSAGE_TYPES, STORAGE_KEYS, DEFAULT_SETTINGS } from '../../src/shared/constants';
import type { Message } from '../../src/shared/types';

const HOST_ID = 'ai-reader-host';

type SendResponse = (response: unknown) => void;
type MessageListener = (
  message: Message,
  sender: { id?: string },
  sendResponse: SendResponse
) => boolean | undefined;

const FILLER =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis ' +
  'nostrud exercitation ullamco laboris. ';

/** A page with enough prose to clear Readability's threshold. */
const ARTICLE_HTML = `
  <nav><a href="/nav">noise</a></nav>
  <article>
    <h1>On Reading Well</h1>
    <p>${FILLER.repeat(4)}</p>
    <p>${FILLER.repeat(4)}</p>
  </article>
  <footer>footer noise</footer>
`;

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

let local: ReturnType<typeof createStorageArea>;
let messageListener: MessageListener | undefined;
let chromeMock: ReturnType<typeof createChromeMock>;

function createChromeMock() {
  return {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: vi.fn((listener: MessageListener) => {
          messageListener = listener;
        }),
        removeListener: vi.fn(),
      },
      getURL: vi.fn((path: string) => `chrome-extension://reader-test-id/${path}`),
      sendMessage: vi.fn(() => Promise.resolve({ success: true })),
    },
    storage: { local },
  };
}

function installChromeMock(): void {
  messageListener = undefined;
  local = createStorageArea();
  chromeMock = createChromeMock();
  vi.stubGlobal('chrome', chromeMock);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

async function loadContentScript(): Promise<void> {
  vi.resetModules();
  await import('../../src/content/index');
  if (!messageListener) {
    throw new Error('content/index.ts registered no chrome.runtime.onMessage listener');
  }
}

/** Send a message and resolve with whatever the script answers. */
function dispatch(message: Message): Promise<unknown> {
  if (!messageListener) throw new Error('content script not loaded');
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) reject(new Error(`content script never answered ${message.type}`));
    }, 2000);

    const keptAlive = messageListener(message, { id: 'test-sender' }, (response) => {
      settled = true;
      clearTimeout(timer);
      resolve(response);
    });

    if (keptAlive !== true) {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new Error(`content script declined ${message.type} without answering synchronously`));
      }
    }
  });
}

/** Send a message that is expected to be answered synchronously. */
function dispatchSync(message: Message): { keptAlive: boolean | undefined; response: unknown } {
  if (!messageListener) throw new Error('content script not loaded');
  let response: unknown;
  const keptAlive = messageListener(message, { id: 'test-sender' }, (value) => {
    response = value;
  });
  return { keptAlive, response };
}

/** Dispatch a message whose handler mounts or unmounts React. */
async function dispatchInAct(message: Message): Promise<unknown> {
  let response: unknown;
  await act(async () => {
    response = await dispatch(message);
  });
  return response;
}

function readerHost(): HTMLElement | null {
  return document.getElementById(HOST_ID);
}

function readerShadow(): ShadowRoot {
  const host = readerHost();
  if (!host?.shadowRoot) throw new Error('the reader shadow root is not mounted');
  return host.shadowRoot;
}

/**
 * Load a page into the shared jsdom document.
 *
 * jsdom implements neither `innerText` nor a document `<title>`, and the
 * content script depends on both (`canExtractContent` measures
 * `body.innerText`, and the extractor falls back to `document.title` for a
 * title). Both are defined here so the tests exercise the real code path
 * instead of tripping over the environment's gaps.
 */
function setPage(
  html: string,
  { title = 'On Reading Well', innerText }: { title?: string; innerText?: string } = {}
): void {
  document.title = title;
  document.body.innerHTML = html;
  Object.defineProperty(document.body, 'innerText', {
    configurable: true,
    get: () => innerText ?? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  });
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe('content script message handling', () => {
  beforeEach(() => {
    installChromeMock();
    setPage('');
  });

  afterEach(() => {
    document.getElementById(HOST_ID)?.remove();
    document.body.className = '';
    document.body.innerHTML = '';
  });

  describe('boot', () => {
    it('registers a message listener at import time, before settings finish loading', async () => {
      // Settings never resolve. The listener is registered first and
      // synchronously precisely so a slow storage read cannot leave the
      // content script permanently deaf.
      local.get.mockImplementation(() => new Promise(() => {}));

      await loadContentScript();

      expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
      expect(typeof messageListener).toBe('function');
    });

    it('keeps answering messages when the settings read fails', async () => {
      local.get.mockImplementation(() => Promise.reject(new Error('storage is gone')));

      await loadContentScript();

      const { keptAlive, response } = dispatchSync({ type: MESSAGE_TYPES.PING });

      expect(keptAlive).toBe(false);
      expect(response).toEqual({ pong: true });
    });

    it('runs on default settings when the stored settings are unreadable', async () => {
      local.get.mockImplementation(() => Promise.reject(new Error('storage is gone')));

      await loadContentScript();

      // `getSettings` absorbs the failure and returns the defaults, so the
      // script has to keep working: a broken settings read is not a reason for
      // the toolbar toggle, the reader or the export button to go dead.
      const response = await dispatch({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { fontSize: 24 },
      });

      expect(response).toEqual({ success: true });
      expect((local.store[STORAGE_KEYS.SETTINGS] as Record<string, unknown>).fontSize).toBe(24);
    });
  });

  describe('PING and unknown types', () => {
    it('answers PING synchronously without holding the response channel', async () => {
      await loadContentScript();

      const { keptAlive, response } = dispatchSync({ type: MESSAGE_TYPES.PING });

      expect(keptAlive).toBe(false);
      expect(response).toEqual({ pong: true });
    });

    it('reports an unknown message type instead of hanging', async () => {
      await loadContentScript();

      const response = await dispatch({ type: 'NOT_A_REAL_TYPE' as Message['type'] });

      expect(response).toEqual({ success: false, error: 'Unknown message type' });
    });
  });

  describe('reading mode', () => {
    it('mounts the reader into a shadow root, leaving the host page untouched', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();

      const response = await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      expect(response).toEqual({ success: true, isActive: true });

      const host = readerHost();
      expect(host, 'the reader host element should be attached').not.toBeNull();
      expect(host?.shadowRoot).not.toBeNull();
      expect(document.body.classList.contains('reader-mode-active')).toBe(true);

      // The reader renders into the shadow root, so the host page's own
      // markup is still exactly what the site served.
      expect(document.querySelector('article')).not.toBeNull();
      expect(document.querySelector('nav a')?.textContent).toBe('noise');
      expect(readerShadow().querySelector('[data-reader-mount]')).not.toBeNull();
      expect(readerShadow().querySelector('.reader-title')?.textContent).toBe('On Reading Well');
    });

    it('reports state, including whether the page has enough text to extract', async () => {
      setPage('<p>tiny</p>');
      await loadContentScript();

      const idle = await dispatch({ type: MESSAGE_TYPES.GET_STATE });
      expect(idle).toEqual({ isActive: false, canExtract: false });

      setPage(ARTICLE_HTML);
      const ready = await dispatch({ type: MESSAGE_TYPES.GET_STATE });
      expect(ready).toEqual({ isActive: false, canExtract: true });
    });

    it('turns reading mode back off and takes the reader with it', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
      expect(readerHost()).not.toBeNull();

      const response = await dispatchInAct({ type: MESSAGE_TYPES.DISABLE_READING_MODE });

      expect(response).toEqual({ success: true, isActive: false });
      expect(readerHost()).toBeNull();
      expect(document.body.classList.contains('reader-mode-active')).toBe(false);
      expect(await dispatch({ type: MESSAGE_TYPES.GET_STATE })).toEqual({
        isActive: false,
        canExtract: true,
      });
    });

    it('refuses to open a reader on a page with no article, and says so', async () => {
      setPage('');
      await loadContentScript();

      const response = (await dispatchInAct({
        type: MESSAGE_TYPES.ENABLE_READING_MODE,
      })) as { success: boolean; error?: string };

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
      // Nothing half-built: no reader on screen for a page we could not read.
      expect(readerHost()).toBeNull();
      expect(document.querySelector('[role="alert"]')).not.toBeNull();
    });

    it('records the article in reading history when the reader opens', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      // addToHistory is fired without await, so let its storage write land.
      await vi.waitFor(() => {
        expect(
          local.set.mock.calls.some((call) => STORAGE_KEYS.READING_HISTORY in call[0])
        ).toBe(true);
      });

      const history = local.store[STORAGE_KEYS.READING_HISTORY] as Array<Record<string, unknown>>;
      expect(history).toHaveLength(1);
      expect(history[0].url).toBe(window.location.href);
      expect(history[0].title).toBe('On Reading Well');
      expect(history[0].readCount).toBe(1);
      expect(history[0].length).toBeGreaterThan(0);
    });
  });

  describe('settings', () => {
    it('clamps an out-of-range setting before it is persisted or rendered', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      const response = await dispatchInAct({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { fontSize: 999, theme: 'neon' },
      });

      expect(response).toEqual({ success: true });

      const stored = local.store[STORAGE_KEYS.SETTINGS] as Record<string, unknown>;
      expect(stored.fontSize).toBe(32);
      expect(stored.theme).toBe(DEFAULT_SETTINGS.theme);

      // The reader is styled from the same clamped value, so the slider and
      // the rendered column can never disagree.
      const overlay = readerShadow().querySelector('.reader-overlay') as HTMLElement | null;
      expect(overlay?.style.getPropertyValue('--reader-font-size')).toBe('32px');
    });

    it('accepts a valid setting and applies it', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      await dispatchInAct({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { fontSize: 24, theme: 'sepia' },
      });

      const stored = local.store[STORAGE_KEYS.SETTINGS] as Record<string, unknown>;
      expect(stored.fontSize).toBe(24);
      expect(stored.theme).toBe('sepia');

      const overlay = readerShadow().querySelector('.reader-overlay') as HTMLElement | null;
      expect(overlay?.className).toContain('reader-theme-sepia');
    });

    it('succeeds without writing when an update carries no payload', async () => {
      await loadContentScript();
      local.set.mockClear();

      const response = await dispatch({ type: MESSAGE_TYPES.UPDATE_SETTINGS });

      expect(response).toEqual({ success: true });
      expect(local.set).not.toHaveBeenCalled();
    });
  });
});
