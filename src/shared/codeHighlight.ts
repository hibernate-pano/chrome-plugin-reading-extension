/**
 * Code Highlighting — Shared Syntax Tokenizer
 *
 * Extracted from CodeBlock.tsx so the print page can reuse the exact same
 * highlighting without pulling in React. Both consumers must agree on
 * output, otherwise printed code would differ from the reading view.
 *
 * Implementation note: highlighting is a SINGLE pass over the raw source.
 * An earlier version ran one String.replace() per token type over a string
 * it had already decorated, so a later rule matched the markup an earlier
 * rule had just written — the string rule happily matched the
 * `class="token-comment"` inside a comment it was handed — and produced
 * invalid HTML such as `<span <span class=…>`. Nothing emitted here is
 * ever re-scanned, and the source is escaped token by token, so our own
 * markup can never be mistaken for source text.
 */

/** Characters that can break out of a text node, and their replacements. */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * Escape text before it is assigned via innerHTML / dangerouslySetInnerHTML.
 *
 * Quotes are deliberately left alone: the only attribute this module ever
 * emits is its own class name, never caller-supplied text, so `"` cannot
 * escape an attribute value. `<` and `>` and `&` are enough to keep the
 * text a text node.
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (char) => HTML_ESCAPES[char]);
}

/* ------------------------------------------------------------------ *
 * Language detection
 * ------------------------------------------------------------------ */

interface LanguageSignal {
  /** Identifier returned when this signal wins. */
  language: string;
  pattern: RegExp;
}

/**
 * Unambiguous markers — decided first, and decisive when they hit.
 *
 * These constructs appear in one language only, or in a shape no other
 * language produces, so they outrank every generic keyword match. This
 * is what keeps a Python file that merely `import`s something from being
 * read as JavaScript, and a one-line JSON blob from being read as HTML.
 */
