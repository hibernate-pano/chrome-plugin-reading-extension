/**
 * SettingsPanel — component tests.
 *
 * Rendered directly into jsdom's document rather than into a shadow root, so
 * `panelRef.current.getRootNode()` is the Document. That is the same shape the
 * component sees in production minus the retargeting, and it is what makes the
 * focus trap and the click-outside listener observable here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, createEvent, act } from '@testing-library/react';
import { SettingsPanel } from '../../src/content/SettingsPanel';
import { SETTINGS_CONSTRAINTS, DEFAULT_SETTINGS } from '../../src/shared/constants';
import { READER_THEMES } from '../../src/shared/readerThemes';
import type { Settings } from '../../src/shared/types';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const BASE: Settings = { ...DEFAULT_SETTINGS };

/** Order `getFocusableElements` sees: close button, 3 swatches, 3 sliders, reset. */
const CLOSE_LABEL = '关闭设置';
const WIDTH_LABEL = '行宽';
const RESET_LABEL = '恢复默认设置';

function renderPanel(overrides: Partial<Settings> = {}) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const onReset = vi.fn().mockResolvedValue(undefined);
  const settings: Settings = { ...BASE, ...overrides };
  const utils = render(
    <SettingsPanel
      settings={settings}
      onChange={onChange}
      onReset={onReset}
      onClose={onClose}
    />
  );
  return { ...utils, onChange, onClose, onReset, settings };
}

const slider = (label: string): HTMLInputElement =>
  screen.getByLabelText(label) as HTMLInputElement;

const closeButton = (): HTMLElement => screen.getByRole('button', { name: CLOSE_LABEL });
const resetButton = (): HTMLElement => screen.getByRole('button', { name: RESET_LABEL });

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

