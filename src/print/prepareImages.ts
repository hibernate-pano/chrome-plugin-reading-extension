/**
 * Image Preparation for Print
 *
 * Two real traps handled here:
 *
 * 1. Lazy-loaded images. Readability copies whatever markup the page had, so
 *    an image's real URL is often parked in data-src while src holds a 1x1
 *    transparent GIF. Printing that yields blank boxes.
 *
 * 2. Decoding. A print is a snapshot — anything still loading when the
 *    snapshot is taken is simply missing. We wait for decode before letting
 *    the user print, with a ceiling so a dead image host can't hang the page.
 */

import { A4 } from '../shared/constants';

/** Attributes lazy-loading libraries stash the real URL in. */
const LAZY_SRC_ATTRS = [
  'data-src',
  'data-original',
  'data-lazy-src',
  'data-actualsrc',
  'data-echo',
  'data-lazy',
] as const;

/** Placeholder payloads that mean "not loaded yet". */
function isPlaceholder(src: string | null): boolean {
  if (!src) return true;
  const trimmed = src.trim();
  if (trimmed === '' || trimmed.startsWith('data:image/svg+xml')) return true;
  // 1x1 transparent GIF — the classic lazy-load placeholder.
  if (/^data:image\/(gif|png);base64,[A-Za-z0-9+/=]{1,80}$/.test(trimmed)) return true;
  if (/^data:image\/gif;base64,R0lGOD/.test(trimmed)) return true;
  return false;
}

/**
 * Recover the real URL for an image that a lazy loader left unresolved.
 * Returns true when src was replaced.
 */
export function resolveLazySrc(image: HTMLImageElement): boolean {
  if (!isPlaceholder(image.getAttribute('src'))) return false;

  for (const attr of LAZY_SRC_ATTRS) {
    const candidate = image.getAttribute(attr);
    if (candidate && !isPlaceholder(candidate)) {
      image.setAttribute('src', candidate);
      return true;
    }
  }

  // Some libraries only fill srcset.
  const srcset = image.getAttribute('srcset');
  if (srcset) {
    // Take the last candidate — usually the highest resolution.
    const candidates = srcset.split(',').map((entry) => entry.trim().split(/\s+/)[0]);
    const best = candidates[candidates.length - 1];
    if (best && !isPlaceholder(best)) {
      image.setAttribute('src', best);
      return true;
    }
  }

  return false;
}

/**
 * Force every image to start loading immediately.
 */
export function eagerizeImages(root: HTMLElement): number {
  const images = Array.from(root.querySelectorAll('img'));
  let repaired = 0;

  for (const image of images) {
    if (resolveLazySrc(image)) repaired += 1;
    image.setAttribute('loading', 'eager');
    image.setAttribute('decoding', 'sync');
  }

  return repaired;
}

interface ImageWaitResult {
  loaded: number;
  failed: number;
}

/**
 * Wait for every image under `root` to finish decoding.
 *
 * Resolves after `timeoutMs` no matter what — a print must remain possible
 * even when an image host is dead. Failures are counted and reported so the
 * toolbar can say so plainly instead of the user discovering blanks on paper.
 */
export function waitForImages(root: HTMLElement, timeoutMs = 5000): Promise<ImageWaitResult> {
  const images = Array.from(root.querySelectorAll('img'));

  if (images.length === 0) {
    return Promise.resolve({ loaded: 0, failed: 0 });
  }

  return new Promise((resolve) => {
    let settled = 0;
    let loaded = 0;
    let failed = 0;

    const finish = () => {
      resolve({ loaded, failed });
    };

    // Hard ceiling: stop waiting, report whatever we have.
    const timer = setTimeout(finish, timeoutMs);

    const settleOne = (ok: boolean) => {
      if (ok) loaded += 1;
      else failed += 1;
      settled += 1;
      if (settled === images.length) {
        clearTimeout(timer);
        finish();
      }
    };

    for (const image of images) {
      if (!image.hasAttribute('src')) {
        settleOne(false);
        continue;
      }

      // complete tells us the browser already has the bitmap, or already failed.
      if (image.complete) {
        settleOne(image.naturalWidth > 0);
        continue;
      }

      image.addEventListener('load', () => settleOne(true), { once: true });
      image.addEventListener('error', () => settleOne(false), { once: true });
    }
  });
}

/**
 * Cap oversized images at slightly less than one printable page height so
 * they scale down instead of being clipped mid-figure.
 */
export function constrainImageHeights(root: HTMLElement): void {
  const maxHeight = `${A4.contentHeight - 10}mm`;
  for (const image of Array.from(root.querySelectorAll('img'))) {
    image.style.maxHeight = maxHeight;
    image.style.objectFit = 'contain';
  }
}
