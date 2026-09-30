/**
 * ReaderView — component tests.
 *
 * The component is rendered straight into jsdom's document; it does not need a
 * shadow root to behave correctly, and rendering it plainly is what makes the
 * document-level Escape / mousemove listeners observable.
 *
 * Timers are the load-bearing part of most of this file: the toolbar auto-hide,
 * the export error decay and the copy reset are all setTimeout-driven, so those
 * tests install fake timers and step them explicitly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { ReaderView } from '../../src/content/ReaderView';
import { DEFAULT_SETTINGS } from '../../src/shared/constants';
import { detectLanguage } from '../../src/shared/codeHighlight';
import type { ExtractedContent, Settings } from '../../src/shared/types';
import type { ReadingRecord } from '../../src/shared/history';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const BASE_CONTENT: ExtractedContent = {
  title: 'How to Read Well',
  content: '<p>Prose that has no code in it at all.</p>',
  textContent: 'Prose that has no code in it at all.',
  excerpt: 'Prose that has no code in it at all.',
  byline: null,
  siteName: null,
  wordCount: 9,
  estimatedReadTime: 5,
};

type ExportResult = { success: boolean; error?: string };

/** A stored record, as `addToHistory` would have written it. */
function record(overrides: Partial<ReadingRecord> = {}): ReadingRecord {
  return {
    id: 'r-1',
    url: 'https://example.com/article',
    title: 'A Read Article',
    excerpt: '',
    byline: '',
    siteName: 'example.com',
    length: 1200,
    readingTime: 6,
    theme: 'light',
    fontSize: 19,
    createdAt: Date.now() - 86_400_000,
    lastReadAt: Date.now() - 3_600_000,
    readCount: 1,
    ...overrides,
  };
}

/**
 * The chrome-API callbacks `content/index.ts` owns and hands down. ReaderView
 * must route every one of them; none of them may be called on its own.
 */
