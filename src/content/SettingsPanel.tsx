/**
 * SettingsPanel Component
 * Floating settings panel — four essential controls only:
 * theme, font size, line height, page width.
 */

import React, { useCallback, useEffect, useRef, type JSX } from 'react';
import type { Settings, Theme } from '../shared/types';
import { SETTINGS_CONSTRAINTS } from '../shared/constants';
import { READER_THEMES } from '../shared/readerThemes';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Partial<Settings>) => void;
  onClose: () => void;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    'input:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'a[href]',
    'select:not([disabled])',
    'textarea:not([disabled])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button on mount
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Click outside to close — must listen on shadow root, not document.
  // Document-level events retarget into the shadow host, breaking contains().
  useEffect(() => {
    function handleClickOutside(event: Event) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        if (target.closest?.('.reader-settings-btn')) return;
        onClose();
      }
    }

    const root = panelRef.current?.getRootNode() ?? document;
    root.addEventListener('mousedown', handleClickOutside);
    return () => root.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Escape to close + focus trap
  useEffect(() => {
    function handleKeyDown(event: Event) {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        onClose();
        return;
      }

      if (keyboardEvent.key === 'Tab' && panelRef.current) {
        const focusableElements = getFocusableElements(panelRef.current);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const root = panelRef.current.getRootNode() as ShadowRoot | Document;
        const active = root.activeElement;

        if (keyboardEvent.shiftKey) {
          if (active === firstElement) {
            keyboardEvent.preventDefault();
            lastElement.focus();
          }
        } else {
          if (active === lastElement) {
            keyboardEvent.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    const root = panelRef.current?.getRootNode() ?? document;
    root.addEventListener('keydown', handleKeyDown, true);
    return () => root.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const handleThemeChange = useCallback((theme: Theme) => {
    onChange({ theme });
  }, [onChange]);

  const handleSliderChange = useCallback(<K extends keyof Settings>(
    key: K,
    parse: (raw: string) => Settings[K]
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div
      ref={panelRef}
      className="reader-settings-panel"
      role="dialog"
      aria-label="Reading settings"
      aria-modal="true"
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
          {READER_THEMES.map((theme) => (
            <button
              key={theme.id}
              className={`reader-theme-swatch ${settings.theme === theme.id ? 'reader-theme-swatch--active' : ''}`}
              onClick={() => handleThemeChange(theme.id)}
              onKeyDown={(e) => handleKeyboardActivation(e, () => handleThemeChange(theme.id))}
              role="radio"
              aria-checked={settings.theme === theme.id}
              aria-label={theme.name}
              type="button"
              tabIndex={0}
              style={{
                backgroundColor: theme.background,
                '--swatch-accent': theme.accent,
                '--swatch-border': theme.border,
              } as React.CSSProperties}
            />
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
    </div>
  );
}

function CloseIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
