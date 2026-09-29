import { describe, it, expect } from 'vitest';
import { buildDocument, buildFilename } from '../../src/print/buildDocument';
import type { PrintPayload } from '../../src/shared/types';

function payload(overrides: Partial<PrintPayload> = {}): PrintPayload {
  return {
    title: '测试文章',
    byline: '作者',
    siteName: '示例站',
    content: '<p>正文</p>',
    sourceUrl: 'https://example.com/post/1',
    exportedAt: Date.UTC(2026, 8, 29),
    ...overrides,
  };
}

describe('buildDocument', () => {
  it('renders title and metadata into the header', () => {
    const doc = buildDocument(payload());
    expect(doc.querySelector('.p-title')?.textContent).toBe('测试文章');
    expect(doc.querySelector('.p-meta')?.textContent).toContain('作者');
    expect(doc.querySelector('.p-meta')?.textContent).toContain('示例站');
  });

  it('omits the meta line when there is nothing to show', () => {
    const doc = buildDocument(payload({ byline: null, siteName: null, exportedAt: NaN }));
    expect(doc.querySelector('.p-meta')).toBeNull();
  });

  it('drops script, style and iframe elements', () => {
    const doc = buildDocument(
      payload({
        content:
          '<p>正文</p><script>alert(1)</script><style>body{}</style><iframe src="x"></iframe>',
      })
    );
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('style')).toBeNull();
    expect(doc.querySelector('iframe')).toBeNull();
    expect(doc.querySelector('.p-content')?.textContent).toContain('正文');
  });

  it('strips inline event handlers and presentational attributes', () => {
    const doc = buildDocument(
      payload({
        content: '<p onclick="alert(1)" style="color:red" class="x" id="y">正文</p>',
      })
    );
    // Scope to the body: the header legitimately carries its own classes.
    const p = doc.querySelector('.p-content p');
    expect(p?.hasAttribute('onclick')).toBe(false);
    expect(p?.hasAttribute('style')).toBe(false);
    expect(p?.hasAttribute('class')).toBe(false);
    expect(p?.hasAttribute('id')).toBe(false);
  });

  it('does not execute scripts carried in the payload', () => {
    const marker = '__payloadScriptRan__';
    (globalThis as unknown as Record<string, unknown>)[marker] = false;
    buildDocument(
      payload({ content: `<p>正文</p><script>globalThis.${marker} = true;</script>` })
    );
    expect((globalThis as unknown as Record<string, unknown>)[marker]).toBe(false);
  });

  it('highlights code blocks and records the language', () => {
    const doc = buildDocument(
      payload({ content: '<pre><code class="language-js">const x = 1;</code></pre>' })
    );
    const block = doc.querySelector('.p-code pre');
    expect(block).not.toBeNull();
    expect(block?.getAttribute('data-language')).toBe('javascript');
    expect(block?.querySelector('.token-keyword')).not.toBeNull();
  });

  it('marks long code blocks as breakable and short ones as not', () => {
    const long = 'const x = 1;\n'.repeat(40);
    const longDoc = buildDocument(payload({ content: `<pre><code>${long}</code></pre>` }));
    expect(longDoc.querySelector('.p-code')?.getAttribute('data-long')).toBe('true');

    const shortDoc = buildDocument(
      payload({ content: '<pre><code>const x = 1;</code></pre>' })
    );
    expect(shortDoc.querySelector('.p-code')?.getAttribute('data-long')).toBeNull();
  });

  it('wraps images in a figure and forces eager loading', () => {
    const doc = buildDocument(
      payload({ content: '<p><img src="https://example.com/a.png" loading="lazy" /></p>' })
    );
    const figure = doc.querySelector('.p-figure');
    expect(figure).not.toBeNull();
    expect(figure?.querySelector('img')?.getAttribute('loading')).toBe('eager');
  });

  it('wraps tables so wide ones cannot overflow the text column', () => {
    const doc = buildDocument(payload({ content: '<table><tr><td>a</td></tr></table>' }));
    expect(doc.querySelector('.p-table-wrap .p-table')).not.toBeNull();
  });

  it('keeps headings out of page breaks via structure only (CSS handles the rest)', () => {
    const doc = buildDocument(payload({ content: '<h2>小节</h2><p>正文</p>' }));
    expect(doc.querySelector('.p-content h2')?.textContent).toBe('小节');
  });

  it('renders a footer link for the source page', () => {
    const doc = buildDocument(payload());
    const link = doc.querySelector('.p-footer a');
    expect(link?.getAttribute('href')).toBe('https://example.com/post/1');
    expect(link?.textContent).toBe('example.com');
  });

  it('rejects a javascript: source URL instead of emitting a live link', () => {
    const doc = buildDocument(payload({ sourceUrl: 'javascript:alert(1)' }));
    expect(doc.querySelector('.p-footer a')).toBeNull();
  });

  it('rejects a data: source URL', () => {
    const doc = buildDocument(payload({ sourceUrl: 'data:text/html,<script>alert(1)</script>' }));
    expect(doc.querySelector('.p-footer a')).toBeNull();
  });

  it('falls back to a generic title when the payload carries none', () => {
    const doc = buildDocument(payload({ title: '' }));
    expect(doc.querySelector('.p-title')?.textContent).toBe('Untitled');
  });
});