interface HistoryHandlers {
  onResetSettings: () => Promise<void>;
  onLoadHistory: () => Promise<ReadingRecord[]>;
  onDeleteHistory: (recordId: string) => Promise<ReadingRecord[]>;
  onClearHistory: () => Promise<ReadingRecord[]>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderReader(
  contentOverrides: Partial<ExtractedContent> = {},
  settingsOverrides: Partial<Settings> = {},
  onExportPdf: () => Promise<ExportResult> = () => Promise.resolve({ success: true }),
  historyOverrides: Partial<HistoryHandlers> = {}
) {
  const content: ExtractedContent = { ...BASE_CONTENT, ...contentOverrides };
  const settings: Settings = { ...DEFAULT_SETTINGS, ...settingsOverrides };
  const onClose = vi.fn();
  const onSettingsChange = vi.fn();
  const onExportPdfSpy = vi.fn(onExportPdf);

  const handlers: HistoryHandlers = {
    onResetSettings: vi.fn(() => Promise.resolve()),
    onLoadHistory: vi.fn(() => Promise.resolve([])),
    onDeleteHistory: vi.fn(() => Promise.resolve([])),
    onClearHistory: vi.fn(() => Promise.resolve([])),
    ...historyOverrides,
  };

  const utils = render(
    <ReaderView
      content={content}
      settings={settings}
      onClose={onClose}
      onSettingsChange={onSettingsChange}
      onExportPdf={onExportPdfSpy}
      {...handlers}
    />
  );

  const toolbar = (): HTMLElement => {
    const el = utils.container.querySelector('.reader-toolbar');
    if (!el) throw new Error('toolbar not rendered');
    return el as HTMLElement;
  };
  const article = (): HTMLElement => {
    const el = utils.container.querySelector('#reader-content');
    if (!el) throw new Error('article not rendered');
    return el as HTMLElement;
  };
  const codeBlocks = (): HTMLElement[] =>
    Array.from(utils.container.querySelectorAll('.reader-code-block'));

  return {
    ...utils,
    content,
    settings,
    onClose,
    onSettingsChange,
    onExportPdf: onExportPdfSpy,
    ...handlers,
    toolbar,
    article,
    codeBlocks,
  };
}

type NavigatorWithClipboard = Navigator & {
  clipboard?: { writeText: (text: string) => Promise<void> };
};

let originalClipboard: NavigatorWithClipboard['clipboard'];

beforeEach(() => {
  originalClipboard = (navigator as NavigatorWithClipboard).clipboard;
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  const nav = navigator as NavigatorWithClipboard;
  if (originalClipboard === undefined) delete nav.clipboard;
  else nav.clipboard = originalClipboard;
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ *
 * Article shell
 * ------------------------------------------------------------------ */

describe('ReaderView — article shell', () => {
  it('renders the title, the meta line and the body', () => {
    const { container } = renderReader(
      { title: 'How to Read Well', content: '<p>The body paragraph.</p>' },
      {},
    );

    const title = container.querySelector('#reader-title');
    expect(title).toHaveTextContent('How to Read Well');

    const body = container.querySelector('#reader-content');
    expect(body).toHaveTextContent('The body paragraph.');
    expect(body?.querySelector('p')).toHaveTextContent('The body paragraph.');
    expect(body).toHaveAttribute('aria-labelledby', 'reader-title');
  });

  it('mounts as a main landmark with the theme class and CSS custom properties', () => {
    const { container } = renderReader({}, { theme: 'sepia', fontSize: 21, lineHeight: 1.5, pageWidth: 800 });

    const overlay = container.querySelector('.reader-overlay') as HTMLElement;
    expect(overlay).toHaveAttribute('role', 'main');
    expect(overlay).toHaveClass('reader-theme-sepia');
    expect(overlay.style.getPropertyValue('--reader-font-size')).toBe('21px');
    expect(overlay.style.getPropertyValue('--reader-line-height')).toBe('1.5');
    expect(overlay.style.getPropertyValue('--reader-page-width')).toBe('800px');
    expect(overlay.style.getPropertyValue('--reader-bg')).toBe('#f8f2e7');
  });

  it('always shows the estimated read time', () => {
    renderReader({ estimatedReadTime: 12 });
    expect(screen.getByText('12 min read')).toBeInTheDocument();
  });

  it('locks body scroll while mounted and releases it on unmount', () => {
    const { unmount } = renderReader();
    expect(document.body).toHaveClass('reader-mode-active');
    unmount();
    expect(document.body).not.toHaveClass('reader-mode-active');
  });
});

/* ------------------------------------------------------------------ *
 * Meta separator — regression for the always-true `(content.byline || true)`
 * ------------------------------------------------------------------ */

describe('ReaderView — meta separators', () => {
  const CASES: Array<{
    label: string;
    siteName: string | null;
    byline: string | null;
    expected: string[];
  }> = [
    {
      label: 'site name and byline',
      siteName: 'Example Blog',
      byline: 'Jane Doe',
      expected: ['Example Blog', 'Jane Doe', '5 min read'],
    },
    {
      label: 'site name only',
      siteName: 'Example Blog',
      byline: null,
      expected: ['Example Blog', '5 min read'],
    },
    {
      label: 'byline only',
      siteName: null,
      byline: 'Jane Doe',
      expected: ['Jane Doe', '5 min read'],
    },
    {
      label: 'neither',
      siteName: null,
      byline: null,
      expected: ['5 min read'],
    },
  ];

  it('renders exactly one separator between consecutive items, for every combination', () => {
    for (const { label, siteName, byline, expected } of CASES) {
      const { container, unmount } = renderReader({ siteName, byline });
      const meta = container.querySelector('.reader-meta') as HTMLElement;

      const items = Array.from(meta.querySelectorAll('.reader-meta__item')).map(
        (el) => el.textContent
      );
      expect(items, label).toEqual(expected);
      expect(meta.querySelectorAll('.reader-meta__separator').length, label).toBe(
        expected.length - 1
      );

      unmount();
    }
  });

  it('never leads, trails or doubles a separator, for every combination', () => {
    for (const { label, siteName, byline } of CASES) {
      const { container, unmount } = renderReader({ siteName, byline });
      const meta = container.querySelector('.reader-meta') as HTMLElement;
      const text = meta.textContent ?? '';

      expect(text.startsWith('·'), `${label}: no leading separator`).toBe(false);
      expect(text.endsWith('·'), `${label}: no trailing separator`).toBe(false);
      expect(text.includes('··'), `${label}: no doubled separator`).toBe(false);
      // The separator is decorative — it must stay out of the a11y tree.
      for (const sep of Array.from(meta.querySelectorAll('.reader-meta__separator'))) {
        expect(sep).toHaveAttribute('aria-hidden', 'true');
      }

      unmount();
    }
  });

  it('renders the separators as a position-dependent sequence, not per-field', () => {
    for (const { label, siteName, byline, expected } of CASES) {
      const { container, unmount } = renderReader({ siteName, byline });
      const meta = container.querySelector('.reader-meta') as HTMLElement;

      // Nothing but items and separators, in order.
      const shape = Array.from(meta.children).map((child) =>
        child.classList.contains('reader-meta__separator') ? '·' : child.textContent
      );
      expect(shape, label).toEqual(
        expected.flatMap((item, index) => (index === 0 ? [item] : ['·', item]))
      );
      // JSX drops the inter-element whitespace, so the separators butt up
      // against the items — what matters is that there is exactly one.
      expect(meta.textContent, label).toBe(expected.join('·'));

      unmount();
    }
  });

  it('never shows a null or undefined meta value', () => {
    for (const { label, siteName, byline } of CASES) {
      const { container, unmount } = renderReader({ siteName, byline });
      const text = container.querySelector('.reader-meta')?.textContent ?? '';
      expect(text, label).not.toMatch(/null|undefined/);
      unmount();
    }
  });
});

/* ------------------------------------------------------------------ *
 * Code blocks
 * ------------------------------------------------------------------ */

describe('ReaderView — processContentWithCodeBlocks', () => {
  it('turns a <pre><code> block into a copyable CodeBlock', () => {
    const { article, codeBlocks } = renderReader({
      content: '<pre><code>const total = 1 + 2;</code></pre>',
    });

    expect(codeBlocks()).toHaveLength(1);
    const code = article().querySelector('.reader-code-block pre code') as HTMLElement;
    expect(code.textContent).toBe('const total = 1 + 2;');
    expect(detectLanguage('const total = 1 + 2;')).toBe('javascript');
    expect(screen.getByLabelText('Code block in javascript')).toBe(code);
  });

  it('gives a rendered code block a working copy button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderReader({ content: '<pre><code>const total = 1 + 2;</code></pre>' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy code to clipboard' }));
    });

