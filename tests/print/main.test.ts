/**
 * Print page boot — `src/print/main.ts`.
 *
 * This module runs `void main()` at import time, grabs every element at
 * module scope, and owns the whole contract between the background script
 * and the user: validate the handoff token, take the one-shot payload out of
 * session storage, mount the article, hold the print button until images
 * settle, and wire the toolbar.
 *
 * It is tested the way the page actually runs. The DOM comes from the real
 * `print.html` (not a hand-written copy, so a renamed id breaks here rather
 * than in production), the module is imported fresh per test, and the drive
 * is real clicks on the real buttons. `markBreaks` and `prepareImages` are
 * mocked only to make "how many times did it re-measure?" and "what did
 * waitForImages report?" directly observable; both are covered for real in
 * their own test files.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PRINT_FONT_SIZES, STORAGE_KEYS } from '../../src/shared/constants';
import { buildFilename } from '../../src/print/buildDocument';
import type { PrintPayload, PrintSettings } from '../../src/shared/types';

/* ------------------------------------------------------------------ */
/* Module mocks                                                       */
/* ------------------------------------------------------------------ */

/**
 * `vi.hoisted` keeps these instances stable across `vi.resetModules()`, so the
 * references below are the same functions the freshly-imported page calls —
 * not a previous copy the factory produced and then discarded.
 */
const mocks = vi.hoisted(() => ({
  clearBreakMarks: vi.fn((_root: HTMLElement) => {}),
  markOversizedBlocks: vi.fn((_root: HTMLElement) => 0),
  eagerizeImages: vi.fn((_root: HTMLElement) => 0),
  waitForImages: vi.fn(
    (_root: HTMLElement, _timeoutMs?: number) =>
      Promise.resolve({ loaded: 0, failed: 0 })
  ),
}));

vi.mock('../../src/print/markBreaks', () => ({
  shouldAllowBreak: vi.fn(() => false),
  clearBreakMarks: mocks.clearBreakMarks,
  markOversizedBlocks: mocks.markOversizedBlocks,
}));

vi.mock('../../src/print/prepareImages', () => ({
  resolveLazySrc: vi.fn(() => false),
  eagerizeImages: mocks.eagerizeImages,
  waitForImages: mocks.waitForImages,
}));

/* ------------------------------------------------------------------ */
/* Chrome mock                                                        */
/* ------------------------------------------------------------------ */

function createStorageArea(seed: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...seed };
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
      for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
      return Promise.resolve();
    }),
  };
}

type StorageArea = ReturnType<typeof createStorageArea>;

let local: StorageArea;
let session: StorageArea;
let chromeMock: { storage: { local: StorageArea; session: StorageArea } };

/* ------------------------------------------------------------------ */
/* Page DOM                                                           */
/* ------------------------------------------------------------------ */

/** The real print page, minus the module script that imports this file. */
const PAGE_HTML = readFileSync(resolve(__dirname, '../../print.html'), 'utf8').replace(
  /<script[\s\S]*?<\/script>/g,
  ''
);

const REQUIRED_IDS = [
  'sheet',
  'doc-title',
  'status',
  'print-btn',
  'font-value',
  'font-down',
  'font-up',
] as const;

/**
 * Build the page exactly as print.html ships it.
 *
 * `extraButtons` lands outside `.toolbar` on purpose: it is the vehicle for
 * defensive branches (a theme the page does not offer) without disturbing the
 * markup under test.
 */
