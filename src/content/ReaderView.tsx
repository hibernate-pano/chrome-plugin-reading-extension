/**
 * ReaderView Component
 * Main reading mode view that displays extracted content
 * Requirements: 3.1, 3.5, 6.2, 6.5
 */

import React, { useState, useCallback, useEffect, useMemo, useRef, type JSX } from 'react';
import type { Settings, ExtractedContent } from '../shared/types';
import { SettingsPanel } from './SettingsPanel';
import { CodeBlock } from './CodeBlock';

interface ReaderViewProps {
  /** Extracted content to display */
  content: ExtractedContent;
  /** Current settings */
  settings: Settings;
  /** Callback to close reading mode */
  onClose: () => void;
  /** Callback when settings change */
  onSettingsChange: (settings: Partial<Settings>) => void;
  /** Callback to add to favorites */
  onAddToFavorites?: () => void;
  /** Whether current article is favorited */
  isFavorited?: boolean;
}

/**
 * ReaderView component - main reading mode interface
 */
export function ReaderView({
  content,
  settings,
  onClose,
  onSettingsChange,
  onAddToFavorites,
  isFavorited = false,
}: ReaderViewProps): JSX.Element {
  const [showSettings, setShowSettings] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  // Toggle settings panel
  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  // Close settings panel
  const closeSettings = useCallback(() => {
    setShowSettings(false);
    // Return focus to settings button when panel closes
    settingsButtonRef.current?.focus();
  }, []);

  // Handle escape key to close reader
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !showSettings) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showSettings]);

  // Lock body scroll when reader is active
  useEffect(() => {
    document.body.classList.add('reader-mode-active');
    return () => {
      document.body.classList.remove('reader-mode-active');
    };
  }, []);

  // Focus close button on mount for keyboard accessibility
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

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

  // Skip to content handler
  const skipToContent = useCallback(() => {
    contentRef.current?.focus();
  }, []);

  // CSS custom properties for settings
  const containerStyle = useMemo(() => ({
    '--reader-font-size': `${settings.fontSize}px`,
    '--reader-line-height': `${settings.lineHeight}`,
    '--reader-page-width': `${settings.pageWidth}px`,
    '--reader-font-family': settings.fontFamily,
  } as React.CSSProperties), [settings]);

  // Theme class
  const themeClass = `reader-theme-${settings.theme}`;

  // Process content to handle code blocks
  const processedContent = useMemo(() => {
    return processContentWithCodeBlocks(content.content);
  }, [content.content]);

  return (
    <div className={`reader-overlay ${themeClass}`} style={containerStyle} role="main">
      {/* Skip to content link for keyboard users */}
      <a
        href="#reader-content"
        className="reader-skip-link"
        onClick={(e) => {
          e.preventDefault();
          skipToContent();
        }}
        onKeyDown={(e) => handleKeyboardActivation(e, skipToContent)}
      >
        Skip to content
      </a>

      {/* Close Button */}
      <button
        ref={closeButtonRef}
        className="reader-close-btn"
        onClick={onClose}
        onKeyDown={(e) => handleKeyboardActivation(e, onClose)}
        aria-label="Close reading mode (Escape)"
        type="button"
        tabIndex={0}
      >
        <CloseIcon />
      </button>

      {/* Main Container */}
      <div className="reader-container">
        {/* Header */}
        <header className="reader-header">
          <h1 className="reader-title" id="reader-title">{content.title}</h1>
          <div className="reader-meta" aria-label="Article metadata">
            {content.siteName && (
              <span className="reader-meta__item">
                <GlobeIcon aria-hidden="true" />
                <span>{content.siteName}</span>
              </span>
            )}
            {content.byline && (
              <span className="reader-meta__item">
                <UserIcon aria-hidden="true" />
                <span>{content.byline}</span>
              </span>
            )}
            <span className="reader-meta__item">
              <ClockIcon aria-hidden="true" />
              <span>{content.estimatedReadTime} min read</span>
            </span>
            <span className="reader-meta__item">
              <TextIcon aria-hidden="true" />
              <span>{content.wordCount.toLocaleString()} words</span>
            </span>
            {onAddToFavorites && (
              <button 
                className="reader-favorite-btn"
                onClick={onAddToFavorites}
                aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                title={isFavorited ? '已收藏' : '收藏文章'}
              >
                {isFavorited ? '❤️' : '🤍'}
              </button>
            )}
          </div>
        </header>

        {/* Content */}
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

      {/* Floating Settings Button */}
      <button
        ref={settingsButtonRef}
        className="reader-floating-btn"
        onClick={toggleSettings}
        onKeyDown={(e) => handleKeyboardActivation(e, toggleSettings)}
        aria-label={showSettings ? 'Close settings' : 'Open settings'}
        aria-expanded={showSettings}
        aria-haspopup="dialog"
        type="button"
        tabIndex={0}
      >
        <SettingsIcon aria-hidden="true" />
      </button>

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
 * Process HTML content and replace code blocks with React components
 */
function processContentWithCodeBlocks(htmlContent: string): React.ReactNode {
  // Parse HTML and extract code blocks
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // Find all pre > code elements
  const codeBlocks = doc.querySelectorAll('pre code, pre');
  const codeBlockData: Array<{ id: string; code: string; language: string }> = [];
  
  codeBlocks.forEach((block, index) => {
    const id = `code-block-${index}`;
    const codeElement = block.tagName === 'CODE' ? block : block.querySelector('code') || block;
    const code = codeElement.textContent || '';
    
    // Try to detect language from class
    let language = '';
    const classList = codeElement.className || block.className || '';
    const langMatch = classList.match(/language-(\w+)|lang-(\w+)|(\w+)/);
    if (langMatch) {
      language = langMatch[1] || langMatch[2] || langMatch[3] || '';
    }
    
    codeBlockData.push({ id, code, language });
    
    // Replace with placeholder
    const placeholder = doc.createElement('div');
    placeholder.setAttribute('data-code-block-id', id);
    
    const preElement = block.tagName === 'PRE' ? block : block.parentElement;
    if (preElement && preElement.parentElement) {
      preElement.parentElement.replaceChild(placeholder, preElement);
    }
  });

  // Get the processed HTML
  const processedHtml = doc.body.innerHTML;

  // Split by code block placeholders and interleave with React components
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  codeBlockData.forEach((blockData, index) => {
    const placeholder = `<div data-code-block-id="${blockData.id}"></div>`;
    const placeholderIndex = processedHtml.indexOf(placeholder, lastIndex);
    
    if (placeholderIndex !== -1) {
      // Add HTML before this code block
      const htmlBefore = processedHtml.slice(lastIndex, placeholderIndex);
      if (htmlBefore.trim()) {
        parts.push(
          <div
            key={`html-${index}`}
            dangerouslySetInnerHTML={{ __html: htmlBefore }}
          />
        );
      }
      
      // Add the code block component
      parts.push(
        <CodeBlock
          key={blockData.id}
          code={blockData.code}
          language={blockData.language}
        />
      );
      
      lastIndex = placeholderIndex + placeholder.length;
    }
  });

  // Add remaining HTML after last code block
  const remainingHtml = processedHtml.slice(lastIndex);
  if (remainingHtml.trim()) {
    parts.push(
      <div
        key="html-final"
        dangerouslySetInnerHTML={{ __html: remainingHtml }}
      />
    );
  }

  // If no code blocks were found, just render the HTML directly
  if (parts.length === 0) {
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  }

  return <>{parts}</>;
}

/**
 * Close icon SVG component
 */
function CloseIcon(): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
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
 * Settings icon SVG component
 */
function SettingsIcon(): JSX.Element {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * Globe icon SVG component
 */
function GlobeIcon(): JSX.Element {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/**
 * User icon SVG component
 */
function UserIcon(): JSX.Element {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/**
 * Clock icon SVG component
 */
function ClockIcon(): JSX.Element {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/**
 * Text icon SVG component
 */
function TextIcon(): JSX.Element {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export default ReaderView;