    expect(writeText).toHaveBeenCalledWith('const total = 1 + 2;');
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('renders a bare <pre> with no <code> child as a code block', () => {
    const { article, codeBlocks } = renderReader({ content: '<pre>bare preformatted text</pre>' });

    expect(codeBlocks()).toHaveLength(1);
    const code = article().querySelector('.reader-code-block pre code') as HTMLElement;
    expect(code.textContent).toBe('bare preformatted text');
    expect(article().querySelector('pre > code > pre')).toBeNull();
  });

  it('renders an inline <code> with no <pre> parent as a code block', () => {
    const { article, codeBlocks } = renderReader({
      content: '<p>Call <code>renderAll()</code> to refresh.</p>',
    });

    expect(codeBlocks()).toHaveLength(1);
    const code = article().querySelector('.reader-code-block pre code') as HTMLElement;
    expect(code.textContent).toBe('renderAll()');
    expect(article().querySelector('p code')).toBeNull();
  });

  it('picks up a code block nested inside a prose wrapper', () => {
    const { article, codeBlocks } = renderReader({
      content: '<div class="post"><p>Intro.</p><pre><code>let a = 1;</code></pre></div>',
    });

    expect(codeBlocks()).toHaveLength(1);
    expect(article().textContent).toContain('Intro.');
    expect(article().textContent).toContain('let a = 1;');
  });