describe('SettingsPanel — dialog shell', () => {
  it('is a labelled modal dialog', () => {
    renderPanel();
    const panel = screen.getByRole('dialog', { name: 'Reading settings' });
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(panel).toHaveClass('reader-settings-panel');
  });

  it('moves focus into the dialog itself on mount', () => {
    renderPanel();
    // The dialog root takes the initial focus: it is not interactive, so a
    // mouse opener gets no focus ring, and the first Tab walks into the
    // controls — whose rings are keyboard-earned.
    expect(document.activeElement).toBe(
      screen.getByRole('dialog', { name: 'Reading settings' })
    );
  });

  it('renders exactly one swatch per theme, three sliders and the reset action', () => {
    renderPanel();
    expect(screen.getAllByRole('radio')).toHaveLength(READER_THEMES.length);
    expect(screen.getByLabelText('字号')).toHaveAttribute('type', 'range');
    expect(screen.getByLabelText('行高')).toHaveAttribute('type', 'range');
    expect(screen.getByLabelText(WIDTH_LABEL)).toHaveAttribute('type', 'range');
    expect(resetButton()).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ *
 * Theme swatches
 * ------------------------------------------------------------------ */

describe('SettingsPanel — theme swatches', () => {
  it('groups the swatches in a radiogroup labelled by the theme label', () => {
    renderPanel();
    const group = screen.getByRole('radiogroup', { name: '主题' });
    expect(group).toHaveClass('reader-theme-grid');
    expect(group.querySelectorAll('.reader-theme-swatch')).toHaveLength(
      READER_THEMES.length
    );
  });

  it('marks only the current theme as checked and active', () => {
    renderPanel({ theme: 'sepia' });

    const byId = new Map(
      READER_THEMES.map((theme) => [theme.id, screen.getByRole('radio', { name: theme.name })])
    );

    for (const theme of READER_THEMES) {
      const swatch = byId.get(theme.id)!;
      if (theme.id === 'sepia') {
        expect(swatch, theme.id).toHaveAttribute('aria-checked', 'true');
        expect(swatch, theme.id).toHaveClass('reader-theme-swatch--active');
      } else {
        expect(swatch, theme.id).toHaveAttribute('aria-checked', 'false');
        expect(swatch, theme.id).not.toHaveClass('reader-theme-swatch--active');
      }
    }
  });

  it('calls onChange with the clicked theme id and nothing else', () => {
    const { onChange } = renderPanel({ theme: 'light' });

    fireEvent.click(screen.getByRole('radio', { name: '深色' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('reports every swatch id it is given', () => {
    const { onChange, unmount } = renderPanel();

    for (const theme of READER_THEMES) {
      fireEvent.click(screen.getByRole('radio', { name: theme.name }));
      expect(onChange, theme.id).toHaveBeenLastCalledWith({ theme: theme.id });
    }
    expect(onChange).toHaveBeenCalledTimes(READER_THEMES.length);
    unmount();
  });

  it('is operable from the keyboard', () => {
    const { onChange } = renderPanel();

    fireEvent.keyDown(screen.getByRole('radio', { name: '护眼' }), {
      key: 'Enter',
    });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'sepia' });

    fireEvent.keyDown(screen.getByRole('radio', { name: '护眼' }), { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'sepia' });

    fireEvent.keyDown(screen.getByRole('radio', { name: '护眼' }), { key: 'a' });
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

/* ------------------------------------------------------------------ *
 * Radiogroup keyboard semantics
 *
 * `role="radiogroup"` promises one tab stop plus arrow-key navigation. These
 * pin that promise, which the swatches previously did not keep: all three
 * carried `tabIndex={0}` and no arrow key was handled anywhere.
 * ------------------------------------------------------------------ */

describe('SettingsPanel — theme radiogroup keyboard', () => {
  function swatch(name: string): HTMLElement {
    return screen.getByRole('radio', { name });
  }

  it('is a single tab stop, on the selected theme', () => {
    renderPanel({ theme: 'sepia' });

    const stops = screen
      .getAllByRole('radio')
      .filter((el) => el.getAttribute('tabindex') === '0');

    expect(stops).toHaveLength(1);
    expect(stops[0]).toBe(swatch('护眼'));
  });

  it('moves selection and focus with ArrowRight, wrapping at the end', () => {
    const { onChange } = renderPanel({ theme: 'light' });

    fireEvent.keyDown(swatch('浅色'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'dark' });
    expect(swatch('深色')).toHaveFocus();

    fireEvent.keyDown(swatch('深色'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'sepia' });

    // Past the last option a radio group cycles, not stops.
    fireEvent.keyDown(swatch('护眼'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'light' });
    expect(swatch('浅色')).toHaveFocus();
  });

  it('moves backwards with ArrowLeft, wrapping at the start', () => {
    const { onChange } = renderPanel({ theme: 'light' });

    fireEvent.keyDown(swatch('浅色'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'sepia' });
    expect(swatch('护眼')).toHaveFocus();

    fireEvent.keyDown(swatch('护眼'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'dark' });
  });

  it('jumps to the ends with Home and End', () => {
    const { onChange } = renderPanel({ theme: 'dark' });

    fireEvent.keyDown(swatch('深色'), { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'sepia' });

    fireEvent.keyDown(swatch('护眼'), { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'light' });
  });

  it('stops the arrow key from also scrolling the panel', () => {
    renderPanel({ theme: 'light' });

    const event = createEvent.keyDown(swatch('浅色'), { key: 'ArrowDown' });
    fireEvent(swatch('浅色'), event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves Enter and Space working alongside the arrows', () => {
    // Regression guard for a real mistake: two `onKeyDown` props on one element
    // leaves the second shadowing the first, silently killing activation.
    const { onChange } = renderPanel({ theme: 'light' });

    fireEvent.keyDown(swatch('浅色'), { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'light' });

    fireEvent.keyDown(swatch('深色'), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'dark' });
  });
});

/* ------------------------------------------------------------------ *
 * Sliders
 * ------------------------------------------------------------------ */

describe('SettingsPanel — sliders', () => {
  it('parses font size with parseInt', () => {
    const { onChange } = renderPanel({ fontSize: 19 });

    fireEvent.change(slider('字号'), { target: { value: '21' } });

    expect(onChange).toHaveBeenCalledWith({ fontSize: 21 });
    expect(onChange.mock.calls[0][0].fontSize).toBe(21);
  });

  it('parses line height with parseFloat, keeping the fraction', () => {
    const { onChange } = renderPanel({ lineHeight: 1.75 });

    fireEvent.change(slider('行高'), { target: { value: '1.5' } });

    expect(onChange).toHaveBeenCalledWith({ lineHeight: 1.5 });
    expect(typeof onChange.mock.calls[0][0].lineHeight).toBe('number');
    expect(onChange.mock.calls[0][0].lineHeight).not.toBe(1);
  });

  it('parses page width with parseInt', () => {
    const { onChange } = renderPanel({ pageWidth: 680 });

    fireEvent.change(slider(WIDTH_LABEL), { target: { value: '800' } });

    expect(onChange).toHaveBeenCalledWith({ pageWidth: 800 });
  });

  it('sends only the slider that moved', () => {
    const { onChange } = renderPanel();

    fireEvent.change(slider('字号'), { target: { value: '16' } });
    fireEvent.change(slider('行高'), { target: { value: '2' } });
    fireEvent.change(slider(WIDTH_LABEL), { target: { value: '1000' } });

    expect(onChange.mock.calls.map(([arg]) => arg)).toEqual([
      { fontSize: 16 },
      { lineHeight: 2 },
      { pageWidth: 1000 },
    ]);
  });

  it('bounds every slider by SETTINGS_CONSTRAINTS', () => {
    renderPanel();

    const cases: Array<[string, keyof typeof SETTINGS_CONSTRAINTS, number | undefined]> = [
      ['字号', 'fontSize', 1],
      ['行高', 'lineHeight', 0.1],
      [WIDTH_LABEL, 'pageWidth', 50],
    ];

    for (const [label, key, step] of cases) {
      const input = slider(label);
      const { min, max } = SETTINGS_CONSTRAINTS[key];
      expect(input, label).toHaveAttribute('min', String(min));
      expect(input, label).toHaveAttribute('max', String(max));
      expect(input, label).toHaveAttribute('step', String(step));
      expect(input, label).toHaveAttribute('aria-valuemin', String(min));
      expect(input, label).toHaveAttribute('aria-valuemax', String(max));
    }
  });

  it('accepts the constraint extremes without clamping them away', () => {
    const { onChange } = renderPanel();

    fireEvent.change(slider('字号'), {
      target: { value: String(SETTINGS_CONSTRAINTS.fontSize.min) },
    });
    fireEvent.change(slider('字号'), {
      target: { value: String(SETTINGS_CONSTRAINTS.fontSize.max) },
    });
    fireEvent.change(slider('行高'), {
      target: { value: String(SETTINGS_CONSTRAINTS.lineHeight.min) },
    });
    fireEvent.change(slider(WIDTH_LABEL), {
      target: { value: String(SETTINGS_CONSTRAINTS.pageWidth.max) },
    });

    expect(onChange.mock.calls.map(([arg]) => arg)).toEqual([
      { fontSize: SETTINGS_CONSTRAINTS.fontSize.min },
      { fontSize: SETTINGS_CONSTRAINTS.fontSize.max },
      { lineHeight: SETTINGS_CONSTRAINTS.lineHeight.min },
      { pageWidth: SETTINGS_CONSTRAINTS.pageWidth.max },
    ]);
  });

  it('mirrors the current settings into the DOM', () => {
    renderPanel({ fontSize: 22, lineHeight: 1.6, pageWidth: 900 });

    expect(slider('字号')).toHaveAttribute('aria-valuenow', '22');
    expect(slider('字号')).toHaveAttribute('aria-valuetext', '22 像素');
    expect(slider('行高')).toHaveAttribute('aria-valuenow', '1.6');
    expect(slider('行高')).toHaveAttribute('aria-valuetext', '1.6');
    expect(slider(WIDTH_LABEL)).toHaveAttribute('aria-valuenow', '900');

    expect(screen.getByText('22px')).toBeInTheDocument();
    expect(screen.getByText('1.6')).toBeInTheDocument();
    expect(screen.getByText('900px')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ *
 * Closing
 * ------------------------------------------------------------------ */

describe('SettingsPanel — closing', () => {
  it('calls onClose from the close button', () => {
    const { onClose } = renderPanel();
    fireEvent.click(closeButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from Enter and Space on the close button', () => {
    const { onClose } = renderPanel();

    fireEvent.keyDown(closeButton(), { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(closeButton(), { key: ' ' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ignores other keys on the close button', () => {
    const { onClose } = renderPanel();
    fireEvent.keyDown(closeButton(), { key: 'a' });
    fireEvent.keyDown(closeButton(), { key: 'Tab' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape and swallows the event', () => {
    const { onClose } = renderPanel();
    const panel = screen.getByRole('dialog');

    const event = createEvent.keyDown(panel, { key: 'Escape' });
    // jsdom clears the stop-propagation flag once dispatch finishes, so the
    // two calls are observed here and their observable consequence in the
    // test below.
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const stopPropagation = vi.spyOn(event, 'stopPropagation');

    fireEvent(panel, event);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented, 'the default action was cancelled').toBe(true);
  });

  it('keeps the Escape key from reaching a listener further down the tree', () => {
    const { onClose } = renderPanel();
    const downstream = vi.fn();
    document.addEventListener('keydown', downstream);

    try {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(downstream, 'the reader behind the panel must not close too').not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', downstream);
    }
  });

  it('closes on a mousedown outside the panel', () => {
    const { onClose } = renderPanel();

    fireEvent.mouseDown(document.body);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open for a mousedown inside the panel', () => {
    const { onClose } = renderPanel();

    fireEvent.mouseDown(slider(WIDTH_LABEL));
    fireEvent.mouseDown(closeButton());
    fireEvent.mouseDown(screen.getByRole('dialog', { name: 'Reading settings' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a mousedown on the settings gear that opened it', () => {
    const { onClose } = renderPanel();
    const gear = document.createElement('button');
    gear.className = 'reader-settings-btn';
    document.body.appendChild(gear);

    try {
      fireEvent.mouseDown(gear);
      expect(onClose, 'toggling via the gear is not a dismissal').not.toHaveBeenCalled();
    } finally {
      gear.remove();
    }
  });

  it('detaches both listeners on unmount', () => {
    const { onClose, unmount } = renderPanel();
    unmount();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.mouseDown(document.body);

    expect(onClose).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ *
 * Focus trap
 * ------------------------------------------------------------------ */

describe('SettingsPanel — focus trap', () => {
  it('wraps forward from the last focusable element to the first', () => {
    renderPanel();
    const first = closeButton();
    // The reset action was appended after the sliders, so it — not the last
    // slider — is what the trap wraps from now.
    const last = resetButton();

    expect(READER_THEMES.length + 5).toBe(document.querySelectorAll(
      '.reader-settings-panel button, .reader-settings-panel input'
    ).length);

    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: 'Tab' });

    expect(document.activeElement, 'Tab on the last element wraps to the first').toBe(first);
  });

  it('wraps backward from the first focusable element to the last', () => {
    renderPanel();
    const first = closeButton();
    const last = resetButton();

    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });

    expect(document.activeElement, 'Shift+Tab on the first element wraps to the last').toBe(last);
  });

  it('leaves focus alone in the middle of the cycle', () => {
    renderPanel();
    const middle = screen.getByRole('radio', { name: '护眼' });

    middle.focus();
    fireEvent.keyDown(middle, { key: 'Tab' });
    expect(document.activeElement).toBe(middle);

    middle.focus();
    fireEvent.keyDown(middle, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(middle);
  });

  it('pulls focus back in when it has dropped to the body', () => {
    // Clicking non-focusable panel content — a heading, a paragraph, the
    // padding — drops focus to <body>. The panel is still an open
    // `aria-modal="true"` dialog at that point, so Tab must re-enter it rather
    // than walk into the host page behind it. This used to assert the opposite
    // (`defaultPrevented === false`), which pinned the escape as intended
    // behaviour; the escape was the defect.
    renderPanel();
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);

    const event = createEvent.keyDown(document.body, { key: 'Tab' });
    fireEvent(document.body, event);

    expect(event.defaultPrevented, 'Tab must not escape an open modal').toBe(true);
    expect(closeButton()).toHaveFocus();
  });

  it('re-enters from the last control on Shift+Tab after focus escapes', () => {
    // Backwards entry has to land on the end of the group, not the start, or
    // Shift+Tab from outside jumps the user past everything in the panel.
    renderPanel();
    (document.activeElement as HTMLElement | null)?.blur();

    const last = resetButton();
    const event = createEvent.keyDown(document.body, { key: 'Tab', shiftKey: true });
    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(true);
    expect(last).toHaveFocus();
  });

  it('ignores keys other than Tab and Escape', () => {
    renderPanel();
    const last = resetButton();
    last.focus();

    fireEvent.keyDown(last, { key: 'ArrowRight' });

    expect(document.activeElement).toBe(last);
  });
});

/* ------------------------------------------------------------------ *
 * Restore defaults
 * ------------------------------------------------------------------ */

describe('SettingsPanel — restore defaults', () => {
  it('calls onReset from the reset button', async () => {
    const { onReset } = renderPanel();

    await act(async () => {
      fireEvent.click(resetButton());
    });

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('confirms the outcome in a live region instead of leaving the user to guess', async () => {
    renderPanel();
    // The status region has to exist before it has anything to announce.
    expect(document.querySelector('.reader-settings-status')).toHaveAttribute(
      'role',
      'status'
    );
    expect(document.querySelector('.reader-settings-status')).toHaveTextContent('');

    await act(async () => {
      fireEvent.click(resetButton());
    });

    expect(document.querySelector('.reader-settings-status')).toHaveTextContent(
      '已恢复默认设置'
    );
  });

  it('does not call onChange — resetting is the parent\'s job, not a local edit', async () => {
    const { onChange } = renderPanel();

    await act(async () => {
      fireEvent.click(resetButton());
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables the button while the write is in flight', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onReset = vi.fn(() => pending);
    render(
      <SettingsPanel
        settings={{ ...BASE }}
        onChange={vi.fn()}
        onReset={onReset}
        onClose={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(resetButton());
    });

    // The button's label changes while the write is in flight, so it can no
    // longer be found by the label it is going to have afterwards.
    const inFlight = document.querySelector('.reader-settings-reset') as HTMLButtonElement;
    expect(inFlight).toBeDisabled();
    expect(inFlight).toHaveTextContent('恢复中…');

    await act(async () => {
      release();
      await pending;
    });

    expect(resetButton()).toBeEnabled();
    expect(resetButton()).toHaveTextContent(RESET_LABEL);
  });

  it('reports a failed reset and leaves the button usable for a retry', async () => {
    const onReset = vi.fn().mockRejectedValue(new Error('存储空间不足'));
    render(
      <SettingsPanel
        settings={{ ...BASE }}
        onChange={vi.fn()}
        onReset={onReset}
        onClose={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(resetButton());
    });

    const status = document.querySelector('.reader-settings-status') as HTMLElement;
    expect(status).toHaveTextContent('存储空间不足');
    expect(status).toHaveClass('reader-settings-status--failed');
    expect(resetButton()).toBeEnabled();
  });

  it('falls back to a default message when the failure carries none', async () => {
    const onReset = vi.fn().mockRejectedValue(new Error(''));
    render(
      <SettingsPanel
        settings={{ ...BASE }}
        onChange={vi.fn()}
        onReset={onReset}
        onClose={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(resetButton());
    });

    // `new Error('')` has an empty message, not a missing one.
    expect(document.querySelector('.reader-settings-status')).not.toHaveTextContent(
      '已恢复默认设置'
    );
    expect(resetButton()).toBeEnabled();
  });

  it('clears the outcome message once the user edits a setting again', async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(resetButton());
    });
    expect(document.querySelector('.reader-settings-status')).toHaveTextContent(
      '已恢复默认设置'
    );

    fireEvent.change(slider('字号'), { target: { value: '21' } });

    expect(document.querySelector('.reader-settings-status')).toHaveTextContent('');
  });

  it('ignores a second click while a reset is already in flight', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onReset = vi.fn(() => pending);
    render(
      <SettingsPanel
        settings={{ ...BASE }}
        onChange={vi.fn()}
        onReset={onReset}
        onClose={vi.fn()}
      />
    );

    const button = document.querySelector('.reader-settings-reset') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
    });
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    // A click that slips past `disabled` — fireEvent bypasses it — must meet
    // the in-flight guard and be dropped.
    await act(async () => {
      fireEvent.click(button);
    });
    expect(onReset).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await pending;
    });
  });

  it('falls back to a generic message when the reset rejects with a non-Error', async () => {
    const onReset = vi.fn().mockRejectedValue('nope');
    render(
      <SettingsPanel
        settings={{ ...BASE }}
        onChange={vi.fn()}
        onReset={onReset}
        onClose={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(resetButton());
    });

    const status = document.querySelector('.reader-settings-status') as HTMLElement;
    expect(status).toHaveTextContent('恢复默认设置失败');
    expect(status).toHaveClass('reader-settings-status--failed');
  });
});
