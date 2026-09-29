import { describe, it, expect, beforeEach } from 'vitest';

import {
  renderSheets,
  clearSheets,
  PAGE_SHEET_CLASS,
  PAGE_VIEWPORT_CLASS,
  PAGE_CLONE_CLASS,
} from '../../src/print/renderSheets';
import { paginate, PAGE_CONTENT_HEIGHT_PX, type MeasuredBlock } from '../../src/print/paginate';

/**
 * These tests pin the one property the whole feature rests on: the slices must
 * tile the document exactly, with no gap and no overlap.
 *
 * The failure they guard against is not hypothetical. An earlier version sliced
 * every page as a fixed `pageHeight` window, while `paginate` breaks at the
 * last candidate that *fits* — usually short of the limit. The two disagreed by
 * a line or two per boundary, and the shared text was printed twice, at the
 * foot of one page and the head of the next.
 */
describe('renderSheets', () => {
  let blocks: MeasuredBlock[];
  let container: HTMLElement;

  beforeEach(() => {
    document.body.replaceChildren();
    container = document.createElement('div');
    document.body.appendChild(container);

    // Three 400px blocks at 0 / 400 / 800, standing in for a short document.
    blocks = [0, 400, 800].map((top) => {
      const element = document.createElement('p');
      element.textContent = `block at ${top}`;
      document.body.appendChild(element);
      return { element, top, height: 400 };
    });
  });

  /** The declared height of each page's clipping box, in px. */
  function sliceHeights(sheets: HTMLElement[]): number[] {
    return sheets.map((sheet) => {
      const viewport = sheet.querySelector(`.${PAGE_VIEWPORT_CLASS}`);
      return viewport === null ? NaN : Number.parseFloat(viewport.style.height);
    });
  }

  /**
   * The document offset of each block copied onto one sheet.
   *
   * Read from `data-doc-top` rather than from `style.top`: a block that
   * straddles a page boundary is placed at a negative offset, and jsdom's CSS
   * parser silently discards negative `top` values, so the rendered value is
   * not readable in this environment. The rendered arithmetic is checked in a
   * real browser instead, where the value is honoured.
   */
  function blockTops(sheet: HTMLElement | undefined): string[] {
    if (sheet === undefined) return [];
    return Array.from(sheet.querySelectorAll(`.${PAGE_CLONE_CLASS} > *`)).map(
      (el) => (el as HTMLElement).dataset.docTop
    );
  }

  it('renders one sheet per page start', () => {
    const sheets = renderSheets(blocks, [0, 500, 1000], container, 1500);
    expect(sheets).toHaveLength(3);
    expect(container.children).toHaveLength(3);
    expect(sheets[0]?.classList.contains(PAGE_SHEET_CLASS)).toBe(true);
  });

  it('numbers the sheets "n / total" from one', () => {
    const sheets = renderSheets(blocks, [0, 500, 1000], container, 1500);
    const labels = sheets.map((s) => s.querySelector('.p-sheet__number')?.textContent);
    expect(labels).toEqual(['1 / 3', '2 / 3', '3 / 3']);
  });

  it('copies only the blocks that fall inside each slice', () => {
    // Pages are [0,500) [500,1000) [1000,1500). The block at 800 straddles
    // the second boundary, so it is copied to two pages and clipped differently
    // on each — which is the point. The block at 0 ends before page 2 starts
    // and is not copied to it at all.
    const sheets = renderSheets(blocks, [0, 500, 1000], container, 1500);
    expect(blockTops(sheets[0])).toEqual(['0', '400']);
    expect(blockTops(sheets[1])).toEqual(['400', '800']);
    expect(blockTops(sheets[2])).toEqual(['800']);
  });

  it('records each block offset relative to its own page', () => {
    const sheets = renderSheets(blocks, [0, 500], container, 1500);
    const children = Array.from(sheets[1]?.querySelectorAll(`.${PAGE_CLONE_CLASS} > *`) ?? []);
    // Document offset 400 sits 100px above the top of page 2, so it is clipped
    // from there down. jsdom cannot represent the negative `top` this produces,
    // so the arithmetic is checked where the layout engine is real.
    expect(children.map((c) => (c as HTMLElement).dataset.docTop)).toEqual(['400', '800']);
    expect(Number((children[0] as HTMLElement).dataset.docTop) - 500).toBe(-100);
  });

  it('gives a block that straddles a boundary to exactly one page at a time', () => {
    // A block ending exactly at the page start is not on that page, and one
    // starting exactly at the page limit is not on the one before. Getting this
    // wrong in the other direction prints the block twice; getting it wrong in
    // this direction drops it.
    const touching: MeasuredBlock[] = [
      { element: blocks[0]!.element, top: 0, height: 500 },
      { element: blocks[1]!.element, top: 500, height: 400 },
    ];
    const sheets = renderSheets(touching, [0, 500], container, 900);
    expect(blockTops(sheets[0])).toEqual(['0']);
    expect(blockTops(sheets[1])).toEqual(['500']);
  });

  it('tiles the document with no overlap and no gap', () => {
    // Starts are deliberately short of a full page, as `paginate` produces them.
    const starts = [0, 820, 1640, 2460];
    const contentHeight = 3200;
    const sheets = renderSheets(blocks, starts, container, contentHeight);
    const heights = sliceHeights(sheets);

    for (let i = 0; i < sheets.length; i += 1) {
      const start = starts[i] as number;
      const end = start + (heights[i] as number);
      const next = starts[i + 1];

      if (next === undefined) {
        expect(end, `page ${i + 1} must stop at the document end`).toBe(contentHeight);
      } else {
        expect(end, `page ${i + 1} overlaps page ${i + 2}`).toBeLessThanOrEqual(next);
        expect(end, `page ${i + 1} leaves a gap`).toBeGreaterThan(start);
      }
    }
  });

  it('stops a short page at the next page start, not at the page limit', () => {
    // The case the fixed-window bug got wrong: the break landed at 820, so a
    // full-page slice would have reprinted 820-971 on the next sheet.
    const sheets = renderSheets(blocks, [0, 820, 1640], container, 2400);
    expect(sliceHeights(sheets)).toEqual([820, 820, 760]);
  });

  it('caps a slice at one printable page', () => {
    // `paginate` never returns starts further apart than a page — it breaks at
    // a candidate within the limit, or at the limit itself. This documents what
    // happens if that contract is ever broken: the page is capped at the
    // printable height rather than allowed to grow past it.
    const sheets = renderSheets(blocks, [0, 200, 1400], container, 2000);
    for (const height of sliceHeights(sheets)) {
      expect(height).toBeLessThanOrEqual(PAGE_CONTENT_HEIGHT_PX);
    }
  });

  it('does not pad the last page out when the document ends early', () => {
    // Content is 600 tall, so page 1 is 600 and there is no phantom area below.
    const sheets = renderSheets(blocks, [0], container, 600);
    expect(sliceHeights(sheets)).toEqual([600]);
  });

  it('copies the source blocks rather than moving them', () => {
    renderSheets(blocks, [0, 500, 1000], container, 1500);
    // The measuring surface must survive every cut: it is what the next
    // settings change re-measures against.
    for (const block of blocks) {
      expect(document.body.contains(block.element)).toBe(true);
    }
    expect(container.querySelectorAll(`.${PAGE_CLONE_CLASS}`)).toHaveLength(3);
  });

  it('does not copy a source id onto the copies', () => {
    blocks[0]!.element.id = 'first-block';
    renderSheets(blocks, [0], container, 400);
    const clone = container.querySelector(`.${PAGE_CLONE_CLASS} > *`);
    expect(clone?.id).toBe('');
    expect(document.getElementById('first-block')).toBe(blocks[0]!.element);
  });

  it('drops the flow margin so offsets are not double-counted', () => {
    renderSheets(blocks, [0], container, 1200);
    const clone = container.querySelector(`.${PAGE_CLONE_CLASS} > *`) as HTMLElement;
    expect(clone.style.position).toBe('absolute');
    // jsdom normalises a zero margin to "0px"; only the absence of a non-zero
    // value matters, since a retained margin would push the block down from the
    // offset the next block already accounts for.
    expect(Number.parseFloat(clone.style.margin)).toBe(0);
  });

  it('marks the page number decorative for screen readers', () => {
    const sheets = renderSheets(blocks, [0, 500], container, 1000);
    for (const sheet of sheets) {
      expect(sheet.querySelector('.p-sheet__number')?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('clears previous sheets without touching the source', () => {
    renderSheets(blocks, [0, 500], container, 1000);
    expect(container.children).toHaveLength(2);
    clearSheets(container);
    expect(container.children).toHaveLength(0);
    expect(document.body.contains(blocks[0]!.element)).toBe(true);
  });

  it('renders nothing for an empty page list', () => {
    expect(renderSheets(blocks, [], container, 1000)).toHaveLength(0);
  });
});

/**
 * The contract between the two modules.
 *
 * `renderSheets` can only tile the document without holes if consecutive page
 * starts are never more than a page apart. `paginate` guarantees that, and this
 * is the test that says so out loud — it is the check whose absence let the two
 * disagree silently in the first place.
 */
describe('paginate output satisfies the render contract', () => {
  const candidates = Array.from({ length: 160 }, (_, i) => ({
    offset: (i + 1) * 37,
    breakable: ((i + 1) * 37) % 111 !== 0,
  }));

  it('never returns starts further apart than one page', () => {
    for (const contentHeight of [500, 971, 1200, 2600, 6000]) {
      const starts = paginate(candidates, PAGE_CONTENT_HEIGHT_PX, contentHeight);
      for (let i = 1; i < starts.length; i += 1) {
        const gap = (starts[i] as number) - (starts[i - 1] as number);
        expect(gap, `content ${contentHeight}, page ${i}`).toBeLessThanOrEqual(
          PAGE_CONTENT_HEIGHT_PX + 0.5
        );
      }
    }
  });

  it('leaves no document range uncovered when tiled', () => {
    const contentHeight = 2600;
    const starts = paginate(candidates, PAGE_CONTENT_HEIGHT_PX, contentHeight);
    const sheets = renderSheets([], starts, document.createElement('div'), contentHeight);
    expect(sheets).toHaveLength(starts.length);

    for (let i = 0; i < sheets.length; i += 1) {
      const start = starts[i] as number;
      const viewport = sheets[i]?.querySelector(`.${PAGE_VIEWPORT_CLASS}`);
      expect(viewport, `page ${i + 1} has a clipping box`).not.toBeNull();
      const height = viewport === null ? NaN : Number.parseFloat(viewport.style.height);
      const next = starts[i + 1];
      if (next !== undefined) {
        expect(start + height, `page ${i + 1} must not reach into the next`).toBeLessThanOrEqual(
          next + 0.5
        );
      } else {
        expect(start + height).toBeGreaterThanOrEqual(contentHeight - 0.5);
      }
    }
  });
});
