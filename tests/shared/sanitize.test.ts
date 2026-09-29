/**
 * Unit tests for the shared article HTML sanitizer
 *
 * The sanitizer is the single gate between untrusted page HTML and live DOM on
 * both the reader and the print path, so these tests cover the payloads that
 * actually matter: inline handlers, script-bearing elements, URL schemes and
 * layout escapes.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeArticleHtml } from '../../src/shared/sanitize';

/** Parse sanitized output back into a document so assertions can query it. */
function parse(html: string): Document {
  return new DOMParser().parseFromString(sanitizeArticleHtml(html), 'text/html');
}

describe('sanitizeArticleHtml', () => {
  describe('event handlers', () => {
    it('removes an inline onerror handler from an image', () => {
      const doc = parse('<img src="http://example.com/x" onerror="window.__XSS__=true" alt="a">');
      const img = doc.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.hasAttribute('onerror')).toBe(false);
      // The image itself is legitimate and must survive.
      expect(img?.getAttribute('src')).toBe('http://example.com/x');
    });

    it('removes every on* attribute regardless of case', () => {
      const doc = parse('<p ONCLICK="a()" onMouseOver="b()" onfocus="c()">正文</p>');
      const p = doc.querySelector('p');
      expect(p?.hasAttribute('onclick')).toBe(false);
      expect(p?.hasAttribute('onmouseover')).toBe(false);
      expect(p?.hasAttribute('onfocus')).toBe(false);
      expect(p?.textContent).toBe('正文');
    });

    it('removes handlers from every element, not just the first', () => {
      const out = sanitizeArticleHtml(
        '<p onclick="a()">1</p><p onclick="b()">2</p><span onmouseenter="c()">3</span>'
      );
      expect(out).not.toMatch(/on[a-z]+=/i);
    });
  });

  describe('dangerous elements', () => {
    it('removes script and style elements entirely', () => {
      const out = sanitizeArticleHtml('<p>keep</p><script>alert(1)</script><style>body{}</style>');
      expect(out).not.toMatch(/<script/i);
      expect(out).not.toMatch(/<style/i);
      expect(out).toContain('keep');
    });

    it('removes iframe, object, embed and form', () => {
      const out = sanitizeArticleHtml(
        '<p>keep</p><iframe src="https://evil.test"></iframe><object data="x.swf"></object><embed src="y"><form action="https://evil.test"><input name="q"></form>'
      );
      expect(out).not.toMatch(/<(iframe|object|embed|form)/i);
      expect(out).not.toMatch(/<input/i);
      expect(out).toContain('keep');
    });

    it('removes a base element that would rewrite relative urls', () => {
      const out = sanitizeArticleHtml('<base href="https://evil.test/"><p>keep</p>');
      expect(out).not.toMatch(/<base/i);
      expect(out).not.toContain('evil.test');
    });

    it('removes svg and math subtrees, which carry their own scripting surface', () => {
      const out = sanitizeArticleHtml(
        '<p>keep</p><svg><script>alert(1)</script></svg><math><mtext>x</mtext></math>'
      );
      expect(out).not.toMatch(/<(svg|math)/i);
      expect(out).not.toMatch(/<script/i);
      expect(out).toContain('keep');
    });

    it('removes link, meta and template', () => {
      const out = sanitizeArticleHtml(
        '<link rel="stylesheet" href="https://evil.test/x.css"><meta http-equiv="refresh" content="0;url=https://evil.test"><template><p>hidden</p></template><p>keep</p>'
      );
      expect(out).not.toMatch(/<(link|meta|template)/i);
      expect(out).not.toContain('hidden');
      expect(out).toContain('keep');
    });

    it('drops link and meta that the parser relocates into head', () => {
      const out = sanitizeArticleHtml('<title>evil</title><meta name="x" content="y"><p>keep</p>');
      expect(out).not.toMatch(/<(title|meta)/i);
      expect(out).toContain('keep');
    });
  });

  describe('url schemes', () => {
    it('blocks a javascript: href', () => {
      const doc = parse('<a href="javascript:alert(1)">click</a>');
      const a = doc.querySelector('a');
      expect(a?.hasAttribute('href')).toBe(false);
      expect(a?.textContent).toBe('click');
    });

    it('blocks a mixed-case javascript: href with leading whitespace', () => {
      const out = sanitizeArticleHtml('<a href="  jAvAsCrIpT:alert(1)">click</a>');
      expect(out).not.toMatch(/jAvAsCrIpT/i);
    });

    it('blocks control-character obfuscation such as java\\tscript:', () => {
      const out = sanitizeArticleHtml('<a href="java\tscript:alert(1)">click</a>');
      expect(out.toLowerCase()).not.toContain('script:');
    });

    it('blocks entity-obfuscated javascript: hrefs', () => {
      const out = sanitizeArticleHtml('<a href="&#106;avascript:alert(1)">click</a>');
      expect(out.toLowerCase()).not.toContain('javascript:');
    });

    it('blocks a data:text/html href', () => {
      const out = sanitizeArticleHtml(
        '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">click</a>'
      );
      expect(out).not.toContain('data:text/html');
    });

    it('blocks vbscript: and file: hrefs', () => {
      expect(sanitizeArticleHtml('<a href="vbscript:msgbox(1)">x</a>')).not.toContain('vbscript');
      expect(sanitizeArticleHtml('<a href="file:///etc/passwd">x</a>')).not.toContain('file:');
    });

    it('allows a data:image src but blocks a data:text/html src', () => {
      const image = '<img src="data:image/png;base64,iVBORw0KGgo=" alt="a">';
      const doc = parse(image);
      expect(doc.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=');

      expect(sanitizeArticleHtml('<img src="data:text/html,<script>alert(1)</script>">')).not.toContain(
        'data:text/html'
      );
    });

    it('keeps legitimate https links and images intact', () => {
      const doc = parse(
        '<a href="https://example.com/post?a=1&amp;b=2">link</a><img src="https://example.com/a.png" alt="图">'
      );
      expect(doc.querySelector('a')?.getAttribute('href')).toBe('https://example.com/post?a=1&b=2');
      expect(doc.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png');
      expect(doc.querySelector('img')?.getAttribute('alt')).toBe('图');
    });

    it('keeps relative, fragment and protocol-relative urls', () => {
      const doc = parse(
        '<a href="/local/page">a</a><a href="#section">b</a><a href="//cdn.example.com/x">c</a><img src="./rel.png">'
      );
      const hrefs = Array.from(doc.querySelectorAll('a')).map((a) => a.getAttribute('href'));
      expect(hrefs).toEqual(['/local/page', '#section', '//cdn.example.com/x']);
      expect(doc.querySelector('img')?.getAttribute('src')).toBe('./rel.png');
    });
  });

  describe('layout escapes', () => {
    it('strips a style attribute that would position over the reader chrome', () => {
      const doc = parse('<div style="position:fixed;top:0;z-index:9999">overlay</div>');
      const div = doc.querySelector('div');
      expect(div?.hasAttribute('style')).toBe(false);
      expect(div?.textContent).toBe('overlay');
    });

    it('strips class, id, width, height, loading, srcset, sizes and decoding', () => {
      const doc = parse(
        '<img class="c" id="i" width="10" height="10" loading="lazy" srcset="a 1x" sizes="50vw" decoding="async" src="https://example.com/a.png">'
      );
      const img = doc.querySelector('img');
      expect(img).not.toBeNull();
      for (const attr of ['class', 'id', 'width', 'height', 'loading', 'srcset', 'sizes', 'decoding']) {
        expect(img?.hasAttribute(attr)).toBe(false);
      }
      expect(img?.getAttribute('src')).toBe('https://example.com/a.png');
    });

    it('strips positional attributes on every element, not only images', () => {
      const out = sanitizeArticleHtml('<p class="x" id="y" style="color:red">正文</p>');
      expect(out).not.toMatch(/\b(class|id|style)=/);
    });
  });

  describe('legitimate article content', () => {
    it('preserves the full set of article markup', () => {
      const html = [
        '<h1>Title</h1><h2>Sub</h2><h6>Deep</h6>',
        '<p>Paragraph with <em>em</em>, <strong>strong</strong>, <sup>sup</sup>, <sub>sub</sub>,',
        ' <span>span</span>, <abbr title="et al.">et al.</abbr>, <time datetime="2026-09-29">today</time>,',
        ' <del>del</del> and <ins>ins</ins>.</p>',
        '<ul><li>one</li></ul><ol><li>two</li></ol>',
        '<blockquote><p>quoted</p></blockquote>',
        '<pre><code>const x = 1;</code></pre>',
        '<table><tbody><tr><td>cell</td></tr></tbody></table>',
        '<figure><img src="https://example.com/a.png" alt="a"><figcaption>cap</figcaption></figure>',
        '<hr><br>',
      ].join('');
      const doc = parse(html);

      for (const selector of [
        'h1', 'h2', 'h6', 'p', 'em', 'strong', 'sup', 'sub', 'span', 'abbr', 'time',
        'del', 'ins', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'td',
        'figure', 'img', 'figcaption', 'hr', 'br',
      ]) {
        expect(doc.querySelector(selector), `expected <${selector}> to survive`).not.toBeNull();
      }
      expect(doc.body.textContent).toContain('Paragraph with');
      expect(doc.querySelector('code')?.textContent).toBe('const x = 1;');
    });

    it('does not mangle text that merely looks like a tag', () => {
      const out = sanitizeArticleHtml('<p>use &lt;script&gt; carefully</p>');
      expect(out).toContain('&lt;script&gt;');
      expect(out).not.toMatch(/<script/i);
    });
  });

  describe('edge cases', () => {
    it('returns an empty string for empty or non-string input', () => {
      expect(sanitizeArticleHtml('')).toBe('');
      expect(sanitizeArticleHtml(undefined as unknown as string)).toBe('');
      expect(sanitizeArticleHtml(null as unknown as string)).toBe('');
    });

    it('is idempotent', () => {
      const hostile = [
        '<p onclick="a()" style="color:red" class="c" id="i">正文</p>',
        '<img src="http://example.com/x" onerror="window.__XSS__=true" alt="a">',
        '<script>alert(1)</script><style>b{}</style><svg onload="alert(1)"></svg>',
        '<a href="  jAvAsCrIpT:alert(1)">click</a><a href="https://ok.test">ok</a>',
        '<iframe src="https://evil.test"></iframe><base href="https://evil.test/">',
        '<img src="data:image/png;base64,iVBORw0KGgo=" alt="inline">',
        '<div style="position:fixed;top:0">overlay</div>',
        '<p>plain &amp; simple &lt;text&gt;</p>',
      ].join('');

      const once = sanitizeArticleHtml(hostile);
      const twice = sanitizeArticleHtml(once);
      expect(twice).toBe(once);
    });

    it('is idempotent across a fully clean document', () => {
      const clean = '<h1>T</h1><p>Body <a href="https://example.com">link</a></p><img src="https://example.com/a.png" alt="a">';
      expect(sanitizeArticleHtml(clean)).toBe(sanitizeArticleHtml(sanitizeArticleHtml(clean)));
    });
  });
});
