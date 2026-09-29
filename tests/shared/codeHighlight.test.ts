import { describe, it, expect } from 'vitest';
import {
  highlightCode,
  detectLanguage,
  normalizeLanguage,
  getTokenPatterns,
} from '../../src/shared/codeHighlight';

/* ------------------------------------------------------------------ *
 * Helpers — every assertion runs against the same path the callers use:
 * the returned string is assigned to an element's innerHTML.
 * ------------------------------------------------------------------ */

const TOKEN_CLASSES = [
  'token-comment',
  'token-string',
  'token-number',
  'token-keyword',
  'token-function',
];

/** Mount the highlighted HTML exactly as CodeBlock / buildDocument do. */
function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

/** Text of every span of one token class, in document order. */
function textsOfClass(html: string, className: string): string[] {
  return Array.from(mount(html).querySelectorAll(`span.${className}`)).map(
    (el) => el.textContent ?? ''
  );
}

/**
 * Number of token spans of one class, counted in the DOM rather than in
 * the raw string — the source itself may contain the text
 * `class="token-…"`, and counting that would be meaningless.
 */
function countOf(html: string, className: string): number {
  return mount(html).querySelectorAll(`span.${className}`).length;
}

/**
 * The invariant that the multi-pass implementation broke:
 * the produced markup must be well formed, must contain nothing but
 * token spans, and must render back to exactly the input source.
 */
function assertWellFormed(html: string, code: string): void {
  const opened = (html.match(/<span\b/g) ?? []).length;
  const closed = (html.match(/<\/span>/g) ?? []).length;
  expect(opened, 'every opened span is closed').toBe(closed);
  expect(html).not.toMatch(/<span\s+</);

  const host = mount(html);
  expect(host.textContent).toBe(code);

  for (const el of Array.from(host.querySelectorAll('*'))) {
    expect(el.tagName).toBe('SPAN');
    expect(TOKEN_CLASSES).toContain(el.getAttribute('class'));
    // Only our own class attribute — nothing smuggled in from the source.
    expect(el.attributes.length).toBe(1);
  }
}

/* ------------------------------------------------------------------ *
 * The reported bug
 * ------------------------------------------------------------------ */

