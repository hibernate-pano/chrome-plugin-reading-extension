/**
 * HistoryPanel — component tests.
 *
 * The panel is rendered straight into jsdom's document rather than into a
 * shadow root: the component's behaviour (focus trap, Escape, click-outside)
 * reads `panelRef.current.getRootNode()`, which is the Document here, and that
 * is the same shape it sees in production minus the retargeting.
 *
 * The security test is the one that matters most. Records are written from
 * `window.location.href` but read back out of `chrome.storage.local`, which is
 * plain JSON — so "the extension only ever writes real http(s) URLs" is not a
 * guarantee about what the panel will be handed. A `javascript:` URL must never
 * become a link, an `href`, or an argument to `window.open`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HistoryPanel, formatRelativeTime } from '../../src/content/HistoryPanel';
import type { ReadingRecord } from '../../src/shared/history';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const NOW = new Date('2026-09-29T12:00:00Z').getTime();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

let seq = 0;

/** A stored record, as `addToHistory` would have written it. */
function record(overrides: Partial<ReadingRecord> = {}): ReadingRecord {
  seq += 1;
  return {
    id: `r-${seq}`,
    url: 'https://example.com/article',
    title: `Article ${seq}`,
    excerpt: 'An excerpt.',
    byline: 'Jane Doe',
    siteName: 'example.com',
    length: 1200,
    readingTime: 6,
    theme: 'light',
    fontSize: 19,
    createdAt: NOW - DAY,
    lastReadAt: NOW - HOUR,
    readCount: 1,
    ...overrides,
  };
}

interface PanelOptions {
  records?: ReadingRecord[];
  loading?: boolean;
  error?: string | null;
}

function renderPanel({ records = [], loading = false, error = null }: PanelOptions = {}) {
  const onDelete = vi.fn();
  const onClear = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <HistoryPanel
      records={records}
      loading={loading}
      error={error}
      onDelete={onDelete}
      onClear={onClear}
      onClose={onClose}
    />
  );
  return { ...utils, onDelete, onClear, onClose };
}

/** The `<li>` for one record, found by its title. */
function rowFor(title: string): HTMLElement {
  const row = screen.getByText(title).closest('li');
  if (!row) throw new Error(`no row for ${title}`);
  return row as HTMLElement;
}

const closeButton = (): HTMLElement => screen.getByRole('button', { name: '关闭阅读历史' });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

