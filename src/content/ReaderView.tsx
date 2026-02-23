/**
 * ReaderView Component
 * Main reading mode view — clean, distraction-free
 */

import React, { useState, useCallback, useEffect, useMemo, useRef, type JSX } from 'react';
import type { Settings, ExtractedContent } from '../shared/types';
import { SettingsPanel } from './SettingsPanel';
import { CodeBlock } from './CodeBlock';

interface ReaderViewProps {
  content: ExtractedContent;
  settings: Settings;
  onClose: () => void;
  onSettingsChange: (settings: Partial<Settings>) => void;
}

export function ReaderView({
  content,
  settings,
  onClose,
  onSettingsChange,
}: ReaderViewProps): JSX.Element {
  const [showSettings, setShowSettings] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide toolbar after inactivity
  const showToolbar = useCallback(() => {
    setToolbarVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // Don't hide if settings panel is open
    if (!showSettings) {
      hideTimerRef.current = setTimeout(() => {
        setToolbarVisible(false);
      }, 2500);
    }
  }, [showSettings]);

  // Keep toolbar visible when settings is open
  useEffect(() => {
    if (showSettings) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      setToolbarVisible(true);
    }
  }, [showSettings]);

  // Show toolbar on any mouse movement
  useEffect(() => {
    document.addEventListener('mousemove', showToolbar);
    // Initial hide after 3s
    hideTimerRef.current = setTimeout(() => setToolbarVisible(false), 3000);
    return () => {
      document.removeEventListener('mousemove', showToolbar);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [showToolbar]);

  // Escape key to close reader (if settings not open)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !showSettings) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showSettings]);

  // Lock body scroll
  useEffect(() => {
    document.body.classList.add('reader-mode-active');
    return () => {
      document.body.classList.remove('reader-mode-active');
    };
  }, []);

  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    settingsBtnRef.current?.focus();
  }, []);

  // CSS custom properties for settings
  const containerStyle = useMemo(() => ({
    '--reader-font-size': `${settings.fontSize}px`,
    '--reader-line-height': `${settings.lineHeight}`,
    '--reader-page-width': `${settings.pageWidth}px`,
    '--reader-font-family': settings.fontFamily,
  } as React.CSSProperties), [settings]);

  const themeClass = `reader-theme-${settings.theme}`;
  const toolbarClass = `reader-toolbar ${toolbarVisible ? 'reader-toolbar--visible' : 'reader-toolbar--hidden'}`;

  const processedContent = useMemo(() => {
    return processContentWithCodeBlocks(content.content);
  }, [content.content]);

  return (
    <div className={`reader-overlay ${themeClass}`} style={containerStyle} role="main">
      {/* Skip to content link */}
      <a
        href="#reader-content"
        className="reader-skip-link"
        onClick={(e) => {
          e.preventDefault();
          contentRef.current?.focus();
        }}
      >
        Skip to content
      </a>

      {/* Toolbar — auto-hides */}
      <div className={toolbarClass} aria-label="Reader controls">
        <button
          className="reader-close-btn"
          onClick={onClose}
          aria-label="Close reading mode (Esc)"
          type="button"
        >
          <CloseIcon />
        </button>

        <button
          ref={settingsBtnRef}
          className={`reader-settings-btn${showSettings ? ' reader-settings-btn--active' : ''}`}
          onClick={toggleSettings}
          aria-label={showSettings ? 'Close settings' : 'Open settings'}
          aria-expanded={showSettings}
          type="button"
        >
          <SettingsIcon />
        </button>
      </div>

      {/* Main Content */}
      <div className="reader-container">
        <header className="reader-header">
          <h1 className="reader-title" id="reader-title">{content.title}</h1>
          <div className="reader-meta" aria-label="Article info">
            {content.siteName && (
              <span className="reader-meta__item">{content.siteName}</span>
            )}
            {content.siteName && (content.byline || true) && (
              <span className="reader-meta__separator" aria-hidden="true">·</span>
            )}
            {content.byline && (
              <>
                <span className="reader-meta__item">{content.byline}</span>
                <span className="reader-meta__separator" aria-hidden="true">·</span>
              </>
            )}
            <span className="reader-meta__item">{content.estimatedReadTime} min read</span>
          </div>
        </header>

        <article
          ref={contentRef}
          id="reader-content"
          className="reader-content"
          tabIndex={-1}
          aria-labelledby="reader-title"
        >
          {processedContent}
        </article>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}

/**
 * Process HTML content, replacing <pre><code> blocks with React components
 */
function processContentWithCodeBlocks(htmlContent: string): React.ReactNode {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const codeBlocks = doc.querySelectorAll('pre code, pre');
  const codeBlockData: Array<{ id: string; code: string; language: string }> = [];

  codeBlocks.forEach((block, index) => {
    const id = `code-block-${index}`;
    const codeElement = block.tagName === 'CODE' ? block : block.querySelector('code') || block;
    const code = codeElement.textContent || '';

    let language = '';
    const classList = codeElement.className || block.className || '';
    const langMatch = classList.match(/language-(\w+)|lang-(\w+)/);
    if (langMatch) {
      language = langMatch[1] || langMatch[2] || '';
    }

    codeBlockData.push({ id, code, language });

    const placeholder = doc.createElement('div');
    placeholder.setAttribute('data-code-block-id', id);

    const preElement = block.tagName === 'PRE' ? block : block.parentElement;
    if (preElement?.parentElement) {
      preElement.parentElement.replaceChild(placeholder, preElement);
    }
  });

  const processedHtml = doc.body.innerHTML;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  codeBlockData.forEach((blockData, index) => {
    const placeholder = `<div data-code-block-id="${blockData.id}"></div>`;
    const placeholderIndex = processedHtml.indexOf(placeholder, lastIndex);

    if (placeholderIndex !== -1) {
      const htmlBefore = processedHtml.slice(lastIndex, placeholderIndex);
      if (htmlBefore.trim()) {
        parts.push(
          <div key={`html-${index}`} dangerouslySetInnerHTML={{ __html: htmlBefore }} />
        );
      }
      parts.push(<CodeBlock key={blockData.id} code={blockData.code} language={blockData.language} />);
      lastIndex = placeholderIndex + placeholder.length;
    }
  });

  const remainingHtml = processedHtml.slice(lastIndex);
  if (remainingHtml.trim()) {
    parts.push(<div key="html-final" dangerouslySetInnerHTML={{ __html: remainingHtml }} />);
  }

  if (parts.length === 0) {
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  }

  return <>{parts}</>;
}

function CloseIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SettingsIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default ReaderView;
