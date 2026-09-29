/**
 * Behavioral tests for the content extractor.
 *
 * These drive the real `extractContent` against real DOM input, so a change in
 * Readability, the sanitizer or the cache shows up here. Assertions are
 * unconditional: a failed extraction has to turn the test red rather than skip
 * the assertions behind an `if (result.success)`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractContent,
  clearCache,
  getCacheSize,
  isCached,
  invalidateCache,
} from '../src/content/extractor';
import type { ExtractedContent, ExtractionResult } from '../src/shared/types';

/** Filler long enough to clear Readability's 500-character threshold. */
const FILLER =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis ' +
  'nostrud exercitation ullamco laboris. ';

/** A plain article with no hostile markup. */
const BENIGN_ARTICLE = `
  <article>
    <h1>On Reading Well</h1>
    <p>${FILLER.repeat(4)}</p>
    <p>${FILLER.repeat(4)}</p>
  </article>
`;

/**
 * A page that tries every escape the reader's HTML sink has to survive.
 *
 * Chosen because Readability passes all of it through: it keeps inline event
 * handlers, `width`/`height`/`class`/`id`, and any URL whose scheme it does not
 * recognise — including a mixed-case `JaVaScRiPt:` and a leading-space
 * `javascript:`. Only the sanitizer removes them, so these fixtures fail if the
 * sanitizer is bypassed.
 */
const HOSTILE_ARTICLE = `
  <article>
    <h1>Hostile Page</h1>
    <p>${FILLER.repeat(4)}</p>
    <p>
      <a href="JaVaScRiPt:alert(1)">mixed case</a>
      <a href=" javascript:alert(2)">leading space</a>
      <a href="vbscript:msgbox(3)">vbscript</a>
      <a href="data:text/html;base64,PHNjcmlwdD4=">data document</a>
    </p>
    <p>
      <img src="https://cdn.example.com/photo.jpg" alt="legit photo"
           onerror="window.__pwned = 1" onload="window.__pwned2 = 1" onclick="window.__pwned3 = 1"
           width="4000" height="4000" class="tracker" id="tracker" srcset="x 2x" loading="lazy" />
    </p>
    <p>
      <a href="https://example.com/real">real link</a>
      <a href="/local/path">local link</a>
      <a href="//cdn.example.com/proto-relative">protocol relative</a>
      <img src="data:image/png;base64,iVBORw0KGgo=" alt="inline">
    </p>
    <script>window.__scriptRan = true;</script>
    <style>.page { position: fixed; z-index: 99999; }</style>
    <p>${FILLER.repeat(4)}</p>
  </article>
`;

function createTestDocument(html: string, title = 'Test Page'): Document {
  const doc = document.implementation.createHTMLDocument(title);
  doc.body.innerHTML = html;
  return doc;
}

/**
 * Assert the extraction succeeded, then narrow the union.
 *
 * Without this a caller could keep asserting on `result.data` behind an
 * `if (result.success)` and a broken extractor would still report green.
 */
function expectExtracted(result: ExtractionResult, context: string): ExtractedContent {
  expect(result.success, `${context}: ${result.success ? '' : result.error}`).toBe(true);
  if (!result.success) {
    throw new Error(`${context}: extraction failed with "${result.error}"`);
  }
  return result.data;
}

/** Parse extracted article HTML so assertions can be made against real nodes. */
function parseContent(content: string): Document {
  return new DOMParser().parseFromString(content, 'text/html');
}

