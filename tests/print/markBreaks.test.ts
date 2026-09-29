import { describe, it, expect } from 'vitest';
import { shouldAllowBreak, markOversizedBlocks } from '../../src/print/markBreaks';
import { ALLOW_BREAK_THRESHOLD_MM } from '../../src/shared/constants';

/** Convert mm to CSS px on the standard 96dpi print scale. */
const px = (mm: number): number => (mm * 96) / 25.4;

describe('shouldAllowBreak', () => {
  it('converts px to mm on the CSS 96dpi scale', () => {
    expect(shouldAllowBreak(px(100), 100)).toBe(false);
    expect(shouldAllowBreak(px(100) + 1, 100)).toBe(true);
  });

  it('uses half a printable page as the default threshold', () => {
    expect(ALLOW_BREAK_THRESHOLD_MM).toBe(128.5);
    expect(shouldAllowBreak(px(ALLOW_BREAK_THRESHOLD_MM))).toBe(false);
    expect(shouldAllowBreak(px(ALLOW_BREAK_THRESHOLD_MM) + 1)).toBe(true);
  });
});

describe('markOversizedBlocks', () => {
  function block(className: string, heightPx: number): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    // jsdom has no layout engine; shadow the offsetHeight getter directly.
    Object.defineProperty(el, 'offsetHeight', { value: heightPx });
    return el;
  }

  it('marks only oversized code blocks and tables, never figures', () => {
    const root = document.createElement('div');
    const smallCode = block('p-code', 100);
    const tallCode = block('p-code', 2000);
    const tallTable = block('p-table-wrap', 2000);
    // A tall figure must stay unmarked: images never split across pages.
    const tallFigure = block('p-figure', 2000);
    root.append(smallCode, tallCode, tallTable, tallFigure);

    expect(markOversizedBlocks(root)).toBe(2);
    expect(tallCode.getAttribute('data-long')).toBe('true');
    expect(tallTable.getAttribute('data-long')).toBe('true');
    expect(tallFigure.getAttribute('data-long')).toBeNull();
    expect(smallCode.getAttribute('data-long')).toBeNull();
  });

  it('respects an existing data-long mark', () => {
    const root = document.createElement('div');
    const already = block('p-code', 100);
    already.setAttribute('data-long', 'true');
    root.appendChild(already);

    expect(markOversizedBlocks(root)).toBe(0);
  });
});
