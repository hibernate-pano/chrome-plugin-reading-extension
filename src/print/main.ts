/**
 * Print Page — entry point
 *
 * Reads a one-shot payload handed over by the background script, renders it at
 * A4 width, and lets the user pick a paper theme and font size before handing
 * off to the browser's own print engine.
 *
 * ## Pagination
 *
 * The document is measured once in a 174mm column — the exact width the printer
 * uses — and cut into real A4 sheets that are themselves what gets printed. The
 * on-screen preview is therefore the printed result, not an estimate of it.
 *
 * This replaced an earlier deliberate rule that the page carried *no*
 * pagination preview, on the grounds that browsers expose no API to query
 * where a break will fall, so any preview would be "an estimate that looks
 * authoritative but is often wrong". That objection was correct while the
 * preview was advisory: we drew a guess, then handed the same document to
 * Chrome and let it fragment again. Deciding the breaks ourselves and printing
 * the result removes the disagreement instead of documenting it.
 *
 * What survives from the old rule is the underlying fact — Chrome still makes
 * the final call, and the sheets are sized to leave it nothing to change. The
 * measurement is taken at the real print width, and the sheet is a hair under
 * A4 so the engine's rounding cannot tip it onto a second page.
 */

import type { PrintPayload, PrintSettings, PrintImageSize } from '../shared/types';
import { PRINT_FONT_SIZES, STORAGE_KEYS } from '../shared/constants';
import { getPrintSettings, savePrintSettings, DEFAULT_PRINT_SETTINGS } from '../shared/printSettings';
import { buildDocument, buildFilename } from './buildDocument';
import { eagerizeImages, waitForImages } from './prepareImages';
import { markOversizedBlocks, clearBreakMarks } from './markBreaks';
import { measureDocument, paginate, PAGE_CONTENT_HEIGHT_PX } from './paginate';
import { renderSheets, clearSheets } from './renderSheets';

// Order matters. Both files style the same selectors at the same specificity —
// a media query adds none — so the later import wins outright. `print.css`
// carries the `@media print` rules that make each sheet exactly one page, and
// they are worthless if `preview.css` follows and re-declares `.p-sheet` for
// the screen. Importing print last is what keeps the printed page a page.
import './preview.css';
import './print.css';

const elements = {
  sheet: document.getElementById('sheet') as HTMLElement,
  pages: document.getElementById('pages') as HTMLElement,
  title: document.getElementById('doc-title') as HTMLElement,
  status: document.getElementById('status') as HTMLElement,
  printBtn: document.getElementById('print-btn') as HTMLButtonElement,
  fontValue: document.getElementById('font-value') as HTMLElement,
  fontDown: document.getElementById('font-down') as HTMLButtonElement,
  fontUp: document.getElementById('font-up') as HTMLButtonElement,
  pageCount: document.getElementById('page-count') as HTMLElement,
  themeButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-theme]')),
  imgSizeButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-imgsize]')),
};

let currentSettings: PrintSettings = { ...DEFAULT_PRINT_SETTINGS };
let currentFilename = 'article.pdf';

/**
 * The rendered article (`.p-doc`), kept for re-pagination.
 *
 * Deliberately *not* `elements.sheet`: that element is the measuring container
 * and carries the `sheet` presentation class, so cloning it would put a second
 * bordered, padded sheet inside every page.
 */
let contentDoc: HTMLElement | null = null;

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
  // The empty state replaces the whole preview area, so any sheets from a
  // previous payload must go with it — a stale page count next to "no content"
  // reads as a bug rather than an empty state.
  clearSheets(elements.pages);

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

/**
 * Apply the theme and image-size classes to a set of sheet elements.
 *
 * The image size is load-bearing for the preview, not just cosmetic: it caps
 * image height in `print.css`, so a sheet missing the class renders images up to
 * twice as tall as the one the layout was measured with — the page boundary
 * would then cut straight through a picture. Both `applySettings` (for a change
 * that does not reflow the text) and `repaginate` (for a full re-cut) go
 * through here, because the sheets are rebuilt from scratch on every cut and
 * whatever the previous set carried is gone.
 */
function applySheetClasses(sheets: Iterable<HTMLElement>): void {
  for (const sheet of sheets) {
    sheet.classList.toggle('p-sheet--light', currentSettings.theme === 'light');
    sheet.classList.toggle('p-sheet--sepia', currentSettings.theme === 'sepia');
    sheet.classList.toggle('p-imgsize-large', currentSettings.imageSize === 'large');
    sheet.classList.toggle('p-imgsize-medium', currentSettings.imageSize === 'medium');
    sheet.classList.toggle('p-imgsize-small', currentSettings.imageSize === 'small');
  }
}

function applySettings(): void {
  document.documentElement.style.setProperty('--print-font-size', `${currentSettings.fontSize}pt`);

  elements.sheet.classList.toggle('sheet--light', currentSettings.theme === 'light');
  elements.sheet.classList.toggle('sheet--sepia', currentSettings.theme === 'sepia');
  elements.sheet.classList.toggle('p-imgsize-large', currentSettings.imageSize === 'large');
  elements.sheet.classList.toggle('p-imgsize-medium', currentSettings.imageSize === 'medium');
  elements.sheet.classList.toggle('p-imgsize-small', currentSettings.imageSize === 'small');

  applySheetClasses(elements.pages.children as Iterable<HTMLElement>);

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
  repaginate();
}

/**
 * Re-cut the document into pages from the current layout.
 *
 * Runs after anything that reflows the column: a font-size step, an image-size
 * step, or images finally resolving. Every offset the last cut was based on is
 * stale after any of those, and a stale cut does not fail loudly — it just
 * shows the reader pages that no longer match the text on them.
 */
function repaginate(): void {
  if (!contentDoc) return;
  const layout = measureDocument(contentDoc);
  const starts = paginate(layout.candidates, PAGE_CONTENT_HEIGHT_PX, layout.height);
  const sheets = renderSheets(layout.blocks, starts, elements.pages, layout.height);
  applySheetClasses(sheets);

  elements.pageCount.textContent = starts.length === 1 ? '共 1 页' : `共 ${starts.length} 页`;
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
  contentDoc = doc;
  elements.sheet.replaceChildren(doc);

  applySettings();
  wireToolbar();

  // Hold the print button until images settle — printing early yields blanks.
  setStatus('正在加载图片…');
  const result = await waitForImages(elements.sheet, 5000);

  // Image heights changed the layout; now re-measure and let oversized code
  // blocks and tables break across pages instead of stranding blank space,
  // then cut the document into pages from that final measurement.
  markOversizedBlocks(elements.sheet);
  repaginate();

  // Report only what went wrong. A clean sweep says nothing — announcing
  // "N images loaded" is noise on a page the user never asked about. But an
  // image that never answered is `pending`, and staying silent about it is
  // how a dead image host ends up printing blank frames.
  const problems: string[] = [];
  if (result.failed > 0) problems.push(`${result.failed} 张未能加载（可能是防盗链或已失效）`);
  if (result.pending > 0) problems.push(`${result.pending} 张仍在加载（图片服务器可能无响应）`);

  if (problems.length > 0) {
    const loaded = result.loaded > 0 ? `${result.loaded} 张图片已加载，` : '';
    setStatus(`${loaded}${problems.join('，')}。仍可继续打印。`);
  } else {
    clearStatus();
  }

  elements.printBtn.disabled = false;
  elements.printBtn.focus();
}

void main();
