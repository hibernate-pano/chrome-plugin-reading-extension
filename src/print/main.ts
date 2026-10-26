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
import {
  PRINT_FONT_SIZES,
  PRINT_LINE_HEIGHTS,
  PRINT_PARAGRAPH_SPACINGS,
  STORAGE_KEYS,
} from '../shared/constants';
import { getPrintSettings, savePrintSettings, DEFAULT_PRINT_SETTINGS } from '../shared/printSettings';
import { buildDocument, buildFilename } from './buildDocument';
import { eagerizeImages, waitForImages, type ImageWaitResult } from './prepareImages';
import { markOversizedBlocks, clearBreakMarks } from './markBreaks';
import { measureDocument, paginate, PAGE_CONTENT_HEIGHT_PX } from './paginate';
import { renderSheets, clearSheets } from './renderSheets';
import {
  assignBlockIds,
  cutTrailingFrom,
  decorateSheetForTrim,
  firstTrimTarget,
  restoreRemoved,
  startsOnPage,
  type RemovedNode,
} from './trim';

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
  lineHeightValue: document.getElementById('line-height-value') as HTMLElement,
  lineHeightDown: document.getElementById('line-height-down') as HTMLButtonElement,
  lineHeightUp: document.getElementById('line-height-up') as HTMLButtonElement,
  paraGapValue: document.getElementById('para-gap-value') as HTMLElement,
  paraGapDown: document.getElementById('para-gap-down') as HTMLButtonElement,
  paraGapUp: document.getElementById('para-gap-up') as HTMLButtonElement,
  pageCount: document.getElementById('page-count') as HTMLElement,
  trimBtn: document.getElementById('trim-btn') as HTMLButtonElement,
  trimBadge: document.getElementById('trim-badge') as HTMLButtonElement,
  trimHint: document.getElementById('trim-hint') as HTMLElement,
  trimStatus: document.getElementById('trim-status') as HTMLElement,
  trimStatusText: document.getElementById('trim-status-text') as HTMLElement,
  trimUndo: document.getElementById('trim-undo') as HTMLButtonElement,
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

/**
 * Whether the document has been cut into pages at least once.
 *
 * The print button stays shut until this is true: before the first cut the
 * page count on screen describes a layout the reader never saw, and a print
 * taken then reproduces that layout instead of the one on screen.
 */
let bootReady = false;

/**
 * An image wait is in flight.
 *
 * While this holds, printing captures the frames before their bitmaps land —
 * blank boxes on paper, cut to a page count computed from the old layout.
 */
let imageWaitPending = false;

/**
 * Counts image waits, so a superseded one can be recognised.
 *
 * Waits overlap: every change of the image size starts its own. Only the
 * newest one may write back — an older wait resolving late would otherwise
 * declare the document settled while the current wait is still running, and
 * the gate would open on a blank frame.
 */
let imageWaitGeneration = 0;

/**
 * Whether the trim mode is on.
 *
 * The mode only decides what a click on a block *means*; it never decides what
 * is printed. Leaving the mode keeps the cut, so the reader can look at the
 * result and come back to it.
 */
let isTrimming = false;

/**
 * The id of the block the document was cut at, or `null` when nothing is cut.
 *
 * A single cut point, not a stack: the reader's decision is the last one they
 * made, and a second cut replaces the first.
 */
let trimTargetId: string | null = null;

/**
 * A short excerpt of the cut-off block.
 *
 * Shown in the status line so the reader can see they cut in the right place
 * — the page count alone does not say which paragraph went away.
 */
let trimSnippet = '';

/**
 * Everything the last cut detached, kept so it can be put back.
 */
let removedNodes: RemovedNode[] = [];

/**
 * Whether an undo is waiting for the images it brought back.
 *
 * The wait owns the trim status line while it runs: that line is the only
 * thing telling the reader why the page cannot be printed yet.
 */
let restoringImages = false;

/**
 * The one place that decides what the toolbar allows.
 *
 * Every path goes through here, so "may the user print yet?" has exactly one
 * answer. A second place flipping `printBtn.disabled` would be a back door
 * around the gate.
 */
function updateControls(): void {
  elements.printBtn.disabled = !(bootReady && !imageWaitPending);
  // The trim rides on the same condition: cutting while the images are still
  // arriving would measure a layout that is about to change under it.
  elements.trimBtn.disabled = elements.printBtn.disabled;
}

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