function mountPage(extraButtons = ''): void {
  document.documentElement.innerHTML = PAGE_HTML;
  for (const id of REQUIRED_IDS) {
    if (!document.getElementById(id)) {
      throw new Error(`print.html no longer provides #${id}; this test needs updating`);
    }
  }
  if (extraButtons) document.body.insertAdjacentHTML('beforeend', extraButtons);
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                           */
/* ------------------------------------------------------------------ */

/** What the background mints: `crypto.randomUUID()` with the dashes dropped. */
const TOKEN = 'f3a9c1d24b8e47059a6b3d8e1f27c405';

function payload(overrides: Partial<PrintPayload> = {}): PrintPayload {
  return {
    title: '论阅读的姿势',
    byline: '作者甲',
    siteName: '示例站点',
    content: '<p>正文第一段。</p><p><img src="https://cdn.example.com/photo.jpg" alt="图" /></p>',
    sourceUrl: 'https://example.com/posts/reading',
    exportedAt: Date.UTC(2026, 8, 29),
    ...overrides,
  };
}

interface BootOptions {
  /** Fragment token, without the leading '#'. Omit for a bare page. */
  token?: string;
  /** Payload to place under the token. Omit for an empty session. */
  payload?: PrintPayload | null;
  /** What `getPrintSettings` should find in `chrome.storage.local`. */
  storedSettings?: Partial<PrintSettings>;
  /** What `waitForImages` should report back. */
  images?: { loaded: number; failed: number };
  extraButtons?: string;
}

/* ------------------------------------------------------------------ */
/* Boot harness                                                       */
/* ------------------------------------------------------------------ */

function bootPromise(): Promise<void> {
  return import('../../src/print/main').then(() => undefined);
}

/**
 * `main()` is fired and forgotten at module scope, so the import resolving
 * does not mean the page is ready. Poll for the two terminal states instead
 * of guessing at a number of microtask ticks.
 */
async function waitForBoot(): Promise<void> {
  const deadline = Date.now() + 2000;
  while (placeholder() === null && printButton().disabled) {
    if (Date.now() > deadline) throw new Error('the print page never finished booting');
    await new Promise((resolve_) => setTimeout(resolve_, 0));
  }
}

async function boot(options: BootOptions = {}): Promise<void> {
  vi.resetModules();

  const token = options.token === undefined ? TOKEN : options.token;
  if (options.payload) {
    session.store[`${STORAGE_KEYS.PRINT_PAYLOAD}${token}`] = options.payload;
  }
  if (options.storedSettings) {
    local.store[STORAGE_KEYS.PRINT_SETTINGS] = options.storedSettings;
  }
  if (options.images) {
    mocks.waitForImages.mockResolvedValue(options.images);
  }

  mountPage(options.extraButtons);
  window.location.hash = token ? `#${token}` : '';

  await bootPromise();
  await waitForBoot();
}

/** Drain the fire-and-forget promise chains the toolbar starts. */
async function flush(): Promise<void> {
  await new Promise((resolve_) => setTimeout(resolve_, 0));
}

/**
 * Same job, without a timer — `savePrintSettings` is a plain promise chain, so
 * microtask turns are enough, and this is the only version usable once fake
 * timers have replaced `setTimeout`.
 */
async function flushMicrotasks(): Promise<void> {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
}

/* ------------------------------------------------------------------ */
/* Element accessors                                                  */
/* ------------------------------------------------------------------ */

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} is not on the page`);
  return el as T;
}

const printButton = (): HTMLButtonElement => byId<HTMLButtonElement>('print-btn');
const statusEl = (): HTMLElement => byId('status');
const fontValue = (): HTMLElement => byId('font-value');
const fontDown = (): HTMLButtonElement => byId<HTMLButtonElement>('font-down');
const fontUp = (): HTMLButtonElement => byId<HTMLButtonElement>('font-up');
const sheet = (): HTMLElement => byId('sheet');
const placeholder = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.placeholder');

function themeButton(theme: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(`[data-theme="${theme}"]`);
  if (!button) throw new Error(`no [data-theme="${theme}"] button on the page`);
  return button;
}

function imgSizeButton(size: string): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`[data-imgsize="${size}"]`);
}

function pressedIn(selector: string): string[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(selector))
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.getAttribute(button.hasAttribute('data-imgsize') ? 'data-imgsize' : 'data-theme') ?? '');
}

function isStatusHidden(): boolean {
  return statusEl().classList.contains('status--hidden');
}

/** The last thing `savePrintSettings` wrote. */
function persisted(): PrintSettings | undefined {
  const calls = local.set.mock.calls;
  const last = calls[calls.length - 1];
  return last?.[0][STORAGE_KEYS.PRINT_SETTINGS] as PrintSettings | undefined;
}

function remarkCount(): number {
  return mocks.markOversizedBlocks.mock.calls.length;
}

let printSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  local = createStorageArea();
  session = createStorageArea();
  chromeMock = { storage: { local, session } };
  vi.stubGlobal('chrome', chromeMock);

  mocks.clearBreakMarks.mockClear();
  mocks.markOversizedBlocks.mockClear();
  mocks.eagerizeImages.mockClear();
  mocks.waitForImages.mockReset();
  mocks.waitForImages.mockResolvedValue({ loaded: 0, failed: 0 });

  document.title = '导出 PDF · Folio';
  window.location.hash = '';
  printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
  // The page logs to console.error on the paths it survives; keep the run quiet
  // and let the tests assert on the message instead.
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  printSpy.mockRestore();
  errorSpy.mockRestore();
  vi.useRealTimers();
  document.body.innerHTML = '';
  window.location.hash = '';
});

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe('print page · handoff token', () => {
  it('shows the placeholder when the URL carries no fragment at all', async () => {
    await boot({ token: '' });

    expect(placeholder()?.querySelector('h1')?.textContent).toBe('没有可打印的内容');
    // Nothing to look up, so nothing to look up. Reaching for session storage
    // with an empty key would be a wild read on someone's export data.
    expect(chromeMock.storage.session.get).not.toHaveBeenCalled();
  });

  it('rejects a fragment that is not lowercase hex', async () => {
    await boot({ token: 'z'.repeat(32) });

    expect(placeholder()).not.toBeNull();
    expect(chromeMock.storage.session.get).not.toHaveBeenCalled();
  });

  it('rejects an uppercase hex fragment', async () => {
    await boot({ token: TOKEN.toUpperCase() });

    expect(placeholder()).not.toBeNull();
    expect(chromeMock.storage.session.get).not.toHaveBeenCalled();
  });

  it('rejects a fragment of the wrong length', async () => {
    await boot({ token: 'a'.repeat(31) });
    expect(placeholder()).not.toBeNull();
    expect(chromeMock.storage.session.get).not.toHaveBeenCalled();

    session.get.mockClear();
    await boot({ token: 'a'.repeat(33) });
    expect(placeholder()).not.toBeNull();
    expect(chromeMock.storage.session.get).not.toHaveBeenCalled();
  });

  it('accepts the 32-character lowercase hex the background actually mints', async () => {
    await boot({ payload: payload() });

    expect(placeholder()).toBeNull();
    expect(chromeMock.storage.session.get).toHaveBeenCalledWith(
      `${STORAGE_KEYS.PRINT_PAYLOAD}${TOKEN}`
    );
  });
});

describe('print page · one-shot payload', () => {
  it('deletes the payload after reading it, so a refresh resurrects nothing', async () => {
    const key = `${STORAGE_KEYS.PRINT_PAYLOAD}${TOKEN}`;
    await boot({ payload: payload() });

    expect(session.get).toHaveBeenCalledWith(key);
    expect(session.remove).toHaveBeenCalledWith(key);
    expect(session.store[key]).toBeUndefined();
  });

  it('shows the placeholder when the session holds nothing under the token', async () => {
    await boot({ payload: null });

    expect(placeholder()?.querySelector('p')?.textContent).toContain('导出 PDF');
    // There was nothing to consume, so nothing was consumed.
    expect(session.remove).not.toHaveBeenCalled();
  });

  it('removes the toolbar so the page cannot print an empty sheet', async () => {
    await boot({ payload: null });

    expect(document.querySelector('.toolbar')).toBeNull();
  });

  it('shows the placeholder instead of throwing when session storage is unreachable', async () => {
    session.get.mockRejectedValueOnce(new Error('Extension context invalidated'));

    await boot({ payload: payload() });

    expect(placeholder()).not.toBeNull();
    // The toolbar goes with it, so there is no button left to press on a page
    // that never received an article.
    expect(document.querySelector('.toolbar')).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      '[Print] Failed to read payload:',
      expect.any(Error)
    );
  });
});

describe('print page · boot', () => {
  it('mounts the article and titles the page with the derived filename', async () => {
    const article = payload();
    await boot({ payload: article });

    expect(sheet().querySelector('.p-doc')).not.toBeNull();
    expect(sheet().textContent).toContain('正文第一段。');
    expect(byId('doc-title').textContent).toBe(article.title);
    // Chrome proposes document.title as the saved filename.
    expect(document.title).toBe(buildFilename(article));
    expect(document.title.endsWith('.pdf')).toBe(true);
  });

  it('eagerizes the very document it mounts, not a copy', async () => {
    await boot({ payload: payload() });

    const eagerized = mocks.eagerizeImages.mock.calls[0]?.[0] as HTMLElement | undefined;
    expect(eagerized).toBeDefined();
    expect(sheet().firstElementChild).toBe(eagerized);
  });

  it('holds the print button until images settle, then enables and focuses it', async () => {
    // Drive the boot by hand so the window while images are in flight is
    // observable — that window is the whole point of the gate.
    let release!: (result: { loaded: number; failed: number }) => void;
    mocks.waitForImages.mockReturnValue(
      new Promise<{ loaded: number; failed: number }>((resolve_) => {
        release = resolve_;
      })
    );

    vi.resetModules();
    mountPage();
    expect(printButton().disabled, 'print.html must ship the button disabled').toBe(true);

    session.store[`${STORAGE_KEYS.PRINT_PAYLOAD}${TOKEN}`] = payload();
    window.location.hash = `#${TOKEN}`;

    await bootPromise();
    await flush();

    expect(mocks.waitForImages).toHaveBeenCalledWith(sheet(), 5000);
    expect(statusEl().textContent).toBe('正在加载图片…');
    expect(printButton().disabled, 'printing mid-load yields blanks').toBe(true);

    release({ loaded: 2, failed: 0 });
    await waitForBoot();

    expect(printButton().disabled).toBe(false);
    expect(document.activeElement).toBe(printButton());
  });

  it('re-measures oversized blocks once images have changed the layout', async () => {
    await boot({ payload: payload() });

    expect(remarkCount()).toBe(1);
  });
});

