import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveLazySrc,
  eagerizeImages,
  waitForImages,
} from '../../src/print/prepareImages';
import { sanitizeArticleHtml } from '../../src/shared/sanitize';

/**
 * Report whether `srcset` survives the sanitizer the print page receives its
 * markup from, so a test can prove which attributes the pipeline actually
 * delivers rather than which ones this module would like to read.
 */
function srcsetSurvivesSanitizer(rawHtml: string): boolean {
  const doc = new DOMParser().parseFromString(sanitizeArticleHtml(rawHtml), 'text/html');
  return doc.querySelector('img')?.hasAttribute('srcset') ?? false;
}

function makeImage(attrs: Record<string, string>): HTMLImageElement {
  const img = document.createElement('img');
  for (const [key, value] of Object.entries(attrs)) {
    img.setAttribute(key, value);
  }
  document.body.appendChild(img);
  return img;
}

const TRANSPARENT_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

describe('resolveLazySrc', () => {
  it('promotes data-src when src is a transparent placeholder', () => {
    const img = makeImage({ src: TRANSPARENT_GIF, 'data-src': 'https://example.com/real.png' });
    expect(resolveLazySrc(img)).toBe(true);
    expect(img.getAttribute('src')).toBe('https://example.com/real.png');
  });

  it('promotes when src is missing entirely', () => {
    const img = makeImage({ 'data-original': 'https://example.com/real.png' });
    expect(resolveLazySrc(img)).toBe(true);
    expect(img.getAttribute('src')).toBe('https://example.com/real.png');
  });

  it('does not recover from srcset, which the sanitizer has already stripped', () => {
    // `srcset` is in the sanitizer's STRIPPED_ATTRS, so an image whose only URL
    // lives there is gone before this page ever sees it. The recovery used to
    // claim otherwise in a comment while being unreachable.
    const img = makeImage({ src: TRANSPARENT_GIF, srcset: 'https://example.com/s.jpg 1x' });
    expect(srcsetSurvivesSanitizer(img.outerHTML)).toBe(false);
    expect(resolveLazySrc(img)).toBe(false);
    expect(img.getAttribute('src')).toBe(TRANSPARENT_GIF);
  });

  it('leaves a real src untouched', () => {
    const img = makeImage({ src: 'https://example.com/real.png', 'data-src': 'https://other/x.png' });
    expect(resolveLazySrc(img)).toBe(false);
    expect(img.getAttribute('src')).toBe('https://example.com/real.png');
  });

  it('does not promote a placeholder from another attribute', () => {
    const img = makeImage({ src: TRANSPARENT_GIF, 'data-src': TRANSPARENT_GIF });
    expect(resolveLazySrc(img)).toBe(false);
  });

  // Regression: a page-controlled `data-*` value was copied straight into a live
  // `src` with no scheme check at all, so the print path walked past the
  // `isSafeUrlValue` policy that every sanitized `src` goes through.
  it.each([
    ['javascript:alert(1)'],
    ['file:///etc/passwd'],
    ['data:text/html,<script>alert(1)</script>'],
    ['  jAvAsCrIpT:alert(1)'],
  ])('refuses to promote %j into src', (hostile) => {
    const img = makeImage({ src: TRANSPARENT_GIF, 'data-src': hostile });
    expect(resolveLazySrc(img)).toBe(false);
    expect(img.getAttribute('src'), 'a rejected candidate must not reach src').toBe(TRANSPARENT_GIF);
  });

  it('keeps looking after a rejected attribute instead of giving up', () => {
    const img = makeImage({
      src: TRANSPARENT_GIF,
      'data-src': 'javascript:alert(1)',
      'data-original': 'https://example.com/real.png',
    });
    expect(resolveLazySrc(img)).toBe(true);
    expect(img.getAttribute('src')).toBe('https://example.com/real.png');
  });

  it('accepts a relative value, which resolves against the page origin', () => {
    const relative = makeImage({ src: TRANSPARENT_GIF, 'data-src': '/img/real.png' });
    expect(resolveLazySrc(relative)).toBe(true);
    expect(relative.getAttribute('src')).toBe('/img/real.png');

    const protocolRelative = makeImage({ src: TRANSPARENT_GIF, 'data-src': '//cdn.example/x.png' });
    expect(resolveLazySrc(protocolRelative)).toBe(true);
    expect(protocolRelative.getAttribute('src')).toBe('//cdn.example/x.png');
  });
});

describe('eagerizeImages', () => {
  it('forces eager decoding and reports how many it repaired', () => {
    const a = makeImage({ src: TRANSPARENT_GIF, 'data-src': 'https://example.com/a.png' });
    const b = makeImage({ src: 'https://example.com/b.png', loading: 'lazy' });

    const root = document.createElement('div');
    root.append(a, b);
    const repaired = eagerizeImages(root);

    expect(repaired).toBe(1);
    expect(a.getAttribute('loading')).toBe('eager');
    expect(b.getAttribute('loading')).toBe('eager');
    expect(b.getAttribute('decoding')).toBe('sync');
  });
});

