/**
 * Break-decision refinement — measured, not guessed.
 *
 * The stylesheet keeps short code blocks and tables whole on paper
 * (break-inside: avoid). That rule has a cost: a block taller than the
 * space left on the page is pushed entirely to the next page, and the
 * leftover space stays blank.
 *
 * Line-count heuristics cannot see rendered size, so once the document is
 * laid out we measure each candidate block and mark anything taller than
 * half a printable page as breakable.
 *
 * This runs after images have settled, because loaded images change block
 * heights. It runs on the print page itself, where the text column is the
 * same 174mm the printer will use, so the measurements carry over to print.
 */

import { ALLOW_BREAK_THRESHOLD_MM } from '../shared/constants';

/** CSS px to mm at the standard 96dpi print scale. */
const MM_PER_PX = 25.4 / 96;

/**
 * Whether a block of the given rendered height should be allowed to break
 * across pages rather than be kept whole.
 */
export function shouldAllowBreak(
  heightPx: number,
  thresholdMm: number = ALLOW_BREAK_THRESHOLD_MM
): boolean {
  return heightPx * MM_PER_PX > thresholdMm;
}

/**
 * Mark oversized code blocks and tables as breakable.
 *
 * Figures are deliberately excluded — a photo split across two pages reads
 * worse than the gap it leaves, and image heights are already capped in
 * print.css (150mm), which bounds the worst gap instead.
 *
 * Returns how many blocks were marked.
 */
export function markOversizedBlocks(root: HTMLElement): number {
  let marked = 0;
  const candidates = root.querySelectorAll<HTMLElement>('.p-code, .p-table-wrap');
  for (const block of Array.from(candidates)) {
    if (block.getAttribute('data-long') === 'true') continue;
    if (shouldAllowBreak(block.offsetHeight)) {
      block.setAttribute('data-long', 'true');
      marked += 1;
    }
  }
  return marked;
}
