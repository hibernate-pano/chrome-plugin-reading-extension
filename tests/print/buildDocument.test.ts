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