function currentLineHeightIndex(): number {
  return PRINT_LINE_HEIGHTS.indexOf(
    currentSettings.lineHeight as (typeof PRINT_LINE_HEIGHTS)[number]
  );
}

function currentParagraphSpacingIndex(): number {
  return PRINT_PARAGRAPH_SPACINGS.indexOf(
    currentSettings.paragraphSpacing as (typeof PRINT_PARAGRAPH_SPACINGS)[number]
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
 *
 * The theme comes in two sets of classes, and they are not interchangeable:
 * `p-sheet--*` paints the paper in the preview stylesheet, `p-theme-*` is
 * where `print.css` reads the `--p-*` variables from. A sheet with only the
 * first is a tinted page whose headings, links and code blocks still carry the
 * light theme's colours.
 */
function applySheetClasses(sheets: Iterable<HTMLElement>): void {
  for (const sheet of sheets) {
    sheet.classList.toggle('p-sheet--light', currentSettings.theme === 'light');
    sheet.classList.toggle('p-sheet--sepia', currentSettings.theme === 'sepia');
    sheet.classList.toggle('p-theme-light', currentSettings.theme === 'light');
    sheet.classList.toggle('p-theme-sepia', currentSettings.theme === 'sepia');
    sheet.classList.toggle('p-imgsize-large', currentSettings.imageSize === 'large');
    sheet.classList.toggle('p-imgsize-medium', currentSettings.imageSize === 'medium');
    sheet.classList.toggle('p-imgsize-small', currentSettings.imageSize === 'small');
    sheet.classList.toggle('p-imgsize-none', currentSettings.imageSize === 'none');
  }
}

function applySettings(): void {
  document.documentElement.style.setProperty('--print-font-size', `${currentSettings.fontSize}pt`);
  // Both density values reach the sheet as custom properties: the print rules
  // read them directly, so one write covers the measuring surface and every
  // rendered sheet, and the two stay independent of each other.
  document.documentElement.style.setProperty(
    '--print-line-height',
    String(currentSettings.lineHeight)
  );
  document.documentElement.style.setProperty(
    '--print-para-gap',
    `${currentSettings.paragraphSpacing}em`
  );

  elements.sheet.classList.toggle('sheet--light', currentSettings.theme === 'light');
  elements.sheet.classList.toggle('sheet--sepia', currentSettings.theme === 'sepia');
  // The theme tokens as well as the theme paint. `sheet--*` is what the
  // preview stylesheet colours the measuring surface with; `p-theme-*` is
  // where `print.css` reads its `--p-*` variables from, and the article
  // measured here has to carry the same tokens as the paper it is cut into —
  // otherwise the sepia paper is laid out with the light theme's colours.
  elements.sheet.classList.toggle('p-theme-light', currentSettings.theme === 'light');
  elements.sheet.classList.toggle('p-theme-sepia', currentSettings.theme === 'sepia');
  elements.sheet.classList.toggle('p-imgsize-large', currentSettings.imageSize === 'large');
  elements.sheet.classList.toggle('p-imgsize-medium', currentSettings.imageSize === 'medium');
  elements.sheet.classList.toggle('p-imgsize-small', currentSettings.imageSize === 'small');
  elements.sheet.classList.toggle('p-imgsize-none', currentSettings.imageSize === 'none');

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

  const lineIndex = currentLineHeightIndex();
  elements.lineHeightValue.textContent = String(currentSettings.lineHeight);
  elements.lineHeightDown.disabled = lineIndex <= 0;
  elements.lineHeightUp.disabled = lineIndex < 0 || lineIndex >= PRINT_LINE_HEIGHTS.length - 1;

  const gapIndex = currentParagraphSpacingIndex();
  elements.paraGapValue.textContent = `${currentSettings.paragraphSpacing}em`;
  elements.paraGapDown.disabled = gapIndex <= 0;
  elements.paraGapUp.disabled = gapIndex < 0 || gapIndex >= PRINT_PARAGRAPH_SPACINGS.length - 1;
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

/**
 * Move the body line height one offered step.
 *
 * A line height reflows every paragraph on the sheet, so the measurement the
 * last cut was based on goes stale — same reason the font stepper re-marks.
 */
function stepLineHeight(delta: number): void {
  const nextIndex = Math.min(
    Math.max(currentLineHeightIndex() + delta, 0),
    PRINT_LINE_HEIGHTS.length - 1
  );
  const next = PRINT_LINE_HEIGHTS[nextIndex];
  if (next === undefined || next === currentSettings.lineHeight) return;
  currentSettings.lineHeight = next;
  applySettings();
  void savePrintSettings({ lineHeight: next });
  scheduleRemarking();
}

/**
 * Move the paragraph spacing one offered step.
 *
 * The gap between paragraphs changes where a line falls, so the page breaks
 * have to be decided again rather than carried over from the old layout.
 */
function stepParagraphSpacing(delta: number): void {
  const nextIndex = Math.min(
    Math.max(currentParagraphSpacingIndex() + delta, 0),
    PRINT_PARAGRAPH_SPACINGS.length - 1
  );
  const next = PRINT_PARAGRAPH_SPACINGS[nextIndex];
  if (next === undefined || next === currentSettings.paragraphSpacing) return;
  currentSettings.paragraphSpacing = next;
  applySettings();
  void savePrintSettings({ paragraphSpacing: next });
  scheduleRemarking();
}

function setTheme(theme: PrintSettings['theme']): void {
  if (theme === currentSettings.theme) return;
  currentSettings.theme = theme;
  applySettings();
  void savePrintSettings({ theme });
}

const IMAGE_SIZES: readonly PrintImageSize[] = ['large', 'medium', 'small', 'none'];

/**
 * Wait for the images of the current layout, holding the print button shut.
 *
 * Returns `null` when this wait has been superseded — a newer wait, or a
 * switch to 无图, took over and this one's conclusion is about a layout that no
 * longer exists. A superseded wait writes nothing back: not the pending flag,
 * not the status line, not a re-cut. Its answer is about the past.
 */
async function waitForImagesFor(generation: number): Promise<ImageWaitResult | null> {
  imageWaitPending = true;
  updateControls();

  const result = await waitForImages(elements.sheet, 5000);

  if (generation !== imageWaitGeneration) return null;

  imageWaitPending = false;
  updateControls();
  return result;
}

async function setImageSize(size: PrintImageSize): Promise<void> {
  if (size === currentSettings.imageSize) return;
  // Every size change invalidates the waits before it: the layout they were
  // waiting for is the one being left behind.
  const generation = ++imageWaitGeneration;
  currentSettings.imageSize = size;
  applySettings();
  void savePrintSettings({ imageSize: size });

  // 无图 keeps images out of the layout entirely, so there is nothing to wait
  // for and a dead image host must not delay a text-only printout. A wait
  // still in flight belongs to the layout the user just left — cancel it.
  if (size === 'none') {
    // The status line describes the layout being left behind, and the wait
    // that is being abandoned may not write to the status bar to correct the
    // record. Clearing it is this action's own write: a page with no images
    // must not keep claiming that images are loading.
    clearStatus();
    imageWaitPending = false;
    updateControls();
    scheduleRemarking();
    return;
  }

  // Any size that shows images has to wait for them: measuring before their
  // bitmaps land cuts pages around empty frames, and printing then yields the
  // blanks the reader is about to complain about.
  setStatus('正在加载图片…');
  const result = await waitForImagesFor(generation);
  // Superseded — a newer action owns the gate now, and will re-cut the pages.
  if (result === null) return;
  reportImageProblems(result);
  scheduleRemarking();
}

/* ------------------------------------------------------------------ */
/* Tail trim                                                           */
/* ------------------------------------------------------------------ */

/**
 * The article body the trim cuts in.
 *
 * The title and the footer are *outside* it — the header is a sibling before
 * it, the footer a sibling after it — so a cut inside the body leaves both
 * standing. The footer in particular has to survive: it carries the source
 * link the article is credited by.
 */
function trimRoot(): HTMLElement | null {
  return contentDoc?.querySelector<HTMLElement>('.p-content') ?? null;
}

/**
 * A short excerpt of a block, for the status line.
 *
 * Text first, the picture's `alt` second: a block that is nothing but an
 * image has no text to show, and an empty excerpt would tell the reader
 * nothing about where they cut.
 */
function snippetOf(element: HTMLElement): string {
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  const alt = (element.querySelector('img')?.getAttribute('alt') ?? '').replace(/\s+/g, ' ').trim();
  const excerpt = text.length > 0 ? text : alt;
  return excerpt.length > 24 ? `${excerpt.slice(0, 24)}…` : excerpt;
}

/**
 * Turn the trim mode on or off.
 *
 * Leaving the mode does not undo the cut — the reader may want to look at the
 * result and come back to it, and the badge keeps the way in.
 */
function setTrimming(on: boolean): void {
  isTrimming = on;
  document.body.classList.toggle('is-trimming', on);
  elements.trimHint.hidden = !on;
  elements.trimBtn.setAttribute('aria-pressed', String(on));
}

/**
 * Cut the document at the given block and lay it out again.
 *
 * One cut point at a time: a new cut restores the previous one first, so the
 * document always carries the reader's last decision rather than the
 * accumulation of every click.
 */
function applyTrim(blockId: string): void {
  const root = trimRoot();
  if (!root) return;

  if (removedNodes.length > 0) {
    restoreRemoved(removedNodes);
    removedNodes = [];
  }

  const target = Array.from(root.querySelectorAll<HTMLElement>('[data-p-block]')).find(
    (block) => block.dataset.pBlock === blockId
  );
  if (!target) return;

  // Read before the cut: afterwards there is nothing left to read.
  trimSnippet = snippetOf(target);
  removedNodes = cutTrailingFrom(root, target);
  trimTargetId = blockId;

  remarkOversizedBlocks();
}

/**
 * Put the cut content back and lay the document out again.
 *
 * The restored images may not have decoded — a page that booted in 无图 never
 * waited for them — so the re-measure waits for them, on the same gate the
 * image size switch uses. A wait that has been superseded writes nothing back:
 * the action that superseded it owns the gate now.
 */
async function undoTrim(): Promise<void> {
  if (trimTargetId === null && removedNodes.length === 0) return;

  const generation = ++imageWaitGeneration;
  restoreRemoved(removedNodes);
  removedNodes = [];
  trimTargetId = null;

  const pendingImage = Array.from(elements.sheet.querySelectorAll('img')).some(
    (image) => !image.complete
  );

  if (pendingImage) {
    restoringImages = true;
    elements.trimStatus.classList.remove('status--hidden');
    elements.trimStatusText.textContent = '正在恢复图片…';
    const result = await waitForImagesFor(generation);
    restoringImages = false;
    // Superseded — a newer action owns the gate now, and will re-cut the pages.
    if (result === null) return;
  }

  remarkOversizedBlocks();
}

/**
 * Show or hide the trim status, and keep the page count in it current.
 *
 * Called on every re-layout: the status line is the only way back to the
 * undo, so it must not disappear when the reader changes the font size.
 */
function updateTrimStatus(pageCount: number): void {
  if (trimTargetId === null) {
    // The wait for restored images owns the line while it runs.
    if (!restoringImages) {
      elements.trimStatus.classList.add('status--hidden');
      elements.trimBadge.hidden = true;
      document.body.classList.remove('has-trim');
    }
    return;
  }

  elements.trimStatus.classList.remove('status--hidden');
  elements.trimStatusText.textContent = `已裁剪至 ${pageCount} 页 · 「${trimSnippet}」`;
  elements.trimBadge.hidden = false;
  document.body.classList.add('has-trim');
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

  // Every sheet carries its own page shortcut, and the blocks that start on
  // it are marked as cuttable. The sheets are rebuilt from scratch on every
  // re-layout, so this is where the shortcuts are made — they never pile up.
  for (const sheet of sheets) decorateSheetForTrim(sheet);

  elements.pageCount.textContent = starts.length === 1 ? '共 1 页' : `共 ${starts.length} 页`;

  // The trim status carries the page count too, and it is the only way back to
  // the undo — so it is refreshed on every re-layout, not only on a cut.
  updateTrimStatus(starts.length);

  // The document now exists as pages, so printing it is meaningful. This lives
  // here rather than at the end of `main()` because the boot wait can be
  // overtaken by a user action — that path finishes booting through the
  // re-cut the action schedules, and would otherwise never open the gate.
  bootReady = true;
  updateControls();
}

function scheduleRemarking(): void {
  if (remarkTimer) clearTimeout(remarkTimer);
  remarkTimer = setTimeout(remarkOversizedBlocks, 120);
}

/**
 * Turn an image wait into the one status line the reader needs.
 *
 * Report only what went wrong. A clean sweep says nothing — announcing
 * "N images loaded" is noise on a page the user never asked about. But an
 * image that never answered is `pending`, and staying silent about it is
 * how a dead image host ends up printing blank frames.
 */
function reportImageProblems(result: ImageWaitResult): void {
  const problems: string[] = [];
  if (result.failed > 0) problems.push(`${result.failed} 张未能加载（可能是防盗链或已失效）`);
  if (result.pending > 0) problems.push(`${result.pending} 张仍在加载（图片服务器可能无响应）`);

  if (problems.length > 0) {
    const loaded = result.loaded > 0 ? `${result.loaded} 张图片已加载，` : '';
    setStatus(`${loaded}${problems.join('，')}。仍可继续打印。`);
  } else {
    clearStatus();
  }
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
        void setImageSize(size as PrintImageSize);
      }
    });
  }

  elements.fontDown.addEventListener('click', () => stepFontSize(-1));
  elements.fontUp.addEventListener('click', () => stepFontSize(1));

  elements.lineHeightDown.addEventListener('click', () => stepLineHeight(-1));
  elements.lineHeightUp.addEventListener('click', () => stepLineHeight(1));

  elements.paraGapDown.addEventListener('click', () => stepParagraphSpacing(-1));
  elements.paraGapUp.addEventListener('click', () => stepParagraphSpacing(1));

  elements.printBtn.addEventListener('click', () => {
    // Belt and braces: re-measure against the final layout right before the
    // snapshot, so no stale mark survives into the printed output.
    remarkOversizedBlocks();
    // Chrome proposes document.title as the saved filename.
    document.title = currentFilename;
    window.print();
  });
}

