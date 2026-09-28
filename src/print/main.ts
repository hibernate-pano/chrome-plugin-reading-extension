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

import type { PrintPayload, PrintSettings } from '../shared/types';
import { PRINT_FONT_SIZES, STORAGE_KEYS } from '../shared/constants';
import { getPrintSettings, savePrintSettings } from '../shared/printSettings';
import { buildDocument, buildFilename } from './buildDocument';
import { eagerizeImages, waitForImages, constrainImageHeights } from './prepareImages';

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
};

let currentSettings: PrintSettings = { theme: 'light', fontSize: 11 };
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

  for (const button of elements.themeButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.theme === currentSettings.theme));
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
}

function setTheme(theme: PrintSettings['theme']): void {
  if (theme === currentSettings.theme) return;
  currentSettings.theme = theme;
  applySettings();
  void savePrintSettings({ theme });
}

function wireToolbar(): void {
  for (const button of elements.themeButtons) {
    button.addEventListener('click', () => {
      const theme = button.dataset.theme;
      if (theme === 'light' || theme === 'sepia') setTheme(theme);
    });
  }

  elements.fontDown.addEventListener('click', () => stepFontSize(-1));
  elements.fontUp.addEventListener('click', () => stepFontSize(1));

  elements.printBtn.addEventListener('click', () => {
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
  constrainImageHeights(doc);
  eagerizeImages(doc);
  elements.sheet.replaceChildren(doc);

  applySettings();
  wireToolbar();

  // Hold the print button until images settle — printing early yields blanks.
  setStatus('正在加载图片…');
  const result = await waitForImages(elements.sheet, 5000);

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
