/**
 * CodeBlock Component
 * Displays code with syntax highlighting and copy functionality
 * Requirements: 4.1, 4.2, 4.3, 6.5
 */

import { useState, useCallback, useMemo, type JSX } from 'react';
import { highlightCode, detectLanguage, normalizeLanguage } from '../shared/codeHighlight';

interface CodeBlockProps {
  /** The code content to display */
  code: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Optional filename to display */
  filename?: string;
}

/**
 * CodeBlock component with syntax highlighting and copy functionality
 */
export function CodeBlock({ code, language, filename }: CodeBlockProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  // Detect or normalize language
  const detectedLanguage = useMemo(() => {
    if (language) {
      return normalizeLanguage(language);
    }
    return detectLanguage(code);
  }, [code, language]);

  // Tokenize code for syntax highlighting
  const highlightedCode = useMemo(() => {
    return highlightCode(code, detectedLanguage);
  }, [code, detectedLanguage]);

  // Copy to clipboard handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers. execCommand can throw, and the
      // textarea must not survive it — hence finally, not a bare call.
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      try {
        textarea.select();
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  // Display language name
  const displayLanguage = filename || detectedLanguage;

  return (
    <div className="reader-code-block">
      <div className="reader-code-block__header">
        <span className="reader-code-block__language" aria-label={`Language: ${displayLanguage}`}>
          {displayLanguage}
        </span>
        <button
          className={`reader-code-block__copy ${copied ? 'reader-code-block__copy--copied' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          aria-live="polite"
          type="button"
        >
          {copied ? (
            <>
              <CopyCheckIcon aria-hidden="true" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre>
        <code 
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          tabIndex={0}
          aria-label={`Code block in ${displayLanguage}`}
        />
      </pre>
    </div>
  );
}

/**
 * Copy icon SVG component
 */
function CopyIcon(): JSX.Element {
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/**
 * Copy check icon SVG component
 */
function CopyCheckIcon(): JSX.Element {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
