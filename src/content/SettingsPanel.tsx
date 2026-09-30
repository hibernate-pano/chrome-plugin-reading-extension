/**
 * SettingsPanel Component
 * Floating settings panel — four essential controls only:
 * theme, font size, line height, page width, plus a way back to the defaults.
 */

import React, { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import type { Settings, Theme } from '../shared/types';
import { SETTINGS_CONSTRAINTS } from '../shared/constants';
import { READER_THEMES } from '../shared/readerThemes';
import { usePanelDismiss } from './usePanelDismiss';
import { CheckIcon, CloseIcon, RefreshIcon } from './icons';

/**
 * Where `value` sits inside its range, as a CSS percentage.
 *
 * Material sliders paint a filled track up to the handle. That fill cannot be
 * expressed in CSS alone — it depends on the value — so the component hands
 * the stylesheet one number and the gradient in `.reader-slider` does the rest.
 */
function fillPercent(value: number, min: number, max: number): string {
  if (max <= min) return '0%';
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return `${(ratio * 100).toFixed(2)}%`;
}

/** `fillPercent` packaged as the custom property the slider CSS reads. */
function fillStyle(value: number, min: number, max: number): React.CSSProperties {
  return { '--slider-fill': fillPercent(value, min, max) } as React.CSSProperties;
}

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Partial<Settings>) => void;
  /** Restore every setting to its default. Rejects if storage refuses the write. */
  onReset: () => Promise<void>;
  onClose: () => void;
}