describe('Content Extractor', () => {
  // The module keeps a URL-keyed Map. Without this the suite is order-dependent:
  // a URL used twice in two tests would resolve from the first test's cache.
  beforeEach(() => {
    clearCache();
  });

  describe('extractContent', () => {
    it('should extract content from a valid article', () => {
      const doc = createTestDocument(BENIGN_ARTICLE, 'Test Article');
      const data = expectExtracted(
        extractContent(doc, 'https://example.com/article'),
        'valid article'
      );

      expect(data.title).toBeTruthy();
      expect(data.content).toBeTruthy();
      expect(data.wordCount).toBeGreaterThan(0);
      expect(data.estimatedReadTime).toBeGreaterThanOrEqual(1);
    });

    it('should return an error for empty document', () => {
      const doc = createTestDocument('');
      const result = extractContent(doc, 'https://example.com/empty');

      expect(result.success).toBe(false);
      if (result.success) throw new Error('empty document should not extract');
      expect(result.error).toBe('Failed to extract content: Readability returned null');
    });

    it('should return an error, not throw, when the document has no body', () => {
      const result = extractContent({ body: null } as unknown as Document, 'https://example.com/nobody');

      expect(result.success).toBe(false);
      if (result.success) throw new Error('a bodyless document should not extract');
      expect(result.error).toMatch(/missing body element/i);
    });

    it('should keep a one-word page rather than opening an empty reader', () => {
      // Readability wraps whatever it keeps in a page div, so a stub article is
      // still returned. The reader renders that instead of the ad-heavy original
      // — a near-empty page is a better outcome than no reader at all.
      const doc = createTestDocument('<p>Short</p>');
      const data = expectExtracted(extractContent(doc, 'https://example.com/short'), 'short doc');

      expect(data.textContent).toBe('Short');
      expect(data.wordCount).toBe(1);
      expect(data.estimatedReadTime).toBe(1);
    });

    it('should leave the source document untouched', () => {
      const doc = createTestDocument(BENIGN_ARTICLE, 'Test Article');
      const before = doc.body.innerHTML;

      expectExtracted(extractContent(doc, 'https://example.com/untouched'), 'untouched doc');

      // Readability rewrites the tree it is given; the caller's DOM must survive.
      expect(doc.body.innerHTML).toBe(before);
    });

    it('should key the cache on the document location when no url is given', () => {
      // A document created by `createHTMLDocument` has no location, so the
      // fallback key is empty and nothing is cached. Without this the module
      // would grow an unbounded cache that no entry can ever be read back from.
      const first = createTestDocument(BENIGN_ARTICLE, 'First Page');
      const second = createTestDocument(
        `<article><h1>Second Page</h1><p>${FILLER.repeat(8)}</p></article>`,
        'Second Page'
      );

      const firstData = expectExtracted(extractContent(first), 'first document');
      const secondData = expectExtracted(extractContent(second), 'second document');

      expect(firstData.title).toBe('First Page');
      expect(secondData.title).toBe('Second Page');
      expect(getCacheSize()).toBe(0);
    });
  });

  describe('caching', () => {
    it('should cache extracted content', () => {
      const doc = createTestDocument(BENIGN_ARTICLE);
      const url = 'https://example.com/cached';

      expect(isCached(url)).toBe(false);
      expect(getCacheSize()).toBe(0);

      expectExtracted(extractContent(doc, url), 'first extract');

      expect(isCached(url)).toBe(true);
      expect(getCacheSize()).toBe(1);
    });

    it('should serve a second extraction of the same url from the cache', () => {
      const url = 'https://example.com/cached2';
      const first = expectExtracted(
        extractContent(createTestDocument(BENIGN_ARTICLE, 'First'), url),
        'first extract'
      );
      const second = expectExtracted(
        extractContent(
          createTestDocument(
            `<article><h1>Completely Different</h1><p>${FILLER.repeat(8)}</p></article>`,
            'Second'
          ),
          url
        ),
        'second extract'
      );

      // Same URL means the cache short-circuits: the second document is never
      // parsed, so its own title never comes back.
      expect(second.title).toBe('First');
      expect(second).toEqual(first);
      expect(getCacheSize()).toBe(1);
    });

    it('should clear cache correctly', () => {
      const doc = createTestDocument(BENIGN_ARTICLE);

      expectExtracted(extractContent(doc, 'https://example.com/clear1'), 'clear1');
      expectExtracted(extractContent(doc, 'https://example.com/clear2'), 'clear2');

      expect(getCacheSize()).toBe(2);

      clearCache();

      expect(getCacheSize()).toBe(0);
      expect(isCached('https://example.com/clear1')).toBe(false);
    });

    it('should invalidate specific cache entry', () => {
      const doc = createTestDocument(BENIGN_ARTICLE);
      const url1 = 'https://example.com/invalidate1';
      const url2 = 'https://example.com/invalidate2';

      expectExtracted(extractContent(doc, url1), 'invalidate1');
      expectExtracted(extractContent(doc, url2), 'invalidate2');

      expect(getCacheSize()).toBe(2);
      expect(isCached(url1)).toBe(true);

      expect(invalidateCache(url1)).toBe(true);
      expect(invalidateCache(url1)).toBe(false);

      expect(getCacheSize()).toBe(1);
      expect(isCached(url1)).toBe(false);
      expect(isCached(url2)).toBe(true);
    });
  });

  describe('sanitized article html', () => {
    it('should strip every inline event handler', () => {
      const doc = createTestDocument(HOSTILE_ARTICLE, 'Hostile Page');
      const data = expectExtracted(extractContent(doc, 'https://evil.example/a'), 'hostile a');
      const parsed = parseContent(data.content);

      const handlers = Array.from(parsed.querySelectorAll('*')).flatMap((el) =>
        Array.from(el.attributes)
          .map((attr) => attr.name.toLowerCase())
          .filter((name) => name.startsWith('on'))
      );

      expect(handlers).toEqual([]);
      expect(data.content).not.toMatch(/\son[a-z]+\s*=/i);
    });

    it('should not carry script or style elements into the reader', () => {
      const doc = createTestDocument(HOSTILE_ARTICLE, 'Hostile Page');
      const data = expectExtracted(extractContent(doc, 'https://evil.example/b'), 'hostile b');
      const parsed = parseContent(data.content);

      expect(parsed.querySelector('script')).toBeNull();
      expect(parsed.querySelector('style')).toBeNull();
      expect(data.content).not.toMatch(/<\s*(script|style)\b/i);
    });

    it('should strip hrefs whose scheme is not http(s)', () => {
      const doc = createTestDocument(HOSTILE_ARTICLE, 'Hostile Page');
      const data = expectExtracted(extractContent(doc, 'https://evil.example/c'), 'hostile c');
      const parsed = parseContent(data.content);

      const hrefs = Array.from(parsed.querySelectorAll('a[href]')).map((a) =>
        (a.getAttribute('href') ?? '').trim()
      );

      expect(hrefs).not.toContain('javascript:alert(1)');
      expect(hrefs.some((href) => /^javascript:/i.test(href))).toBe(false);
      expect(hrefs.some((href) => /^vbscript:/i.test(href))).toBe(false);
      expect(hrefs.some((href) => /^data:/i.test(href))).toBe(false);
      expect(data.content).not.toMatch(/href\s*=\s*["']?\s*(javascript|vbscript|data):/i);
    });

    it('should strip the attributes that let a page escape the reader column', () => {
      const doc = createTestDocument(HOSTILE_ARTICLE, 'Hostile Page');
      const data = expectExtracted(extractContent(doc, 'https://evil.example/d'), 'hostile d');
      const parsed = parseContent(data.content);

      for (const attr of ['width', 'height', 'class', 'id', 'srcset', 'loading', 'style']) {
        expect(
          parsed.querySelector(`[${attr}]`),
          `expected no element to keep a "${attr}" attribute`
        ).toBeNull();
      }
    });

    it('should keep a legitimate https image', () => {
      const doc = createTestDocument(HOSTILE_ARTICLE, 'Hostile Page');
      const data = expectExtracted(extractContent(doc, 'https://evil.example/e'), 'hostile e');
      const parsed = parseContent(data.content);

      const image = parsed.querySelector('img[src="https://cdn.example.com/photo.jpg"]');
      expect(image, 'the https image should survive sanitization').not.toBeNull();
      expect(image?.getAttribute('alt')).toBe('legit photo');
    });

    it('should keep ordinary links and relative urls', () => {
      const doc = createTestDocument(HOSTILE_ARTICLE, 'Hostile Page');
      const data = expectExtracted(extractContent(doc, 'https://evil.example/f'), 'hostile f');
      const parsed = parseContent(data.content);

      const hrefs = Array.from(parsed.querySelectorAll('a')).map((a) => a.getAttribute('href'));

      expect(hrefs).toContain('https://example.com/real');
      expect(hrefs).toContain('/local/path');
      expect(hrefs).toContain('//cdn.example.com/proto-relative');
    });

    it('should keep an inline data: image, which is legitimate article content', () => {
      const doc = createTestDocument(HOSTILE_ARTICLE, 'Hostile Page');
      const data = expectExtracted(extractContent(doc, 'https://evil.example/g'), 'hostile g');
      const parsed = parseContent(data.content);

      expect(parsed.querySelector('img[src^="data:image/"]')).not.toBeNull();
    });

    it('should cache the sanitized html, not the raw Readability output', () => {
      const url = 'https://evil.example/cached';
      const first = expectExtracted(
        extractContent(createTestDocument(HOSTILE_ARTICLE, 'Hostile Page'), url),
        'hostile first'
      );
      const cached = expectExtracted(
        extractContent(createTestDocument(BENIGN_ARTICLE, 'Innocent Page'), url),
        'hostile cached'
      );

      expect(cached.content).toBe(first.content);
      expect(cached.content).not.toMatch(/\son[a-z]+\s*=/i);
      expect(cached.content).not.toMatch(/javascript:/i);
    });
  });

  describe('text that has no Latin words', () => {
    it('should count a CJK article without reporting zero words', () => {
      // The word count is two counters added together: `[a-zA-Z]+` matches for
      // a Latin script and a CJK range match for the others. A page written
      // entirely in one or the other exercises the half that finds nothing —
      // and a `null` from `String.match` there has to read as zero, not crash.
      const cjk = createTestDocument(
        `<article><h1>读书笔记</h1><p>${'阅读是一种生活方式，也是一种修行。'.repeat(30)}</p></article>`,
        '读书笔记'
      );

      const data = expectExtracted(
        extractContent(cjk, 'https://example.com/cjk'),
        'cjk article'
      );

      expect(data.wordCount).toBeGreaterThan(0);
      // CJK characters are counted in pairs, so the count is about half the
      // character total and a reading time is still derived from it.
      expect(data.estimatedReadTime).toBeGreaterThanOrEqual(1);
    });

    it('should still count the Latin words in a mixed-script article', () => {
      const mixed = createTestDocument(
        `<article><h1>Mixed</h1><p>${'阅读与写作。'.repeat(20)} The quick brown fox.</p></article>`,
        'Mixed'
      );

      const data = expectExtracted(
        extractContent(mixed, 'https://example.com/mixed'),
        'mixed article'
      );

      expect(data.wordCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('failures inside the extraction', () => {
    it('should report a thrown Error with its message instead of a blank reader', () => {
      // `cloneNode` is the first thing the extractor does with the document.
      // If it throws, the whole extraction fails — and the reader has to say
      // why, not report a page it could not read.
      const exploding = {
        body: {},
        location: { href: 'https://example.com/boom' },
        cloneNode: () => {
          throw new Error('clone refused');
        },
      } as unknown as Document;
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        const result = extractContent(exploding);

        expect(result.success).toBe(false);
        if (result.success) throw new Error('a throwing clone should not extract');
        expect(result.error).toBe('Content extraction failed: clone refused');
        expect(errors).toHaveBeenCalled();
      } finally {
        errors.mockRestore();
      }
    });

    it('should report a thrown non-Error rather than answering with undefined', () => {
      // Chrome and Readability are not the only things in the try block, and
      // a rejection that is not an Error must still produce a message the user
      // can act on. Assuming `.message` exists yields `Content extraction
      // failed: undefined`.
      const exploding = {
        body: {},
        location: { href: 'https://example.com/boom2' },
        cloneNode: () => {
          throw 'a bare string';
        },
      } as unknown as Document;
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        const result = extractContent(exploding);

        expect(result.success).toBe(false);
        if (result.success) throw new Error('a throwing clone should not extract');
        expect(result.error).toBe('Content extraction failed: a bare string');
      } finally {
        errors.mockRestore();
      }
    });

    it('should not cache a document whose extraction blew up', () => {
      const exploding = {
        body: {},
        location: { href: 'https://example.com/boom3' },
        cloneNode: () => {
          throw new Error('clone refused');
        },
      } as unknown as Document;
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        expect(extractContent(exploding).success).toBe(false);
        expect(getCacheSize()).toBe(0);
        expect(isCached('https://example.com/boom3')).toBe(false);
      } finally {
        errors.mockRestore();
      }
    });
  });
});