describe('print page · image status', () => {
  it('names the images that failed so blanks are not a surprise on paper', async () => {
    await boot({ payload: payload(), images: { loaded: 4, failed: 2 } });

    expect(isStatusHidden()).toBe(false);
    expect(statusEl().textContent).toContain('4 张图片已加载');
    expect(statusEl().textContent).toContain('2 张未能加载');
  });

  it('clears the loading status when every image arrived', async () => {
    await boot({ payload: payload(), images: { loaded: 3, failed: 0 } });

    expect(isStatusHidden()).toBe(true);
    expect(statusEl().textContent).toBe('');
  });

  it('still lets the user print after reporting failures', async () => {
    await boot({ payload: payload(), images: { loaded: 0, failed: 5 } });

    expect(printButton().disabled).toBe(false);
  });

  /**
   * Regression. `waitForImages` gives the toolbar a way to tell "the page has
   * no images" apart from "every image is still loading": a run that hits the
   * ceiling reports the unanswered ones as `pending`. `main()` must surface
   * that as a warning — reading it as "all good" hid the status and printed
   * blanks without a word of warning.
   */
  it('warns when images are still pending at the ceiling', async () => {
    await boot({ payload: payload(), images: { loaded: 0, failed: 0, pending: 1 } });

    expect(sheet().querySelectorAll('img').length).toBeGreaterThan(0);
    expect(isStatusHidden()).toBe(false);
    expect(statusEl().textContent).toContain('仍在加载');
  });

  it('says nothing when every image loaded cleanly', async () => {
    await boot({ payload: payload(), images: { loaded: 2, failed: 0, pending: 0 } });

    expect(isStatusHidden()).toBe(true);
    expect(statusEl().textContent).toBe('');
  });

  it('reports failures and pending images together', async () => {
    await boot({ payload: payload(), images: { loaded: 1, failed: 1, pending: 1 } });

    const text = statusEl().textContent ?? '';
    expect(text).toContain('1 张图片已加载');
    expect(text).toContain('1 张未能加载');
    expect(text).toContain('1 张仍在加载');
  });
});

