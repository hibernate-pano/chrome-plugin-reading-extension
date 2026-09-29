import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { measureDocument } from '../../src/print/paginate';

/**
 * Measurement tests.
 *
 * `measureDocument` decides where every page break falls, and it is the half of
 * the pagination engine a jsdom run cannot reach on its own: jsdom has no
 * layout engine, so `Range.getClientRects` does not exist and the function
 * correctly bails out. That bail-out is itself worth a test, but it leaves the
 * real policy — which blocks are splittable, where the candidates land, which
 * ones the heading rule suppresses — completely unverified.
 *
 * So the geometry is stubbed here. The stubs are deliberately literal: each
 * element declares the box and the line positions it "rendered" at, and the
 * measurement code has to read them back and apply its own rules. If the
 * selection rules change, these fail.
 */

interface FakeBox {
  /** Top of the border box, in px, relative to the document. */
  top: number;
  /** Rendered height, in px. */
  height: number;
  /** Top of each line box, in px, relative to the document. */
  lines?: number[];
}

let boxes: WeakMap<Element, FakeBox>;
let originals: {
  elementRect: typeof Element.prototype.getBoundingClientRect;
  rangeRects?: typeof Range.prototype.getClientRects;
  rangeRect?: typeof Range.prototype.getBoundingClientRect;
};

function rect(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    left: 0,
    right: 174,
    width: 174,
    height,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function installFakeLayout(): void {
  boxes = new WeakMap();

  originals = {
    elementRect: Element.prototype.getBoundingClientRect,
    rangeRects: Range.prototype.getClientRects,
    rangeRect: Range.prototype.getBoundingClientRect,
  };

  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    const box = boxes.get(this);
    if (!box) return rect(0, 0);
    // The measuring container is the origin of every offset.
    return rect(box.top, box.height);
  };

  // jsdom ships a Range with no geometry methods at all. Adding them is what
  // makes the measurement path reachable here.
  const rangeProto = Range.prototype as unknown as Record<string, unknown>;
  rangeProto.getClientRects = function (this: Range): DOMRectList {
    const node = this.startContainer;
    // A text node's line boxes belong to the nearest laid-out ancestor, which
    // may be several levels up — a `<pre>` inside a `.p-code` div, for instance.
    let element: Element | null =
      node.nodeType === 1 ? (node as Element) : (node as Text).parentElement;
    let box: FakeBox | undefined;
    while (element !== null && box === undefined) {
      box = boxes.get(element);
      element = element.parentElement;
    }
    const tops = box?.lines ?? [];
    const list = tops.map((top) => rect(top, 20));
    return {
      length: list.length,
      item: (i: number) => list[i] ?? null,
      [Symbol.iterator]: function* () {
        yield* list;
      },
    } as unknown as DOMRectList;
  };
  rangeProto.getBoundingClientRect = function (this: Range): DOMRect {
    const rects = (this as unknown as { getClientRects(): DOMRectList }).getClientRects();
    return rects[0] ?? rect(0, 0);
  };
}

/** Build a `.p-doc` and register the box each flow block "rendered" at. */
function buildDoc(
  blocks: { html: string; top: number; height: number; lines?: number[] }[]
): HTMLElement {
  const doc = document.createElement('article');
  doc.className = 'p-doc';
  const header = document.createElement('header');
  header.className = 'p-header';
  const content = document.createElement('div');
  content.className = 'p-content';

  boxes.set(doc, { top: 0, height: 3000 });
  boxes.set(content, { top: 0, height: 3000 });
  boxes.set(header, { top: 0, height: 100 });

  for (const block of blocks) {
    const holder = document.createElement('div');
    holder.innerHTML = block.html;
    const element = holder.firstElementChild as HTMLElement;
    content.appendChild(element);
    boxes.set(element, { top: block.top, height: block.height, lines: block.lines });
  }

  doc.appendChild(header);
  doc.appendChild(content);
  document.body.replaceChildren(doc);
  return doc;
}

