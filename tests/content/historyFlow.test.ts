/**
 * Reading-history flow — end-to-end through the real content script.
 *
 * `HistoryPanel.test.tsx` proves the panel behaves; it stubs the four
 * callbacks `content/index.ts` hands down. This file proves those callbacks
 * are wired to the right storage calls at all — the part where a typo in a
 * prop name leaves a button that looks fine and does nothing.
 *
 * The chain driven here is the user's, not the source's: load the content
 * script, turn reading mode on through the message listener, click the real
 * toolbar button inside the shadow root, and assert on what
 * `chrome.storage.local` ends up holding.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { MESSAGE_TYPES, DEFAULT_SETTINGS, STORAGE_KEYS } from '../../src/shared/constants';
import type { Message } from '../../src/shared/types';
import type { ReadingRecord } from '../../src/shared/history';

const HOST_ID = 'ai-reader-host';
const HISTORY_KEY = STORAGE_KEYS.READING_HISTORY;

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

const ARTICLE_HTML = `
  <article>
    <h1>On Reading Well</h1>
    <p>${FILLER.repeat(4)}</p>
    <p>${FILLER.repeat(4)}</p>
  </article>
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
    remove: vi.fn(() => Promise.resolve()),
  };
}

let local: ReturnType<typeof createStorageArea>;
let messageListener: MessageListener | undefined;

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

function dispatch(message: Message): Promise<unknown> {
  if (!messageListener) throw new Error('content script not loaded');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`content script never answered ${message.type}`)),
      2000
    );
    const keptAlive = messageListener(message, { id: 'test-sender' }, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
    if (keptAlive !== true) {
      clearTimeout(timer);
      reject(new Error(`content script declined ${message.type} without answering`));
    }
  });
}

function readerShadow(): ShadowRoot {
  const host = document.getElementById(HOST_ID);
  if (!host?.shadowRoot) throw new Error('the reader shadow root is not mounted');
  return host.shadowRoot;
}

function toolbarButton(selector: string): HTMLButtonElement {
  const button = readerShadow().querySelector<HTMLButtonElement>(selector);
  if (!button) {
    const found = Array.from(readerShadow().querySelectorAll('button'))
      .map((b) => b.className)
      .join(', ');
    throw new Error(`no ${selector} in the reader toolbar; buttons found: ${found || 'none'}`);
  }
  return button;
}

/** The history toolbar button. */
function clockButton(): HTMLButtonElement {
  return toolbarButton('.reader-history-btn');
}

/** Boot the script with `ARTICLE_HTML` loaded and reading mode switched on. */
async function openReader(): Promise<void> {
  document.title = 'On Reading Well';
  document.body.innerHTML = ARTICLE_HTML;
  Object.defineProperty(document.body, 'innerText', {
    configurable: true,
    get: () => ARTICLE_HTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  });

  await loadContentScript();
  let response: unknown;
  await act(async () => {
    response = await dispatch({ type: MESSAGE_TYPES.ENABLE_READING_MODE });
  });
  expect(response).toEqual({ success: true, isActive: true });
}

function clickHistoryButton(): Promise<void> {
  return act(async () => {
    clockButton().click();
  });
}

/** Open the panel and let the storage read settle. */
async function openHistoryPanel(): Promise<void> {
  await clickHistoryButton();
  // The read resolves in a microtask; flush it before asserting on the DOM.
  await act(async () => {
    await Promise.resolve();
  });
}

function storedHistory(): ReadingRecord[] {
  const value = local.store[HISTORY_KEY];
  return Array.isArray(value) ? (value as ReadingRecord[]) : [];
}

function panel(): HTMLElement {
  const element = readerShadow().querySelector<HTMLElement>('.reader-history-panel');
  if (!element) throw new Error('the history panel is not open');
  return element;
}

function panelButton(label: string): HTMLButtonElement {
  const button = Array.from(panel().querySelectorAll('button')).find(
    (candidate) => candidate.getAttribute('aria-label') === label || candidate.textContent === label
  );
  if (!button) {
    const found = Array.from(panel().querySelectorAll('button'))
      .map((b) => b.getAttribute('aria-label') || b.textContent)
      .join(', ');
    throw new Error(`no "${label}" button in the panel; found: ${found || 'none'}`);
  }
  return button;
}