  it('keeps prose before, between and after code blocks', () => {
    const { article, codeBlocks } = renderReader({
      content: [
        '<p>First paragraph.</p>',
        '<pre><code>const a = 1;</code></pre>',
        '<p>Second paragraph.</p>',
        '<pre><code>const b = 2;</code></pre>',
        '<p>Third paragraph.</p>',
      ].join(''),
    });

    expect(codeBlocks()).toHaveLength(2);
    expect(article().querySelectorAll('p')).toHaveLength(3);

    const text = article().textContent ?? '';
    for (const fragment of [
      'First paragraph.',
      'const a = 1;',
      'Second paragraph.',
      'const b = 2;',
      'Third paragraph.',
    ]) {
      expect(text, fragment).toContain(fragment);
    }

    // Order is preserved, not merely presence.
    const order = [
      'First paragraph.',
      'const a = 1;',
      'Second paragraph.',
      'const b = 2;',
      'Third paragraph.',
    ].map((fragment) => text.indexOf(fragment));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('keeps prose that shares a parent with a code block', () => {
    const { article, codeBlocks } = renderReader({
      content: '<section><p>Nested intro.</p><pre><code>x = 1</code></pre><p>Nested outro.</p></section>',
    });

    expect(codeBlocks()).toHaveLength(1);
    const paragraphs = Array.from(article().querySelectorAll('p')).map((p) => p.textContent);
    expect(paragraphs).toEqual(['Nested intro.', 'Nested outro.']);
  });

  it('reads a language-python class off the <code>', () => {
    const { codeBlocks } = renderReader({
      content: '<pre><code class="language-python">def main():\n    return 1</code></pre>',
    });

    expect(codeBlocks()).toHaveLength(1);
    expect(screen.getByLabelText('Language: python')).toHaveTextContent('python');
    expect(screen.getByLabelText('Code block in python').textContent).toBe(
      'def main():\n    return 1'
    );
  });

  it('reads a lang- class off a bare <pre> too', () => {
    renderReader({ content: '<pre class="lang-rust">fn main() {}</pre>' });
    expect(screen.getByLabelText('Language: rust')).toBeInTheDocument();
  });

  it('renders a content string with no code at all unchanged', () => {
    const html = '<p>One.</p><ul><li>Two</li></ul><blockquote>Three</blockquote>';
    const { article, codeBlocks } = renderReader({ content: html });

    expect(codeBlocks()).toHaveLength(0);
    expect(article().innerHTML).toContain('<li>Two</li>');
    expect(article().textContent).toContain('Three');
  });

  it('is not fooled by a literal code-block placeholder in the article', () => {
    // The old implementation re-serialized the body and located each
    // placeholder with indexOf, so an article that merely *contains* the
    // placeholder string could be spliced apart at the wrong offset.
    const { article, codeBlocks } = renderReader({
      content: [
        '<p>Legit paragraph before the decoy.</p>',
        '<div data-code-block-id="code-block-0">DECOY PAYLOAD</div>',
        '<pre><code>const real = 1;</code></pre>',
        '<p>Legit paragraph after the decoy.</p>',
      ].join(''),
    });

    expect(codeBlocks(), 'exactly one real code block').toHaveLength(1);
    expect(article().querySelector('.reader-code-block pre code')?.textContent).toBe(
      'const real = 1;'
    );

    const text = article().textContent ?? '';
    expect(text).toContain('Legit paragraph before the decoy.');
    expect(text).toContain('Legit paragraph after the decoy.');
    expect(article().querySelectorAll('[data-code-block-id]')).toHaveLength(1);
    expect(article().textContent?.match(/DECOY PAYLOAD/g)).toHaveLength(1);
  });

  it('handles a document whose only content is a code block', () => {
    const { article, codeBlocks } = renderReader({ content: '<pre><code>only()</code></pre>' });
    expect(codeBlocks()).toHaveLength(1);
    // The article also carries the block's own header (language label and
    // copy button), so assert on the code element rather than the whole node.
    expect(article().querySelector('.reader-code-block pre code')?.textContent).toBe('only()');
  });

  it('handles an empty content string', () => {
    const { article, codeBlocks } = renderReader({ content: '' });
    expect(codeBlocks()).toHaveLength(0);
    expect(article().textContent).toBe('');
  });
});

/* ------------------------------------------------------------------ *
 * Toolbar
 * ------------------------------------------------------------------ */

describe('ReaderView — toolbar visibility', () => {
  it('starts visible and hides after 3000ms of inactivity', () => {
    vi.useFakeTimers();
    const { toolbar } = renderReader();

    expect(toolbar()).toHaveClass('reader-toolbar--visible');

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--visible');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--hidden');
  });

  it('comes back on mousemove and hides again after a shorter idle window', () => {
    vi.useFakeTimers();
    const { toolbar } = renderReader();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--hidden');

    act(() => {
      fireEvent.mouseMove(document);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--visible');

    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(toolbar(), 'still visible just before the idle deadline').toHaveClass(
      'reader-toolbar--visible'
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--hidden');
  });

  it('restarts the idle window on repeated movement', () => {
    vi.useFakeTimers();
    const { toolbar } = renderReader();

    for (let i = 0; i < 5; i += 1) {
      act(() => {
        vi.advanceTimersByTime(2000);
        fireEvent.mouseMove(document);
      });
    }
    expect(toolbar()).toHaveClass('reader-toolbar--visible');

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--hidden');
  });

  /**
   * KNOWN BUG — src/content/ReaderView.tsx:61-69.
   *
   * The `mousemove` effect declares `showToolbar` as its only dependency, and
   * `showToolbar` is a `useCallback` over `showSettings`. So toggling the
   * settings panel tears the effect down and rebuilds it — and the rebuild
   * unconditionally arms a fresh unconditional 3000ms hide:
   *
   *     hideTimerRef.current = setTimeout(() => setToolbarVisible(false), 3000);
   *
   * The `if (!showSettings)` guard in `showToolbar` (line 43) only protects
   * the *mousemove* path; nothing protects this one. Three seconds after the
   * settings panel opens — with the panel still open — the toolbar disappears
   * out from under it, which is exactly what the comment on line 50 and the
   * effect on lines 51-58 promise will not happen.
   *
   * Written against the CORRECT behaviour with `.fails`, so it flips to a
   * failure as soon as the mount timer is gated on `showSettings` (or the
   * effect is split so the one-shot arm is not re-run).
   */
  it('stays visible for as long as the settings panel is open', async () => {
    vi.useFakeTimers();
    const { toolbar } = renderReader();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--hidden');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(toolbar()).toHaveClass('reader-toolbar--visible');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(toolbar(), 'the panel is still open').toBeInTheDocument();
    expect(toolbar(), 'the toolbar must not hide underneath it').toHaveClass(
      'reader-toolbar--visible'
    );

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--visible');
  });

  it('stops listening for mousemove once unmounted', () => {
    vi.useFakeTimers();
    const { toolbar, unmount } = renderReader();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--hidden');

    unmount();

    // No listener, no re-render, and certainly no React warning.
    act(() => {
      fireEvent.mouseMove(document);
      vi.advanceTimersByTime(60_000);
    });
    expect(() => screen.getByLabelText('Reader controls')).toThrow();
  });
});

/* ------------------------------------------------------------------ *
 * Toolbar — mousemove throttling
 * ------------------------------------------------------------------ */

describe('ReaderView — toolbar mousemove throttling', () => {
  it('asks for at most one hide re-arm per frame', () => {
    vi.useFakeTimers();
    const { toolbar } = renderReader();
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');

    act(() => {
      // A pointer sweep delivers far more events than one frame can show.
      for (let i = 0; i < 20; i += 1) {
        fireEvent.mouseMove(document);
      }
    });

    expect(rafSpy, '20 mousemoves in a single frame').toHaveBeenCalledTimes(1);
    expect(toolbar(), 'the toolbar is shown immediately, not on the next frame').toHaveClass(
      'reader-toolbar--visible'
    );
  });

  it('does not latch: movement on a later frame arms again', () => {
    vi.useFakeTimers();
    const { toolbar } = renderReader();
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');

    act(() => {
      fireEvent.mouseMove(document);
    });
    expect(rafSpy).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(20);
      fireEvent.mouseMove(document);
    });
    expect(rafSpy, 'a new frame is a new re-arm').toHaveBeenCalledTimes(2);

    // Throttling must not shift the deadline: the toolbar hides 2500ms after
    // the *last* movement, measured from the event rather than from the frame
    // that armed the timer. (That movement was 20ms ago when this act block
    // opened, so the deadline lands 2500ms from here, not from the frame.)
    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(toolbar(), 'still visible just before the idle deadline').toHaveClass(
      'reader-toolbar--visible'
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(toolbar()).toHaveClass('reader-toolbar--hidden');
  });

  it('arms no hide at all while a panel is open, however much the mouse moves', async () => {
    vi.useFakeTimers();
    const { toolbar } = renderReader();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });

    for (let i = 0; i < 5; i += 1) {
      act(() => {
        vi.advanceTimersByTime(20);
        fireEvent.mouseMove(document);
      });
    }

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(toolbar(), 'no hide can fire underneath an open panel').toHaveClass(
      'reader-toolbar--visible'
    );
  });
});

