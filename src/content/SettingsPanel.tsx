/**
 * SettingsPanel Component
 * Floating settings panel for customizing reading experience
 * Requirements: 3.1, 3.2, 6.5
 */

import React, { useCallback, useEffect, useRef, type JSX } from 'react';
import type { Settings, Theme } from '../shared/types';
import { SETTINGS_CONSTRAINTS, VALID_THEMES } from '../shared/constants';

interface SettingsPanelProps {
  /** Current settings */
  settings: Settings;
  /** Callback when settings change */
  onChange: (settings: Partial<Settings>) => void;
  /** Callback to close the panel */
  onClose: () => void;
}

/**
 * Theme display names
 */
const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  sepia: 'Sepia',
};

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
        <label className="reader-settings-label" id="theme-label">Theme</label>
        <div 
          className="reader-theme-selector" 
          role="radiogroup" 
          aria-labelledby="theme-label"
        >
          {VALID_THEMES.map((theme) => (
            <button
              key={theme}
              className={`reader-theme-btn ${settings.theme === theme ? 'reader-theme-btn--active' : ''}`}
              onClick={() => handleThemeChange(theme)}
              onKeyDown={(e) => handleKeyboardActivation(e, () => handleThemeChange(theme))}
              role="radio"
              aria-checked={settings.theme === theme}
              type="button"
              tabIndex={0}
            >
              {THEME_LABELS[theme]}
            </button>
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

export default SettingsPanel;