describe('print page · font stepper', () => {
  it('walks down and back up through the offered sizes', async () => {
    await boot({ payload: payload() });
    const start = PRINT_FONT_SIZES.indexOf(11 as (typeof PRINT_FONT_SIZES)[number]);
    expect(start).toBeGreaterThan(0);

    fontDown().click();
    expect(fontValue().textContent).toBe(`${PRINT_FONT_SIZES[start - 1]}pt`);

    fontUp().click();
    expect(fontValue().textContent).toBe(`${PRINT_FONT_SIZES[start]}pt`);
  });

  it('disables the stepper at both ends of the range', async () => {
    await boot({ payload: payload(), storedSettings: { fontSize: PRINT_FONT_SIZES[0] } });
    expect(fontDown().disabled).toBe(true);
    expect(fontUp().disabled).toBe(false);

    await boot({
      payload: payload(),
      storedSettings: { fontSize: PRINT_FONT_SIZES[PRINT_FONT_SIZES.length - 1] },
    });
    expect(fontUp().disabled).toBe(true);
    expect(fontDown().disabled).toBe(false);
  });

  it('writes the chosen size into the print stylesheet', async () => {
    await boot({ payload: payload() });

    fontUp().click();

    expect(document.documentElement.style.getPropertyValue('--print-font-size')).toBe('12pt');
  });

  it('persists the new size through savePrintSettings', async () => {
    await boot({ payload: payload() });

    fontUp().click();
    await flush();

    expect(persisted()?.fontSize).toBe(12);
    // The rest of the settings ride along; a font click must not blank the theme.
    expect(persisted()?.theme).toBe('light');
    expect(persisted()?.imageSize).toBe('large');
  });

  it('re-marks oversized blocks after a font change reflows the sheet', async () => {
    await boot({ payload: payload() });
    const before = remarkCount();
    vi.useFakeTimers();

    fontUp().click();
    vi.advanceTimersByTime(120);

    expect(remarkCount()).toBe(before + 1);
  });
});

