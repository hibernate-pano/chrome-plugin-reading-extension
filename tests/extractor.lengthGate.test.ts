import { describe, it, expect, beforeEach } from 'vitest';
import { extractContent, clearCache } from '../src/content/extractor';

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(
    `<!doctype html><html><head><title>T</title></head><body>${html}</body></html>`,
    'text/html'
  );
}

const FILLER = 'lorem ipsum dolor sit amet consectetur adipiscing elit '.repeat(20);

describe('regression: the length gate must run on sanitized content', () => {
  beforeEach(() => clearCache());

  it('refuses a page whose only content the sanitizer strips', () => {
    // Long enough to clear a 50-char gate on the RAW html, but everything
    // lives inside tags the sanitizer removes wholesale. Gating before
    // sanitizing would report success and render an empty reader.
    const html = `<article><form>${FILLER}${FILLER}</form></article>`;
    expect(docFrom(html).body?.textContent?.length ?? 0).toBeGreaterThan(50);

    const result = extractContent(docFrom(html), 'https://example.com/form-only');
    expect(result.success).toBe(false);
  });

  it('still accepts a normal article', () => {
    const result = extractContent(
      docFrom(`<article><p>${FILLER}</p><p>${FILLER}</p></article>`),
      'https://example.com/normal'
    );
    expect(result.success).toBe(true);
  });
});
