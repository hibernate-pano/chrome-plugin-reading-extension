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

/** Click a control inside the reader's shadow root and let React settle. */
async function clickInReader(selector: string): Promise<void> {
  const control = readerShadow().querySelector<HTMLElement>(selector);
  if (!control) throw new Error(`the reader has no "${selector}" control`);
  await act(async () => {
    control.click();
  });
}

/** Open the reading-history panel and wait for its storage read to land. */
async function openHistoryPanel(): Promise<void> {
  await clickInReader('[aria-label="Open reading history"]');
  await vi.waitFor(() => {
    expect(readerShadow().querySelector('.reader-history-panel')).not.toBeNull();
  });
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

    it('mounts exactly one reader when two enable messages overlap', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();

      // Both messages are sent from one synchronous burst, so both are inside
      // `enableReadingMode` at the same time — past the `state.isActive` guard,
      // which is only set once the reader is mounted. Two readers mounting would
      // mean the second removes the host the first root is bound to, leaving an
      // overlay that is on screen, blank, and reported active twice.
      let responses: unknown[];
      await act(async () => {
        responses = await Promise.all([
          dispatch({ type: MESSAGE_TYPES.ENABLE_READING_MODE }),
          dispatch({ type: MESSAGE_TYPES.ENABLE_READING_MODE }),
        ]);
      });

      expect(responses).toEqual([
        { success: true, isActive: true },
        { success: true, isActive: true },
      ]);
      expect(document.querySelectorAll(`#${HOST_ID}`)).toHaveLength(1);
      // The symptom that mattered: a live root bound to a detached mount node
      // renders nothing at all, and no other assertion here would notice.
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

    // Regression: memory was moved to the new value and the write swallowed, so
    // the DOM showed 30px while storage kept 19 — and the caller was told it
    // worked. The next unrelated change then repainted to the "failed" value,
    // and it silently reverted on the next page load.
    it('rolls the reader back and reports the failure when storage refuses a setting', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      local.set.mockRejectedValueOnce(new Error('quota exceeded'));

      const response = await dispatchInAct({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { fontSize: 30 },
      });

      expect(response).toEqual({ success: false, error: 'quota exceeded' });

      // Memory rolled back, so the reader goes back to what storage holds —
      // otherwise the next repaint would restore the value that was lost.
      const overlay = readerShadow().querySelector('.reader-overlay') as HTMLElement;
      expect(overlay.style.getPropertyValue('--reader-font-size')).toBe('19px');

      // And the user is told, rather than left to notice a setting that moved back.
      expect(document.querySelector('[role="alert"]')).not.toBeNull();
    });

    it('still applies and persists a setting when the write succeeds', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      const response = await dispatchInAct({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { fontSize: 30 },
      });

      expect(response).toEqual({ success: true });
      const overlay = readerShadow().querySelector('.reader-overlay') as HTMLElement;
      expect(overlay.style.getPropertyValue('--reader-font-size')).toBe('30px');
      expect((local.store[STORAGE_KEYS.SETTINGS] as Record<string, unknown>).fontSize).toBe(30);
    });

    it('keeps later settings working after one was refused', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      local.set.mockRejectedValueOnce(new Error('quota exceeded'));
      await dispatchInAct({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { fontSize: 30 },
      });

      // A rejected write must not poison the ones behind it.
      const response = await dispatchInAct({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { fontSize: 24 },
      });

      expect(response).toEqual({ success: true });
      const overlay = readerShadow().querySelector('.reader-overlay') as HTMLElement;
      expect(overlay.style.getPropertyValue('--reader-font-size')).toBe('24px');
      expect((local.store[STORAGE_KEYS.SETTINGS] as Record<string, unknown>).fontSize).toBe(24);
    });

    it('does not let a failed write roll back a concurrent one that succeeded', async () => {
      // Sliders fire a change per step, so these genuinely overlap in the
      // product. The first call's write is refused; while it is still in flight
      // the second one lands and persists. Rolling back to the snapshot taken
      // on entry would then undo the *successful* change too, leaving memory,
      // DOM and storage disagreeing — the exact failure the rollback exists to
      // prevent. The serial test above cannot reach this ordering.
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      let releaseFirstWrite!: () => void;
      const firstWriteBlocked = new Promise<void>((resolve) => {
        releaseFirstWrite = resolve;
      });

      // Keyed on call order, not payload: the second call's settings are merged
      // over the first's, so it also carries fontSize 30 and a value-based
      // predicate would refuse both.
      const realSet = local.set.getMockImplementation()!;
      let writes = 0;
      local.set.mockImplementation(async (items: Record<string, unknown>) => {
        writes += 1;
        if (writes === 1) {
          await firstWriteBlocked;
          throw new Error('quota exceeded');
        }
        return realSet(items);
      });

      try {
        const first = dispatchInAct({
          type: MESSAGE_TYPES.UPDATE_SETTINGS,
          payload: { fontSize: 30 },
        });
        const second = dispatchInAct({
          type: MESSAGE_TYPES.UPDATE_SETTINGS,
          payload: { lineHeight: 2 },
        });
        releaseFirstWrite();
        await Promise.all([first, second]);

        const overlay = readerShadow().querySelector('.reader-overlay') as HTMLElement;
        // Settings are merged and written whole, so the accepted write also
        // persists the font size the refused one had staged — that is correct,
        // not a leak. The invariant under test is narrower: the late failure
        // must not drag the accepted change back out with it.
        expect(overlay.style.getPropertyValue('--reader-line-height')).toBe('2');
        expect((local.store[STORAGE_KEYS.SETTINGS] as Record<string, unknown>).lineHeight).toBe(2);
      } finally {
        local.set.mockImplementation(realSet);
      }
    });

    it('reports a settings write that rejects with something that is not an Error', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      // Chrome rejections are not guaranteed to be Error instances. A reporter
      // that assumes they are throws inside its own catch and answers nothing,
      // leaving the toolbar waiting on a response that never comes.
      local.set.mockRejectedValueOnce('quota exceeded');

      const response = await dispatchInAct({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { fontSize: 30 },
      });

      expect(response).toEqual({ success: false, error: 'quota exceeded' });
      const overlay = readerShadow().querySelector('.reader-overlay') as HTMLElement;
      expect(overlay.style.getPropertyValue('--reader-font-size')).toBe('19px');
    });
  });

  /* ---------------------------------------------------------------- */
  /* Idempotence: messages that arrive when there is nothing to do    */
  /* ---------------------------------------------------------------- */

  describe('redundant reading-mode messages', () => {
    it('does not remount the reader when reading mode is already on', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
      const host = readerHost();

      // The second ENABLE must be a no-op, not a second mount over the first.
      // Remounting drops the host the live React root is bound to, and the
      // reader would go blank while still reporting itself active.
      const response = await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      expect(response).toEqual({ success: true, isActive: true });
      expect(readerHost()).toBe(host);
      expect(document.querySelectorAll(`#${HOST_ID}`)).toHaveLength(1);
      expect(readerShadow().querySelector('.reader-title')?.textContent).toBe('On Reading Well');
    });

    it('reports a disable that arrives before any enable instead of throwing', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();

      const response = await dispatchInAct({ type: MESSAGE_TYPES.DISABLE_READING_MODE });

      expect(response).toEqual({ success: true, isActive: false });
      expect(readerHost()).toBeNull();
    });

    it('still shuts down cleanly when the page has already removed the reader host', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      // The shadow host is attached with `mode: 'open'`, so a page script can
      // reach in and take it away. Disabling has to survive that: it is the
      // only thing that releases the module-level root and the active flag.
      readerHost()?.remove();

      const response = await dispatchInAct({ type: MESSAGE_TYPES.DISABLE_READING_MODE });

      expect(response).toEqual({ success: true, isActive: false });
      expect(await dispatch({ type: MESSAGE_TYPES.GET_STATE })).toEqual({
        isActive: false,
        canExtract: true,
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* A page that fights the reader                                    */
  /* ---------------------------------------------------------------- */

  describe('hostile or stale host pages', () => {
    it('replaces a stale reader host left in the page by an earlier run', async () => {
      setPage(ARTICLE_HTML);
      const stale = document.createElement('div');
      stale.id = HOST_ID;
      stale.textContent = 'left over from a previous visit';
      document.body.appendChild(stale);
      await loadContentScript();

      const response = await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      expect(response).toEqual({ success: true, isActive: true });
      // The stale node has to go, or its shadow-less body would swallow the
      // mount and the reader would report itself open over nothing.
      expect(document.querySelectorAll(`#${HOST_ID}`)).toHaveLength(1);
      expect(readerHost()).not.toBe(stale);
      expect(readerShadow().querySelector('.reader-title')?.textContent).toBe('On Reading Well');
    });

    it('keeps serving settings when the page has removed the reader mount', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

      // Same open shadow root: a page script can delete the mount node. A
      // repaint that re-renders into a missing node would throw and take the
      // whole settings message down with it.
      readerShadow().querySelector('[data-reader-mount]')?.remove();

      const response = await dispatchInAct({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { fontSize: 28 },
      });

      expect(response).toEqual({ success: true });
      expect((local.store[STORAGE_KEYS.SETTINGS] as Record<string, unknown>).fontSize).toBe(28);
    });

    // Regression: a disable that cannot unmount leaves the module-level root
    // live while reporting the reader as off. The next enable then finds that
    // stale root *and* the old host. If the host is removed without unmounting
    // first, the root keeps rendering into a detached node and the reader is on
    // screen, blank, and reported active.
    it('replaces a stale host that still has a live root bound to it', async () => {
      setPage(ARTICLE_HTML);

      let unmountShouldThrow = false;
      vi.doMock('react-dom/client', async () => {
        const actual =
          await vi.importActual<typeof import('react-dom/client')>('react-dom/client');
        return {
          ...actual,
          createRoot: (container: Element) => {
            const root = actual.createRoot(container);
            return {
              render: (node: unknown) => root.render(node as never),
              unmount: () => {
                if (unmountShouldThrow) throw new Error('unmount failed');
                root.unmount();
              },
            };
          },
        };
      });

      try {
        await loadContentScript();
        await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
        expect(readerShadow().querySelector('.reader-title')).not.toBeNull();

        unmountShouldThrow = true;
        expect(await dispatchInAct({ type: MESSAGE_TYPES.DISABLE_READING_MODE })).toEqual({
          success: true,
          isActive: false,
        });

        unmountShouldThrow = false;
        const response = await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });

        expect(response).toEqual({ success: true, isActive: true });
        // The symptom that mattered: a live root on a detached mount renders
        // nothing, and no other assertion here would notice.
        expect(readerShadow().querySelector('.reader-title')?.textContent).toBe('On Reading Well');
      } finally {
        vi.doUnmock('react-dom/client');
        vi.resetModules();
      }
    });
  });

  /* ---------------------------------------------------------------- */
  /* canExtractContent on pages jsdom does not model                  */
  /* ---------------------------------------------------------------- */

  describe('text measurement guards', () => {
    it('refuses to extract from a document that has no body at all', async () => {
      await loadContentScript();
      const body = Object.getOwnPropertyDescriptor(Document.prototype, 'body');
      Object.defineProperty(document, 'body', { value: null, configurable: true });
      try {
        expect(await dispatch({ type: MESSAGE_TYPES.GET_STATE })).toEqual({
          isActive: false,
          canExtract: false,
        });
      } finally {
        delete (document as unknown as Record<string, unknown>).body;
        if (body) Object.defineProperty(Document.prototype, 'body', body);
      }
    });

    it('reports no text when the body exposes none to measure', async () => {
      await loadContentScript();
      // `innerText` is a rendering-only property. A page that has replaced the
      // body, or an environment without layout, leaves it undefined — which
      // must read as "no text" rather than crashing the state query.
      Object.defineProperty(document.body, 'innerText', {
        configurable: true,
        get: () => undefined,
      });

      expect(await dispatch({ type: MESSAGE_TYPES.GET_STATE })).toEqual({
        isActive: false,
        canExtract: false,
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* PDF hand-off                                                      */
  /* ---------------------------------------------------------------- */

  describe('PDF export', () => {
    it('reports a hand-off that answered nothing', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
      chromeMock.runtime.sendMessage.mockResolvedValueOnce(undefined);

      await clickInReader('[aria-label="导出 PDF"]');

      // A resolved `undefined` is not a successful export. Answering `success`
      // would put a toast in front of the user for a print page that was never
      // opened.
      await vi.waitFor(() => {
        expect(readerShadow().textContent).toContain('No response');
      });
    });

    it('reports a hand-off that rejects with something that is not an Error', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
      chromeMock.runtime.sendMessage.mockRejectedValueOnce('the worker is asleep');

      await clickInReader('[aria-label="导出 PDF"]');

      await vi.waitFor(() => {
        expect(readerShadow().textContent).toContain('the worker is asleep');
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* History panel failures                                           */
  /* ---------------------------------------------------------------- */

  describe('history panel failures', () => {
    it('keeps a record on screen when the delete write fails', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
      await vi.waitFor(() => {
        expect(
          local.set.mock.calls.some((call) => STORAGE_KEYS.READING_HISTORY in call[0])
        ).toBe(true);
      });
      await openHistoryPanel();

      local.set.mockRejectedValueOnce(new Error('storage write failed'));
      const del = readerShadow().querySelector<HTMLButtonElement>(
        '[aria-label^="删除《"]'
      ) as HTMLButtonElement;
      expect(del, 'the record should offer a delete button').not.toBeNull();
      await act(async () => {
        del.click();
      });

      // The delete is re-read from storage, never patched, so a refused write
      // must leave the record visible. Dropping it here would show the user an
      // entry they just removed and hide on reload.
      await vi.waitFor(() => {
        expect(readerShadow().textContent).toContain('删除失败，请重试');
      });
      expect(readerShadow().querySelectorAll('.reader-history-list li')).toHaveLength(1);
    });

    it('keeps every record on screen when the clear write fails', async () => {
      setPage(ARTICLE_HTML);
      await loadContentScript();
      await dispatchInAct({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
      await vi.waitFor(() => {
        expect(
          local.set.mock.calls.some((call) => STORAGE_KEYS.READING_HISTORY in call[0])
        ).toBe(true);
      });
      await openHistoryPanel();

      local.set.mockRejectedValueOnce(new Error('storage write failed'));
      // Erasing every record is destructive, so the panel asks first; the
      // confirmation is where the actual write happens.
      await clickInReader('.reader-history-clear');
      const confirm = readerShadow().querySelector<HTMLButtonElement>(
        '.reader-history-clear--danger'
      ) as HTMLButtonElement;
      expect(confirm, 'clearing should ask for confirmation first').not.toBeNull();
      await act(async () => {
        confirm.click();
      });

      await vi.waitFor(() => {
        expect(readerShadow().textContent).toContain('清空失败，请重试');
      });
      expect(readerShadow().querySelectorAll('.reader-history-list li')).toHaveLength(1);
    });
  });
});