/* ------------------------------------------------------------------ *
 * Settings panel
 * ------------------------------------------------------------------ */

describe('ReaderView — settings panel', () => {
  it('toggles the panel from the gear and flips aria-expanded', async () => {
    renderReader();

    const closed = screen.getByRole('button', { name: 'Open settings' });
    expect(closed).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(closed);
    });

    const open = screen.getByRole('button', { name: 'Close settings' });
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(open).toHaveClass('reader-settings-btn--active');
    expect(screen.getByRole('dialog', { name: 'Reading settings' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(open);
    });

    expect(screen.getByRole('button', { name: 'Open settings' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('forwards a settings change to onSettingsChange', async () => {
    const { onSettingsChange } = renderReader();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    });

    fireEvent.click(screen.getByRole('radio', { name: '深色' }));
    expect(onSettingsChange).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('returns focus to the gear when the panel closes itself', async () => {
    renderReader();
    const gear = screen.getByRole('button', { name: 'Open settings' });

    await act(async () => {
      fireEvent.click(gear);
    });
    // The dialog root takes the mount focus — see SettingsPanel.
    expect(document.activeElement).toBe(
      screen.getByRole('dialog', { name: 'Reading settings' })
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '关闭设置' }));
    });

    expect(document.activeElement).toBe(gear);
  });

  it('routes restore-defaults to the callback the content script owns', async () => {
    const onResetSettings = vi.fn(() => Promise.resolve());
    renderReader({}, {}, undefined, { onResetSettings });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '恢复默认设置' }));
    });

    expect(onResetSettings).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ *
 * History panel
 * ------------------------------------------------------------------ */

