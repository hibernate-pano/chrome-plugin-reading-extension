/**
 * ReaderView Component
 * Main reading mode view — clean, distraction-free
 */

import React, { useState, useCallback, useEffect, useMemo, useRef, type JSX } from 'react';
import type { Settings, ExtractedContent } from '../shared/types';
import type { ReadingRecord } from '../shared/history';
import { SettingsPanel } from './SettingsPanel';
import { HistoryPanel } from './HistoryPanel';
import { CodeBlock } from './CodeBlock';
import {
  CloseIcon,
  DownloadIcon,
  ErrorIcon,
  HistoryIcon,
  SettingsIcon,
  SpinnerIcon,
} from './icons';
import { getReaderThemeById } from '../shared/readerThemes';

/** Which floating panel, if any, is open. They are mutually exclusive. */
type ActivePanel = 'settings' | 'history' | null;

/** Idle window before the auto-hiding toolbar goes away, after a mouse move. */
const TOOLBAR_IDLE_MS = 2500;
/** Slightly longer window for the initial hide, before any mouse move at all. */
const TOOLBAR_INITIAL_IDLE_MS = 3000;

interface ReaderViewProps {
  content: ExtractedContent;
  settings: Settings;
  onClose: () => void;
  onSettingsChange: (settings: Partial<Settings>) => void;
  /** Hand the article to the background, which opens the print page. */
  onExportPdf: () => Promise<{ success: boolean; error?: string }>;
  /** Restore the built-in defaults. Rejects if storage refuses the write. */
  onResetSettings: () => Promise<void>;
  /** Read the stored reading records. */
  onLoadHistory: () => Promise<ReadingRecord[]>;
  /** Drop one record; resolves with what storage still holds. */
  onDeleteHistory: (recordId: string) => Promise<ReadingRecord[]>;
  /** Drop every record; resolves with what storage still holds (empty). */
  onClearHistory: () => Promise<ReadingRecord[]>;
}