describe('waitForImages', () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * jsdom never fetches an image, so `complete` and `naturalWidth` are
   * declared outright rather than waited for. `complete: true` with a positive
   * `naturalWidth` is a decoded bitmap; `complete: true` with zero is the
   * browser's way of saying it already failed.
   */
  function image(
    attrs: Record<string, string>,
    state: { complete: boolean; naturalWidth: number }
  ): HTMLImageElement {
    const img = document.createElement('img');
    for (const [key, value] of Object.entries(attrs)) {
      img.setAttribute(key, value);
    }
    Object.defineProperty(img, 'complete', { value: state.complete, configurable: true });
    Object.defineProperty(img, 'naturalWidth', { value: state.naturalWidth, configurable: true });
    root.appendChild(img);
    return img;
  }

  function decoded(src: string): HTMLImageElement {
    return image({ src }, { complete: true, naturalWidth: 800 });
  }

  function broken(src: string): HTMLImageElement {
    return image({ src }, { complete: true, naturalWidth: 0 });
  }

  function pending(src: string): HTMLImageElement {
    return image({ src }, { complete: false, naturalWidth: 0 });
  }

  it('resolves with zeroes when the page has no images at all', async () => {
    await expect(waitForImages(root, 5000)).resolves.toEqual({ loaded: 0, failed: 0, pending: 0 });
  });

  it('counts an image that is already decoded as loaded', async () => {
    decoded('https://example.com/a.png');
    decoded('https://example.com/b.png');
    vi.useFakeTimers();

    const promise = waitForImages(root, 5000);

    await expect(promise).resolves.toEqual({ loaded: 2, failed: 0, pending: 0 });
    // The ceiling was cleared; nothing is left holding the page open.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('counts an already-complete image with no bitmap as failed', async () => {
    // A 404 leaves the element complete with nothing decoded — indistinguishable
    // here from a success unless naturalWidth is consulted.
    broken('https://example.com/gone.png');
    vi.useFakeTimers();

    await expect(waitForImages(root, 5000)).resolves.toEqual({ loaded: 0, failed: 1, pending: 0 });
  });

  it('counts an image with no src attribute as failed without waiting for events', async () => {
    root.appendChild(document.createElement('img'));
    vi.useFakeTimers();

    await expect(waitForImages(root, 5000)).resolves.toEqual({ loaded: 0, failed: 1, pending: 0 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('settles each image as its load or error event arrives', async () => {
    const good = pending('https://example.com/good.png');
    const bad = pending('https://example.com/bad.png');
    vi.useFakeTimers();

    const promise = waitForImages(root, 5000);
    good.dispatchEvent(new Event('load'));
    bad.dispatchEvent(new Event('error'));

    await expect(promise).resolves.toEqual({ loaded: 1, failed: 1, pending: 0 });
  });

  it('resolves as soon as the last image reports in, without reaching for the ceiling', async () => {
    const first = pending('https://example.com/a.png');
    const second = pending('https://example.com/b.png');
    vi.useFakeTimers();

    const promise = waitForImages(root, 5000);
    first.dispatchEvent(new Event('load'));
    second.dispatchEvent(new Event('load'));

    await expect(promise).resolves.toEqual({ loaded: 2, failed: 0, pending: 0 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps waiting while an image is still loading', async () => {
    pending('https://example.com/slow.png');
    vi.useFakeTimers();

    let settled = false;
    const promise = waitForImages(root, 5000).then((result) => {
      settled = true;
      return result;
    });

    vi.advanceTimersByTime(4999);
    await Promise.resolve();
    expect(settled, 'a print that starts before images settle yields blanks').toBe(false);

    vi.advanceTimersByTime(1);
    // The ceiling fires and the still-loading image surfaces as `pending`.
    await expect(promise).resolves.toEqual({ loaded: 0, failed: 0, pending: 1 });
  });

  it('counts only the images that answered before the ceiling', async () => {
    // A dead image host: the first image is already in hand, the second never
    // answers. The ceiling resolves with what it has — and `pending` is what
    // separates "arrived" from "never arrived" for the caller.
    const answered = pending('https://example.com/ok.png');
    pending('https://example.com/hang.png');
    vi.useFakeTimers();

    const promise = waitForImages(root, 5000);
    answered.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(5000);

    const result = await promise;
    expect(result).toEqual({ loaded: 1, failed: 0, pending: 1 });
    // Every image lands in exactly one bucket, so the counts always sum to
    // the number of images — no image can fall through unreported.
    expect(result.loaded + result.failed + result.pending).toBe(2);
  });

  it('reports a never-answering image as pending, not failed', async () => {
    pending('https://example.com/hang.png');
    pending('https://example.com/also-hangs.png');
    vi.useFakeTimers();

    const promise = waitForImages(root, 5000);
    vi.advanceTimersByTime(5000);

    // Not counted as failed: nothing failed, it simply never arrived. But it
    // is NOT silently dropped either — a caller reading only `failed` would
    // otherwise print blank frames without a warning.
    await expect(promise).resolves.toEqual({ loaded: 0, failed: 0, pending: 2 });
  });

  it('defaults the ceiling to five seconds', async () => {
    pending('https://example.com/hang.png');
    vi.useFakeTimers();

    let settled = false;
    const promise = waitForImages(root).then((result) => {
      settled = true;
      return result;
    });

    vi.advanceTimersByTime(4999);
    await Promise.resolve();
    expect(settled).toBe(false);

    vi.advanceTimersByTime(1);
    await promise;
    expect(settled).toBe(true);
  });
});