describe('buildDocument language hints', () => {
  it('highlights a bare inline code element', () => {
    // A `<code>` outside a `<pre>` is a `<code>` in its own right: it has to be
    // promoted to a block on its own, or it stays an unreadable inline run in
    // the printed column.
    const doc = buildDocument(
      payload({ content: '<p>Call <code>print(1)</code> here.</p>' })
    );

    const block = doc.querySelector('.p-code pre');
    expect(block).not.toBeNull();
    expect(block?.textContent).toBe('print(1)');
  });

  it('reads the language off a pre that has no code child', () => {
    // Hand-written markup often puts the text of a `<pre>` straight inside it.
    // Reaching for a `<code>` child and giving up there would drop the block's
    // text entirely.
    const doc = buildDocument(payload({ content: '<pre>fn main() { let x = 1; }</pre>' }));

    const block = doc.querySelector('.p-code pre');
    expect(block).not.toBeNull();
    expect(block?.textContent).toBe('fn main() { let x = 1; }');
    // No child `<code>`, so the language comes from the text.
    expect(block?.getAttribute('data-language')).toBe('rust');
  });

  it('detects the language from the text, because sanitizing runs first', () => {
    // The sanitizer strips `class` from every element (it is in
    // STRIPPED_ATTRS), and it runs before the code pass. So the `language-` /
    // `lang-` hint `readLanguageHint` looks for is never present by the time
    // the code blocks are rebuilt, and every block is detected from its text.
    //
    // This is pinned deliberately: the "declared" and "detected" languages
    // agreeing here is coincidence — `js` and `python` are the two values a
    // hint would most plausibly carry, and both are what the text says.
    const doc = buildDocument(
      payload({
        content:
          '<pre class="language-rust"><code class="lang-rs">fn main() { let x = 1; }</code></pre>' +
          '<pre class="language-python"><code class="lang-py">def main():\n    return 1</code></pre>',
      })
    );

    const languages = Array.from(doc.querySelectorAll('.p-code pre')).map((pre) =>
      pre.getAttribute('data-language')
    );
    expect(languages).toEqual(['rust', 'python']);
  });
});

describe('buildDocument image wrapping', () => {
  it('wraps an image whose parent is not a paragraph or figure', () => {
    // Readability wraps prose images in <p>, but an image in a <div> has to be
    // wrapped in place — replacing the <div> would take its siblings with it.
    const doc = buildDocument(
      payload({ content: '<div><img src="https://example.com/a.png" alt="a"> tail</div>' })
    );

    const wrapper = doc.querySelector('.p-content div');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('.p-figure img')?.getAttribute('src')).toBe(
      'https://example.com/a.png'
    );
    expect(wrapper?.textContent).toContain('tail');
  });

  it('replaces the whole paragraph when the image is wrapped in one', () => {
    const doc = buildDocument(
      payload({ content: '<p><img src="https://example.com/a.png" alt="a"></p>' })
    );

    expect(doc.querySelector('.p-content p')).toBeNull();
    expect(doc.querySelector('.p-content > .p-figure img')).not.toBeNull();
  });

  it('loses the caption of a figure it wraps, leaving the branch that styles it unreachable', () => {
    // `processImage` builds a fresh <figure>, swaps it in for the old one, and
    // then moves only the <img> across — the <figcaption> stays behind in the
    // detached old figure. So `figure.querySelector('figcaption')` is always
    // null and the `p-caption` styling below it can never be applied.
    //
    // Characterisation, not endorsement: this asserts what the code does today
    // so a change here is a deliberate one, and so the loss is visible next to
    // the dead branch it causes.
    const doc = buildDocument(
      payload({
        content:
          '<figure><img src="https://example.com/a.png" alt="a"><figcaption>图注</figcaption></figure>',
      })
    );

    const figure = doc.querySelector('.p-content figure');
    expect(figure?.className).toBe('p-figure');
    expect(figure?.querySelector('img')).not.toBeNull();
    expect(figure?.querySelector('figcaption')).toBeNull();
    expect(doc.querySelector('.p-caption')).toBeNull();
  });
});

describe('buildFilename', () => {
  it('combines title and host', () => {
    expect(buildFilename(payload())).toBe('测试文章 - example.com.pdf');
  });

  it('strips characters that are reserved on common filesystems', () => {
    const name = buildFilename(payload({ title: 'a/b:c*d?e"f<g>h|i' }));
    expect(name).not.toMatch(/[/\\:*?"<>|]/);
  });

  it('falls back to the host when the title is empty', () => {
    expect(buildFilename(payload({ title: '' }))).toBe('example.com.pdf');
  });

  it('falls back to a generic name when there is no usable source', () => {
    expect(buildFilename(payload({ title: '', sourceUrl: 'not a url' }))).toBe('article.pdf');
  });

  it('truncates very long titles', () => {
    const name = buildFilename(payload({ title: 'x'.repeat(300) }));
    // 80 title chars + " - host" + ".pdf"
    expect(name.length).toBeLessThan(100);
  });
});
