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

import { sanitizeUrlValue } from '../shared/sanitize';

/**
 * Attributes lazy-loading libraries stash the real URL in.
 *
 * Mirrors `LAZY_URL_ATTRS` in `src/shared/sanitize.ts`, which applies the same
 * scheme check to these values on the way in. `srcset` is deliberately not a
 * recovery source here: the sanitizer strips it from every element, so an image
 * whose only URL lives there is gone before this page sees it.
 */
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
 *
 * A candidate has to clear the same scheme check every sanitized `src` clears.
 * These attributes are spelled `data-*`, so nothing else vets them, and
 * copying one straight into `src` would make this page the only place in the
 * pipeline where a page-controlled URL reaches a live attribute unchecked.
 */
export function resolveLazySrc(image: HTMLImageElement): boolean {
  if (!isPlaceholder(image.getAttribute('src'))) return false;

  for (const attr of LAZY_SRC_ATTRS) {
    const candidate = image.getAttribute(attr);
    // An attribute that is still a placeholder, or that fails the scheme check,
    // is not this image's URL — keep looking rather than promoting it.
    if (candidate && !isPlaceholder(candidate) && sanitizeUrlValue(candidate, 'src') !== null) {
      image.setAttribute('src', candidate);
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

export interface ImageWaitResult {
  loaded: number;
  failed: number;
  /** Still unanswered when the ceiling fired — neither loaded nor failed. */
  pending: number;
}

/**
 * Wait for every image under `root` to finish decoding.
 *
 * Resolves after `timeoutMs` no matter what — a print must remain possible
 * even when an image host is dead. Outcomes are counted and reported so the
 * toolbar can say so plainly instead of the user discovering blanks on paper.
 *
 * Images that never answer are reported as `pending` rather than folded into
 * `failed`: they may still arrive, and calling them failures would misreport
 * a slow host as a dead one. The caller must treat `pending` as a warning —
 * counting it as success is how a dead image host ends up printing blank.
 */
export function waitForImages(root: HTMLElement, timeoutMs = 5000): Promise<ImageWaitResult> {
  const images = Array.from(root.querySelectorAll('img'));

  if (images.length === 0) {
    return Promise.resolve({ loaded: 0, failed: 0, pending: 0 });
  }

  return new Promise((resolve) => {
    let settled = 0;
    let loaded = 0;
    let failed = 0;

    const finish = () => {
      resolve({ loaded, failed, pending: images.length - settled });
    };

    // Hard ceiling: stop waiting, report whatever we have. Whatever has not
    // answered by now is counted as pending.
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
