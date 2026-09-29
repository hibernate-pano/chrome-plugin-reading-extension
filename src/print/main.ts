/**
 * Print Page — entry point
 *
 * Reads a one-shot payload handed over by the background script, renders it
 * at A4 width, and lets the user pick a paper theme and font size before
 * handing off to the browser's own print engine.
 *
 * There is no pagination preview here on purpose. Browsers expose no API to
 * query where a page break will fall — the engine decides at line level,
 * which JS cannot observe. Any "preview" we drew would be an estimate that
 * looks authoritative but is often wrong, which is worse than none. Chrome's
 * print dialog shows the real thing.
 */

import type { PrintPayload, PrintSettings, PrintImageSize } from '../shared/types';
import { PRINT_FONT_SIZES, STORAGE_KEYS } from '../shared/constants';
import { getPrintSettings, savePrintSettings, DEFAULT_PRINT_SETTINGS } from '../shared/printSettings';
import { buildDocument, buildFilename } from './buildDocument';
import { eagerizeImages, waitForImages } from './prepareImages';
import { markOversizedBlocks, clearBreakMarks } from './markBreaks';

import './print.css';
import './preview.css';

const elements = {
  sheet: document.getElementById('sheet') as HTMLElement,
  title: document.getElementById('doc-title') as HTMLElement,
  status: document.getElementById('status') as HTMLElement,
  printBtn: document.getElementById('print-btn') as HTMLButtonElement,
  fontValue: document.getElementById('font-value') as HTMLElement,
  fontDown: document.getElementById('font-down') as HTMLButtonElement,
  fontUp: document.getElementById('font-up') as HTMLButtonElement,
  themeButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-theme]')),
  imgSizeButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-imgsize]')),
};

let currentSettings: PrintSettings = { ...DEFAULT_PRINT_SETTINGS };
let currentFilename = 'article.pdf';

function setStatus(message: string): void {
  elements.status.classList.remove('status--hidden');
  elements.status.textContent = message;
}

function clearStatus(): void {
  elements.status.classList.add('status--hidden');
  elements.status.textContent = '';
}

function showPlaceholder(title: string, detail: string): void {
  document.querySelector('.toolbar')?.remove();
  clearStatus();

  const placeholder = document.createElement('div');
  placeholder.className = 'placeholder';

  const heading = document.createElement('h1');
  heading.textContent = title;
  placeholder.appendChild(heading);

  const paragraph = document.createElement('p');
  paragraph.textContent = detail;
  placeholder.appendChild(paragraph);

  const button = document.createElement('button');
  button.className = 'btn btn--ghost';
  button.type = 'button';
  button.textContent = '关闭此页';
  button.addEventListener('click', () => window.close());
  placeholder.appendChild(button);

  document.querySelector('.page')?.replaceChildren(placeholder);
}

function currentFontIndex(): number {
  return PRINT_FONT_SIZES.indexOf(
    currentSettings.fontSize as (typeof PRINT_FONT_SIZES)[number]
  );
}

function applySettings(): void {
  document.documentElement.style.setProperty('--print-font-size', `${currentSettings.fontSize}pt`);

  elements.sheet.classList.toggle('sheet--light', currentSettings.theme === 'light');
  elements.sheet.classList.toggle('sheet--sepia', currentSettings.theme === 'sepia');
  elements.sheet.classList.toggle('p-imgsize-large', currentSettings.imageSize === 'large');
  elements.sheet.classList.toggle('p-imgsize-medium', currentSettings.imageSize === 'medium');
  elements.sheet.classList.toggle('p-imgsize-small', currentSettings.imageSize === 'small');

  for (const button of elements.themeButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.theme === currentSettings.theme));
  }

  for (const button of elements.imgSizeButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.imgsize === currentSettings.imageSize));
  }

  const index = currentFontIndex();
  elements.fontValue.textContent = `${currentSettings.fontSize}pt`;
  elements.fontDown.disabled = index <= 0;
  elements.fontUp.disabled = index < 0 || index >= PRINT_FONT_SIZES.length - 1;
}

function stepFontSize(delta: number): void {
  const nextIndex = Math.min(
    Math.max(currentFontIndex() + delta, 0),
    PRINT_FONT_SIZES.length - 1
  );
  const next = PRINT_FONT_SIZES[nextIndex];
  if (next === undefined || next === currentSettings.fontSize) return;
  currentSettings.fontSize = next;
  applySettings();
  void savePrintSettings({ fontSize: next });
  scheduleRemarking();
}

function setTheme(theme: PrintSettings['theme']): void {
  if (theme === currentSettings.theme) return;
  currentSettings.theme = theme;
  applySettings();
  void savePrintSettings({ theme });
}