const STRONG_LANGUAGE_SIGNALS: LanguageSignal[] = [
  { language: 'cpp', pattern: /\bstd::|#\s*include\s*<[\w./]*(?:cstdio|cstring|vector|iostream|algorithm|memory|utility)>/ },
  { language: 'c', pattern: /#\s*include\s*<[\w./]+\.h>|^\s*#\s*define\s+\w+/m },
  { language: 'rust', pattern: /\bfn\s+\w+|^\s*(?:pub(?:\([^)]*\))?\s+)?(?:struct|enum|trait|impl)\s+\w+/m },
  { language: 'go', pattern: /^\s*(?:package\s+\w+|func\s+\w*\s*\()/m },
  { language: 'java', pattern: /^\s*(?:public|private|protected)[\w\s]*\b(?:class|interface|enum|void|int)\b|@Override|System\.out\.println/m },
  {
    language: 'python',
    // `class Foo(Base):` / `def foo():` / `if __name__` / `self.x` / a bare
    // `import os` line. `import x from 'y'` is JS, and cannot match here.
    pattern:
      /^\s*(?:async\s+)?def\s+\w+\s*\(|\bclass\s+\w+(?:\([^)]*\))?\s*:|^\s*if\s+__name__|self\.\w+|^\s*(?:from\s+[\w.]+\s+)?import\s+[\w.]+(?:\s+as\s+\w+)?\s*$/m,
  },
  {
    language: 'sql',
    pattern:
      /\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE)\b[\s\S]*\b(?:FROM|INTO|VALUES|SET|TABLE|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY)\b/i,
  },
  // A leading `{`/`[` followed by a quoted key or a literal — a JSON
  // document, not a JavaScript object or array literal, and not a page
  // that happens to contain an HTML string.
  { language: 'json', pattern: /^\s*[{[]\s*(?:"(?:[^"\\]|\\.)*"\s*:|[\d[{])/ },
  {
    language: 'html',
    // A doctype, a real closing tag, or an opening tag immediately followed
    // by more markup. `vector<string>` and `a < b` are not HTML.
    pattern:
      /<!DOCTYPE\s+html|<\/(?:html|head|body|div|span|p|a|ul|ol|li|table|thead|tbody|tr|td|script|style|form|section|article|header|footer|nav|textarea|button|input|img|h[1-6])\s*>|<[a-z][\w-]*(?:\s[^<>]*)?>\s*(?:<\/?[a-z][\w-]*)/i,
  },
  {
    language: 'css',
    // A declaration that precedes the first `;` inside a block. Without
    // that ordering, a TypeScript interface reads as a style sheet.
    pattern: /[.#][\w-]+\s*\{[^}]*:[^}]*;|@media\s|^\s*[\w-]+\s*\{\s*[\w-]+\s*:\s*[^;}]+;/m,
  },
  { language: 'yaml', pattern: /^---\s*$|^\s*-\s+[\w"']+:\s/m },
  {
    language: 'bash',
    // `export const x` is JavaScript; a shell assignment is upper-case.
    pattern: /^#!.*\b(?:ba|z|k)?sh\b|^\s*(?:export\s+[A-Z_]\w*=|alias\s+\w+=|local\s+\w+=|source\s+[\w./])/m,
  },
];

/**
 * Generic markers — only consulted when no strong signal matched. Ordered
 * most- to least-specific; the first hit wins. Deliberately narrow, so
 * ordinary prose falls through to `plaintext`.
 */
const WEAK_LANGUAGE_SIGNALS: LanguageSignal[] = [
  {
    language: 'typescript',
    pattern: /\b(?:interface|namespace|declare|implements)\b|\b(?:enum|type)\s+\w+|\bas\s+const\b|:\s*(?:string|number|boolean|unknown|never)\b/,
  },
  {
    language: 'javascript',
    pattern: /\b(?:const|let|var|function|return|async|await|require|module\.exports)\b|\b(?:import|export)\s+[\w{*]/,
  },
  { language: 'java', pattern: /\b(?:public|private|protected|static|final)\s+[\w<>[\]]+\s+\w+|\bnew\s+[A-Z]\w*\s*\(/ },
  { language: 'python', pattern: /\b(?:print|elif|lambda|self)\b/ },
  { language: 'bash', pattern: /\b(?:echo|chmod|chown|sudo|grep|awk|sed|export)\s|\$\{?\w+/ },
  { language: 'markdown', pattern: /^#{1,6}\s+\S|^\s*[-*+]\s+\S|^\s*\d+\.\s+\S/m },
  { language: 'yaml', pattern: /^\s*[\w.-]+:\s/m },
];

/**
 * Detect programming language from code content.
 *
 * Two tiers: unambiguous structural markers first, then generic keywords.
 * The tiering is the whole point — a flat, insertion-ordered table made
 * `json`/`html` shadow everything behind them and read any Python file
 * containing the word `import` as JavaScript.
 */
export function detectLanguage(code: string): string {
  if (!code) return 'plaintext';

  for (const { language, pattern } of STRONG_LANGUAGE_SIGNALS) {
    if (pattern.test(code)) return language;
  }
  for (const { language, pattern } of WEAK_LANGUAGE_SIGNALS) {
    if (pattern.test(code)) return language;
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

/* ------------------------------------------------------------------ *
 * Tokenization
 * ------------------------------------------------------------------ */

interface TokenPattern {
  pattern: RegExp;
  className: string;
}

interface TokenRule {
  className: string;
  /**
   * Regex source for one whole token. It must contain no capture groups of
   * its own: `highlightCode` wraps each source in exactly one group and
   * maps group index back to a class name.
   */
  source: string;
}

const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'implements', 'import', 'export', 'default', 'from', 'async', 'await', 'yield', 'this', 'super', 'null', 'undefined', 'true', 'false', 'typeof', 'instanceof', 'in', 'of'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'implements', 'interface', 'type', 'enum', 'namespace', 'declare', 'as', 'readonly', 'private', 'public', 'protected', 'static', 'abstract'],
  python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'with', 'pass', 'break', 'continue', 'lambda', 'yield', 'global', 'nonlocal', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is'],
  java: ['public', 'private', 'protected', 'class', 'void', 'static', 'final', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'new', 'import', 'package', 'interface', 'extends', 'implements'],
  cpp: ['void', 'int', 'char', 'bool', 'auto', 'const', 'static', 'class', 'struct', 'enum', 'namespace', 'template', 'typename', 'public', 'private', 'protected', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'delete', 'using', 'include', 'std'],
  c: ['void', 'int', 'char', 'struct', 'union', 'enum', 'static', 'const', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'include', 'define', 'typedef', 'sizeof', 'malloc', 'free'],
  go: ['func', 'package', 'import', 'struct', 'interface', 'map', 'chan', 'go', 'defer', 'select', 'range', 'for', 'if', 'else', 'return', 'var', 'const', 'type', 'switch', 'case', 'break', 'continue'],
  rust: ['fn', 'let', 'mut', 'impl', 'struct', 'enum', 'pub', 'mod', 'use', 'match', 'loop', 'break', 'continue', 'if', 'else', 'for', 'while', 'return', 'const', 'static', 'trait', 'where', 'async', 'await', 'move', 'ref', 'self', 'Self'],
  sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'GROUP', 'ORDER', 'BY', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'PRIMARY', 'FOREIGN', 'KEY'],
  bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'local', 'source', 'alias', 'unset', 'export', 'sudo', 'cd', 'ls', 'grep'],
};

/**
 * Build the keyword alternative, or null when the language has none.
 *
 * The `\b` on both sides is what keeps `const` from firing inside
 * `constant` and `null` from firing inside `nullable`: a word character
 * next to the matched keyword means no boundary exists, so the
 * alternative is rejected.
 */
function buildKeywordSource(keywords: string[]): string | null {
  if (keywords.length === 0) return null;
  const escaped = keywords.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return `\\b(?:${escaped.join('|')})\\b`;
}

const LINE_COMMENT_SOURCE = '\\/\\/[^\\n]*';
const BLOCK_COMMENT_SOURCE = '\\/\\*[\\s\\S]*?\\*\\/';
const DOUBLE_QUOTED_SOURCE = '"(?:[^"\\\\]|\\\\.)*"';
const SINGLE_QUOTED_SOURCE = "'(?:[^'\\\\]|\\\\.)*'";
const TEMPLATE_SOURCE = '`(?:[^`\\\\]|\\\\.)*`';
const NUMBER_SOURCE = '\\b\\d+\\.?\\d*\\b';
// Only the identifier is wrapped — the trailing `(` and any space stay out
// of the span, even though the call is what identifies the token.
const FUNCTION_CALL_SOURCE = '\\b[a-zA-Z_]\\w*(?=\\s*\\()';

/**
 * `#` is a comment in some languages and something else entirely in
 * others, so it cannot be a global rule the way `//` and `/* *\/` are.
 * Each guard below encodes one language's own rule about when a `#` opens
 * a comment.
 */
const HASH_COMMENT_SOURCE = '#[^\\n]*';
/** YAML: a `#` only starts a comment at the start of a line or after whitespace. */
const HASH_COMMENT_YAML_SOURCE = '(?<![^\\s])#[^\\n]*';
/** Shell family: `${#x}` (length), `${x#p}` (strip) and `\#` are not comments. */
const HASH_COMMENT_SHELL_SOURCE = '(?<![$\\\\{}\\w])#[^\\n]*';

/**
 * Line-comment syntax that only applies to specific languages.
 *
 * Languages not listed here keep the two unambiguous C-style rules and
 * nothing else — `#main` in CSS is an id selector, `#x` in JavaScript is
 * a private field, and `#include` in C is a preprocessor directive. None
 * of them may swallow the rest of the line.
 */
const LANGUAGE_LINE_COMMENTS: Record<string, string[]> = {
  python: [HASH_COMMENT_SOURCE],
  r: [HASH_COMMENT_SOURCE],
  yaml: [HASH_COMMENT_YAML_SOURCE],
  bash: [HASH_COMMENT_SHELL_SOURCE],
  ruby: [HASH_COMMENT_SHELL_SOURCE],
  perl: [HASH_COMMENT_SHELL_SOURCE],
};

/**
 * Ordered token rules for a language. Order is the alternation order of
 * the single combined regex; only rules that can start at the same
 * position are affected. Keywords must precede function calls so that
 * `if (x)` stays a keyword.
 *
 * Comments come first so that a comment wins over anything inside it —
 * not that ordering is what makes that true. The scan is leftmost-first,
 * so a `"` at an earlier index already consumes a `#` further along; a
 * `#` at an earlier index consumes a `"` further along. Either way the
 * comment stays atomic.
 */
function getTokenRules(language: string): TokenRule[] {
  const normalized = normalizeLanguage(language);

  const commentRules: TokenRule[] = [
    { className: 'token-comment', source: LINE_COMMENT_SOURCE },
    { className: 'token-comment', source: BLOCK_COMMENT_SOURCE },
  ];
  for (const source of LANGUAGE_LINE_COMMENTS[normalized] ?? []) {
    commentRules.push({ className: 'token-comment', source });
  }

  const rules: TokenRule[] = [
    ...commentRules,
    { className: 'token-string', source: DOUBLE_QUOTED_SOURCE },
    { className: 'token-string', source: SINGLE_QUOTED_SOURCE },
    { className: 'token-string', source: TEMPLATE_SOURCE },
    { className: 'token-number', source: NUMBER_SOURCE },
  ];

  const keywordSource = buildKeywordSource(LANGUAGE_KEYWORDS[normalized] ?? []);
  if (keywordSource !== null) {
    rules.push({ className: 'token-keyword', source: keywordSource });
  }

  rules.push({ className: 'token-function', source: FUNCTION_CALL_SOURCE });

  return rules;
}

/**
 * Get tokenization patterns for a specific language
 */
export function getTokenPatterns(language: string): TokenPattern[] {
  return getTokenRules(language).map((rule) => ({
    pattern: new RegExp(`(${rule.source})`, 'g'),
    className: rule.className,
  }));
}

/**
 * Map a combined-regex match back to the class name of the rule that won.
 * Group `i + 1` belongs to `rules[i]`, so the first defined group is the
 * rule whose alternative matched at this position.
 */
function resolveClassName(match: RegExpExecArray, rules: TokenRule[]): string {
  for (let i = 0; i < rules.length; i += 1) {
    if (match[i + 1] !== undefined) return rules[i].className;
  }
  return rules[0].className;
}

/**
 * Tokenize code into HTML with syntax highlight classes.
 *
 * One left-to-right walk of the raw source. Each character is consumed by
 * at most one rule, and every emitted piece is escaped source text — the
 * `<span>` wrappers we add are never re-examined. Output is therefore
 * safe to assign via innerHTML.
 */
export function highlightCode(code: string, language: string): string {
  if (!code) return '';

  const rules = getTokenRules(language);
  const pattern = new RegExp(rules.map((rule) => `(${rule.source})`).join('|'), 'g');

  let html = '';
  let cursor = 0;
  let match = pattern.exec(code);

  while (match !== null) {
    if (match[0].length === 0) {
      // No rule can match empty today, but an unterminated token must never
      // be able to wedge the scanner on one index.
      pattern.lastIndex += 1;
      match = pattern.exec(code);
      continue;
    }

    html += escapeHtml(code.slice(cursor, match.index));
    html += `<span class="${resolveClassName(match, rules)}">${escapeHtml(match[0])}</span>`;
    cursor = match.index + match[0].length;
    match = pattern.exec(code);
  }

  return html + escapeHtml(code.slice(cursor));
}
