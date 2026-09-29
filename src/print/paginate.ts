/**
 * Pagination engine.
 *
 * ## Why this exists, and what happened to the old "no preview" rule
 *
 * The print page used to carry a deliberate rule: no pagination preview,
 * because browsers expose no API to query where a page break will fall. Any
 * preview we drew would be "an estimate that looks authoritative but is often
 * wrong". That reasoning was sound *as long as the preview was advisory* — we
 * drew a guess, then handed the same document to Chrome and let it fragment
 * again, so the two could never be made to agree.
 *
 * This module removes the disagreement instead of apologising for it. The
 * document is measured once, cut into discrete sheets, and **those sheets are
 * what gets printed**. The preview is not a prediction of the output; it is the
 * output. See `print.css`, where each sheet is exactly one printed page.
 *
 * ## How the cut is measured
 *
 * The article is laid out once in a real 174mm column — the same width the
 * printer uses — and every legal break position is read off that layout. The
 * sheets are then produced by cloning the content and clipping each clone to
 * its page's slice. Because nothing is ever re-flowed into a per-page
 * container, line breaking inside a paragraph is identical to the continuous
 * flow, which is what the print engine does too.
 *
 * `paginate()` is pure: candidates in, page starts out. The whole pagination
 * policy is therefore testable without a layout engine, and only
 * `measureCandidates()` needs one.
 */

import { A4 } from '../shared/constants';

/** CSS px per mm at the standard 96dpi reference. */
const PX_PER_MM = 96 / 25.4;

/** A4 printable height (297 - 20 * 2) expressed in CSS px. */
export const PAGE_CONTENT_HEIGHT_PX = A4.contentHeight * PX_PER_MM;

/**
 * One position where a page break may fall.
 *
 * `breakable` carries the policy rather than leaving it to the caller: a
 * heading may not be stranded at the foot of a page, a figure may not be cut in
 * half, and a short code block is kept whole. Non-breakable candidates still
 * exist — they mark where content sits — but `paginate` never selects one.
 */
export interface BreakCandidate {
  /** Distance from the top of the measured content, in CSS px. */
  offset: number;
  /** True when a page break is allowed to fall here. */
  breakable: boolean;
}

/** How a block is allowed to be cut. */
type Splittability = 'never' | 'lines';

/**
 * A unit of flow: an element, or a bare run of text.
 *
 * `sanitizeArticleHtml` can leave loose text at the top of the article — prose
 * Readability never wrapped in a block — and that text still occupies vertical
 * space and still needs somewhere legal to break.
 */
type FlowNode = HTMLElement | Text;

/** One flow block, with the geometry it was measured at. */
export interface MeasuredBlock {
  /** The block as rendered in the measuring surface. */
  element: HTMLElement;
  /** Distance from the top of the document, in CSS px. */
  top: number;
  /** Rendered height, in CSS px. */
  height: number;
}

/** Everything one measurement pass produced. */
export interface DocumentLayout {
  /** Total rendered height of the document, in CSS px. */
  height: number;
  /** Flow blocks in document order. */
  blocks: MeasuredBlock[];
  /** Legal break positions, ascending. */
  candidates: BreakCandidate[];
}

/** Blocks that must never be cut, whatever their height. */
const ATOMIC_SELECTOR = 'figure, table, hr, h1, h2, h3, h4, h5, h6';

/** Blocks whose text may be cut between lines. */
const SPLITTABLE_SELECTOR = 'p, li, blockquote, pre, .p-table-wrap, .p-code, .p-content, div';

/** Headings, which must not be left as the last thing on a page. */
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

/**
 * Minimum lines that must remain on each side of a break inside a paragraph.
 *
 * One line stranded at the top of a page (a widow) or hanging alone at the
 * bottom (an orphan) reads as a layout mistake even when the type is correct.
 */
const MIN_LINES_EACH_SIDE = 2;

/** An upper bound on pages, so a pathological layout cannot spin forever. */
const MAX_PAGES = 2000;

/**
 * Decide where each page starts.
 *
 * Pure: the whole pagination policy lives here, so it can be tested against
 * synthetic layouts instead of a real one.
 *
 * The loop is driven by **content height**, not by the candidate list. Running
 * out of candidates does not mean the document is finished — the last block may
 * simply be taller than a page and offer nowhere to cut — and stopping there
 * would silently drop its tail. Conversely, a document whose last candidate is
 * also its last content has nothing left to place, so the height test is what
 * ends the loop in both directions.
 *
 * @param candidates Break positions in ascending offset order.
 * @param pageHeight Printable height of one page, in CSS px.
 * @param contentHeight Total rendered height of the document, in CSS px.
 * @returns Ascending offsets at which each page begins. Always starts at 0.
 */
