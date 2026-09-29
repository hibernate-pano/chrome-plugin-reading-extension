import { describe, it, expect, beforeAll } from 'vitest';

import { measureDocument } from '../../src/print/paginate';

/**
 * The no-layout path, in its own file on purpose.
 *
 * `canMeasureLayout` caches its answer the first time it is asked, so this
 * scenario only presents itself if the very first call happens in an
 * environment without a layout engine. Vitest gives each test file a fresh
 * module registry, which is the only way to reach it honestly — deleting the
 * Range methods mid-file would leave the cache already populated and the test
 * would be asserting nothing.
 *
 * The environment being described is real: it is jsdom, and it is also any
 * browser that has not upgraded to a version with `Range.getClientRects`. The
 * print page must boot and show something rather than throw on it.
 */
describe('measureDocument without a layout engine', () => {
  let doc: HTMLElement;

  beforeAll(() => {
    // Sanity: this file only means anything if the geometry really is absent.
    expect(typeof document.createRange().getClientRects).toBe('undefined');
  });

  it('returns an empty layout rather than throwing', () => {
    doc = document.createElement('article');
    doc.className = 'p-doc';
    doc.innerHTML = '<div class="p-content"><p>alpha</p><p>beta</p></div>';
    document.body.replaceChildren(doc);

    const layout = measureDocument(doc);

    expect(layout.blocks).toEqual([]);
    expect(layout.candidates).toEqual([]);
    expect(layout.height).toBe(0);
  });

  it('leaves a document that has no measurable content reportable', () => {
    // Call it twice: the cached answer must not turn into a thrown error or a
    // half-built layout on the second pass.
    const second = measureDocument(doc);
    expect(second).toEqual({ blocks: [], candidates: [], height: 0 });
  });
});