const IMAGE_SIZES: readonly PrintImageSize[] = ['large', 'medium', 'small'];

function setImageSize(size: PrintImageSize): void {
  if (size === currentSettings.imageSize) return;
  currentSettings.imageSize = size;
  applySettings();
  void savePrintSettings({ imageSize: size });
  scheduleRemarking();
}

/* ------------------------------------------------------------------ */
/* Break-decision refresh                                              */
/* ------------------------------------------------------------------ */

/**
 * Debounce handle — the font stepper fires in quick bursts and each
 * re-measure forces a full layout pass.
 */
let remarkTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Re-run break decisions from scratch.
 *
 * Font-size and image-size changes reflow the document, so measurements
 * taken at boot go stale: a code block that grew past the keep-whole
 * threshold would still be forced unbroken, get pushed to the next page in
 * print, and leave a gap the continuous preview cannot show.
 */
function remarkOversizedBlocks(): void {
  clearBreakMarks(elements.sheet);
  markOversizedBlocks(elements.sheet);
}

function scheduleRemarking(): void {
  if (remarkTimer) clearTimeout(remarkTimer);
  remarkTimer = setTimeout(remarkOversizedBlocks, 120);
}

function wireToolbar(): void {
  for (const button of elements.themeButtons) {
    button.addEventListener('click', () => {
      const theme = button.dataset.theme;
      if (theme === 'light' || theme === 'sepia') setTheme(theme);
    });
  }

  for (const button of elements.imgSizeButtons) {
    button.addEventListener('click', () => {
      const size = button.dataset.imgsize;
      if (size && IMAGE_SIZES.includes(size as PrintImageSize)) {
        setImageSize(size as PrintImageSize);
      }
    });
  }

  elements.fontDown.addEventListener('click', () => stepFontSize(-1));
  elements.fontUp.addEventListener('click', () => stepFontSize(1));

  elements.printBtn.addEventListener('click', () => {
    // Belt and braces: re-measure against the final layout right before the
    // snapshot, so no stale mark survives into the printed output.
    remarkOversizedBlocks();
    // Chrome proposes document.title as the saved filename.
    document.title = currentFilename;
    window.print();
  });
}

/* ------------------------------------------------------------------ */
/* Payload retrieval                                                   */
/* ------------------------------------------------------------------ */

/** Tokens are minted by the background script as lowercase hex. */
const TOKEN_PATTERN = /^[a-f0-9]{32}$/;

/**
 * Read the handoff token from the URL fragment.
 *
 * The fragment rather than the query string keeps the token out of any
 * server-side log, and needs no URL parsing here.
 */
function readToken(): string {
  const fragment = window.location.hash.replace(/^#/, '');
  return TOKEN_PATTERN.test(fragment) ? fragment : '';
}

/**
 * Read the one-shot payload from session storage, then delete it so a
 * refresh cannot resurrect a stale article and nothing is left behind.
 */
async function takePayload(): Promise<PrintPayload | null> {
  const token = readToken();
  if (!token) return null;

  const key = STORAGE_KEYS.PRINT_PAYLOAD + token;
  try {
    const result = await chrome.storage.session.get(key);
    const payload = result[key] as PrintPayload | undefined;
    if (payload) {
      await chrome.storage.session.remove(key);
    }
    return payload ?? null;
  } catch (error) {
    console.error('[Print] Failed to read payload:', error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const [payload, stored] = await Promise.all([takePayload(), getPrintSettings()]);

  if (!payload) {
    showPlaceholder(
      '没有可打印的内容',
      '请回到正在阅读的文章，在阅读模式工具栏点击「导出 PDF」。此页面只接受扩展发起的导出请求。'
    );
    return;
  }

  currentSettings = stored;
  currentFilename = buildFilename(payload);

  elements.title.textContent = payload.title;
  document.title = currentFilename;

  const doc = buildDocument(payload);
  eagerizeImages(doc);
  elements.sheet.replaceChildren(doc);

  applySettings();
  wireToolbar();

  // Hold the print button until images settle — printing early yields blanks.
  setStatus('正在加载图片…');
  const result = await waitForImages(elements.sheet, 5000);

  // Image heights changed the layout; now re-measure and let oversized code
  // blocks and tables break across pages instead of stranding blank space.
  markOversizedBlocks(elements.sheet);

  if (result.failed > 0) {
    setStatus(
      `${result.loaded} 张图片已加载，${result.failed} 张未能加载（可能是防盗链或已失效）。仍可继续打印。`
    );
  } else {
    clearStatus();
  }

  elements.printBtn.disabled = false;
  elements.printBtn.focus();
}

void main();