export function paginate(
  candidates: BreakCandidate[],
  pageHeight: number = PAGE_CONTENT_HEIGHT_PX,
  contentHeight: number = 0
): number[] {
  const starts: number[] = [0];
  if (pageHeight <= 0) return starts;

  let index = 0;

  for (let guard = 0; guard < MAX_PAGES; guard += 1) {
    const pageStart = starts[starts.length - 1];
    // Everything that fits on this page is already placed.
    if (pageStart + pageHeight >= contentHeight) break;
    const limit = pageStart + pageHeight;

    // The last breakable candidate that still fits. Scanning forward from
    // `index` rather than restarting keeps this linear in the number of
    // candidates instead of quadratic in the page count.
    let chosen = -1;
    for (let j = index; j < candidates.length; j += 1) {
      const candidate = candidates[j];
      if (candidate === undefined || candidate.offset > limit) break;
      if (candidate.breakable) chosen = j;
    }

    // A break at or before where this page already starts would produce a page
    // with nothing on it, so the next legal one past the limit is taken instead.
    if (chosen !== -1) {
      const picked = candidates[chosen];
      if (picked !== undefined && picked.offset > pageStart + 0.5) {
        starts.push(picked.offset);
        // Resume the scan past the break just taken. Everything at or before it
        // belongs to a page that is already placed.
        index = chosen + 1;
        continue;
      }
    }

    // Nothing legal fits: an atomic block taller than a page, or the tail of
    // the document. Cut at the limit itself. Progress is guaranteed because
    // the next page starts a full pageHeight further on, and `contentHeight`
    // bounds the loop even without MAX_PAGES.
    starts.push(limit);
    while (index < candidates.length) {
      const candidate = candidates[index];
      if (candidate === undefined || candidate.offset > limit) break;
      index += 1;
    }
  }

  return starts;
}

/* ------------------------------------------------------------------ */
/* Measurement                                                         */
/* ------------------------------------------------------------------ */

/**
 * Elements that only wrap other blocks and carry no formatting of their own.
 *
 * Sanitized article HTML keeps whatever wrappers the source page used, so the
 * article body is frequently `<div class="post-body">` or `<article>` around
 * the real blocks. Treating one of those as a single unbreakable block would
 * report the whole document as one page — which is exactly the bug this
 * collector was written to avoid, one level further down.
 *
 * `ul`/`ol` are here for the same reason, and it matters more than it looks: a
 * list is a sequence of items, and the only sensible place to break one is
 * between two items. Descending to the `li` level makes those boundaries
 * candidates. Without this a long list is one opaque block and the page boundary
 * lands wherever the pixel falls — usually through the middle of an item,
 * which is the most common complaint about generated PDFs.
 */
const WRAPPER_SELECTOR = 'div, article, section, main, aside, header, footer, ul, ol';

/**
 * Blocks that are themselves the unit, even though they wrap other elements.
 *
 * `markBreaks` measures these and sets `data-long` on them once they pass half
 * a printable page; the break policy is then allowed to cut them. Treating them
 * as wrappers would discard that measurement.
 */
const UNIT_SELECTOR = '.p-code, .p-table-wrap';

/**
 * The block-level nodes that make up the article's flow, in document order.
 *
 * Measured against the sheet's direct children this finds one node — the
 * `.p-doc` wrapper — and reports a single unbroken page, because a container is
 * not a block. The flow is therefore read from `.p-content`, descending through
 * formatting-free wrappers until the real blocks are reached.
 *
 * Descending stops at a block that carries its own formatting. A paragraph
 * inside a blockquote is therefore part of that blockquote's unit: a page may
 * break between two paragraphs of a long quotation, but not through the middle
 * of one, because the break candidates are line positions measured inside the
 * quote as a whole.
 */
function collectFlowNodes(content: HTMLElement): FlowNode[] {
  const nodes: FlowNode[] = [];

  const walk = (parent: Node): void => {
    for (const child of Array.from(parent.childNodes)) {
      if (child instanceof Text) {
        if (child.textContent?.trim()) nodes.push(child);
        continue;
      }
      if (!(child instanceof HTMLElement)) continue;

      if (child.classList.contains('p-content')) {
        walk(child);
        continue;
      }
      // A code block and a wrapped table are pagination units, not mere
      // wrappers: `markBreaks` measures them and sets `data-long` once they pass
      // half a page. Descending through them would throw that decision away —
      // the flow node would become the inner `pre` or `table`, and a long block
      // would be split like short prose while a long table would be treated as
      // unsplittable, which is the opposite of what was measured.
      if (child.matches(UNIT_SELECTOR)) {
        nodes.push(child);
        continue;
      }
      // Descend only through wrappers that hold other blocks. An empty wrapper,
      // or one holding a single image, is content in its own right.
      if (child.matches(WRAPPER_SELECTOR) && child.children.length > 0) {
        walk(child);
        continue;
      }
      nodes.push(child);
    }
  };

  walk(content);
  return nodes;
}

/** Classify how a block may be cut. */
function splittabilityOf(node: FlowNode): Splittability {
  if (!(node instanceof HTMLElement)) return 'lines';
  if (node.matches(ATOMIC_SELECTOR)) return 'never';
  // `data-long` is set by markBreaks once a code block or table measures taller
  // than half a page. Below that the block moves to the next page whole, which
  // is what the print stylesheet's `break-inside: avoid` already asks for.
  if (node.matches('.p-code, .p-table-wrap') && node.dataset.long !== 'true') {
    return 'never';
  }
  return node.matches(SPLITTABLE_SELECTOR) ? 'lines' : 'never';
}