export function SettingsPanel({ settings, onChange, onReset, onClose }: SettingsPanelProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ text: string; failed: boolean } | null>(
    null
  );

  // Initial focus lands on the dialog root, not the close button. Chrome's
  // :focus-visible heuristic paints a ring on any control focused by script
  // during the opening click, so a mouse user opened the panel and got a ring
  // they never earned. The dialog root is not interactive and carries none —
  // its stylesheet says so — and the first Tab walks into the real controls.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Escape, focus trap and click-outside — shared with HistoryPanel so the two
  // panels cannot drift apart on keyboard behaviour.
  usePanelDismiss({
    panelRef,
    onClose,
    ignoreOutsideSelector: '.reader-settings-btn',
  });

  const handleThemeChange = useCallback((theme: Theme) => {
    setResetStatus(null);
    onChange({ theme });
  }, [onChange]);

  const handleSliderChange = useCallback(<K extends keyof Settings>(
    key: K,
    parse: (raw: string) => Settings[K]
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setResetStatus(null);
    onChange({ [key]: parse(event.target.value) });
  }, [onChange]);

  const handleKeyboardActivation = useCallback((
    event: React.KeyboardEvent,
    action: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }, []);

  /**
   * Arrow-key navigation for the theme radiogroup.
   *
   * `role="radiogroup"` is a single-tab-stop pattern: the arrow keys move
   * between options and selection follows focus, which is what a screen reader
   * in forms mode sends. Without this the group is three separate tab stops
   * whose arrow keys do nothing, and the ARIA roles promise an interaction the
   * component does not implement.
   *
   * Wrapping is deliberate — a radio group is a cycle, so ArrowUp on the first
   * option lands on the last.
   */
  const handleThemeArrow = useCallback((
    event: React.KeyboardEvent,
    index: number
  ) => {
    const last = READER_THEMES.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = READER_THEMES[next];
    if (!target) return;
    // Selection follows focus, so focus has to move with it or the roving
    // tabindex would leave the group's single tab stop on the wrong option.
    const group = event.currentTarget.parentElement;
    const options = group ? group.querySelectorAll<HTMLButtonElement>('[role="radio"]') : [];
    const nextOption = options[next];
    if (nextOption) nextOption.focus();
    handleThemeChange(target.id);
  }, [handleThemeChange]);

  /**
   * Restore the defaults.
   *
   * Unlike clearing history this needs no confirmation step: it only rewrites
   * four values the user can put back with the sliders above, so the cost of a
   * misclick is one drag. The outcome is announced in the status line rather
   * than left to be inferred from the sliders quietly moving.
   */
  const handleReset = useCallback(async () => {
    if (resetting) return;
    setResetting(true);
    setResetStatus(null);
    try {
      await onReset();
      setResetStatus({ text: '已恢复默认设置', failed: false });
    } catch (error) {
      setResetStatus({
        text: error instanceof Error ? error.message : '恢复默认设置失败',
        failed: true,
      });
    } finally {
      setResetting(false);
    }
  }, [onReset, resetting]);

  return (
    <div
      ref={panelRef}
      className="reader-settings-panel"
      role="dialog"
      aria-label="Reading settings"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="reader-settings-panel__header">
        <h3 className="reader-settings-panel__title" id="settings-title">设置</h3>
        <button
          ref={closeButtonRef}
          className="reader-settings-panel__close"
          onClick={onClose}
          onKeyDown={(e) => handleKeyboardActivation(e, onClose)}
          aria-label="关闭设置"
          type="button"
          tabIndex={0}
        >
          <CloseIcon aria-hidden="true" />
        </button>
      </div>

      {/* Theme Selector */}
      <div className="reader-settings-group">
        <label className="reader-settings-label" id="theme-label">主题</label>
        <div
          className="reader-theme-grid"
          role="radiogroup"
          aria-labelledby="theme-label"
        >
          {READER_THEMES.map((theme, index) => (
            <button
              key={theme.id}
              className={`reader-theme-swatch ${settings.theme === theme.id ? 'reader-theme-swatch--active' : ''}`}
              onClick={() => handleThemeChange(theme.id)}
              onKeyDown={(e) => {
                // One handler: two `onKeyDown` props would leave the second
                // shadowing the first and silently kill Enter/Space activation.
                handleKeyboardActivation(e, () => handleThemeChange(theme.id));
                handleThemeArrow(e, index);
              }}
              role="radio"
              aria-checked={settings.theme === theme.id}
              aria-label={theme.name}
              type="button"
              // Roving tabindex: the group is one tab stop, on the selected
              // option. `tabIndex={0}` on all three would make it three, which
              // is the behaviour the arrow keys above exist to replace.
              tabIndex={settings.theme === theme.id ? 0 : -1}
            >
              <span
                className="reader-theme-swatch__chip"
                style={{
                  backgroundColor: theme.background,
                  // The tick has to read on a white, a near-black and a cream
                  // circle, so it is painted in the theme's own ink rather than
                  // in the panel's.
                  color: theme.text,
                  '--swatch-border': theme.border,
                } as React.CSSProperties}
              >
                <span className="reader-theme-swatch__check">
                  <CheckIcon size={18} />
                </span>
              </span>
              <span className="reader-theme-swatch__name">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="reader-settings-group">
        <label className="reader-settings-label" htmlFor="reader-font-size">
          字号
        </label>
        <div className="reader-slider-row">
          <input
            id="reader-font-size"
            type="range"
            className="reader-slider"
            style={fillStyle(
              settings.fontSize,
              SETTINGS_CONSTRAINTS.fontSize.min,
              SETTINGS_CONSTRAINTS.fontSize.max
            )}
            min={SETTINGS_CONSTRAINTS.fontSize.min}
            max={SETTINGS_CONSTRAINTS.fontSize.max}
            step={1}
            value={settings.fontSize}
            onChange={handleSliderChange('fontSize', (v) => parseInt(v, 10))}
            aria-valuemin={SETTINGS_CONSTRAINTS.fontSize.min}
            aria-valuemax={SETTINGS_CONSTRAINTS.fontSize.max}
            aria-valuenow={settings.fontSize}
            aria-valuetext={`${settings.fontSize} 像素`}
            tabIndex={0}
          />
          <span className="reader-slider-value" aria-hidden="true">{settings.fontSize}px</span>
        </div>
      </div>

      {/* Line Height */}
      <div className="reader-settings-group">
        <label className="reader-settings-label" htmlFor="reader-line-height">
          行高
        </label>
        <div className="reader-slider-row">
          <input
            id="reader-line-height"
            type="range"
            className="reader-slider"
            style={fillStyle(
              settings.lineHeight,
              SETTINGS_CONSTRAINTS.lineHeight.min,
              SETTINGS_CONSTRAINTS.lineHeight.max
            )}
            min={SETTINGS_CONSTRAINTS.lineHeight.min}
            max={SETTINGS_CONSTRAINTS.lineHeight.max}
            step={0.1}
            value={settings.lineHeight}
            onChange={handleSliderChange('lineHeight', (v) => parseFloat(v))}
            aria-valuemin={SETTINGS_CONSTRAINTS.lineHeight.min}
            aria-valuemax={SETTINGS_CONSTRAINTS.lineHeight.max}
            aria-valuenow={settings.lineHeight}
            aria-valuetext={settings.lineHeight.toFixed(1)}
            tabIndex={0}
          />
          <span className="reader-slider-value" aria-hidden="true">{settings.lineHeight.toFixed(1)}</span>
        </div>
      </div>

      {/* Page Width */}
      <div className="reader-settings-group">
        <label className="reader-settings-label" htmlFor="reader-page-width">
          行宽
        </label>
        <div className="reader-slider-row">
          <input
            id="reader-page-width"
            type="range"
            className="reader-slider"
            style={fillStyle(
              settings.pageWidth,
              SETTINGS_CONSTRAINTS.pageWidth.min,
              SETTINGS_CONSTRAINTS.pageWidth.max
            )}
            min={SETTINGS_CONSTRAINTS.pageWidth.min}
            max={SETTINGS_CONSTRAINTS.pageWidth.max}
            step={50}
            value={settings.pageWidth}
            onChange={handleSliderChange('pageWidth', (v) => parseInt(v, 10))}
            aria-valuemin={SETTINGS_CONSTRAINTS.pageWidth.min}
            aria-valuemax={SETTINGS_CONSTRAINTS.pageWidth.max}
            aria-valuenow={settings.pageWidth}
            aria-valuetext={`${settings.pageWidth} 像素`}
            tabIndex={0}
          />
          <span className="reader-slider-value" aria-hidden="true">{settings.pageWidth}px</span>
        </div>
      </div>

      {/* Restore defaults */}
      <div className="reader-settings-footer">
        <button
          className="reader-settings-reset"
          onClick={handleReset}
          disabled={resetting}
          type="button"
        >
          <RefreshIcon size={18} />
          {resetting ? '恢复中…' : '恢复默认设置'}
        </button>
        {/* Always in the DOM: a live region inserted together with its text is
            not reliably announced by every screen reader. */}
        <p
          className={`reader-settings-status${resetStatus?.failed ? ' reader-settings-status--failed' : ''}`}
          role="status"
        >
          {resetStatus?.text ?? ''}
        </p>
      </div>
    </div>
  );
}