describe('ReaderView — history panel', () => {
  const openHistory = async (): Promise<ReturnType<typeof renderReader>> => {
    const utils = renderReader();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    return utils;
  };

  it('toggles the panel from the clock and flips aria-expanded', async () => {
    const { onLoadHistory } = renderReader();

    const closed = screen.getByRole('button', { name: 'Open reading history' });
    expect(closed).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(closed);
    });

    const open = screen.getByRole('button', { name: 'Close reading history' });
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(open).toHaveClass('reader-history-btn--active');
    expect(screen.getByRole('dialog', { name: '阅读历史' })).toBeInTheDocument();
    expect(onLoadHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(open);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not read storage until the panel is actually opened', () => {
    const { onLoadHistory } = renderReader();
    expect(onLoadHistory, 'reading on mount would be a read per article').not.toHaveBeenCalled();
  });

  it('shows a loading state until the records arrive', async () => {
    const pending = deferred<ReadingRecord[]>();
    renderReader({}, {}, undefined, { onLoadHistory: () => pending.promise });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    expect(screen.getByText('正在加载阅读记录…')).toBeInTheDocument();
    expect(screen.queryByText('还没有阅读记录')).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve([record({ title: 'Loaded Article' })]);
      await pending.promise;
    });

    expect(screen.getByText('Loaded Article')).toBeInTheDocument();
  });

  it('shows the empty state when storage has nothing', async () => {
    await openHistory();
    expect(screen.getByText('还没有阅读记录')).toBeInTheDocument();
  });

  it('re-reads on every open so a record erased elsewhere stops being shown', async () => {
    const onLoadHistory = vi.fn(() => Promise.resolve([record({ title: 'Still here' })]));
    renderReader({}, {}, undefined, { onLoadHistory });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close reading history' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });

    expect(onLoadHistory).toHaveBeenCalledTimes(2);
  });

  it('forwards a delete and renders what storage says is left', async () => {
    const onDeleteHistory = vi.fn(() => Promise.resolve([]));
    renderReader(
      {},
      {},
      undefined,
      { onLoadHistory: () => Promise.resolve([record({ title: 'Doomed' })]), onDeleteHistory }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '删除《Doomed》的阅读记录' }));
    });

    expect(onDeleteHistory).toHaveBeenCalledTimes(1);
    expect(onDeleteHistory).toHaveBeenCalledWith('r-1');
    expect(screen.queryByText('Doomed')).not.toBeInTheDocument();
    expect(screen.getByText('还没有阅读记录')).toBeInTheDocument();
  });

  it('reports a failed delete and keeps showing the record', async () => {
    renderReader(
      {},
      {},
      undefined,
      {
        onLoadHistory: () => Promise.resolve([record({ title: 'Sticky' })]),
        onDeleteHistory: () => Promise.reject(new Error('删除失败，请重试')),
      }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '删除《Sticky》的阅读记录' }));
    });

    expect(screen.getByText('Sticky')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('删除失败，请重试');
  });

  it('reports a failed history read in the panel', async () => {
    renderReader(
      {},
      {},
      undefined,
      { onLoadHistory: () => Promise.reject(new Error('storage gone')) }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('storage gone');
  });

  it('uses a fallback message when a read rejects with a non-Error', async () => {
    renderReader({}, {}, undefined, { onLoadHistory: () => Promise.reject('nope') });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('读取阅读历史失败');
  });

  it('ignores a read that settles after the panel unmounted', async () => {
    const pending = deferred<ReadingRecord[]>();
    const { unmount } = renderReader(
      {},
      {},
      undefined,
      { onLoadHistory: () => pending.promise }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    await act(async () => {
      unmount();
      pending.reject(new Error('late'));
      await pending.promise.catch(() => {});
    });
    // The catch ran, saw `cancelled`, and dropped the result — no setState on
    // an unmounted component, no crash.
  });

  it('uses a fallback message when a delete rejects with a non-Error', async () => {
    renderReader(
      {},
      {},
      undefined,
      {
        onLoadHistory: () => Promise.resolve([record({ title: 'Sticky' })]),
        onDeleteHistory: () => Promise.reject('nope'),
      }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '删除《Sticky》的阅读记录' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('删除失败，请重试');
  });

  it('uses a fallback message when a clear rejects with a non-Error', async () => {
    renderReader(
      {},
      {},
      undefined,
      {
        onLoadHistory: () => Promise.resolve([record({ title: 'Wiped' })]),
        onClearHistory: () => Promise.reject('nope'),
      }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '清空全部' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '确认清空' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('清空失败，请重试');
  });

  it('erases the history only after the panel confirms', async () => {
    const onClearHistory = vi.fn(() => Promise.resolve([]));
    renderReader(
      {},
      {},
      undefined,
      { onLoadHistory: () => Promise.resolve([record({ title: 'Wiped' })]), onClearHistory }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '清空全部' }));
    });
    expect(onClearHistory, 'one click must not wipe 200 records').not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '确认清空' }));
    });
    expect(onClearHistory).toHaveBeenCalledTimes(1);
    expect(screen.getByText('还没有阅读记录')).toBeInTheDocument();
  });

  it('never opens a stored javascript: record, because the panel never renders one', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderReader(
      {},
      {},
      undefined,
      {
        onLoadHistory: () =>
          Promise.resolve([record({ title: 'Hostile', url: 'javascript:alert(1)' })]),
      }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });

    const panel = screen.getByRole('dialog', { name: '阅读历史' });
    expect(within(panel).queryByRole('link')).not.toBeInTheDocument();
    expect(panel.querySelector('a')).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it('and the settings panel and the history panel are never both open', async () => {
    await openHistory();
    expect(screen.getByRole('dialog', { name: '阅读历史' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    });
    expect(screen.queryByRole('dialog', { name: '阅读历史' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Reading settings' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
      fireEvent.click(screen.getByRole('button', { name: 'Open reading history' }));
    });
    expect(screen.queryByRole('dialog', { name: 'Reading settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '阅读历史' })).toBeInTheDocument();
  });

  it('keeps the toolbar visible for as long as the history panel is open', async () => {
    vi.useFakeTimers();
    const { toolbar } = await openHistory();

    expect(toolbar()).toHaveClass('reader-toolbar--visible');

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(toolbar(), 'the toolbar must not hide underneath it').toHaveClass(
      'reader-toolbar--visible'
    );
  });

  it('closes the panel — not the reader — on Escape, then returns focus', async () => {
    const { onClose } = await openHistory();
    const clock = screen.getByRole('button', { name: 'Close reading history' });

    fireEvent.keyDown(screen.getByRole('dialog', { name: '阅读历史' }), { key: 'Escape' });

    expect(onClose, 'Escape belongs to the panel first').not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open reading history' }));
    expect(clock).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ *
 * Escape
 * ------------------------------------------------------------------ */

describe('ReaderView — Escape', () => {
  it('closes the reader when the settings panel is closed', () => {
    const { onClose } = renderReader();

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close the reader while the settings panel is open', async () => {
    const { onClose } = renderReader();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    });

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose, 'Escape belongs to the panel first').not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the reader on a second Escape, once the panel is gone', async () => {
    const { onClose } = renderReader();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const { onClose } = renderReader();
    fireEvent.keyDown(document.body, { key: 'Enter' });
    fireEvent.keyDown(document.body, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ *
 * Skip link
 * ------------------------------------------------------------------ */

describe('ReaderView — skip link', () => {
  it('moves focus to the article instead of following the hash', () => {
    const { article } = renderReader();
    const link = screen.getByRole('link', { name: 'Skip to content' });

    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);

    fireEvent.click(link);

    expect(document.activeElement).toBe(article());
    expect(article()).toHaveAttribute('tabindex', '-1');
    // The hash was not set — the article is focused directly.
    expect(window.location.hash).toBe('');
  });
});

/* ------------------------------------------------------------------ *
 * Export PDF
 * ------------------------------------------------------------------ */

describe('ReaderView — export PDF', () => {
  const EXPORT_BUTTON = '导出 PDF';

  it('calls onExportPdf and shows a spinner until it settles', async () => {
    const pending = deferred<ExportResult>();
    const { container, onExportPdf } = renderReader({}, {}, () => pending.promise);
    const button = screen.getByRole('button', { name: EXPORT_BUTTON });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(onExportPdf).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(container.querySelector('.reader-spinner')).not.toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve({ success: true });
      await pending.promise;
    });

    expect(container.querySelector('.reader-spinner')).toBeNull();
    expect(button).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('surfaces the error from a failed export in a live region', async () => {
    const { container } = renderReader({}, {}, () =>
      Promise.resolve({ success: false, error: '打印页加载失败' })
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: EXPORT_BUTTON }));
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('reader-export-error');
    expect(alert).toHaveTextContent('打印页加载失败');
    // Re-enables after a failure, so the user can retry.
    expect(screen.getByRole('button', { name: EXPORT_BUTTON })).toBeEnabled();
    expect(container.querySelector('.reader-spinner')).toBeNull();
  });

  it('falls back to a default message when the failure carries none', async () => {
    renderReader({}, {}, () => Promise.resolve({ success: false }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: EXPORT_BUTTON }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('导出失败');
  });

  it('reports a thrown export as an error instead of an unhandled rejection', async () => {
    const { onExportPdf } = renderReader({}, {}, () => Promise.reject(new Error('no print page')));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: EXPORT_BUTTON }));
    });

    expect(onExportPdf).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('no print page');
    expect(screen.getByRole('button', { name: EXPORT_BUTTON })).toBeEnabled();
  });

  it('clears the error after 6000ms', async () => {
    vi.useFakeTimers();
    renderReader({}, {}, () => Promise.resolve({ success: false, error: '临时失败' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: EXPORT_BUTTON }));
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(screen.getByRole('alert'), 'still shown just before the deadline').toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears a stale error on the next export attempt', async () => {
    let attempt = 0;
    renderReader({}, {}, () => {
      attempt += 1;
      return attempt === 1
        ? Promise.resolve({ success: false, error: '第一次失败' })
        : Promise.resolve({ success: true });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: EXPORT_BUTTON }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('第一次失败');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: EXPORT_BUTTON }));
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not start a second export while one is still in flight', async () => {
    const pending = deferred<ExportResult>();
    const { onExportPdf } = renderReader({}, {}, () => pending.promise);
    const button = screen.getByRole('button', { name: EXPORT_BUTTON });

    await act(async () => {
      fireEvent.click(button);
    });
    expect(onExportPdf).toHaveBeenCalledTimes(1);

    // The mechanism is `disabled`, and React additionally refuses to dispatch
    // a synthetic click at all on a disabled form control — so `if (exporting)
    // return` on line 95 is defense-in-depth that no DOM event can reach. The
    // behaviour that matters is the one a real double-click produces.
    expect(button).toBeDisabled();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(onExportPdf).toHaveBeenCalledTimes(1);

    // And it is usable again once the first one settles.
    await act(async () => {
      pending.resolve({ success: true });
      await pending.promise;
    });
    expect(button).toBeEnabled();

    await act(async () => {
      fireEvent.click(button);
    });
    expect(onExportPdf).toHaveBeenCalledTimes(2);
  });

  it('pins the one case the exporting guard does NOT cover: two clicks in one batch', async () => {
    // Both clicks land before React commits the re-render, so neither
    // `disabled` nor a re-read of `exporting` can help, and `onExportPdf` is
    // entered twice. Not reported as a bug: in a browser each click is its own
    // discrete event and React 18 flushes it synchronously, so two clicks
    // never share a batch. Pinned so the assumption behind line 95's guard is
    // explicit rather than assumed — if batching ever changes, this fails.
    const pending = deferred<ExportResult>();
    const { onExportPdf } = renderReader({}, {}, () => pending.promise);
    const button = screen.getByRole('button', { name: EXPORT_BUTTON });

    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(onExportPdf).toHaveBeenCalledTimes(2);

    await act(async () => {
      pending.resolve({ success: true });
      await pending.promise;
    });
  });
});