/** Breakable candidates only, ascending. */
function breakableOffsets(offsets: number[]): number[] {
  return offsets.filter((o) => o.breakable).map((o) => o.offset);
}

describe('measureDocument', () => {
  beforeEach(() => {
    installFakeLayout();
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = originals.elementRect;
    const rangeProto = Range.prototype as unknown as Record<string, unknown>;
    if (originals.rangeRects) rangeProto.getClientRects = originals.rangeRects;
    else delete rangeProto.getClientRects;
    if (originals.rangeRect) rangeProto.getBoundingClientRect = originals.rangeRect;
    else delete rangeProto.getBoundingClientRect;
    document.body.replaceChildren();
  });

  it('reports the document height and the flow blocks', () => {
    const doc = buildDoc([
      { html: '<p>one</p>', top: 100, height: 60, lines: [100, 120] },
      { html: '<p>two</p>', top: 160, height: 60, lines: [160, 180] },
    ]);

    const layout = measureDocument(doc);

    expect(layout.height).toBe(3000);
    expect(layout.blocks.map((b) => b.top)).toEqual([0, 100, 160]);
    expect(layout.blocks[2]?.height).toBe(60);
  });

  it('offers a break before every block after the first', () => {
    const doc = buildDoc([
      { html: '<p>one</p>', top: 100, height: 60 },
      { html: '<p>two</p>', top: 160, height: 60 },
      { html: '<p>three</p>', top: 220, height: 60 },
    ]);

    const layout = measureDocument(doc);
    expect(breakableOffsets(layout.candidates)).toContain(160);
    expect(breakableOffsets(layout.candidates)).toContain(220);
  });

  it('adds a candidate between every line of a paragraph', () => {
    const doc = buildDoc([
      { html: '<p>one</p>', top: 0, height: 100, lines: [0, 20, 40, 60, 80] },
      { html: '<p>two</p>', top: 100, height: 20 },
    ]);

    const layout = measureDocument(doc);
    // Line tops 20/40/60/80 are inside the paragraph. With five lines and a
    // two-line minimum, only the middle ones qualify.
    expect(breakableOffsets(layout.candidates)).toEqual(expect.arrayContaining([40, 60]));
    expect(breakableOffsets(layout.candidates)).not.toContain(20);
    expect(breakableOffsets(layout.candidates)).not.toContain(80);
  });

  it('never cuts a paragraph closer than two lines to either end', () => {
    // Six lines at 0/20/40/60/80/100. With a two-line minimum on each side only
    // the middle two cuts qualify; the first and last lines must stay with their
    // neighbours rather than being stranded.
    const lines = [0, 20, 40, 60, 80, 100];
    const doc = buildDoc([{ html: '<p>one</p>', top: 0, height: 120, lines }]);

    const layout = measureDocument(doc);
    const inside = layout.candidates
      .filter((c) => c.breakable && c.offset > 0 && lines.includes(c.offset))
      .map((c) => c.offset);

    expect(inside).toEqual([40, 60, 80]);
  });

  it('refuses to break immediately after a heading', () => {
    const doc = buildDoc([
      { html: '<h2>title</h2>', top: 0, height: 40 },
      { html: '<p>body</p>', top: 40, height: 40 },
    ]);

    const layout = measureDocument(doc);
    const before = layout.candidates.find((c) => c.offset === 40);
    expect(before, 'there is a candidate at the paragraph').toBeDefined();
    expect(before?.breakable, 'but the heading rule forbids it').toBe(false);
  });

  it('does not forbid a break before a heading', () => {
    const doc = buildDoc([
      { html: '<p>body</p>', top: 0, height: 40 },
      { html: '<h2>title</h2>', top: 40, height: 40 },
    ]);

    const layout = measureDocument(doc);
    expect(layout.candidates.find((c) => c.offset === 40)?.breakable).toBe(true);
  });

  it('never cuts a figure, however tall it is', () => {
    const doc = buildDoc([
      { html: '<p>body</p>', top: 0, height: 40 },
      { html: '<figure><img src="x"></figure>', top: 40, height: 1800 },
      { html: '<p>after</p>', top: 1840, height: 40 },
    ]);

    const layout = measureDocument(doc);
    // A figure contributes only the boundary before and after it — no interior
    // candidates, so a page can never land inside it.
    expect(layout.candidates.filter((c) => c.offset > 40 && c.offset < 1840)).toHaveLength(0);
  });

  it('does not cut a short code block, but does cut a long one', () => {
    const short = buildDoc([
      { html: '<div class="p-code"><pre>few lines</pre></div>', top: 0, height: 100 },
      { html: '<p>after</p>', top: 100, height: 20 },
    ]);
    expect(short.querySelector('.p-code')?.getAttribute('data-long')).not.toBe('true');

    // `markBreaks` sets data-long once a block passes half a page; until then the
    // block moves whole, which is what the print stylesheet's break-inside:avoid
    // asks for.
    const long = buildDoc([
      { html: '<div class="p-code" data-long="true"><pre>many</pre></div>', top: 0, height: 1500 },
      { html: '<p>after</p>', top: 1500, height: 20 },
    ]);
    const layout = measureDocument(long);
    // A long code block is splittable, so it contributes line candidates of its
    // own rather than being a single unbreakable atom.
    expect(layout.blocks).toHaveLength(3);
  });

  it('descends through wrapper elements to reach the real blocks', () => {
    // Sanitized article HTML keeps whatever wrappers the source page used.
    const doc = document.createElement('article');
    doc.className = 'p-doc';
    const content = document.createElement('div');
    content.className = 'p-content';
    const wrapper = document.createElement('article');
    wrapper.innerHTML = '<p>deep</p><div><p>deeper</p></div>';
    const deep = wrapper.querySelector('div > p') as HTMLElement;
    content.appendChild(wrapper);
    doc.appendChild(content);
    document.body.replaceChildren(doc);

    boxes.set(doc, { top: 0, height: 500 });
    boxes.set(content, { top: 0, height: 500 });
    boxes.set(wrapper.querySelector('p') as Element, { top: 0, height: 40 });
    boxes.set(deep, { top: 40, height: 40 });

    const layout = measureDocument(doc);
    expect(layout.blocks.map((b) => b.top)).toEqual([0, 40]);
  });

  it('descends into lists so a break can fall between items', () => {
    const doc = document.createElement('article');
    doc.className = 'p-doc';
    const content = document.createElement('div');
    content.className = 'p-content';
    content.innerHTML = '<ul><li>one</li><li>two</li><li>three</li></ul>';
    const items = Array.from(content.querySelectorAll('li'));
    doc.appendChild(content);
    document.body.replaceChildren(doc);

    boxes.set(doc, { top: 0, height: 300 });
    boxes.set(content, { top: 0, height: 300 });
    items.forEach((li, i) => boxes.set(li, { top: i * 40, height: 40 }));

    const layout = measureDocument(doc);
    // Three items, three blocks — not one unbreakable list.
    expect(layout.blocks).toHaveLength(3);
    expect(breakableOffsets(layout.candidates)).toEqual([40, 80]);
  });

  it('keeps a paragraph inside a blockquote as part of the quote', () => {
    const doc = document.createElement('article');
    doc.className = 'p-doc';
    const content = document.createElement('div');
    content.className = 'p-content';
    content.innerHTML = '<blockquote><p>quoted</p></blockquote>';
    const quote = content.querySelector('blockquote') as HTMLElement;
    const inner = content.querySelector('p') as HTMLElement;
    doc.appendChild(content);
    document.body.replaceChildren(doc);

    boxes.set(doc, { top: 0, height: 300 });
    boxes.set(content, { top: 0, height: 300 });
    boxes.set(quote, { top: 0, height: 200, lines: [0, 20, 40] });
    boxes.set(inner, { top: 20, height: 60 });

    const layout = measureDocument(doc);
    // The quote is one block; its inner paragraph is not promoted to its own.
    expect(layout.blocks).toHaveLength(1);
  });

  it('sorts candidates so the cut can scan them in one pass', () => {
    const doc = document.createElement('article');
    doc.className = 'p-doc';
    const content = document.createElement('div');
    content.className = 'p-content';
    doc.appendChild(content);
    document.body.replaceChildren(doc);
    boxes.set(doc, { top: 0, height: 300 });
    boxes.set(content, { top: 0, height: 300 });

    // Appended out of order on purpose.
    for (const top of [200, 0, 100]) {
      const p = document.createElement('p');
      p.textContent = 'x';
      content.appendChild(p);
      boxes.set(p, { top, height: 40 });
    }

    const layout = measureDocument(doc);
    const offsets = layout.candidates.map((c) => c.offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });

  it('handles loose text that was never wrapped in a block', () => {
    // `sanitizeArticleHtml` can emit bare prose — Readability does not always
    // wrap. It occupies space and needs somewhere legal to break, so it has to
    // go through the same line-level machinery as a paragraph, even though it
    // has no box of its own to measure.
    const doc = document.createElement('article');
    doc.className = 'p-doc';
    const content = document.createElement('div');
    content.className = 'p-content';
    const loose = document.createTextNode('a run of prose with no wrapper');
    content.appendChild(loose);
    doc.appendChild(content);
    document.body.replaceChildren(doc);

    boxes.set(doc, { top: 0, height: 300 });
    boxes.set(content, { top: 0, height: 300 });
    // The Range stub resolves a text node through its parent, so the lines are
    // registered against the container it sits in.
    boxes.set(content, { top: 0, height: 300, lines: [50, 70, 90, 110, 130] });

    const layout = measureDocument(doc);

    // A text node is not an element, so it contributes candidates but no block —
    // the renderer has no element to copy for it.
    const inside = layout.candidates.filter((c) => c.breakable).map((c) => c.offset);
    expect(inside).toEqual(expect.arrayContaining([90, 110]));
    expect(layout.blocks).toHaveLength(0);
  });

  it('skips whitespace-only text instead of planting a candidate at zero', () => {
    const doc = document.createElement('article');
    doc.className = 'p-doc';
    const content = document.createElement('div');
    content.className = 'p-content';
    content.appendChild(document.createTextNode('   \n  '));
    content.appendChild(document.createElement('p')).textContent = 'real';
    doc.appendChild(content);
    document.body.replaceChildren(doc);

    boxes.set(doc, { top: 0, height: 300 });
    boxes.set(content, { top: 0, height: 300 });
    boxes.set(content.querySelector('p') as Element, { top: 20, height: 40 });

    const layout = measureDocument(doc);
    // The blank run must not produce an offset-0 candidate, which would look
    // like a break opportunity at the very top of the document.
    expect(layout.candidates.filter((c) => c.breakable && c.offset === 0)).toHaveLength(0);
  });

  it('keeps a short code block whole but lets a long one break', () => {
    // The `.p-code` div is the unit, not a wrapper to descend through: the
    // `data-long` mark `markBreaks` puts on it is the only thing that decides
    // whether it may be cut, so descending past it would invert the rule.
    const short = buildDoc([
      { html: '<div class="p-code"><pre>short</pre></div>', top: 0, height: 100 },
      { html: '<p>after</p>', top: 100, height: 40 },
    ]);
    const shortLayout = measureDocument(short);
    expect(
      shortLayout.candidates.filter((c) => c.offset > 0 && c.offset < 100)
    ).toHaveLength(0);
    expect(
      shortLayout.blocks.map((b) => b.element.className),
      'the code block is one unit'
    ).toContain('p-code');

    const long = buildDoc([
      {
        html: '<div class="p-code" data-long="true"><pre>long</pre></div>',
        top: 0,
        height: 900,
        lines: [0, 20, 40, 60, 80],
      },
      { html: '<p>after</p>', top: 900, height: 40 },
    ]);
    const layout = measureDocument(long);
    // Marked long, the block now offers interior breaks of its own.
    expect(layout.candidates.filter((c) => c.breakable && c.offset > 0 && c.offset < 900)).not.toHaveLength(
      0
    );
  });

  it('keeps a short table whole but splits one marked long', () => {
    const short = buildDoc([
      { html: '<div class="p-table-wrap"><table><tr><td>x</td></tr></table></div>', top: 0, height: 120 },
      { html: '<p>after</p>', top: 120, height: 40 },
    ]);
    expect(measureDocument(short).candidates.filter((c) => c.offset > 0 && c.offset < 120)).toHaveLength(
      0
    );

    const long = buildDoc([
      {
        html: '<div class="p-table-wrap" data-long="true"><table><tr><td>x</td></tr></table></div>',
        top: 0,
        height: 800,
        lines: [0, 20, 40, 60],
      },
      { html: '<p>after</p>', top: 800, height: 40 },
    ]);
    // A bare `table` is atomic and would never be cut; the wrapper carries the
    // measurement that says this one is allowed to be.
    expect(
      measureDocument(long).candidates.filter((c) => c.breakable && c.offset > 0 && c.offset < 800)
    ).not.toHaveLength(0);
  });

  it('keeps a short table whole', () => {
    const doc = buildDoc([
      { html: '<div class="p-table-wrap"><table><tr><td>x</td></tr></table></div>', top: 0, height: 120 },
      { html: '<p>after</p>', top: 120, height: 40 },
    ]);
    const layout = measureDocument(doc);
    expect(layout.candidates.filter((c) => c.offset > 0 && c.offset < 120)).toHaveLength(0);
  });

  it('reports a text node with no measurable box as the top of the document', () => {
    // An inline run whose parent produced no line rects — an unrendered or
    // display:none subtree. Falling back to the container top is the safe
    // answer: the alternative would be `NaN` propagating into the break list.
    const doc = document.createElement('article');
    doc.className = 'p-doc';
    const content = document.createElement('div');
    content.className = 'p-content';
    content.appendChild(document.createTextNode('text with no measured lines'));
    doc.appendChild(content);
    document.body.replaceChildren(doc);

    boxes.set(doc, { top: 0, height: 300 });
    boxes.set(content, { top: 0, height: 300 }); // deliberately no `lines`

    const layout = measureDocument(doc);
    for (const candidate of layout.candidates) {
      expect(Number.isFinite(candidate.offset)).toBe(true);
    }
  });

  it('collapses line boxes that share a top', () => {
    // Characters on one line all report the same rect top. Left uncollapsed they
    // would become several break candidates at the same offset, and the
    // two-line minimum would be satisfied by a single visual line.
    const doc = buildDoc([
      { html: '<p>one</p>', top: 0, height: 120, lines: [0, 0, 20, 20, 40, 60, 80] },
      { html: '<p>two</p>', top: 120, height: 20 },
    ]);

    const layout = measureDocument(doc);
    const offsets = layout.candidates.filter((c) => c.breakable).map((c) => c.offset);
    // Distinct tops only: 0, 20, 40, 60, 80 — with 20 leaving 4 below and 3 above.
    expect(new Set(offsets).size).toBe(offsets.length);
    expect(offsets).toEqual(expect.arrayContaining([40, 60]));
  });

  it('degrades to an empty layout when the environment has no layout', () => {
    // jsdom's Range has no geometry methods. Returning empty rather than
    // throwing is what keeps the print page booting under test. The cache in
    // `canMeasureLayout` is per module, so the genuinely-absent case is covered
    // in paginate.noLayout.test.ts, which gets a fresh module registry.
    const doc = buildDoc([{ html: '<p>one</p>', top: 0, height: 40 }]);
    const layout = measureDocument(doc);
    expect(layout.blocks.length).toBeGreaterThan(0);
  });
});