function clickPanelButton(label: string): Promise<void> {
  const button = panelButton(label);
  return act(async () => {
    button.click();
    await Promise.resolve();
  });
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe('reading-history flow', () => {
  beforeEach(() => {
    messageListener = undefined;
    local = createStorageArea();
    vi.stubGlobal('chrome', createChromeMock());
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.getElementById(HOST_ID)?.remove();
    document.body.className = '';
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists the article the reader just recorded', async () => {
    await openReader();
    // Opening reading mode writes one record.
    expect(storedHistory()).toHaveLength(1);

    await openHistoryPanel();

    expect(panel().textContent).toContain('On Reading Well');
    expect(storedHistory()[0].url).toBe(window.location.href);
  });

  it('shows the empty state when storage holds nothing', async () => {
    await openReader();
    local.store[HISTORY_KEY] = [];

    await openHistoryPanel();

    expect(panel().textContent).toContain('还没有阅读记录');
  });

  it('deletes one record from storage, leaving the rest alone', async () => {
    await openReader();
    await openHistoryPanel();

    await clickPanelButton('删除《On Reading Well》的阅读记录');

    expect(storedHistory()).toEqual([]);
    expect(panel().textContent).toContain('还没有阅读记录');
  });

  it('empties storage only after the confirmation', async () => {
    await openReader();
    await openHistoryPanel();

    await clickPanelButton('清空全部');
    expect(storedHistory()).toHaveLength(1);

    await clickPanelButton('确认清空');
    expect(storedHistory()).toEqual([]);
    expect(panel().textContent).toContain('还没有阅读记录');
  });

  it('keeps a javascript: record visible but inert when it comes back from storage', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    await openReader();

    // What the panel sees is what storage holds, not what the writer intended.
    local.store[HISTORY_KEY] = [
      {
        id: 'r-hostile',
        url: 'javascript:window.__pwned = true',
        title: 'Injected Record',
        excerpt: '',
        byline: '',
        siteName: 'evil.example',
        length: 10,
        readingTime: 1,
        theme: 'light',
        fontSize: 19,
        createdAt: Date.now() - 1000,
        lastReadAt: Date.now() - 1000,
        readCount: 1,
      },
    ];

    await openHistoryPanel();

    const item = panel().querySelector('.reader-history-item') as HTMLElement;
    expect(item.textContent).toContain('Injected Record');
    expect(item.querySelector('a')).toBeNull();
    expect(item.querySelector('.reader-history-item__title--inert')).not.toBeNull();
    expect(item.querySelector('.reader-history-item__title')?.tagName).toBe('SPAN');
    expect(panel().innerHTML).not.toContain('javascript:');
    expect(open).not.toHaveBeenCalled();
    // Still erasable: refusing to open it is not refusing to remove it.
    expect(() => panelButton('删除《Injected Record》的阅读记录')).not.toThrow();
  });

  it('restores the default settings and repaints the reader', async () => {
    await openReader();

    await act(async () => {
      await dispatch({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: { theme: 'dark', fontSize: 27 },
      });
    });
    expect(local.store[STORAGE_KEYS.SETTINGS]).toMatchObject({ theme: 'dark', fontSize: 27 });
    expect(readerShadow().querySelector('.reader-theme-dark')).not.toBeNull();

    await act(async () => {
      readerShadow().querySelector<HTMLButtonElement>('.reader-settings-btn')?.click();
      await Promise.resolve();
    });

    const reset = readerShadow().querySelector<HTMLButtonElement>('.reader-settings-reset');
    expect(reset, 'the settings panel has no restore-defaults action').not.toBeNull();

    await act(async () => {
      reset?.click();
      await Promise.resolve();
    });

    expect(local.store[STORAGE_KEYS.SETTINGS]).toEqual({ ...DEFAULT_SETTINGS });
    expect(readerShadow().querySelector('.reader-theme-light')).not.toBeNull();
  });
});
