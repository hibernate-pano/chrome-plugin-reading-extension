import { describe, it, expect } from 'vitest';
import { addCjkSpacing, addCjkSpacingToHtml } from '../../src/shared/cjkSpacing';

/** Parse a fragment the way the reader does, and read back its text. */
function textOf(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent ?? '';
}

describe('CJK inter-script spacing', () => {
  describe('addCjkSpacing', () => {
    it('should separate Chinese from a Latin word in both directions', () => {
      expect(addCjkSpacing('使用React框架')).toBe('使用 React 框架');
    });

    it('should separate Chinese from digits', () => {
      expect(addCjkSpacing('共12个章节，第3版')).toBe('共 12 个章节，第 3 版');
    });

    it('should handle kana and compatibility ideographs as CJK', () => {
      expect(addCjkSpacing('これはReactです')).toBe('これは React です');
      expect(addCjkSpacing('說A')).toBe('說 A');
    });

    it('should leave a space that is already there alone', () => {
      expect(addCjkSpacing('使用 React 框架')).toBe('使用 React 框架');
    });

    it('should not pad full-width punctuation away from Latin text', () => {
      // pangu does space around brackets, but the brackets here are full-width
      // and belong to the Chinese sentence — pushing them apart looks worse
      // than leaving them tight.
      expect(addCjkSpacing('中文（React）结束')).toBe('中文（React）结束');
      expect(addCjkSpacing('他说：React很好')).toBe('他说：React 很好');
    });

    it('should leave pure Latin and pure Chinese text untouched', () => {
      expect(addCjkSpacing('just some english')).toBe('just some english');
      expect(addCjkSpacing('纯中文段落')).toBe('纯中文段落');
    });

    it('should return empty and falsy input unchanged', () => {
      expect(addCjkSpacing('')).toBe('');
      expect(addCjkSpacing(null as unknown as string)).toBe(null);
    });

    it('should be idempotent', () => {
      const once = addCjkSpacing('使用React18的钩子');
      expect(addCjkSpacing(once)).toBe(once);
      expect(once).toBe('使用 React18 的钩子');
    });
  });

  describe('addCjkSpacingToHtml', () => {
    it('should space prose without touching tags or attributes', () => {
      const html = '<p>使用<a href="/React?lang=中文">React框架</a>开发</p>';
      const result = addCjkSpacingToHtml(html);

      expect(textOf(result)).toContain('使用');
      expect(textOf(result)).toContain('React 框架');
      // A regex over the raw string would have padded the href and the tag.
      expect(result).toContain('href="/React?lang=中文"');
      expect(result).not.toContain('React ?');
    });

    it('should skip <pre> blocks', () => {
      const html = '<p>运行pnpm install</p><pre><code>const 中文=1;</code></pre>';
      const result = addCjkSpacingToHtml(html);

      expect(textOf(result)).toContain('运行 pnpm install');
      expect(result).toContain('const 中文=1;');
      expect(result).not.toContain('中文 = 1');
    });

    it('should skip inline <code>', () => {
      const result = addCjkSpacingToHtml('<p>调用<code>use中文Hook()</code>即可</p>');

      expect(result).toContain('<code>use中文Hook()</code>');
      expect(textOf(result)).toContain('调用');
      expect(textOf(result)).toContain('即可');
    });

    it('should space inside a node but not across a tag boundary', () => {
      // `使用` and `React` sit in different text nodes, so neither node alone
      // sees the adjacency. Bridging that needs cross-node state and would put
      // a space inside `<em>`; the honest behaviour is to leave the seam as the
      // source page wrote it. `React 框架` is one text node, so it does get
      // spaced.
      const result = addCjkSpacingToHtml('<p>使用<em>React框架</em>很好</p>');
      expect(result).toBe('<p>使用<em>React 框架</em>很好</p>');
    });

    it('should be idempotent through a second pass', () => {
      const html = '<p>使用React框架</p>';
      const once = addCjkSpacingToHtml(html);
      expect(addCjkSpacingToHtml(once)).toBe(once);
    });

    it('should return empty input unchanged', () => {
      expect(addCjkSpacingToHtml('')).toBe('');
    });

    it('should preserve markup it has no business changing', () => {
      const html = '<ul><li>第一React项</li><li>second item</li></ul>';
      const result = addCjkSpacingToHtml(html);

      expect(result).toContain('<ul><li>');
      expect(textOf(result)).toContain('第一 React 项');
      expect(textOf(result)).toContain('second item');
    });
  });
});