/**
 * Wire the trim: the mode, the badge, the undo, and the click on a block.
 */
function wireTrim(): void {
  elements.trimBtn.addEventListener('click', () => setTrimming(!isTrimming));
  // The badge is a way back into the mode, not a way out of the cut.
  elements.trimBadge.addEventListener('click', () => setTrimming(true));
  elements.trimUndo.addEventListener('click', () => void undoTrim());

  document.addEventListener('keydown', (event) => {
    // Leaving the mode keeps the cut: the reader may only want a look at the
    // result, and the status line still offers the undo.
    if (event.key === 'Escape' && isTrimming) setTrimming(false);
  });

  // Delegated on the rendered pages, because the sheets are rebuilt on every
  // re-layout and a handler bound to a sheet would die with it.
  elements.pages.addEventListener('click', (event) => {
    if (!isTrimming || imageWaitPending) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    // The page the click landed on. Every cut point lives on a page.
    const page = target.closest<HTMLElement>('.p-sheet');
    if (!page) return;
    const pageStart = Number(page.dataset.pageStart);
    if (!Number.isFinite(pageStart)) return;

    // The page shortcut is resolved first: its button sits on the paper, in
    // the margin, and carries no block id of its own — the block lookup
    // below would reject it outright. It stands for "this page and
    // everything after it", so it cuts at the first block that *starts* on
    // this page.
    const pageButton = target.closest<HTMLElement>('[data-trim-page]');
    const block =
      pageButton === null
        ? target.closest<HTMLElement>('[data-p-block]')
        : firstTrimTarget(page, pageStart);
    if (!block) return;

    // A block that continues from the previous page is not a cut point:
    // cutting there would throw away the half of it that already fits on the
    // earlier page, and the reader would never see what went.
    if (!startsOnPage(block, pageStart)) return;

    const blockId = block.dataset.pBlock;
    if (!blockId) return;
    applyTrim(blockId);
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

  // The blocks are labelled before the first measurement, so the ids describe
  // the document that gets cut rather than one that has already been cut.
  // Only the article body is labelled: the title and the footer are not
  // article blocks and must not be offered as cut points.
  const articleContent = doc.querySelector<HTMLElement>('.p-content');
  if (articleContent) assignBlockIds(articleContent);

  elements.sheet.replaceChildren(doc);

  applySettings();
  wireToolbar();
  wireTrim();

  // Hold the print button until images settle — printing early yields blanks.
  // 无图 keeps images out of the layout entirely, so there is nothing to wait
  // for and a dead image host must not delay a text-only printout.
  if (currentSettings.imageSize !== 'none') {
    const generation = ++imageWaitGeneration;
    setStatus('正在加载图片…');
    const result = await waitForImagesFor(generation);
    // Overtaken by a user action. That action owns the gate now and schedules
    // its own re-cut, which is what completes the boot.
    if (result === null) return;
    reportImageProblems(result);
  }

  // Image heights changed the layout; now re-measure and let oversized code
  // blocks and tables break across pages instead of stranding blank space,
  // then cut the document into pages from that final measurement.
  markOversizedBlocks(elements.sheet);
  repaginate();

  updateControls();
  elements.printBtn.focus();
}

void main().catch((error: unknown) => {
  console.error('[Print] Print page failed to initialise:', error);
  showPlaceholder('打印页初始化失败', '请关闭此页，回到文章后重新导出。');
});
