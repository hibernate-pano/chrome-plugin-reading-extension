/**
 * Behavioral tests for the export hand-off.
 *
 * Regression this protects: the export button used to call
 * `chrome.runtime.sendMessage` itself, with no payload. Chrome does not deliver
 * a content script's own message back to that same context, so it went straight
 * to the background, which rejected it as "Invalid payload" and opened no tab.
 * The button looked dead.
 *
 * Nothing here reads the source. The whole chain is driven the way a user
 * drives it — import the content script, turn reading mode on through the
 * message listener, click the real export button inside the shadow root — and
 * the assertions are on the message that actually reaches
 * `chrome.runtime.sendMessage` and on what the reader shows afterwards.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { MESSAGE_TYPES } from '../../src/shared/constants';
import type { Message, PrintPayload } from '../../src/shared/types';

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

const ARTICLE_HTML = `
  <nav><a href="/nav">noise</a></nav>
  <article>
    <h1>On Reading Well</h1>
    <p>${FILLER.repeat(4)}</p>
    <p>
      <img src="https://cdn.example.com/photo.jpg" alt="legit photo"
           onerror="window.__pwned = true" />
    </p>
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

function exportButton(): HTMLButtonElement {
  const button = readerShadow().querySelector<HTMLButtonElement>('.reader-export-btn');
  if (!button) {
    const found = Array.from(readerShadow().querySelectorAll('button'))
      .map((b) => b.className)
      .join(', ');
    throw new Error(`no export button in the reader toolbar; buttons found: ${found || 'none'}`);
  }
  return button;
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

function sentMessage(index = 0): { type: string; payload?: PrintPayload } {
  const call = chromeMock.runtime.sendMessage.mock.calls[index];
  if (!call) throw new Error(`chrome.runtime.sendMessage was never called (call #${index})`);
  return call[0] as { type: string; payload?: PrintPayload };
}

function clickExport(): Promise<void> {
  const button = exportButton();
  return act(async () => {
    button.click();
  });
}

function readerAlertText(): string {
  const alert = readerShadow().querySelector('[role="alert"]');
  return alert?.textContent ?? '';
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe('export hand-off', () => {
  beforeEach(() => {
    messageListener = undefined;
    local = createStorageArea();
    chromeMock = createChromeMock();
    vi.stubGlobal('chrome', chromeMock);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.getElementById(HOST_ID)?.remove();
    document.body.className = '';
    document.body.innerHTML = '';
  });

  it('sends nothing to the background just for opening the reader', async () => {
    await openReader();

    // The view is not the thing that talks to the background. If ReaderView
    // called sendMessage itself, mounting the reader would put a message on
    // the wire before the user touched anything.
    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('sends EXPORT_PDF with the article attached when the export button is used', async () => {
    await openReader();
    const before = Date.now();

    await clickExport();

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledTimes(1);
    const message = sentMessage();
    expect(message.type).toBe(MESSAGE_TYPES.EXPORT_PDF);

    const payload = message.payload;
    expect(payload, 'the payload must ride along with the message').toBeDefined();
    if (!payload) throw new Error('EXPORT_PDF went out with no payload');

    expect(payload.title).toBe('On Reading Well');
    expect(payload.sourceUrl).toBe(window.location.href);
    expect(typeof payload.exportedAt).toBe('number');
    expect(payload.exportedAt).toBeGreaterThanOrEqual(before);
    expect(payload.content).toContain('Lorem ipsum');
    expect(payload.content.length).toBeGreaterThan(100);
  });

  it('never sends a bare EXPORT_PDF that the background would reject as invalid', async () => {
    await openReader();

    await clickExport();

    const message = sentMessage();
    // The exact shape `handleExportPdf` guards against. A payload-less message
    // answers "Invalid payload" and opens no tab, which is what made the button
    // look dead.
    expect(message).not.toEqual({ type: MESSAGE_TYPES.EXPORT_PDF });
    expect(message.payload).toBeTruthy();
    if (!message.payload) throw new Error('EXPORT_PDF went out with no payload');
    expect(typeof message.payload.content).toBe('string');
    expect(message.payload.content.length).toBeGreaterThan(0);
  });

  it('exports the sanitized article, not the raw page html', async () => {
    await openReader();

    await clickExport();

    const message = sentMessage();
    const content = message.payload?.content ?? '';
    // The page carried an inline handler on its hero image. The reader renders
    // this string with dangerouslySetInnerHTML and the print page writes it to
    // disk, so it must already be clean on the way out.
    expect(content).toContain('https://cdn.example.com/photo.jpg');
    expect(content).not.toMatch(/\son[a-z]+\s*=/i);
  });

  it('shows nothing on screen when the background accepts the export', async () => {
    chromeMock.runtime.sendMessage.mockResolvedValue({ success: true });
    await openReader();

    await clickExport();

    expect(readerShadow().querySelector('[role="alert"]')).toBeNull();
    expect(exportButton().disabled).toBe(false);
  });

  it('surfaces a refusal from the background in the reader', async () => {
    chromeMock.runtime.sendMessage.mockResolvedValue({
      success: false,
      error: 'Failed to open the print page: No window available',
    });
    await openReader();

    await clickExport();

    // Silence here is the original bug: the button looked dead and nothing
    // explained why.
    expect(readerAlertText()).toBe('Failed to open the print page: No window available');
  });

  it('surfaces a transport failure instead of throwing out of the handler', async () => {
    chromeMock.runtime.sendMessage.mockRejectedValue(
      new Error('Extension context invalidated')
    );
    await openReader();

    await clickExport();

    expect(readerAlertText()).toBe('Extension context invalidated');
  });

  it('re-enables the export button after a failed attempt', async () => {
    chromeMock.runtime.sendMessage.mockResolvedValue({ success: false, error: 'nope' });
    await openReader();

    await clickExport();
    expect(exportButton().disabled).toBe(false);

    // A second attempt must be possible; a permanently disabled button is the
    // same dead-button symptom from a different cause.
    await clickExport();
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('does not send a second export while the first is still in flight', async () => {
    let settle: ((value: unknown) => void) | undefined;
    chromeMock.runtime.sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          settle = resolve;
        })
    );
    await openReader();

    await clickExport();
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledTimes(1);

    // Double-clicking an impatient export button must not open two tabs.
    await clickExport();
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      settle?.({ success: true });
    });
    expect(exportButton().disabled).toBe(false);
  });
});