describe('renderContentNodes escape handling', () => {
  /**
   * The sink where escaping has to hold.
   *
   * `sanitizeArticleHtml` escapes `<` so article prose cannot become markup, and
   * `content/index.ts` hands the sanitized string straight to this component. A
   * text node parsed out of that string has its entities decoded again, so
   * anything that re-emits `nodeValue` into the raw-HTML run inverts the
   * escaping. These tests pin the composition — sanitizer output arriving at the
   * sink — which is the step no other test covered.
   */
  function contentRegion(): HTMLElement {
    const region = document.querySelector('#reader-content');
    if (!(region instanceof HTMLElement)) throw new Error('reader content region not found');
    return region;
  }

  it('keeps escaped markup in article text inert when a code block follows it', () => {
    // The sanitizer's output for prose that merely *looks* like markup. The
    // `<code>` sibling forces the split path through `serializeNode`, which is
    // where the decoded text used to re-enter the fragment unescaped.
    const sanitized =
      '<p>before &lt;img src=x onerror="globalThis.__folioXss = 1"&gt; ' +
      '<code>const a = 1;</code></p>';

    renderReader({ content: sanitized });

    expect(contentRegion().querySelectorAll('img')).toHaveLength(0);
    expect((globalThis as Record<string, unknown>).__folioXss).toBeUndefined();
    // The prose itself still reads correctly — escaping must not mangle it.
    expect(contentRegion().textContent).toContain('<img src=x');
  });

  it('keeps escaped markup inert in prose with no code block at all', () => {
    // The same text with no sibling element, so the whole paragraph stays on
    // the outerHTML path. Guards the case where the two paths disagree.
    const sanitized = '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>';

    renderReader({ content: sanitized });

    expect(contentRegion().querySelectorAll('script')).toHaveLength(0);
    expect(contentRegion().textContent).toContain('<script>alert(1)</script>');
  });

  it('escapes ampersands so entity text is not re-interpreted', () => {
    // `&amp;` decodes to `&`; re-emitted raw, a following entity-looking run
    // would decode a second time.
    //
    // The `<code>` sibling is load-bearing, not decoration: without an element
    // to recurse into, the whole `<p>` goes through the `outerHTML` branch and
    // `escapeText` is never called — this test would pass against code that
    // escaped nothing at all.
    renderReader({ content: '<p>Tom &amp;amp; Jerry &amp;lt;b&amp;gt;</p><code>x</code>' });

    expect(contentRegion().textContent).toContain('Tom &amp; Jerry &lt;b&gt;');
  });
});

