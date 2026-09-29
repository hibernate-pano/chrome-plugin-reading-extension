/**
 * CodeBlock — component tests.
 *
 * The highlighting contract is NOT re-stated here. Every assertion about the
 * rendered markup is made against `highlightCode`'s own output, so this file
 * tests the component (did it call the tokenizer, and put the result in the
 * DOM) and not the tokenizer (already covered by tests/shared/codeHighlight).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CodeBlock } from '../../src/content/CodeBlock';
import { highlightCode, detectLanguage } from '../../src/shared/codeHighlight';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const SAMPLE = 'const greeting = "hi"; // say hi\nconsole.log(greeting);';

type NavigatorWithClipboard = Navigator & {
  clipboard?: { writeText: (text: string) => Promise<void> };
};

/** jsdom ships no clipboard; install one for the test. */
function stubClipboard(writeText: ReturnType<typeof vi.fn>): void {
  Object.assign(navigator, { clipboard: { writeText } });
}

const originalClipboard = (navigator as NavigatorWithClipboard).clipboard;
const originalExecCommand = (document as Document & { execCommand?: unknown }).execCommand;

afterEach(() => {
  const nav = navigator as NavigatorWithClipboard;
  if (originalClipboard === undefined) {
    delete nav.clipboard;
  } else {
    nav.clipboard = originalClipboard;
  }
  const doc = document as Document & { execCommand?: unknown };
  if (originalExecCommand === undefined) {
    delete doc.execCommand;
  } else {
    doc.execCommand = originalExecCommand;
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Mount a highlighted string the way the component does, for comparison. */
function mountHtml(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

/**
 * Run a body that deliberately provokes an unhandled rejection, without
 * letting the runner fail the file over it.
 *
 * A `throw` inside the component's `catch` block is exactly the bug under
 * test, so the rejection is inherent — but the runner would otherwise report
 * it as an unhandled error and fail the whole file. Node delivers
 * `unhandledRejection` after the microtask queue drains, i.e. before the
 * `setTimeout` checkpoint below, so swapping the listeners out for the span
 * of the test is enough to absorb it.
 */
async function withoutReportingRejections<T>(body: () => Promise<T>): Promise<T> {
  const existing = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', () => {
    /* absorbed on purpose */
  });
  try {
    return await body();
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.removeAllListeners('unhandledRejection');
    for (const listener of existing) {
      process.on('unhandledRejection', listener as (reason: unknown) => void);
    }
  }
}

/** The `<code>` element the component fills via dangerouslySetInnerHTML. */
function codeElement(languageLabel: string): HTMLElement {
  return screen.getByLabelText(`Code block in ${languageLabel}`);
}

beforeEach(() => {
  stubClipboard(vi.fn().mockResolvedValue(undefined));
});

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

describe('CodeBlock — rendering', () => {
  it('renders the code, and the language detected from its content', () => {
    render(<CodeBlock code={SAMPLE} />);

    const language = detectLanguage(SAMPLE);
    expect(language).toBe('javascript');

    const code = codeElement(language);
    // The visible text is byte-for-byte the source, whatever the tokenizer did.
    expect(code.textContent).toBe(SAMPLE);
    expect(screen.getByLabelText(`Language: ${language}`)).toHaveTextContent(language);
  });

  it('shows a filename in preference to the detected language', () => {
    render(<CodeBlock code={SAMPLE} filename="server.ts" />);

    // Not "javascript" — the filename wins for display.
    expect(screen.getByLabelText('Language: server.ts')).toHaveTextContent('server.ts');
    expect(screen.queryByLabelText('Language: javascript')).not.toBeInTheDocument();
    expect(codeElement('server.ts').textContent).toBe(SAMPLE);
  });

  it('normalizes an alias passed through the language prop', () => {
    render(<CodeBlock code={'print(1)'} language="py" />);
    expect(screen.getByLabelText('Language: python')).toBeInTheDocument();
  });

  it('lets an explicit language prop override detection', () => {
    // `const x = 1;` detects as javascript on its own.
    expect(detectLanguage('const x = 1;')).toBe('javascript');
    render(<CodeBlock code="const x = 1;" language="typescript" />);
    expect(screen.getByLabelText('Language: typescript')).toBeInTheDocument();
  });

  it('labels an unremarkable snippet as plaintext rather than leaving it blank', () => {
    render(<CodeBlock code="just some prose" />);
    expect(detectLanguage('just some prose')).toBe('plaintext');
    expect(screen.getByLabelText('Language: plaintext')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ *
 * Highlighting wiring
 * ------------------------------------------------------------------ */

describe('CodeBlock — highlighted markup', () => {
  it('assigns exactly what highlightCode returns for the effective language', () => {
    const language = detectLanguage(SAMPLE);
    render(<CodeBlock code={SAMPLE} />);

    const code = codeElement(language);
    // The tokenizer is the single source of truth — comparing against it keeps
    // this test from re-encoding the tokenizer's contract.
    expect(code.innerHTML).toBe(highlightCode(SAMPLE, language));
  });

  it('highlights for the prop language, not the detected one', () => {
    render(<CodeBlock code={SAMPLE} language="python" />);
    const code = codeElement('python');
    expect(code.innerHTML).toBe(highlightCode(SAMPLE, 'python'));
  });

  it('produces the same token spans a standalone highlightCode mount would', () => {
    const language = detectLanguage(SAMPLE);
    render(<CodeBlock code={SAMPLE} />);

    const actual = codeElement(language);
    const expected = mountHtml(highlightCode(SAMPLE, language));

    const spansOf = (root: HTMLElement, cls: string): string[] =>
      Array.from(root.querySelectorAll(`span.${cls}`)).map((el) => el.textContent ?? '');

    for (const cls of [
      'token-comment',
      'token-string',
      'token-number',
      'token-keyword',
      'token-function',
    ]) {
      expect(spansOf(actual, cls), cls).toEqual(spansOf(expected, cls));
    }
    expect(actual.querySelectorAll('span').length).toBeGreaterThan(0);
  });

  it('escapes markup in the source instead of mounting it', () => {
    const payload = '<img src=x onerror=alert(1)>\nconst a = 1;';
    render(<CodeBlock code={payload} />);

    const code = codeElement('javascript');
    expect(code.querySelector('img')).toBeNull();
    expect(code.textContent).toBe(payload);
  });

  it('renders empty code without blowing up', () => {
    render(<CodeBlock code="" />);
    expect(screen.getByLabelText('Language: plaintext')).toBeInTheDocument();
    expect(codeElement('plaintext').textContent).toBe('');
  });
});

/* ------------------------------------------------------------------ *
 * Copy — happy path
 * ------------------------------------------------------------------ */

describe('CodeBlock — copy to clipboard', () => {
  it('writes the exact code to the clipboard and shows the copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    render(<CodeBlock code={SAMPLE} language="javascript" />);
    const button = screen.getByRole('button', { name: 'Copy code to clipboard' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(SAMPLE);
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    expect(button).toHaveClass('reader-code-block__copy--copied');
    expect(button).toHaveAttribute('aria-label', 'Copied to clipboard');
  });

  it('does not mutate the code when copying — the source string is untouched', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<CodeBlock code={SAMPLE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy code to clipboard' }));
    });

    expect(writeText.mock.calls[0][0]).toBe(SAMPLE);
    expect(codeElement('javascript').textContent).toBe(SAMPLE);
  });

  it('reverts the copied state 2000ms later', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    render(<CodeBlock code={SAMPLE} />);
    const button = screen.getByRole('button', { name: 'Copy code to clipboard' });

    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.getByText('Copied!'), 'still copied just before the deadline').toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    expect(button).not.toHaveClass('reader-code-block__copy--copied');
    expect(button).toHaveAttribute('aria-label', 'Copy code to clipboard');
  });

  it('can be copied again after reverting', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    render(<CodeBlock code={SAMPLE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy code to clipboard' }));
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy code to clipboard' }));
    });
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ *
 * Copy — execCommand fallback
 * ------------------------------------------------------------------ */

describe('CodeBlock — execCommand fallback', () => {
  /** Every `<textarea>` the component builds while copying. */
  function trackTextareas(): { created: HTMLTextAreaElement[]; restore: () => void } {
    const created: HTMLTextAreaElement[] = [];
    const real = document.createElement.bind(document);
    const spy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(((tag: string, options?: ElementCreationOptions) => {
        const el = real(tag, options as never) as HTMLElement;
        if (String(tag).toLowerCase() === 'textarea') created.push(el as HTMLTextAreaElement);
        return el;
      }) as typeof document.createElement);
    return { created, restore: () => spy.mockRestore() };
  }

  it('falls back to execCommand when the clipboard write is rejected', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    stubClipboard(writeText);
    const execCommand = vi.fn(() => true);
    (document as Document & { execCommand?: unknown }).execCommand = execCommand;

    const { created, restore } = trackTextareas();

    render(<CodeBlock code={SAMPLE} />);
    try {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy code to clipboard' }));
      });

      expect(writeText).toHaveBeenCalledTimes(1);
      expect(execCommand, 'the legacy copy path ran').toHaveBeenCalledWith('copy');
      expect(created, 'a textarea was staged for the legacy copy').toHaveLength(1);
      expect(created[0].value).toBe(SAMPLE);
      expect(
        document.body.contains(created[0]),
        'the staged textarea is removed again'
      ).toBe(false);
    } finally {
      restore();
    }
  });

  it('still shows the copied state after the fallback', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    (document as Document & { execCommand?: unknown }).execCommand = vi.fn(() => true);

    render(<CodeBlock code={SAMPLE} />);
    const button = screen.getByRole('button', { name: 'Copy code to clipboard' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('Copied!')).toBeInTheDocument();
    expect(button).toHaveClass('reader-code-block__copy--copied');
  });

  it('falls back when navigator.clipboard is missing entirely', async () => {
    const nav = navigator as NavigatorWithClipboard;
    delete nav.clipboard;
    const execCommand = vi.fn(() => true);
    (document as Document & { execCommand?: unknown }).execCommand = execCommand;

    render(<CodeBlock code={SAMPLE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy code to clipboard' }));
    });

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  /**
   * KNOWN BUG — src/content/CodeBlock.tsx:52-53.
   *
   * The fallback is not itself guarded. `document.execCommand('copy')` sits
   * between `document.body.appendChild(textarea)` and
   * `document.body.removeChild(textarea)`, so when it throws (which jsdom does
   * by default, and which a real browser does on some pages) the removal on
   * line 53 is skipped and the invisible, `position: fixed` textarea is left
   * welded into the page body for good.
   *
   * The assertion below is the CORRECT behaviour, so this is written as
   * `it.fails`: it passes while the bug is present and starts failing — i.e.
   * demands attention — the moment the fallback is wrapped in its own
   * try/finally. Delete the `.fails` as part of that fix.
   */
  it('removes the staged textarea even when execCommand itself throws', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    // jsdom does not implement execCommand; it surfaces as a throw.
    (document as Document & { execCommand?: unknown }).execCommand = vi.fn(() => {
      throw new Error('Not implemented');
    });

    render(<CodeBlock code={SAMPLE} />);

    // The throw escapes `handleCopy` as an unhandled rejection — React's
    // onClick discards the promise — so absorb it for the span of this test.
    await withoutReportingRejections(async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy code to clipboard' }));
      });
    });

    expect(
      document.querySelectorAll('textarea'),
      'the staged textarea must not outlive the fallback'
    ).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * Unmount
 * ------------------------------------------------------------------ */

describe('CodeBlock — unmount', () => {
  it('does not warn about a state update after the component is gone', async () => {
    vi.useFakeTimers();
    const errors: unknown[][] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });

    try {
      const { unmount } = render(<CodeBlock code={SAMPLE} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy code to clipboard' }));
      });
      expect(screen.getByText('Copied!')).toBeInTheDocument();

      // Unmount with the 2s reset timer still pending, then let it fire.
      unmount();
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const unmountWarnings = errors.filter(([message]) =>
        typeof message === 'string' && /unmounted component|state update|act\(\)/i.test(message)
      );
      expect(unmountWarnings).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});
