/**
 * Sheet rendering — turning page starts into paper.
 *
 * Each sheet is a real 210 × 297mm box with the print margins baked in as
 * padding, so its text column is exactly the 174mm the layout was measured at.
 * Inside it, the blocks belonging to that page are placed at the offsets they
 * were measured at, and the sheet clips everything else.
 *
 * ## Why blocks are copied individually
 *
 * The obvious implementation — clone the whole article per page and shift it —
 * costs a full document copy per page. Measured on a 60-page article that was
 * 58,000 DOM nodes and a 15-second re-cut when the font size changed, which is
 * unusable for the one interaction that has to feel instant.
 *
 * Copying only the blocks that intersect a page's slice makes the total work
 * proportional to the document rather than to pages times document. A block
 * that straddles a boundary is copied to both pages, which is correct: each
 * copy is clipped to that page's range.
 *
 * The blocks are positioned absolutely at their measured offsets rather than
 * re-flowed. Their internal layout is unchanged — a paragraph still wraps
 * against the same 174mm column, so the line breaking the measurement recorded
 * is the line breaking that gets drawn — and their margins are already baked
 * into the *next* block's offset, so nothing is lost by taking the flow out of
 * it.
 */

import { A4 } from '../shared/constants';
import { PAGE_CONTENT_HEIGHT_PX, type MeasuredBlock } from './paginate';

/** Class applied to every rendered page sheet. */
export const PAGE_SHEET_CLASS = 'p-sheet';

/** Class applied to the clipping box inside a sheet. */
export const PAGE_VIEWPORT_CLASS = 'p-sheet__viewport';

/** Class applied to the block container that is clipped inside a sheet. */
export const PAGE_CLONE_CLASS = 'p-sheet__content';

/**
 * Render the article as one sheet per page.
 *
 * Sheet *k* shows the document range `[start_k, start_{k+1})`, not a fixed
 * `pageHeight` window. The two are not the same thing: `paginate` breaks at the
 * last candidate that *fits*, which is usually short of the page limit, so
 * slicing a full page from every start would reprint the gap at the top of the
 * next sheet. Clipping each sheet at the next page's start is what makes the
 * two line up exactly, and the space a short page leaves at the foot is the
 * honest rendering of a page that ended early.
 *
 * @param blocks Flow blocks with their measured geometry, as returned by
 *   `measureDocument`.
 * @param starts Page start offsets, ascending, as returned by `paginate()`.
 * @param container Where the sheets are appended. Emptied first.
 * @param contentHeight Total document height, so the last sheet is not padded
 *   out to a full page when the document ends early.
 */
export function renderSheets(
  blocks: MeasuredBlock[],
  starts: number[],
  container: HTMLElement,
  contentHeight: number
): HTMLElement[] {
  container.replaceChildren();
  const sheets: HTMLElement[] = [];
  const total = starts.length;
  const columnWidthPx = A4.contentWidth * (96 / 25.4);

  for (let i = 0; i < total; i += 1) {
    const start = starts[i];
    if (start === undefined) continue;

    // Where this page's content ends: the next page's start, the bottom of the
    // printable box, or the end of the document — whichever comes first.
    const next = i + 1 < total ? starts[i + 1] : undefined;
    const end = Math.min(next ?? contentHeight, start + PAGE_CONTENT_HEIGHT_PX, contentHeight);
    const sliceHeight = Math.max(0, Math.min(end, contentHeight) - start);

    const sheet = document.createElement('div');
    sheet.className = PAGE_SHEET_CLASS;
    // `data-page` is what the stylesheet and the tests key off; it also gives
    // the print rule a stable hook for "every sheet but the last ends a page".
    sheet.dataset.page = String(i + 1);

    // The clipping box is the *content* area, not the sheet. Clipping at the
    // sheet's own border box would let the tail of the slice run into the
    // bottom margin, over the page number and into the strip of the page most
    // printers cannot reach.
    const viewport = document.createElement('div');
    viewport.className = PAGE_VIEWPORT_CLASS;
    viewport.style.height = `${sliceHeight}px`;

    const slice = document.createElement('div');
    slice.className = PAGE_CLONE_CLASS;

    for (const block of blocks) {
      // A block is on this page if any part of it falls inside the slice. The
      // height test matters: a tall figure starting just above `start` still
      // has most of itself on this page.
      if (block.top >= end || block.top + block.height <= start) continue;

      const clone = block.element.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.style.position = 'absolute';
      clone.style.left = '0';
      clone.style.width = `${columnWidthPx}px`;
      // Offsets are absolute, so the flow's own margins would double-count the
      // gap the next block's `top` already encodes.
      clone.style.margin = '0';
      clone.style.top = `${block.top - start}px`;
      // The block's own offset in the document, kept alongside the rendered
      // one. The rendered value goes negative for a block that straddles the
      // page boundary, and that is the normal case rather than the exception —
      // recording both makes "why is there a paragraph above the top of this
      // page" answerable from the DOM instead of from the arithmetic.
      clone.dataset.docTop = String(block.top);
      slice.appendChild(clone);
    }

    viewport.appendChild(slice);
    sheet.appendChild(viewport);

    const footer = document.createElement('div');
    footer.className = 'p-sheet__number';
    // `aria-hidden` because the number is decorative: the toolbar announces the
    // page count once, and a screen reader reading "3 / 12" on every sheet adds
    // nothing to that.
    footer.setAttribute('aria-hidden', 'true');
    footer.textContent = `${i + 1} / ${total}`;

    sheet.appendChild(footer);
    container.appendChild(sheet);
    sheets.push(sheet);
  }

  return sheets;
}

/**
 * Remove the rendered sheets without touching the measured source element.
 */
export function clearSheets(container: HTMLElement): void {
  container.replaceChildren();
}