export function ReaderView({
  content,
  settings,
  onClose,
  onSettingsChange,
  onExportPdf,
  onResetSettings,
  onLoadHistory,
  onDeleteHistory,
  onClearHistory,
}: ReaderViewProps): JSX.Element {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<ReadingRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const historyBtnRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastMoveRef = useRef(0);

  // Read through a ref so `showToolbar` keeps a stable identity. If it
  // depended on the active panel, opening one would tear down and re-arm the
  // mousemove effect below — re-scheduling the initial hide and vanishing the
  // toolbar while the panel is still open.
  const panelOpenRef = useRef(activePanel !== null);
  panelOpenRef.current = activePanel !== null;

  // Auto-hide toolbar after inactivity
  const showToolbar = useCallback(() => {
    setToolbarVisible(true);
    // A pointer sweep delivers mousemove far faster than the toolbar can
    // visibly react, so the re-arm is coalesced to one per frame. The deadline
    // is measured from the *latest* event rather than from the frame that
    // armed the timer, so throttling never shortens (or extends) the window.
    lastMoveRef.current = Date.now();
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      // Don't hide if a panel is open
      if (!panelOpenRef.current) {
        const elapsed = Date.now() - lastMoveRef.current;
        const remaining = Math.max(0, TOOLBAR_IDLE_MS - elapsed);
        hideTimerRef.current = setTimeout(() => {
          setToolbarVisible(false);
        }, remaining);
      }
    });
  }, []);

  // Keep toolbar visible when a panel is open, and cancel any hide already
  // in flight — this is what stops a pending timer from firing underneath it.
  useEffect(() => {
    if (activePanel) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setToolbarVisible(true);
    }
  }, [activePanel]);

  // Show toolbar on any mouse movement
  useEffect(() => {
    document.addEventListener('mousemove', showToolbar, { passive: true });
    // Initial hide after 3s
    hideTimerRef.current = setTimeout(
      () => setToolbarVisible(false),
      TOOLBAR_INITIAL_IDLE_MS
    );
    return () => {
      document.removeEventListener('mousemove', showToolbar);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [showToolbar]);

  // Escape key to close reader (if no panel is open)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !activePanel) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activePanel]);

  // Reading progress, written straight to the overlay as a custom property.
  //
  // A scrollbar drag emits scroll events faster than the frame rate, so the
  // write is coalesced to one per frame. The value lands on an element the
  // stylesheet already reads, so a scrolling article costs no React render at
  // all. Window resize is the other thing that moves the end of the document.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    let frame: number | null = null;

    const write = (): void => {
      frame = null;
      const scrollable = overlay.scrollHeight - overlay.clientHeight;
      const ratio = scrollable > 0 ? overlay.scrollTop / scrollable : 0;
      overlay.style.setProperty(
        '--reader-progress',
        `${(Math.min(1, Math.max(0, ratio)) * 100).toFixed(2)}%`
      );
    };

    const handleScroll = (): void => {
      if (frame !== null) return;
      frame = requestAnimationFrame(write);
    };

    overlay.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    write();

    return () => {
      overlay.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.classList.add('reader-mode-active');
    return () => {
      document.body.classList.remove('reader-mode-active');
    };
  }, []);

  const toggleSettings = useCallback(() => {
    // Closing through the gear has to hand focus back, exactly as Escape and
    // the close button do. Without it the panel unmounts while it owns focus,
    // focus falls to <body>, and the next Tab is delivered to the host page
    // behind the overlay — the reader's own keydown listener is on the shadow
    // root and never sees it.
    setActivePanel((prev) => {
      if (prev === 'settings') {
        // Deferred: the button is still mounted during this state update, so
        // focusing synchronously here would be undone by the re-render.
        requestAnimationFrame(() => settingsBtnRef.current?.focus());
      }
      return prev === 'settings' ? null : 'settings';
    });
  }, []);

  const toggleHistory = useCallback(() => {
    setActivePanel((prev) => {
      if (prev === 'history') {
        requestAnimationFrame(() => historyBtnRef.current?.focus());
      }
      return prev === 'history' ? null : 'history';
    });
  }, []);

  const handleExportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const result = await onExportPdf();
      if (!result.success) {
        setExportError(result.error ?? '导出失败');
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  }, [exporting, onExportPdf]);

  // Clear a stale error so it does not sit on screen after the next success.
  useEffect(() => {
    if (!exportError) return;
    const timer = setTimeout(() => setExportError(null), 6000);
    return () => clearTimeout(timer);
  }, [exportError]);

  const closeSettings = useCallback(() => {
    setActivePanel(null);
    settingsBtnRef.current?.focus();
  }, []);

  const closeHistory = useCallback(() => {
    setActivePanel(null);
    historyBtnRef.current?.focus();
  }, []);

  // History is read when the panel opens rather than on mount: most readers
  // never open it, and a storage read for nothing is a read per article.
  // Re-read on every open so a record deleted from another tab is not shown
  // as still present.
  useEffect(() => {
    if (activePanel !== 'history') return;

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    onLoadHistory()
      .then((records) => {
        if (!cancelled) setHistoryRecords(records);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHistoryError(error instanceof Error ? error.message : '读取阅读历史失败');
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activePanel, onLoadHistory]);

  const handleDeleteHistory = useCallback(
    (recordId: string) => {
      setHistoryError(null);
      onDeleteHistory(recordId)
        .then(setHistoryRecords)
        .catch((error: unknown) => {
          setHistoryError(error instanceof Error ? error.message : '删除失败，请重试');
        });
    },
    [onDeleteHistory]
  );

  const handleClearHistory = useCallback(() => {
    setHistoryError(null);
    onClearHistory()
      .then(setHistoryRecords)
      .catch((error: unknown) => {
        setHistoryError(error instanceof Error ? error.message : '清空失败，请重试');
      });
  }, [onClearHistory]);


  // CSS custom properties — keep this list to the four things the user can adjust.
  const containerStyle = useMemo(() => {
    const themeData = getReaderThemeById(settings.theme);
    return {
      '--reader-bg': themeData.background,
      '--reader-text': themeData.text,
      '--reader-text-muted': themeData.textMuted,
      '--reader-accent': themeData.accent,
      '--reader-border': themeData.border,
      '--reader-code-bg': themeData.codeBg,
      '--reader-font-size': `${settings.fontSize}px`,
      '--reader-line-height': `${settings.lineHeight}`,
      '--reader-page-width': `${settings.pageWidth}px`,
    } as React.CSSProperties;
  }, [settings]);

  const themeClass = `reader-theme-${settings.theme}`;
  const toolbarClass = `reader-toolbar ${toolbarVisible ? 'reader-toolbar--visible' : 'reader-toolbar--hidden'}`;

  // Meta is collected as a list and joined at render time. Laying out one
  // branch per field meant each branch hard-coded its own trailing `·`, which
  // is how a doubled or orphaned separator slips in whenever a field is
  // missing. Here the separator is a function of position, so it is right for
  // every combination of present/absent fields.
  const metaItems = useMemo(() => {
    const items: string[] = [];
    if (content.siteName) items.push(content.siteName);
    if (content.byline) items.push(content.byline);
    items.push(`${content.estimatedReadTime} min read`);
    return items;
  }, [content.siteName, content.byline, content.estimatedReadTime]);

  const processedContent = useMemo(() => {
    return processContentWithCodeBlocks(content.content);
  }, [content.content]);

  return (
    <div
      ref={overlayRef}
      className={`reader-overlay ${themeClass}`}
      style={containerStyle}
      role="main"
    >
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

        {/* Right-aligned control cluster — the two-bar top strip is
            space-between, so these must sit together or they drift apart. */}
        <div className="reader-toolbar__actions">
          <button
            className="reader-export-btn"
            onClick={handleExportPdf}
            disabled={exporting}
            aria-label="导出 PDF"
            title="导出 PDF"
            type="button"
          >
            {exporting ? <SpinnerIcon /> : <DownloadIcon />}
          </button>

          <button
            ref={historyBtnRef}
            className={`reader-history-btn${activePanel === 'history' ? ' reader-history-btn--active' : ''}`}
            onClick={toggleHistory}
            aria-label={activePanel === 'history' ? 'Close reading history' : 'Open reading history'}
            aria-expanded={activePanel === 'history'}
            type="button"
          >
            <HistoryIcon />
          </button>

          <button
            ref={settingsBtnRef}
            className={`reader-settings-btn${activePanel === 'settings' ? ' reader-settings-btn--active' : ''}`}
            onClick={toggleSettings}
            aria-label={activePanel === 'settings' ? 'Close settings' : 'Open settings'}
            aria-expanded={activePanel === 'settings'}
            type="button"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      {/* Anchored to the overlay, not the toolbar — the toolbar is a
          fixed top strip and would push this out of the viewport. */}
      {exportError && (
        <div className="reader-export-error" role="alert">
          <ErrorIcon />
          <span>{exportError}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="reader-container">
        <header className="reader-header">
          <h1 className="reader-title" id="reader-title">{content.title}</h1>
          <div className="reader-meta" aria-label="Article info">
            {metaItems.map((item, index) => (
              <React.Fragment key={`meta-${index}`}>
                {index > 0 && (
                  <span className="reader-meta__separator" aria-hidden="true">·</span>
                )}
                <span className="reader-meta__item">{item}</span>
              </React.Fragment>
            ))}
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

      {/* Floating panels — mutually exclusive, so the overlay only ever has
          one modal on screen and Escape has one meaning at a time. */}
      {activePanel === 'settings' && (
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          onReset={onResetSettings}
          onClose={closeSettings}
        />
      )}

      {activePanel === 'history' && (
        <HistoryPanel
          records={historyRecords}
          loading={historyLoading}
          error={historyError}
          onDelete={handleDeleteHistory}
          onClear={handleClearHistory}
          onClose={closeHistory}
        />
      )}
    </div>
  );
}

/** Code text plus the raw language hint found on the source element. */
interface CodeBlockContent {
  code: string;
  /** Raw `language-x` / `lang-x` token — CodeBlock normalizes aliases itself. */
  language: string;
}

/**
 * Elements that must become a <CodeBlock>: every <pre> (with or without a
 * <code> child) plus every <code> that is not inside a <pre>.
 *
 * A Set, because `pre code, pre` counts a <pre><code> pair twice — the pair
 * would otherwise be rendered twice, once with a <code> parent that has already
 * been consumed. Descending per element kind instead means each is seen once.
 */
function collectCodeBlockElements(doc: Document): Set<Element> {
  const elements = new Set<Element>();

  doc.querySelectorAll('pre').forEach((pre) => elements.add(pre));
  doc.querySelectorAll('code').forEach((code) => {
    if (!code.closest('pre')) {
      elements.add(code);
    }
  });

  return elements;
}

/** Pull a `language-x` / `lang-x` token off a className. */
function readLanguageHint(className: string | null | undefined): string {
  const match = (className || '').match(/language-(\w+)|lang-(\w+)/);
  return match ? match[1] || match[2] || '' : '';
}

/**
 * Read the code out of a <pre> or a standalone <code>.
 * A <pre> with no <code> child falls back to its own text.
 */
function readCodeBlock(element: Element): CodeBlockContent {
  const source = element.tagName === 'PRE' ? element.querySelector('code') ?? element : element;

  return {
    code: source.textContent || '',
    language: readLanguageHint(source.className) || readLanguageHint(element.className),
  };
}

/**
 * Escape a text node's value for re-entry into an HTML string.
 *
 * `nodeValue` is the *decoded* text: the sanitizer wrote `&lt;img …&gt;`, and
 * parsing that fragment turned it back into a literal `<img …>` character run.
 * Concatenating it into `pending` un-does the escaping, so article text that
 * merely looked like markup — a post about HTML, a tutorial showing a tag —
 * would come back as live DOM under `dangerouslySetInnerHTML`. Escaping here
 * restores the invariant the sanitizer established.
 */
function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Serialize a body child for the raw-HTML run it belongs to. */
function serializeNode(node: Node): string {
  if (node.nodeType === Node.ELEMENT_NODE) return (node as Element).outerHTML;
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.nodeValue ?? '');
  // Comments and processing instructions carry no article text; dropping them
  // keeps them from re-entering the string as live markup.
  return '';
}

/**
 * Turn the children of `parent` into React nodes, swapping every code block for
 * a <CodeBlock>.
 *
 * Runs of ordinary nodes are accumulated and flushed as one raw-HTML fragment,
 * so prose keeps its structure instead of being wrapped one node at a time.
 * Elements that contain a code block are descended into, which means a code
 * block nested in prose is picked up rather than being left behind as inert
 * markup. The element that held it does not survive the split — an element
 * cannot stay open across a React sibling boundary — so it is flattened away.
 * Its other children are emitted in order, so only the wrapper is lost, never
 * its content.
 */
function renderContentNodes(
  parent: Node,
  path: string,
  codeBlocks: Set<Element>
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let pending = '';
  let htmlIndex = 0;

  const flush = (): void => {
    if (pending.trim()) {
      nodes.push(
        <div key={`${path}-html-${htmlIndex++}`} dangerouslySetInnerHTML={{ __html: pending }} />
      );
    }
    pending = '';
  };

  Array.from(parent.childNodes).forEach((node, index) => {
    const childPath = `${path}.${index}`;
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;

    if (element) {
      if (codeBlocks.has(element)) {
        flush();
        const { code, language } = readCodeBlock(element);
        nodes.push(<CodeBlock key={`${childPath}-code`} code={code} language={language} />);
        return;
      }

      // Any <code> below sits either in a <pre> that would have matched
      // already, or stands on its own — either way a code block lives inside.
      if (element.querySelector('pre, code')) {
        flush();
        nodes.push(...renderContentNodes(element, childPath, codeBlocks));
        return;
      }
    }

    pending += serializeNode(node);
  });

  flush();

  return nodes;
}

/**
 * Process HTML content, replacing <pre> and standalone <code> blocks with React components.
 *
 * One traversal of the parsed document. Every node is either swapped for a
 * <CodeBlock> node or accumulated into the raw-HTML fragment that precedes it —
 * there is no third outcome, so nothing can fall through.
 *
 * This deliberately does not round-trip through an HTML string: the previous
 * version re-serialized the body and located each placeholder with `indexOf`,
 * which missed occurrences, could latch onto unrelated markup that happened to
 * contain the same literal placeholder string, and left an entry with no
 * placeholder at all when a node had no parent — in that last case the code was
 * simply gone from the output.
 */
function processContentWithCodeBlocks(htmlContent: string): React.ReactNode {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const codeBlocks = collectCodeBlockElements(doc);

  const segments = renderContentNodes(doc.body, '0', codeBlocks);

  if (segments.length === 0) {
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  }

  return <>{segments}</>;
}

