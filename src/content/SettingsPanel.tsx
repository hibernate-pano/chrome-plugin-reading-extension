/**
 * SettingsPanel Component
 * Floating settings panel for customizing reading experience
 * Requirements: 3.1, 3.2, 6.5
 */

import React, { useCallback, useEffect, useRef, type JSX } from 'react';
import type { Settings, Theme } from '../shared/types';
import { SETTINGS_CONSTRAINTS } from '../shared/constants';
import { READER_THEMES } from '../shared/readerThemes';

interface SettingsPanelProps {
  /** Current settings */
  settings: Settings;
  /** Callback when settings change */
  onChange: (settings: Partial<Settings>) => void;
  /** Callback to close the panel */
  onClose: () => void;
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'a[href]',
    'select:not([disabled])',
    'textarea:not([disabled])',
  ].join(', ');
  
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
}

/**
 * SettingsPanel component for customizing reading experience
 */
export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button on mount
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Handle click outside to close
  // Must listen on shadow root (not document) to get accurate event.target within Shadow DOM.
  // From document's perspective, all Shadow DOM clicks are retargeted to the shadow host,
  // making panelRef.current.contains(target) always return false.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (panelRef.current && !panelRef.current.contains(target)) {
        // Don't close when clicking the settings toggle button itself
        if (target.closest?.('.reader-settings-btn')) return;
        onClose();
      }
    }

    const root = panelRef.current?.getRootNode() ?? document;
    root.addEventListener('mousedown', handleClickOutside as EventListener);
    return () => root.removeEventListener('mousedown', handleClickOutside as EventListener);
  }, [onClose]);

  // Handle escape key to close and focus trap
  // Keyboard events: listen on shadow root for correct activeElement resolution
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      // Focus trap - Tab and Shift+Tab
      if (event.key === 'Tab' && panelRef.current) {
        const focusableElements = getFocusableElements(panelRef.current);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        // Use shadow root's activeElement for accurate focus tracking inside Shadow DOM
        const shadowRoot = panelRef.current.getRootNode() as ShadowRoot | Document;
        const active = shadowRoot.activeElement;

        if (event.shiftKey) {
          if (active === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (active === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    const root = panelRef.current?.getRootNode() ?? document;
    root.addEventListener('keydown', handleKeyDown as EventListener, true);
    return () => root.removeEventListener('keydown', handleKeyDown as EventListener, true);
  }, [onClose]);

  // Handle keyboard activation for buttons
  const handleKeyboardActivation = useCallback((
    event: React.KeyboardEvent,
    action: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }, []);

  // Theme change handler
  const handleThemeChange = useCallback((theme: Theme) => {
    onChange({ theme });
  }, [onChange]);

  // Font size change handler
  const handleFontSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const fontSize = parseInt(event.target.value, 10);
    onChange({ fontSize });
  }, [onChange]);

  // Code font size change handler
  const handleCodeFontSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const codeFontSize = parseInt(event.target.value, 10);
    onChange({ codeFontSize });
  }, [onChange]);

  // Line height change handler
  const handleLineHeightChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const lineHeight = parseFloat(event.target.value);
    onChange({ lineHeight });
  }, [onChange]);

  // Page width change handler
  const handlePageWidthChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const pageWidth = parseInt(event.target.value, 10);
    onChange({ pageWidth });
  }, [onChange]);

  return (
    <div
      ref={panelRef}
      className="reader-settings-panel"
      role="dialog"
      aria-label="Reading settings"
      aria-modal="true"
    >
      {/* Header */}
      <div className="reader-settings-panel__header">
        <h3 className="reader-settings-panel__title" id="settings-title">Settings</h3>
        <button
          ref={closeButtonRef}
          className="reader-settings-panel__close"
          onClick={onClose}
          onKeyDown={(e) => handleKeyboardActivation(e, onClose)}
          aria-label="Close settings"
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
              onClick={() => handleThemeChange(theme.id as Theme)}
              onKeyDown={(e) => handleKeyboardActivation(e, () => handleThemeChange(theme.id as Theme))}
              role="radio"
              aria-checked={settings.theme === theme.id}
              type="button"
              tabIndex={0}
              title={theme.name}
              style={{
                backgroundColor: theme.background,
                '--swatch-accent': theme.accent,
                '--swatch-border': theme.border,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Font Size Slider */}
      <div className="reader-settings-group">
        <label className="reader-settings-label" htmlFor="reader-font-size">
          Font Size
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
            onChange={handleFontSizeChange}
            aria-valuemin={SETTINGS_CONSTRAINTS.fontSize.min}
            aria-valuemax={SETTINGS_CONSTRAINTS.fontSize.max}
            aria-valuenow={settings.fontSize}
            aria-valuetext={`${settings.fontSize} pixels`}
            tabIndex={0}
          />
          <span className="reader-slider-value" aria-hidden="true">{settings.fontSize}px</span>
        </div>
      </div>

      {/* Code Font Size Slider */}
      <div className="reader-settings-group">
        <label className="reader-settings-label" htmlFor="reader-code-font-size">
          Code Font Size
        </label>
        <div className="reader-slider-row">
          <input
            id="reader-code-font-size"
            type="range"
            className="reader-slider"
            min={SETTINGS_CONSTRAINTS.codeFontSize.min}
            max={SETTINGS_CONSTRAINTS.codeFontSize.max}
            step={1}
            value={settings.codeFontSize}
            onChange={handleCodeFontSizeChange}
            aria-valuemin={SETTINGS_CONSTRAINTS.codeFontSize.min}
            aria-valuemax={SETTINGS_CONSTRAINTS.codeFontSize.max}
            aria-valuenow={settings.codeFontSize}
            aria-valuetext={`${settings.codeFontSize} pixels`}
            tabIndex={0}
          />
          <span className="reader-slider-value" aria-hidden="true">{settings.codeFontSize}px</span>
        </div>
      </div>

      {/* Line Height Slider */}
      <div className="reader-settings-group">
        <label className="reader-settings-label" htmlFor="reader-line-height">
          Line Height
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
            onChange={handleLineHeightChange}
            aria-valuemin={SETTINGS_CONSTRAINTS.lineHeight.min}
            aria-valuemax={SETTINGS_CONSTRAINTS.lineHeight.max}
            aria-valuenow={settings.lineHeight}
            aria-valuetext={`${settings.lineHeight.toFixed(1)}`}
            tabIndex={0}
          />
          <span className="reader-slider-value" aria-hidden="true">{settings.lineHeight.toFixed(1)}</span>
        </div>
      </div>

      {/* Page Width Slider */}
      <div className="reader-settings-group">
        <label className="reader-settings-label" htmlFor="reader-page-width">
          Page Width
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
            onChange={handlePageWidthChange}
            aria-valuemin={SETTINGS_CONSTRAINTS.pageWidth.min}
            aria-valuemax={SETTINGS_CONSTRAINTS.pageWidth.max}
            aria-valuenow={settings.pageWidth}
            aria-valuetext={`${settings.pageWidth} pixels`}
            tabIndex={0}
          />
          <span className="reader-slider-value" aria-hidden="true">{settings.pageWidth}px</span>
        </div>
      </div>

      {/* Show Images Toggle */}
      <div className="reader-settings-group">
        <label className="reader-settings-label" id="show-images-label">Display</label>
        <div className="reader-toggle-row">
          <button
            className={`reader-toggle-btn ${settings.showImages ? 'reader-toggle-btn--active' : ''}`}
            onClick={() => onChange({ showImages: true })}
            onKeyDown={(e) => handleKeyboardActivation(e, () => onChange({ showImages: true }))}
            role="radio"
            aria-checked={settings.showImages}
            aria-labelledby="show-images-label"
            type="button"
            tabIndex={0}
          >
            <ImageIcon aria-hidden="true" />
            <span>Show Images</span>
          </button>
          <button
            className={`reader-toggle-btn ${!settings.showImages ? 'reader-toggle-btn--active' : ''}`}
            onClick={() => onChange({ showImages: false })}
            onKeyDown={(e) => handleKeyboardActivation(e, () => onChange({ showImages: false }))}
            role="radio"
            aria-checked={!settings.showImages}
            aria-labelledby="show-images-label"
            type="button"
            tabIndex={0}
          >
            <ImageOffIcon aria-hidden="true" />
            <span>Hide Images</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Close icon SVG component
 */
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

/**
 * Image icon SVG component
 */
function ImageIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

/**
 * Image off icon SVG component
 */
function ImageOffIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
    </svg>
  );
}

export default SettingsPanel;