/** Cached once: probing allocates a Range, and this is asked per block. */
let geometryAvailable: boolean | null = null;

/**
 * Whether this environment can measure text layout at all.
 *
 * Line positions come from `Range.getClientRects()`, which a document without a
 * layout engine does not implement — jsdom, for one, returns a Range with no
 * geometry methods on it. There is no useful answer to "where does this line
 * break" in such an environment, and the honest degradation is a single page
 * rather than a guess. Real Chrome always has it, so this only ever fires in
 * tests, but the print page must not throw on boot because of it.
 */
function canMeasureLayout(): boolean {
  if (geometryAvailable === null) {
    geometryAvailable = typeof document.createRange().getClientRects === 'function';
  }
  return geometryAvailable;
}

/**
 * Top edge of a flow node, relative to the measured container.
 *
 * Elements report their border-box top, so the candidate sits above the
 * block's own margin, padding and border — the break lands where the block
 * begins, not where its first line of text happens to be. Using the text rect
 * for elements would push the break down past every top margin and quietly
 * under-fill the page above it.
 *
 * Bare text nodes have no box, so they fall back to their first line rect.
 */
function topOf(node: FlowNode, containerTop: number): number {
  if (!canMeasureLayout()) return 0;
  if (node instanceof HTMLElement) {
    return node.getBoundingClientRect().top - containerTop;
  }
  const range = document.createRange();
  range.selectNodeContents(node);
  const first = range.getClientRects()[0];
  // An empty text node has no rects. Reporting the container top would plant a
  // phantom candidate at offset 0, so fall back to the node's own box.
  return (first ? first.top : containerTop) - containerTop;
}

/**
 * Offsets of every line box inside a block, relative to `containerTop`.
 *
 * A Range over a text node reports one client rect per line box, which gives
 * real line positions without walking character by character. Only distinct
 * tops are kept: consecutive characters on one line all report the same one.
 */
function lineOffsetsIn(node: FlowNode, containerTop: number): number[] {
  const offsets: number[] = [];
  const targets: Text[] = [];

  if (node instanceof Text) {
    targets.push(node);
  } else {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
      targets.push(n as Text);
    }
  }

  for (const target of targets) {
    const text = target.textContent;
    if (text === null || text.trim() === '') continue;

    const range = document.createRange();
    range.selectNodeContents(target);

    for (const rect of Array.from(range.getClientRects())) {
      if (rect.height === 0) continue;
      const top = rect.top - containerTop;
      const last = offsets[offsets.length - 1];
      if (last === undefined || Math.abs(top - last) > 0.5) offsets.push(top);
    }
  }

  return offsets;
}

/**
 * Measure the laid-out article: its height, its flow blocks, and every legal
 * break position.
 *
 * One pass, because the block geometry and the break candidates are two views
 * of the same walk, and the renderer needs both. Measuring separately would
 * risk the two describing different documents.
 *
 * Must run after images have settled: a lazy image that resolves later moves
 * every offset below it.
 *
 * @param content The rendered article (the `.p-doc` element), laid out at the
 *   print column width.
 */
export function measureDocument(content: HTMLElement): DocumentLayout {
  const containerTop = content.getBoundingClientRect().top;
  if (!canMeasureLayout()) {
    return { height: 0, blocks: [], candidates: [] };
  }

  const candidates: BreakCandidate[] = [];
  const blocks: MeasuredBlock[] = [];
  let previous: FlowNode | null = null;

  for (const node of collectFlowNodes(content)) {
    const top = topOf(node, containerTop);

    // Bare text runs are cut between lines like a paragraph, but they have no
    // box of their own to hand to the renderer as a block, so only elements
    // become measurable blocks.
    if (node instanceof HTMLElement) {
      const rect = node.getBoundingClientRect();
      blocks.push({ element: node, top, height: rect.height });
    }

    // A break *before* this node, suppressed when the previous node is a
    // heading. A page whose last line is a section title reads as a layout
    // mistake — the same `page-break-after: avoid` the print stylesheet already
    // asks the engine for.
    if (previous !== null) {
      candidates.push({
        offset: top,
        breakable: !(previous instanceof HTMLElement && previous.matches(HEADING_SELECTOR)),
      });
    }

    if (splittabilityOf(node) === 'lines') {
      const lines = lineOffsetsIn(node, containerTop);
      const lineCount = lines.length;
      for (let i = 1; i < lines.length; i += 1) {
        const offset = lines[i];
        // Two lines must stay on each side: `i` above, `lineCount - i` below.
        candidates.push({
          offset,
          breakable: i >= MIN_LINES_EACH_SIDE && lineCount - i >= MIN_LINES_EACH_SIDE,
        });
      }
    }

    previous = node;
  }

  candidates.sort((a, b) => a.offset - b.offset);
  return { height: content.getBoundingClientRect().height, blocks, candidates };
}
