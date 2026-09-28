/**
 * Code Highlighting — Shared Syntax Tokenizer
 *
 * Extracted from CodeBlock.tsx so the print page can reuse the exact same
 * highlighting without pulling in React. Both consumers must agree on
 * output, otherwise printed code would differ from the reading view.
 */

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
  go: /\b(func|package|import|chan|defer|go|select|range)\b/,
  rust: /\b(fn|let|mut|impl|struct|enum|pub|mod|use|match)\b/,
  html: /<\/?[a-z][\s\S]*>/i,
  css: /\{[\s\S]*?:\s*[\s\S]*?;\s*[\s\S]*?\}/,
  sql: /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|CREATE|DROP|ALTER)\b/i,
  json: /^\s*[[{]/,
  yaml: /^\s*[\w-]+:\s/m,
  bash: /\b(echo|cd|ls|grep|awk|sed|chmod|chown|sudo)\b/,
  markdown: /^#{1,6}\s|^\*\s|^-\s|^\d+\.\s/m,
};

/**
 * Detect programming language from code content
 */
export function detectLanguage(code: string): string {
  if (!code) return 'plaintext';
  for (const [language, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(code)) {
      return language;
    }
  }
  return 'plaintext';
}

/**
 * Normalize language identifier
 */
export function normalizeLanguage(language: string): string {
  const normalized = language.toLowerCase().trim();
  const aliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    rb: 'ruby',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    'c++': 'cpp',
    cxx: 'cpp',
    yml: 'yaml',
    md: 'markdown',
  };
  return aliases[normalized] || normalized;
}

interface TokenPattern {
  pattern: RegExp;
  className: string;
}

const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'implements', 'import', 'export', 'default', 'from', 'async', 'await', 'yield', 'this', 'super', 'null', 'undefined', 'true', 'false', 'typeof', 'instanceof', 'in', 'of'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'implements', 'interface', 'type', 'enum', 'namespace', 'declare', 'as', 'readonly', 'private', 'public', 'protected', 'static', 'abstract'],
  python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'with', 'pass', 'break', 'continue', 'lambda', 'yield', 'global', 'nonlocal', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is'],
  java: ['public', 'private', 'protected', 'class', 'void', 'static', 'final', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'new', 'import', 'package', 'interface', 'extends', 'implements'],
  cpp: ['void', 'int', 'char', 'bool', 'auto', 'const', 'static', 'class', 'struct', 'enum', 'namespace', 'template', 'typename', 'public', 'private', 'protected', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'delete', 'using', 'include', 'std'],
  c: ['void', 'int', 'char', 'struct', 'union', 'enum', 'static', 'const', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'include', 'define', 'typedef', 'sizeof', 'malloc', 'free'],
  go: ['func', 'package', 'import', 'struct', 'interface', 'map', 'chan', 'go', 'defer', 'select', 'range', 'for', 'if', 'else', 'return', 'var', 'const', 'type', 'switch', 'case', 'break', 'continue'],
  rust: ['fn', 'let', 'mut', 'impl', 'struct', 'enum', 'pub', 'mod', 'use', 'match', 'loop', 'break', 'continue', 'if', 'else', 'for', 'while', 'return', 'const', 'static', 'struct', 'trait', 'where', 'async', 'await', 'move', 'ref', 'self', 'Self'],
  sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'GROUP', 'ORDER', 'BY', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'PRIMARY', 'FOREIGN', 'KEY'],
  bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'local', 'source', 'alias', 'unset', 'export', 'sudo', 'cd', 'ls', 'grep'],
};

/**
 * Get tokenization patterns for a specific language
 */
export function getTokenPatterns(language: string): TokenPattern[] {
  const commonPatterns: TokenPattern[] = [
    { pattern: /(\/\/[^\n]*)/g, className: 'token-comment' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'token-comment' },
    { pattern: /("(?:[^"\\]|\\.)*")/g, className: 'token-string' },
    { pattern: /('(?:[^'\\]|\\.)*')/g, className: 'token-string' },
    { pattern: /(`(?:[^`\\]|\\.)*`)/g, className: 'token-string' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'token-number' },
  ];

  const keywords = LANGUAGE_KEYWORDS[language] || [];
  if (keywords.length > 0) {
    // Escape regex-special chars in keywords before joining
    const escaped = keywords.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    commonPatterns.push({
      pattern: new RegExp(`\\b(${escaped.join('|')})\\b`, 'g'),
      className: 'token-keyword',
    });
  }

  commonPatterns.push({
    pattern: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
    className: 'token-function',
  });

  return commonPatterns;
}

/**
 * Tokenize code into HTML with syntax highlight classes
 * Input is escaped first — output is safe to assign via innerHTML.
 */
export function highlightCode(code: string, language: string): string {
  if (!code) return '';

  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  for (const { pattern, className } of getTokenPatterns(language)) {
    escaped = escaped.replace(pattern, (match) => {
      if (match.includes('class="token-')) return match;
      return `<span class="${className}">${match}</span>`;
    });
  }

  return escaped;
}