describe('highlightCode — markup is never re-scanned', () => {
  it('does not re-highlight the class attribute it emitted itself', () => {
    // The exact reported repro. Pass 1 wrapped the comment in
    // `<span class="token-comment">`, then the string rule matched the
    // `"token-comment"` text inside that span and wrapped the `class`
    // attribute name, yielding `<span <span class=…>`.
    const code = '// say "hi" now\nconst x = 1;';
    const html = highlightCode(code, 'javascript');

    expect(html).toBe(
      '<span class="token-comment">// say "hi" now</span>\n' +
        '<span class="token-keyword">const</span> x = <span class="token-number">1</span>;'
    );
    expect(html).not.toMatch(/<span\s+</);
    expect(html).toContain('<span class="token-comment">// say "hi" now</span>');
    expect(mount(html).textContent).toBe(code);
  });

  it('keeps a block comment intact when it holds quotes and a class name', () => {
    const code = '/* keep <span class="token-string">literal</span> */ const s = 1;';
    const html = highlightCode(code, 'javascript');

    assertWellFormed(html, code);
    expect(textsOfClass(html, 'token-comment')).toEqual([
      '/* keep <span class="token-string">literal</span> */',
    ]);
    expect(countOf(html, 'token-string')).toBe(0);
  });

  it('does not nest a span inside the span it just emitted', () => {
    const code = '<span class="token-comment">already highlighted</span>';
    assertWellFormed(highlightCode(code, 'javascript'), code);
  });

  it('preserves source text exactly across every language', () => {
    const samples = [
      '// comment\nconst x = "s"; /* b */ foo(1, 2.5);',
      'def main():\n    print("hi")  # note\n    return None',
      "SELECT id, name FROM users WHERE age > 21 ORDER BY name;",
      '#include <stdio.h>\nint main(void) { printf("%d\\n", 42); return 0; }',
      "const html = '<span class=\"token-comment\">x</span>';",
      'const a = "unterminated',
      '/* one */ const a = 1; /* two */',
      'console.log(`hello ${name}`);',
      'let re = /ab+c/g; // regex-ish',
      'a < b && c > d',
      '',
      'plain prose, no code at all',
    ];
    const languages = [
      'javascript',
      'typescript',
      'python',
      'java',
      'cpp',
      'c',
      'go',
      'rust',
      'sql',
      'bash',
      'json',
      'yaml',
      'markdown',
      'html',
      'css',
      'plaintext',
      '',
    ];

    for (const language of languages) {
      for (const code of samples) {
        assertWellFormed(highlightCode(code, language), code);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * Rule priority
 * ------------------------------------------------------------------ */

describe('highlightCode — rule priority', () => {
  it('gives a comment everything inside it', () => {
    const code = '// return 42 "x" foo(1)';
    const html = highlightCode(code, 'javascript');

    assertWellFormed(html, code);
    // One token, and it is a comment: nothing inside was re-classified.
    expect((html.match(/<span\b/g) ?? []).length).toBe(1);
    expect(textsOfClass(html, 'token-comment')).toEqual([code]);
    expect(countOf(html, 'token-keyword')).toBe(0);
    expect(countOf(html, 'token-number')).toBe(0);
  });

  it('gives a string everything inside it', () => {
    const code = 'const s = "return 42 foo()";';
    const html = highlightCode(code, 'javascript');

    assertWellFormed(html, code);
    expect(textsOfClass(html, 'token-string')).toEqual(['"return 42 foo()"']);
    // `const` is the only keyword; nothing inside the string was re-classified.
    expect(textsOfClass(html, 'token-keyword')).toEqual(['const']);
    expect(countOf(html, 'token-number')).toBe(0);
    expect(countOf(html, 'token-function')).toBe(0);
  });

  it('does not read a comment marker inside a string as a comment', () => {
    const code = "const u = 'https://example.com/a/*b*/'; // go";
    const html = highlightCode(code, 'javascript');

    assertWellFormed(html, code);
    expect(textsOfClass(html, 'token-string')).toEqual(["'https://example.com/a/*b*/'"]);
    expect(textsOfClass(html, 'token-comment')).toEqual(['// go']);
  });

  it('splits two separate block comments instead of merging them', () => {
    const html = highlightCode('/* one */ const a = 1; /* two */', 'javascript');
    expect(textsOfClass(html, 'token-comment')).toEqual(['/* one */', '/* two */']);
  });

  it('classifies a keyword that is followed by a paren as a keyword', () => {
    const html = highlightCode('if (x) { return y; }', 'javascript');
    expect(textsOfClass(html, 'token-keyword')).toEqual(['if', 'return']);
    expect(textsOfClass(html, 'token-function')).toEqual([]);
  });

  it('classifies a call as a function and a bare literal as a number', () => {
    const html = highlightCode('doThing(1); let n = 2.5;', 'javascript');
    expect(textsOfClass(html, 'token-function')).toEqual(['doThing']);
    expect(textsOfClass(html, 'token-number')).toEqual(['1', '2.5']);
  });

  it('keeps the space and paren outside the function span', () => {
    expect(highlightCode('foo (bar)', 'javascript')).toBe(
      '<span class="token-function">foo</span> (bar)'
    );
  });

  it('highlights multi-byte and unterminated tokens without breaking markup', () => {
    const unterminated = 'const s = "never closed';
    assertWellFormed(highlightCode(unterminated, 'javascript'), unterminated);
    const unterminatedBlock = '/* never closed';
    assertWellFormed(highlightCode(unterminatedBlock, 'javascript'), unterminatedBlock);
  });
});

/* ------------------------------------------------------------------ *
 * Escaping / injection
 * ------------------------------------------------------------------ */

describe('highlightCode — escaping and injection', () => {
  it('escapes a script tag instead of emitting it', () => {
    const code = '<script>alert(1)</script>';
    const html = highlightCode(code, 'javascript');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(mount(html).querySelector('script')).toBeNull();
    assertWellFormed(html, code);
  });

  it('escapes an attribute break-out payload', () => {
    const code = '"><img src=x onerror=1>';
    const html = highlightCode(code, 'javascript');

    expect(html).not.toMatch(/<img/i);
    const host = mount(html);
    expect(host.querySelector('img')).toBeNull();
    // The only element that survives is the `1` literal, as a token span.
    expect(Array.from(host.children).map((el) => el.outerHTML)).toEqual([
      '<span class="token-number">1</span>',
    ]);
    expect(host.textContent).toBe(code);
    assertWellFormed(html, code);
  });

  it('escapes markup that hides inside a string token', () => {
    const code = 'const s = "<img src=x onerror=alert(1)>";';
    const html = highlightCode(code, 'javascript');

    expect(html).not.toMatch(/<img/i);
    expect(html).toContain('&lt;img');
    const host = mount(html);
    expect(host.querySelector('img')).toBeNull();
    // The payload stays inside its string token and is not re-classified.
    expect(textsOfClass(html, 'token-string')).toEqual([
      '"<img src=x onerror=alert(1)>"',
    ]);
    expect(host.textContent).toBe(code);
  });

  it('escapes an ampersand and angle brackets in source text', () => {
    expect(highlightCode('a & b < c > d', 'plaintext')).toBe('a &amp; b &lt; c &gt; d');
  });

  it('never leaks a live attribute, whatever the source', () => {
    const payloads = [
      `<img src=x onerror=alert(1)>`,
      `"><svg/onload=alert(1)>`,
      `<a href="javascript:alert(1)">x</a>`,
      `<!-- <script>alert(1)</script> -->`,
      `<div class="token-comment">injected</div>`,
    ];
    for (const code of payloads) {
      const html = highlightCode(code, 'javascript');
      const host = mount(html);
      // Every element the payload managed to create is a token span of
      // ours, carrying nothing but a class.
      for (const el of Array.from(host.querySelectorAll('*'))) {
        expect(el.tagName).toBe('SPAN');
        expect(Array.from(el.attributes).map((a) => a.name)).toEqual(['class']);
        expect(TOKEN_CLASSES).toContain(el.getAttribute('class'));
      }
      expect(host.textContent).toBe(code);
      assertWellFormed(html, code);
    }
  });

  it('returns an empty string for empty input', () => {
    expect(highlightCode('', 'javascript')).toBe('');
  });
});

/* ------------------------------------------------------------------ *
 * Keyword boundaries
 * ------------------------------------------------------------------ */

describe('keyword matching does not fire inside identifiers', () => {
  function keywordPattern(language: string): RegExp {
    const entry = getTokenPatterns(language).find((p) => p.className === 'token-keyword');
    expect(entry, `${language} has a keyword pattern`).toBeDefined();
    return entry!.pattern;
  }

  it('leaves a JavaScript identifier that merely contains a keyword alone', () => {
    const code = 'const constant = nullable;';
    const html = highlightCode(code, 'javascript');

    expect(textsOfClass(html, 'token-keyword')).toEqual(['const']);
    expect(html).toContain(' constant = nullable;');
  });

  it('rejects keyword prefixes and suffixes when matched directly', () => {
    const pattern = keywordPattern('javascript');
    for (const identifier of [
      'constant',
      'nullable',
      'a_constant',
      'constructor',
      'format',
      'undefinedValue',
      'nullish',
    ]) {
      pattern.lastIndex = 0;
      expect(identifier.match(pattern), identifier).toBeNull();
    }
    for (const keyword of ['const', 'null', 'undefined', 'instanceof', 'typeof']) {
      pattern.lastIndex = 0;
      expect(keyword.match(pattern), keyword).not.toBeNull();
    }
  });

  it('rejects capitalized SQL keywords inside longer identifiers', () => {
    const pattern = keywordPattern('sql');
    for (const identifier of ['NULLABLE', 'SELECTED', 'CREATED_AT', 'ORDERING']) {
      pattern.lastIndex = 0;
      expect(identifier.match(pattern), identifier).toBeNull();
    }
    const html = highlightCode('SELECT id FROM users WHERE x IS NULL;', 'sql');
    expect(textsOfClass(html, 'token-keyword')).toEqual([
      'SELECT',
      'FROM',
      'WHERE',
      'NULL',
    ]);
  });

  it('matches the capitalized Python keywords but not their extensions', () => {
    const pattern = keywordPattern('python');
    for (const keyword of ['True', 'False', 'None']) {
      pattern.lastIndex = 0;
      expect(keyword.match(pattern), keyword).not.toBeNull();
    }
    for (const identifier of ['Trueish', 'Nonetheless', 'Falsey', 'island', 'android']) {
      pattern.lastIndex = 0;
      expect(identifier.match(pattern), identifier).toBeNull();
    }
  });

  it('highlights the Python capitalized keywords in real code', () => {
    const html = highlightCode('if True:\n    return None', 'python');
    expect(textsOfClass(html, 'token-keyword')).toEqual(['if', 'True', 'return', 'None']);
  });
});

/* ------------------------------------------------------------------ *
 * Per-language comment syntax
 * ------------------------------------------------------------------ */

const HASH_COMMENT_LANGUAGES = ['python', 'r', 'yaml', 'bash', 'ruby', 'perl'];
const NO_HASH_COMMENT_LANGUAGES = [
  'javascript',
  'typescript',
  'java',
  'c',
  'cpp',
  'go',
  'rust',
  'sql',
  'css',
  'html',
  'json',
  'markdown',
  'plaintext',
];

/** Patterns whose source mentions `#` — the only way a language opts in. */
function hashCommentPatterns(language: string) {
  return getTokenPatterns(language).filter((p) => p.pattern.source.includes('#'));
}

describe('per-language comment syntax', () => {
  it('makes a Python hash comment atomic', () => {
    // The hash comment used to be invisible to the tokenizer, so the
    // string inside it was picked out as a string of its own.
    const code = 'def f(x):\n    # note: "q"\n    return x';
    const html = highlightCode(code, 'python');

    expect(html).toBe(
      '<span class="token-keyword">def</span> <span class="token-function">f</span>(x):\n' +
        '    <span class="token-comment"># note: "q"</span>\n' +
        '    <span class="token-keyword">return</span> x'
    );
    expect(countOf(html, 'token-string')).toBe(0);
    assertWellFormed(html, code);
  });

  it('keeps a hash inside a Python string a string', () => {
    // The quote sits at an earlier index than the hash, so the leftmost
    // match — the string — wins and consumes the `#` with it.
    const code = 's = "# not a comment"';
    const html = highlightCode(code, 'python');

    expect(textsOfClass(html, 'token-string')).toEqual(['"# not a comment"']);
    expect(countOf(html, 'token-comment')).toBe(0);
    assertWellFormed(html, code);
  });

  it('leaves shell variable interpolation alone', () => {
    const interpolated = 'echo "$HOME" # comment';
    const html = highlightCode(interpolated, 'bash');
    expect(textsOfClass(html, 'token-string')).toEqual(['"$HOME"']);
    expect(textsOfClass(html, 'token-comment')).toEqual(['# comment']);
    assertWellFormed(html, interpolated);

    // `${#x}` is a length and `${x#p}` is a strip — neither opens a comment.
    const expansions = 'len=${#arr[@]}\nstrip=${x#pre}';
    expect(highlightCode(expansions, 'bash')).toBe(expansions);

    // An escaped hash is a literal hash.
    expect(highlightCode('echo \\# not a comment', 'bash')).toBe(
      '<span class="token-keyword">echo</span> \\# not a comment'
    );
  });

  it('only opens a YAML comment at a line start or after whitespace', () => {
    // A URL fragment is part of the scalar, not a comment.
    const inline = 'homepage: /docs/page#section  # real comment';
    const html = highlightCode(inline, 'yaml');
    expect(textsOfClass(html, 'token-comment')).toEqual(['# real comment']);
    expect(html).toContain('page#section');
    assertWellFormed(html, inline);

    expect(textsOfClass(highlightCode('# leading comment\nname: demo', 'yaml'), 'token-comment')).toEqual(
      ['# leading comment']
    );
  });

  it('gives every hash-comment language exactly one hash rule', () => {
    for (const language of HASH_COMMENT_LANGUAGES) {
      const hashes = hashCommentPatterns(language);
      expect(hashes.length, language).toBe(1);
      expect(hashes[0].className, language).toBe('token-comment');
    }
    for (const language of HASH_COMMENT_LANGUAGES) {
      const code = 'code() # note';
      expect(textsOfClass(highlightCode(code, language), 'token-comment'), language).toEqual([
        '# note',
      ]);
      assertWellFormed(highlightCode(code, language), code);
    }
  });

  it('gives no hash rule to languages where # means something else', () => {
    for (const language of NO_HASH_COMMENT_LANGUAGES) {
      expect(hashCommentPatterns(language).length, language).toBe(0);
    }
  });

  it('does not turn a CSS id selector into a comment', () => {
    const code = '#header { color: red; }';
    // Nothing in that snippet is a token for a language with no keyword
    // table, so it must survive byte for byte.
    expect(highlightCode(code, 'css')).toBe(code);
    expect(countOf(highlightCode(code, 'css'), 'token-comment')).toBe(0);
    expect(detectLanguage(code)).toBe('css');
  });

  it('does not turn a private field or a preprocessor directive into a comment', () => {
    const js = highlightCode('class A { #x = 1; }', 'javascript');
    expect(countOf(js, 'token-comment')).toBe(0);
    expect(js).toContain('#x');

    // `#include` is a directive; treating it as a comment would swallow
    // the header name.
    const c = highlightCode('#include <stdio.h>', 'c');
    expect(countOf(c, 'token-comment')).toBe(0);
    expect(c).toContain('&lt;stdio.h&gt;');
  });

  it('exposes the extra comment pattern through getTokenPatterns', () => {
    const commentClasses = (language: string) =>
      getTokenPatterns(language)
        .filter((p) => p.className === 'token-comment')
        .map((p) => p.pattern.source);

    expect(commentClasses('javascript')).toEqual(['(\\/\\/[^\\n]*)', '(\\/\\*[\\s\\S]*?\\*\\/)']);
    expect(commentClasses('css')).toEqual(['(\\/\\/[^\\n]*)', '(\\/\\*[\\s\\S]*?\\*\\/)']);
    expect(commentClasses('python')).toEqual([
      '(\\/\\/[^\\n]*)',
      '(\\/\\*[\\s\\S]*?\\*\\/)',
      '(#[^\\n]*)',
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * getTokenPatterns
 * ------------------------------------------------------------------ */

describe('getTokenPatterns', () => {
  it('returns one global pattern per rule with a known class name', () => {
    const patterns = getTokenPatterns('javascript');
    expect(patterns.length).toBeGreaterThan(0);
    for (const { pattern, className } of patterns) {
      expect(pattern.global).toBe(true);
      expect(TOKEN_CLASSES).toContain(className);
    }
    expect(patterns.map((p) => p.className)).toEqual([
      'token-comment',
      'token-comment',
      'token-string',
      'token-string',
      'token-string',
      'token-number',
      'token-keyword',
      'token-function',
    ]);
  });

  it('omits the keyword rule for a language without a keyword table', () => {
    for (const language of ['plaintext', 'ruby', 'html', 'css', 'json', 'yaml', 'markdown']) {
      const classes = getTokenPatterns(language).map((p) => p.className);
      expect(classes, language).not.toContain('token-keyword');
      expect(classes, language).toContain('token-function');
    }
  });

  it('keeps matching the source text when used on its own', () => {
    const comment = getTokenPatterns('javascript').find((p) => p.className === 'token-comment')!;
    expect('// a\n// b'.match(comment.pattern)).toEqual(['// a', '// b']);
  });
});

/* ------------------------------------------------------------------ *
 * detectLanguage
 * ------------------------------------------------------------------ */

describe('detectLanguage', () => {
  it('returns plaintext for empty or unremarkable input', () => {
    expect(detectLanguage('')).toBe('plaintext');
    expect(detectLanguage('plain prose with no code at all')).toBe('plaintext');
  });

  it('detects the common web languages', () => {
    expect(detectLanguage('const x = 1;')).toBe('javascript');
    expect(detectLanguage("import React from 'react';\nexport default App;")).toBe(
      'javascript'
    );
    expect(
      detectLanguage('interface User {\n  name: string;\n}\nexport const x: number = 1;')
    ).toBe('typescript');
    expect(
      detectLanguage('<!DOCTYPE html>\n<html><head><title>t</title></head><body></body></html>')
    ).toBe('html');
    expect(detectLanguage('.button {\n  color: red;\n}')).toBe('css');
  });

  it('does not read a Python file as JavaScript', () => {
    // `import` is a JavaScript marker AND a Python statement; the old
    // insertion-ordered table checked JavaScript first and always won.
    expect(detectLanguage('import os\nimport sys\n\ndef main():\n    pass')).toBe('python');
    expect(detectLanguage('import os\nprint(os.getcwd())')).toBe('python');
    expect(
      detectLanguage('from collections import OrderedDict\n\nclass Store:\n    pass')
    ).toBe('python');
  });

  it('does not read a JSON document as HTML or JavaScript', () => {
    expect(detectLanguage('{"name": "value", "n": 1}')).toBe('json');
    expect(detectLanguage('[1, 2, 3]')).toBe('json');
    // The old `/<\/?[a-z][\s\S]*>/i` matched the URL inside this string.
    expect(detectLanguage('{"link": "<a href=x>click</a>"}')).toBe('json');
  });

  it('does not read a C++ template as HTML', () => {
    expect(detectLanguage('#include <iostream>\n\nint main() {\n  std::cout << "hi";\n}')).toBe(
      'cpp'
    );
    expect(detectLanguage('std::vector<std::string> names;')).not.toBe('html');
  });

  it('separates the c-like languages', () => {
    expect(detectLanguage('#include <stdio.h>\nint main(void) { return 0; }')).toBe('c');
    expect(detectLanguage('package main\n\nfunc main() {\n\tprintln("hi")\n}')).toBe('go');
    expect(detectLanguage('fn main() {\n    let mut x = 1;\n}')).toBe('rust');
    expect(
      detectLanguage('public class Main {\n  public static void main(String[] a) {}\n}')
    ).toBe('java');
  });

  it('detects the scripting and data languages', () => {
    expect(detectLanguage('SELECT id FROM users WHERE age > 21;')).toBe('sql');
    expect(detectLanguage('#!/bin/bash\necho "hi" | grep x')).toBe('bash');
    expect(detectLanguage('## Heading\n\nSome prose.')).toBe('markdown');
    expect(detectLanguage('name: demo\nversion: 1\n')).toBe('yaml');
  });
});

/* ------------------------------------------------------------------ *
 * normalizeLanguage
 * ------------------------------------------------------------------ */

describe('normalizeLanguage', () => {
  it('resolves the known aliases', () => {
    expect(normalizeLanguage('JS')).toBe('javascript');
    expect(normalizeLanguage('c++')).toBe('cpp');
    expect(normalizeLanguage('yml')).toBe('yaml');
    expect(normalizeLanguage('md')).toBe('markdown');
    expect(normalizeLanguage('  Sh  ')).toBe('bash');
  });

  it('passes unknown identifiers through in lower case', () => {
    expect(normalizeLanguage('Ruby')).toBe('ruby');
    expect(normalizeLanguage('plaintext')).toBe('plaintext');
  });
});