describe('print page · theme', () => {
  it('presses exactly one button in the theme group', async () => {
    await boot({ payload: payload() });
    expect(pressedIn('[data-theme]')).toEqual(['light']);

    themeButton('sepia').click();

    expect(pressedIn('[data-theme]')).toEqual(['sepia']);
    expect(themeButton('light').getAttribute('aria-pressed')).toBe('false');
    expect(themeButton('sepia').getAttribute('aria-pressed')).toBe('true');
  });

  it('swaps the sheet class for the chosen paper', async () => {
    await boot({ payload: payload() });
    expect(sheet().classList.contains('sheet--light')).toBe(true);

    themeButton('sepia').click();

    expect(sheet().classList.contains('sheet--sepia')).toBe(true);
    expect(sheet().classList.contains('sheet--light')).toBe(false);
  });

  it('persists the theme', async () => {
    await boot({ payload: payload() });

    themeButton('sepia').click();
    await flush();

    expect(persisted()?.theme).toBe('sepia');
  });

  it('does nothing when the pressed theme is clicked again', async () => {
    await boot({ payload: payload() });
    local.set.mockClear();

    themeButton('light').click();
    await flush();

    expect(local.set).not.toHaveBeenCalled();
  });

  it('ignores a theme the page does not offer', async () => {
    await boot({ payload: payload(), extraButtons: '<button data-theme="dark">x</button>' });

    themeButton('dark').click();
    await flush();

    expect(sheet().classList.contains('sheet--light')).toBe(true);
    expect(local.set, 'a theme the page does not offer must not be persisted').not.toHaveBeenCalled();
  });
});

