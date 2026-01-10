/**
 * CodeBlock Component
 * Displays code with syntax highlighting and copy functionality
 * Requirements: 4.1, 4.2, 4.3, 6.5
 */

import React, { useState, useCallback, useMemo, type JSX } from 'react';

interface CodeBlockProps {
  /** The code content to display */
  code: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Optional filename to display */
  filename?: string;
}

/**
 * Language detection patterns
 * Maps common patterns to language identifiers
 */
const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  javascript: /\b(const|let|var|function|=>|async|await|import|export|require)\b/,
  typescript: /\b(interface|type|enum|namespace|declare|as|implements)\b/,
  python: /\b(def|class|import|from|if __name__|print\(|self\.)\b/,
  java: /\b(public|private|protected|class|void|static|final|extends|implements)\b/,
  cpp: /\b(#include|std::|cout|cin|nullptr|template|typename)\b/,
  c: /\b(#include|printf|scanf|malloc|free|sizeof)\b/,
  go: /\b(func|package|import|go|chan|defer|goroutine)\b/,
  rust: /\b(fn|let|mut|impl|struct|enum|pub|mod|use|match)\b/,
  html: /<\/?[a-z][\s\S]*>/i,
  css: /\{[\s\S]*?:\s*[\s\S]*?;[\s\S]*?\}/,
  sql: /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|CREATE|DROP|ALTER)\b/i,
  json: /^\s*[[{]/,
  yaml: /^[\w-]+:\s/m,
  bash: /\b(echo|cd|ls|grep|awk|sed|chmod|chown|sudo)\b/,
  markdown: /^#{1,6}\s|^\*\s|^-\s|^\d+\.\s/m,
};

/**
 * Supported languages for syntax highlighting
 */
const _SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
  'go', 'rust', 'html', 'css', 'sql', 'json', 'yaml', 'bash', 'markdown'
] as const;

/**
 * Detect programming language from code content
 */
function detectLanguage(code: string): string {
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(code)) {
      return lang;
    }
  }
  return 'plaintext';
}

/**
 * Normalize language identifier
 */
function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'bash',
    'shell': 'bash',
    'zsh': 'bash',
    'c++': 'cpp',
    'cxx': 'cpp',
    'yml': 'yaml',
    'md': 'markdown',
  };
  return aliases[normalized] || normalized;
}

/**
 * Simple tokenizer for syntax highlighting
 * Returns HTML string with token classes
 */
function tokenize(code: string, language: string): string {
  // Escape HTML entities first
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply syntax highlighting based on language
  const patterns = getLanguagePatterns(language);
  
  for (const { pattern, className } of patterns) {
    escaped = escaped.replace(pattern, (match) => {
      // Don't double-wrap already tokenized content
      if (match.includes('class="token-')) return match;
      return `<span class="${className}">${match}</span>`;
    });
  }

  return escaped;
}

interface TokenPattern {
  pattern: RegExp;
  className: string;
}

/**
 * Get tokenization patterns for a language
 */
function getLanguagePatterns(language: string): TokenPattern[] {
  const commonPatterns: TokenPattern[] = [
    // Comments (single line)
    { pattern: /(\/\/[^\n]*)/g, className: 'token-comment' },
    // Comments (multi-line)
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'token-comment' },
    // Strings (double quotes)
    { pattern: /("(?:[^"\\]|\\.)*")/g, className: 'token-string' },
    // Strings (single quotes)
    { pattern: /('(?:[^'\\]|\\.)*')/g, className: 'token-string' },
    // Template literals
    { pattern: /(`(?:[^`\\]|\\.)*`)/g, className: 'token-string' },
    // Numbers
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'token-number' },
  ];

  const languageKeywords: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'yield', 'this', 'super', 'null', 'undefined', 'true', 'false', 'typeof', 'instanceof', 'in', 'of'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'yield', 'this', 'super', 'null', 'undefined', 'true', 'false', 'typeof', 'instanceof', 'in', 'of', 'interface', 'type', 'enum', 'namespace', 'declare', 'as', 'implements', 'readonly', 'private', 'public', 'protected', 'static', 'abstract'],
    python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'with', 'pass', 'break', 'continue', 'lambda', 'yield', 'global', 'nonlocal', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'async', 'await'],
    java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'new', 'this', 'super', 'null', 'true', 'false', 'import', 'package'],
    cpp: ['int', 'long', 'double', 'float', 'char', 'bool', 'void', 'auto', 'const', 'static', 'class', 'struct', 'enum', 'union', 'public', 'private', 'protected', 'virtual', 'override', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw', 'new', 'delete', 'this', 'nullptr', 'true', 'false', 'template', 'typename', 'namespace', 'using', 'include'],
    go: ['func', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'break', 'continue', 'go', 'chan', 'select', 'defer', 'package', 'import', 'var', 'const', 'type', 'struct', 'interface', 'map', 'make', 'new', 'nil', 'true', 'false'],
    rust: ['fn', 'let', 'mut', 'const', 'static', 'return', 'if', 'else', 'for', 'while', 'loop', 'match', 'break', 'continue', 'struct', 'enum', 'impl', 'trait', 'pub', 'mod', 'use', 'self', 'Self', 'super', 'crate', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'async', 'await', 'move', 'ref', 'where'],
    sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'],
    bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'read', 'export', 'local', 'source', 'alias', 'unset', 'true', 'false'],
  };

  const keywords = languageKeywords[language] || [];
  const keywordPatterns: TokenPattern[] = [];

  if (keywords.length > 0) {
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    keywordPatterns.push({ pattern: keywordRegex, className: 'token-keyword' });
  }

  // Function patterns
  const functionPattern: TokenPattern = {
    pattern: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
    className: 'token-function'
  };

  return [...commonPatterns, ...keywordPatterns, functionPattern];
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
    return tokenize(code, detectedLanguage);
  }, [code, detectedLanguage]);

  // Copy to clipboard handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  // Handle keyboard activation for copy button
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy();
    }
  }, [handleCopy]);

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
          onKeyDown={handleKeyDown}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          aria-live="polite"
          type="button"
          tabIndex={0}
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

export default CodeBlock;