/* ------------------------------------------------------------------ *
 * Reading progress
 *
 * jsdom does no layout, so the geometry the progress bar reads is faked
 * onto the overlay instance; the writes land in its inline style, which is
 * exactly what the stylesheet's progress gradient consumes.
 * ------------------------------------------------------------------ */

describe('ReaderView — reading progress', () => {
  function fakeLayout(overlay: HTMLElement, scrollHeight: number, clientHeight: number): void {
    Object.defineProperty(overlay, 'scrollHeight', { value: scrollHeight, configurable: true });
    Object.defineProperty(overlay, 'clientHeight', { value: clientHeight, configurable: true });
  }

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  it('writes scroll progress into a custom property on the overlay', async () => {
    const { container, unmount } = renderReader();
    const overlay = container.querySelector('.reader-overlay') as HTMLElement;
    // No scrollable height yet: the bar starts empty, not NaN.
    expect(overlay.style.getPropertyValue('--reader-progress')).toBe('0.00%');

    fakeLayout(overlay, 3000, 1000);
    await act(async () => {
      overlay.dispatchEvent(new Event('scroll'));
      await nextFrame();
    });
    expect(overlay.style.getPropertyValue('--reader-progress')).toBe('0.00%');

    await act(async () => {
      Object.defineProperty(overlay, 'scrollTop', { value: 1000, configurable: true });
      overlay.dispatchEvent(new Event('scroll'));
      // A second scroll inside the same frame is coalesced away, not queued.
      overlay.dispatchEvent(new Event('scroll'));
      await nextFrame();
    });
    expect(overlay.style.getPropertyValue('--reader-progress')).toBe('50.00%');

    // A frame still pending at unmount must be cancelled rather than left to
    // write into a detached overlay.
    await act(async () => {
      overlay.dispatchEvent(new Event('scroll'));
      unmount();
    });
  });

  it('clamps progress at 100% when a resize moves the end of the document up', async () => {
    const { container, unmount } = renderReader();
    const overlay = container.querySelector('.reader-overlay') as HTMLElement;

    fakeLayout(overlay, 3000, 1000);
    Object.defineProperty(overlay, 'scrollTop', { value: 4000, configurable: true });

    await act(async () => {
      window.dispatchEvent(new Event('resize'));
      await nextFrame();
    });
    expect(overlay.style.getPropertyValue('--reader-progress')).toBe('100.00%');

    unmount();
  });
});

/* ------------------------------------------------------------------ *
 * Render edge cases in the code-block walker
 * ------------------------------------------------------------------ */

describe('ReaderView — render edge cases', () => {
  it('reads the language from a lang- class when there is no language- one', () => {
    renderReader({ content: '<pre class="lang-rb">puts 1</pre>' });

    expect(screen.getByLabelText('Code block in ruby')).toBeInTheDocument();
  });

  it('drops top-level comment nodes instead of serializing them back to life', () => {
    // The comment must be a *direct child of body*: nested inside a <p> it
    // never meets the serializer — the paragraph goes out as one outerHTML.
    // The `<code>` sibling keeps the article on the node-by-node path.
    renderReader({ content: '<p>Before</p><!-- dropped --><code>x</code>' });

    const content = document.querySelector('#reader-content') as HTMLElement;
    expect(content.textContent).toContain('Before');
    expect(content.innerHTML).not.toContain('dropped');
  });
});