describe('print page · image size', () => {
  it('presses exactly one button in the image-size group', async () => {
    await boot({ payload: payload() });
    expect(pressedIn('[data-imgsize]')).toEqual(['large']);

    imgSizeButton('small')?.click();

    expect(pressedIn('[data-imgsize]')).toEqual(['small']);
  });

  it('swaps the sheet class for the chosen size', async () => {
    await boot({ payload: payload() });
    expect(sheet().classList.contains('p-imgsize-large')).toBe(true);

    imgSizeButton('small')?.click();

    expect(sheet().classList.contains('p-imgsize-small')).toBe(true);
    expect(sheet().classList.contains('p-imgsize-large')).toBe(false);
  });

  it('persists the size and re-measures, because image height moves the layout', async () => {
    await boot({ payload: payload() });
    const before = remarkCount();
    vi.useFakeTimers();

    imgSizeButton('medium')?.click();
    await flushMicrotasks();

    expect(persisted()?.imageSize).toBe('medium');
    vi.advanceTimersByTime(120);
    expect(remarkCount()).toBe(before + 1);
  });

  it('does nothing when the pressed size is clicked again', async () => {
    await boot({ payload: payload() });
    local.set.mockClear();

    imgSizeButton('large')?.click();
    await flush();

    expect(local.set).not.toHaveBeenCalled();
  });

  it('ignores a size it does not recognise', async () => {
    await boot({ payload: payload(), extraButtons: '<button data-imgsize="">x</button>' });

    imgSizeButton('')?.click();
    await flush();

    expect(sheet().classList.contains('p-imgsize-large')).toBe(true);
    expect(local.set, 'an unrecognised size must not be persisted').not.toHaveBeenCalled();
  });

  it('presses 无图, swaps the class and persists it like any other level', async () => {
    await boot({ payload: payload() });

    imgSizeButton('none')?.click();
    await flush();

    expect(pressedIn('[data-imgsize]')).toEqual(['none']);
    expect(sheet().classList.contains('p-imgsize-none')).toBe(true);
    expect(persisted()?.imageSize).toBe('none');
  });

  it('boots into 无图 without waiting for images at all', async () => {
    // 无图 keeps images out of the layout, so a dead image host must not hold
    // a text-only printout hostage for the five-second ceiling.
    await boot({
      payload: payload(),
      storedSettings: { theme: 'light', fontSize: 11, imageSize: 'none' },
    });

    expect(mocks.waitForImages).not.toHaveBeenCalled();
    expect(sheet().classList.contains('p-imgsize-none')).toBe(true);
    expect(printButton().disabled).toBe(false);
    expect(remarkCount()).toBe(1);
  });

  it('waits for images again before re-measuring when leaving 无图', async () => {
    await boot({
      payload: payload(),
      storedSettings: { theme: 'light', fontSize: 11, imageSize: 'none' },
    });
    expect(mocks.waitForImages).not.toHaveBeenCalled();
    const remarksAtBoot = remarkCount();

    // Drive the wait by hand: the re-measure must not fire while the bitmaps
    // that move the layout are still in flight.
    let release!: (result: { loaded: number; failed: number }) => void;
    mocks.waitForImages.mockReturnValue(new Promise((resolve_) => { release = resolve_; }));
    vi.useFakeTimers();

    imgSizeButton('small')?.click();
    await flushMicrotasks();

    expect(mocks.waitForImages).toHaveBeenCalledWith(sheet(), 5000);
    expect(statusEl().textContent).toBe('正在加载图片…');
    expect(remarkCount(), 'no re-cut before images settle').toBe(remarksAtBoot);

    release({ loaded: 1, failed: 0 });
    await flushMicrotasks();
    vi.advanceTimersByTime(120);

    expect(remarkCount()).toBe(remarksAtBoot + 1);
    expect(sheet().classList.contains('p-imgsize-small')).toBe(true);
  });
});

describe('print page · print button', () => {
  it('re-measures before handing off, so no stale mark reaches the paper', async () => {
    await boot({ payload: payload() });

    const order: string[] = [];
    mocks.clearBreakMarks.mockImplementation(() => {
      order.push('clear');
    });
    mocks.markOversizedBlocks.mockImplementation(() => {
      order.push('remark');
      return 0;
    });
    printSpy.mockImplementation(() => {
      order.push('print');
    });

    printButton().click();

    expect(order).toEqual(['clear', 'remark', 'print']);
  });

  it('re-measures immediately, not on the debounce timer', async () => {
    await boot({ payload: payload() });
    const before = remarkCount();

    printButton().click();

    expect(remarkCount()).toBe(before + 1);
  });

  it('titles the page with the filename Chrome will save under', async () => {
    const article = payload();
    await boot({ payload: article });

    printButton().click();

    expect(document.title).toBe(buildFilename(article));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});

describe('print page · re-measure debounce', () => {
  it('collapses a burst of font clicks into one re-measure', async () => {
    // Start at the smallest size so all three clicks really change it —
    // otherwise the clamped ones are no-ops and the test proves nothing.
    await boot({ payload: payload(), storedSettings: { fontSize: PRINT_FONT_SIZES[0] } });
    vi.useFakeTimers();

    const before = remarkCount();
    fontUp().click();
    fontUp().click();
    fontUp().click();

    expect(fontValue().textContent).toBe(`${PRINT_FONT_SIZES[3]}pt`);

    vi.advanceTimersByTime(119);
    expect(remarkCount()).toBe(before);

    vi.advanceTimersByTime(1);
    expect(remarkCount()).toBe(before + 1);
  });
});