describe('HistoryPanel — dialog shell', () => {
  it('is a labelled modal dialog with a heading and a count', () => {
    renderPanel({ records: [record(), record()] });

    const panel = screen.getByRole('dialog', { name: '阅读历史' });
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(panel).toHaveClass('reader-history-panel');
    expect(screen.getByText('阅读历史')).toBeInTheDocument();
    expect(document.querySelector('.reader-history-panel__count')).toHaveTextContent('2 条');
  });

  it('moves focus to the close button on mount', () => {
    renderPanel();
    expect(document.activeElement).toBe(closeButton());
  });

  it('says the records never leave the device', () => {
    renderPanel({ records: [record()] });
    expect(
      screen.getByText(/只保存在这台设备上，不会上传到任何服务器/)
    ).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ *
 * Empty and loading states
 * ------------------------------------------------------------------ */

describe('HistoryPanel — empty and loading', () => {
  it('shows the empty state when there are no records', () => {
    renderPanel();
    expect(screen.getByText('还没有阅读记录')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('does not offer to clear an empty history', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: '清空全部' })).toBeDisabled();
  });

  it('shows a status line instead of an empty state while storage is still reading', () => {
    renderPanel({ loading: true });

    expect(screen.queryByText('还没有阅读记录')).not.toBeInTheDocument();
    expect(screen.getByText('正在加载阅读记录…')).toBeInTheDocument();
    // Nothing to clear yet, and nothing to claim about the count.
    expect(screen.getByRole('button', { name: '清空全部' })).toBeDisabled();
    expect(document.querySelector('.reader-history-panel__count')).toHaveTextContent('');
  });

  it('replaces the loading state once the records arrive', () => {
    const { rerender } = renderPanel({ loading: true });
    expect(screen.getByText('正在加载阅读记录…')).toBeInTheDocument();

    rerender(
      <HistoryPanel
        records={[record({ title: 'Arrived' })]}
        loading={false}
        error={null}
        onDelete={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText('正在加载阅读记录…')).not.toBeInTheDocument();
    expect(screen.getByText('Arrived')).toBeInTheDocument();
  });

  it('surfaces a failed load as an alert', () => {
    renderPanel({ error: '读取阅读历史失败' });
    expect(screen.getByRole('alert')).toHaveTextContent('读取阅读历史失败');
  });
});

/* ------------------------------------------------------------------ *
 * Listing
 * ------------------------------------------------------------------ */

describe('HistoryPanel — records', () => {
  it('renders title, site, relative time and reading time for each record', () => {
    const entry = record({
      title: 'How to Read Well',
      siteName: 'example.com',
      readingTime: 8,
      lastReadAt: NOW - 3 * DAY,
    });
    renderPanel({ records: [entry] });

    const row = rowFor('How to Read Well');
    expect(row).toHaveTextContent('3 天前');
    expect(row).toHaveTextContent('example.com');
    expect(row).toHaveTextContent('约 8 分钟');
  });

  it('lists newest first regardless of the order storage holds', () => {
    const older = record({ title: 'Older', lastReadAt: NOW - 5 * DAY });
    const newer = record({ title: 'Newer', lastReadAt: NOW - HOUR });
    const middle = record({ title: 'Middle', lastReadAt: NOW - 2 * DAY });

    renderPanel({ records: [older, newer, middle] });

    const titles = Array.from(document.querySelectorAll('.reader-history-item__title')).map(
      (el) => el.textContent
    );
    expect(titles).toEqual(['Newer', 'Middle', 'Older']);
  });

  it('does not mutate the records array it was handed', () => {
    const older = record({ title: 'Older', lastReadAt: NOW - 5 * DAY });
    const newer = record({ title: 'Newer', lastReadAt: NOW - HOUR });
    const records = [older, newer];

    renderPanel({ records });

    expect(records).toEqual([older, newer]);
  });

  it('falls back to a placeholder for a record with no title', () => {
    renderPanel({ records: [record({ title: '' })] });
    expect(screen.getByText('未命名')).toBeInTheDocument();
  });

  it('reports an unknown duration instead of inventing one', () => {
    renderPanel({ records: [record({ readingTime: 0 })] });
    expect(screen.getByText('阅读时长未知')).toBeInTheDocument();
  });

  it('sorts a record with an unusable timestamp last instead of crashing', () => {
    const broken = record({ title: 'Broken', lastReadAt: NaN });
    const fine = record({ title: 'Fine', lastReadAt: NOW - HOUR });

    renderPanel({ records: [broken, fine] });

    expect(screen.getByText('时间未知')).toBeInTheDocument();
    const titles = Array.from(document.querySelectorAll('.reader-history-item__title')).map(
      (el) => el.textContent
    );
    expect(titles).toEqual(['Fine', 'Broken']);
  });
});

/* ------------------------------------------------------------------ *
 * Relative time
 * ------------------------------------------------------------------ */

describe('formatRelativeTime', () => {
  const cases: Array<{ label: string; age: number; expected: string }> = [
    { label: 'just now', age: 0, expected: '刚刚' },
    { label: 'under a minute', age: 30_000, expected: '刚刚' },
    { label: 'minutes', age: 45 * MINUTE, expected: '45 分钟前' },
    { label: 'an hour and a half', age: 90 * MINUTE, expected: '1 小时前' },
    { label: 'under a day', age: 23 * HOUR, expected: '23 小时前' },
    { label: 'days', age: 6 * DAY, expected: '6 天前' },
  ];

  it('describes every age in words rather than as a date', () => {
    for (const { label, age, expected } of cases) {
      expect(formatRelativeTime(NOW - age, NOW), label).toBe(expected);
    }
  });

  it('falls back to a calendar date past a week', () => {
    // Built from local components so the expectation holds in any timezone.
    const old = new Date(2026, 8, 1, 9, 30).getTime();
    expect(formatRelativeTime(old, NOW)).toBe('9月1日');

    const older = new Date(2024, 10, 30, 9, 30).getTime();
    expect(formatRelativeTime(older, NOW)).toBe('2024年11月30日');
  });

  it('treats a future timestamp as just now — that is clock skew, not prophecy', () => {
    expect(formatRelativeTime(NOW + 5 * HOUR, NOW)).toBe('刚刚');
  });

  it('reports an unusable timestamp as unknown', () => {
    expect(formatRelativeTime(NaN, NOW)).toBe('时间未知');
    expect(formatRelativeTime(NOW, NaN)).toBe('时间未知');
  });

  it('defaults to the current time when no reference is given', () => {
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(NOW - 2 * DAY)).toBe('2 天前');
  });
});

/* ------------------------------------------------------------------ *
 * URL scheme safety
 * ------------------------------------------------------------------ */

describe('HistoryPanel — URL scheme safety', () => {
  let open: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    open = vi.spyOn(window, 'open').mockReturnValue(null);
  });

  it('refuses to turn a stored javascript: URL into a link', () => {
    const hostile = record({
      title: 'Hostile record',
      url: 'javascript:window.__pwned = true',
    });
    const { container } = renderPanel({ records: [hostile] });

    // Nothing anywhere in the panel can activate it: no anchor, no href, no
    // button standing in for one.
    expect(container.querySelector('a')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.innerHTML).not.toContain('__pwned');

    const title = screen.getByText('Hostile record');
    expect(title.tagName).toBe('SPAN');
    expect(title).toHaveClass('reader-history-item__title--inert');
    expect(title.closest('button')).toBeNull();

    expect(open, 'nothing to click').not.toHaveBeenCalled();
  });

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['file:', 'file:///etc/passwd'],
    ['chrome-extension:', 'chrome-extension://abc/popup.html'],
    ['a relative path', '/some/local/page'],
    ['a bare host with no scheme', 'example.com/article'],
    ['an empty string', ''],
  ])('refuses %s', (_label, url) => {
    const { container } = renderPanel({ records: [record({ url })] });
    expect(container.querySelector('a')).toBeNull();
    expect(container.innerHTML).not.toContain('href');
    expect(open).not.toHaveBeenCalled();
  });

  it('opens a valid http(s) record in a new tab, with the opener severed', () => {
    renderPanel({
      records: [record({ title: 'Good', url: 'https://example.com/read?utm=1' })],
    });

    fireEvent.click(screen.getByText('Good'));

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      'https://example.com/read?utm=1',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('accepts plain http as well as https', () => {
    renderPanel({ records: [record({ title: 'Plain', url: 'http://example.com/a' })] });
    fireEvent.click(screen.getByText('Plain'));
    expect(open).toHaveBeenCalledWith('http://example.com/a', '_blank', 'noopener,noreferrer');
  });

  it('keeps a hostile record deletable — refusing to open it is not refusing to erase it', () => {
    const hostile = record({ title: 'Hostile', url: 'javascript:alert(1)' });
    const { onDelete } = renderPanel({ records: [hostile] });

    fireEvent.click(screen.getByRole('button', { name: '删除《Hostile》的阅读记录' }));

    expect(onDelete).toHaveBeenCalledWith(hostile.id);
  });
});

/* ------------------------------------------------------------------ *
 * Deleting
 * ------------------------------------------------------------------ */

describe('HistoryPanel — deleting one record', () => {
  it('labels each delete button with the record it removes', () => {
    renderPanel({
      records: [record({ title: 'First' }), record({ title: 'Second' })],
    });

    expect(
      screen.getByRole('button', { name: '删除《First》的阅读记录' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '删除《Second》的阅读记录' })
    ).toBeInTheDocument();
  });

  it('deletes only the record whose button was pressed', () => {
    const first = record({ title: 'First' });
    const second = record({ title: 'Second' });
    const third = record({ title: 'Third' });
    const { onDelete } = renderPanel({ records: [first, second, third] });

    fireEvent.click(screen.getByRole('button', { name: '删除《Second》的阅读记录' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(second.id);
  });

  it('moves focus somewhere it can still reach when the row disappears', () => {
    // The pressed button is about to be unmounted with its row; focus must not
    // be dropped to <body>, where the focus trap can no longer see it.
    const { container } = renderPanel({ records: [record({ title: 'Doomed' })] });

    fireEvent.click(screen.getByRole('button', { name: '删除《Doomed》的阅读记录' }));

    expect(container.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(closeButton());
  });

  it('surfaces a failed delete without removing the record from the list', () => {
    const { onDelete, rerender } = renderPanel({ records: [record({ title: 'Sticky' })] });

    fireEvent.click(screen.getByRole('button', { name: '删除《Sticky》的阅读记录' }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    // Storage still holds it, so the parent re-renders with the record present.
    rerender(
      <HistoryPanel
        records={[record({ title: 'Sticky' })]}
        loading={false}
        error="删除失败，请重试"
        onDelete={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Sticky')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('删除失败，请重试');
  });
});

/* ------------------------------------------------------------------ *
 * Clear all
 * ------------------------------------------------------------------ */

describe('HistoryPanel — clear all', () => {
  it('asks before deleting anything', () => {
    const { onClear } = renderPanel({ records: [record(), record()] });

    fireEvent.click(screen.getByRole('button', { name: '清空全部' }));

    expect(onClear, 'one click is not enough').not.toHaveBeenCalled();
    expect(screen.getByText(/将删除全部 2 条阅读记录，此操作无法撤销。/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认清空' })).toBeInTheDocument();
  });

  it('erases only after the confirmation', () => {
    const { onClear } = renderPanel({ records: [record(), record()] });

    fireEvent.click(screen.getByRole('button', { name: '清空全部' }));
    fireEvent.click(screen.getByRole('button', { name: '确认清空' }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does nothing at all when the confirmation is cancelled', () => {
    const { onClear } = renderPanel({ records: [record(), record()] });

    fireEvent.click(screen.getByRole('button', { name: '清空全部' }));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(onClear).not.toHaveBeenCalled();
    expect(screen.queryByText(/此操作无法撤销/)).not.toBeInTheDocument();
    // Back to the ordinary footer, ready to ask again.
    expect(screen.getByRole('button', { name: '清空全部' })).toBeInTheDocument();
  });

  it('hands focus to the cancel button, since the opener is gone', () => {
    renderPanel({ records: [record()] });

    fireEvent.click(screen.getByRole('button', { name: '清空全部' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '取消' }));
  });

  it('returns focus into the panel after a confirmed clear', () => {
    renderPanel({ records: [record()] });

    fireEvent.click(screen.getByRole('button', { name: '清空全部' }));
    fireEvent.click(screen.getByRole('button', { name: '确认清空' }));

    expect(document.activeElement).toBe(closeButton());
  });

  it('drops the confirmation when the list empties underneath it', () => {
    const { rerender } = renderPanel({ records: [record()] });

    fireEvent.click(screen.getByRole('button', { name: '清空全部' }));
    expect(screen.getByRole('button', { name: '确认清空' })).toBeInTheDocument();

    rerender(
      <HistoryPanel
        records={[]}
        loading={false}
        error={null}
        onDelete={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: '确认清空' })).not.toBeInTheDocument();
    expect(screen.getByText('还没有阅读记录')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ *
 * Keyboard and dismissal
 * ------------------------------------------------------------------ */

describe('HistoryPanel — keyboard and dismissal', () => {
  it('closes on Escape and swallows the event', () => {
    const { onClose } = renderPanel();
    const panel = screen.getByRole('dialog');

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    fireEvent(panel, event);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps Escape from reaching the reader behind it', () => {
    const { onClose } = renderPanel();
    const downstream = vi.fn();
    document.addEventListener('keydown', downstream);

    try {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(downstream, 'the reader must not close too').not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', downstream);
    }
  });

  it('closes from the close button', () => {
    const { onClose } = renderPanel();
    fireEvent.click(closeButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a mousedown outside the panel', () => {
    const { onClose } = renderPanel();

    fireEvent.mouseDown(document.body);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open for a mousedown inside it', () => {
    const { onClose } = renderPanel({ records: [record({ title: 'Kept' })] });

    fireEvent.mouseDown(screen.getByRole('dialog'));
    fireEvent.mouseDown(screen.getByRole('button', { name: '删除《Kept》的阅读记录' }));
    fireEvent.mouseDown(closeButton());

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a mousedown on the toolbar button that opened it', () => {
    const { onClose } = renderPanel();
    const clock = document.createElement('button');
    clock.className = 'reader-history-btn';
    document.body.appendChild(clock);

    try {
      fireEvent.mouseDown(clock);
      expect(onClose, 'toggling via the clock is not a dismissal').not.toHaveBeenCalled();
    } finally {
      clock.remove();
    }
  });

  it('traps Tab around the panel', () => {
    renderPanel({ records: [record({ title: 'Only' })] });

    const focusable = Array.from(
      screen.getByRole('dialog').querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(last).toHaveClass('reader-history-clear');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement, 'Tab on the last element wraps to the first').toBe(first);

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement, 'Shift+Tab on the first wraps to the last').toBe(last);
  });

  it('leaves focus alone in the middle of the cycle', () => {
    renderPanel({ records: [record({ title: 'Only' })] });

    const middle = screen.getByText('Only');
    middle.focus();

    fireEvent.keyDown(middle, { key: 'Tab' });
    expect(document.activeElement).toBe(middle);

    fireEvent.keyDown(middle, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(middle);
  });

  it('detaches both listeners on unmount', () => {
    const { onClose, unmount } = renderPanel();
    unmount();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.mouseDown(document.body);

    expect(onClose).not.toHaveBeenCalled();
  });
});
