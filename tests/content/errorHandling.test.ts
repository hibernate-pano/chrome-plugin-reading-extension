/**
 * Unit tests for the error handling module.
 *
 * `errorHandling.ts` had no coverage at all. It is the user-facing error
 * surface of the extension: every toast it raises is the only feedback a user
 * gets when extraction, storage or rendering fails, and `ErrorBoundary` is what
 * keeps a React render crash from taking the whole page down.
 *
 * Timers are faked throughout the toast tests because the removal sequence is
 * two nested `setTimeout` calls (see the timing block below).
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import {
  ERROR_MESSAGES,
  getErrorMessage,
  showToast,
  handleError,
  ErrorBoundary,
  ErrorFallback,
  type ErrorContext,
} from '../../src/content/errorHandling';

const TOAST_CLASS = 'reader-toast';
const STYLE_ID = 'reader-toast-styles';
const DEFAULT_DURATION = 5000;
/** The exit animation that runs between the duration elapsing and removal. */
const EXIT_ANIMATION_MS = 300;

const ALL_CONTEXTS = Object.keys(ERROR_MESSAGES) as ErrorContext[];

function toasts(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`.${TOAST_CLASS}`));
}

function currentToast(): HTMLElement {
  const all = toasts();
  expect(all).toHaveLength(1);
  return all[0];
}

function styleTagCount(): number {
  return document.querySelectorAll(`#${STYLE_ID}`).length;
}

/** Remove the injected <style> so the "injected once" assertions are local. */
function removeInjectedStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
}

describe('ERROR_MESSAGES', () => {
  it('covers every error context exactly once', () => {
    expect(ALL_CONTEXTS).toEqual([
      'extraction',
      'storage',
      'render',
      'initialization',
      'disable',
      'default',
    ]);
  });

  it('has a non-empty message for every context', () => {
    for (const context of ALL_CONTEXTS) {
      expect(typeof ERROR_MESSAGES[context], context).toBe('string');
      expect(ERROR_MESSAGES[context].length, context).toBeGreaterThan(0);
    }
  });

  it('has a distinct message per context', () => {
    const messages = ALL_CONTEXTS.map((c) => ERROR_MESSAGES[c]);
    expect(new Set(messages).size).toBe(messages.length);
  });
});

describe('getErrorMessage', () => {
  it.each(ALL_CONTEXTS)('returns the mapped message for %s', (context) => {
    expect(getErrorMessage(context)).toBe(ERROR_MESSAGES[context]);
  });

  it('returns every message from the map rather than a re-worded copy', () => {
    for (const context of ALL_CONTEXTS) {
      expect(getErrorMessage(context)).toBe(ERROR_MESSAGES[context]);
    }
  });

  it('falls back to the default message for an unknown context', () => {
    expect(getErrorMessage('network' as ErrorContext)).toBe(ERROR_MESSAGES.default);
    expect(getErrorMessage('' as ErrorContext)).toBe(ERROR_MESSAGES.default);
    expect(getErrorMessage(undefined as unknown as ErrorContext)).toBe(ERROR_MESSAGES.default);
    expect(getErrorMessage(null as unknown as ErrorContext)).toBe(ERROR_MESSAGES.default);
  });

  it('does not leak an inherited Object property for a prototype name', () => {
    // Regression: the fallback used to be
    // `ERROR_MESSAGES[context] ?? ERROR_MESSAGES.default`, and `??` only covers
    // null/undefined. `'toString'` and `'constructor'` are inherited from
    // Object.prototype, so they resolved to a *function* which was then assigned
    // to `toast.textContent`, rendering "function toString() { [native code] }".
    // `Object.hasOwn` closes the hole.
    expect(getErrorMessage('toString' as ErrorContext)).toBe(ERROR_MESSAGES.default);
    expect(getErrorMessage('hasOwnProperty' as ErrorContext)).toBe(ERROR_MESSAGES.default);
    expect(getErrorMessage('constructor' as ErrorContext)).toBe(ERROR_MESSAGES.default);
    expect(getErrorMessage('valueOf' as ErrorContext)).toBe(ERROR_MESSAGES.default);

    // Every real context must still resolve to its own message.
    for (const context of Object.keys(ERROR_MESSAGES) as ErrorContext[]) {
      expect(getErrorMessage(context)).toBe(ERROR_MESSAGES[context]);
    }
  });
});

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    removeInjectedStyles();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
    removeInjectedStyles();
    vi.restoreAllMocks();
  });

  it('appends an element with role="alert"', () => {
    showToast({ type: 'error', message: '出错了' });

    const toast = currentToast();
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.textContent).toBe('出错了');
  });

  it('is discoverable by the role query a screen reader uses', () => {
    showToast({ type: 'info', message: '提示' });
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
  });

  it.each(['error', 'warning', 'info', 'success'] as const)('uses the %s modifier class', (type) => {
    showToast({ type, message: 'msg' });

    const toast = currentToast();
    expect(toast.className).toBe(`reader-toast reader-toast--${type}`);
    expect(toast.classList.contains('reader-toast--error')).toBe(type === 'error');
  });

  it('colors errors differently from the other types', () => {
    showToast({ type: 'error', message: 'e' });
    showToast({ type: 'success', message: 's' });

    const [errorToast, successToast] = toasts();
    expect(errorToast.style.backgroundColor).not.toBe(successToast.style.backgroundColor);
    expect(errorToast.style.backgroundColor).toBe('rgb(254, 226, 226)');
  });

  it('appends multiple toasts side by side', () => {
    showToast({ type: 'info', message: 'one' });
    showToast({ type: 'info', message: 'two' });

    expect(toasts()).toHaveLength(2);
    expect(toasts().map((t) => t.textContent)).toEqual(['one', 'two']);
  });

  it('keeps the toast mounted for the full duration', () => {
    showToast({ type: 'info', message: 'sticky' });

    vi.advanceTimersByTime(DEFAULT_DURATION - 1);
    expect(currentToast()).toBeDefined();
    expect(currentToast().style.animation).toBe('reader-toast-in 0.3s ease-out');
  });

  it('switches to the exit animation when the duration elapses', () => {
    // The toast is deliberately still in the DOM at this point: the module
    // nests a second setTimeout(300) so the exit animation can finish.
    showToast({ type: 'info', message: 'leaving' });

    vi.advanceTimersByTime(DEFAULT_DURATION);
    expect(currentToast()).toBeDefined();
    expect(currentToast().style.animation).toBe('reader-toast-out 0.3s ease-in forwards');
  });

  it('removes itself duration + 300ms, not duration', () => {
    showToast({ type: 'info', message: 'leaving' });

    vi.advanceTimersByTime(DEFAULT_DURATION + EXIT_ANIMATION_MS - 1);
    expect(toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toasts()).toHaveLength(0);
  });

  it('removes itself at exactly duration + 300ms on the fake clock', () => {
    const order: string[] = [];
    vi.spyOn(HTMLElement.prototype, 'remove').mockImplementation(function (this: HTMLElement) {
      order.push('removed');
      return Element.prototype.remove.call(this);
    });

    showToast({ type: 'info', message: 'leaving' });
    expect(order).toEqual([]);

    vi.advanceTimersByTime(DEFAULT_DURATION);
    expect(order).toEqual([]);

    vi.advanceTimersByTime(EXIT_ANIMATION_MS);
    expect(order).toEqual(['removed']);
  });

  it('honours a custom duration', () => {
    showToast({ type: 'info', message: 'quick', duration: 100 });

    vi.advanceTimersByTime(100 + EXIT_ANIMATION_MS - 1);
    expect(toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toasts()).toHaveLength(0);
  });

  it('removes each toast on its own schedule', () => {
    showToast({ type: 'info', message: 'short', duration: 100 });
    showToast({ type: 'info', message: 'long', duration: 1000 });

    vi.advanceTimersByTime(100 + EXIT_ANIMATION_MS);
    expect(toasts().map((t) => t.textContent)).toEqual(['long']);

    vi.advanceTimersByTime(1000 - 100);
    expect(toasts()).toHaveLength(0);
  });

  it('renders the message as text, never as markup', () => {
    showToast({ type: 'error', message: '<img src=x onerror=alert(1)>' });

    const toast = currentToast();
    expect(toast.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(toast.querySelector('img')).toBeNull();
  });
});

describe('showToast — style injection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    removeInjectedStyles();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
    removeInjectedStyles();
    vi.restoreAllMocks();
  });

  it('injects the keyframes into <head> once', () => {
    showToast({ type: 'error', message: 'a' });

    const style = document.getElementById(STYLE_ID);
    expect(style).not.toBeNull();
    expect(style!.tagName).toBe('STYLE');
    expect(style!.parentElement).toBe(document.head);
    expect(style!.textContent).toContain('@keyframes reader-toast-in');
    expect(style!.textContent).toContain('@keyframes reader-toast-out');
  });

  it('injects exactly once across many toasts, not once per toast', () => {
    for (let i = 0; i < 25; i++) {
      showToast({ type: 'info', message: `toast ${i}` });
    }

    expect(toasts()).toHaveLength(25);
    expect(styleTagCount()).toBe(1);
  });

  it('does not re-inject after a toast has been removed', () => {
    showToast({ type: 'info', message: 'first', duration: 10 });
    vi.advanceTimersByTime(10 + EXIT_ANIMATION_MS);
    expect(toasts()).toHaveLength(0);

    showToast({ type: 'info', message: 'second', duration: 10 });
    expect(styleTagCount()).toBe(1);
    expect(toasts()).toHaveLength(1);
  });

  it('starts out with no style element of its own', () => {
    expect(styleTagCount()).toBe(0);
  });
});

describe('handleError', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    removeInjectedStyles();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
    removeInjectedStyles();
    vi.restoreAllMocks();
  });

  it('logs with the [Reader] prefix and the context', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError(new Error('boom'), 'extraction');

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('[Reader] extraction:', expect.any(Error));
    expect((error.mock.calls[0][1] as Error).message).toBe('boom');
  });

  it('shows a toast with the context-specific message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError(new Error('boom'), 'storage');

    const toast = currentToast();
    expect(toast.textContent).toBe(ERROR_MESSAGES.storage);
    expect(toast.classList.contains('reader-toast--error')).toBe(true);
  });

  it('defaults to the default context', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError(new Error('boom'));

    expect(error).toHaveBeenCalledWith('[Reader] default:', expect.any(Error));
    expect(currentToast().textContent).toBe(ERROR_MESSAGES.default);
  });

  it('logs the Error itself so the stack survives', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError(new TypeError('x is not a function'), 'render');

    // The stack is the only thing that locates a content-script crash, so
    // the error object must reach the console rather than just its message.
    expect(error).toHaveBeenCalledWith('[Reader] render:', expect.any(TypeError));
    expect((error.mock.calls[0][1] as Error).message).toBe('x is not a function');
  });

  it('stringifies a non-Error value', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError('a string failure', 'extraction');
    // A non-Error has no stack to preserve, so the raw value is logged as-is.
    expect(error).toHaveBeenLastCalledWith('[Reader] extraction:', 'a string failure');

    handleError({ code: 500 }, 'storage');
    expect(error).toHaveBeenLastCalledWith('[Reader] storage:', { code: 500 });
    handleError(undefined, 'disable');
    expect(error).toHaveBeenLastCalledWith('[Reader] disable:', undefined);
  });

  it('does not throw for any thrown value', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    for (const thrown of [new Error('e'), 'str', 42, null, undefined, { a: 1 }]) {
      expect(() => handleError(thrown, 'render')).not.toThrow();
    }
    expect(toasts()).toHaveLength(6);
  });

  it('shows one toast per call', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError(new Error('one'), 'render');
    handleError(new Error('two'), 'render');

    expect(toasts()).toHaveLength(2);
    expect(toasts().map((t) => t.textContent)).toEqual([
      ERROR_MESSAGES.render,
      ERROR_MESSAGES.render,
    ]);
  });
});

describe('ErrorFallback', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the error message', () => {
    render(React.createElement(ErrorFallback, { error: new Error('渲染失败了') }));

    expect(screen.getByText('渲染失败了')).toBeDefined();
  });

  it('renders a fixed heading alongside the message', () => {
    const { container } = render(
      React.createElement(ErrorFallback, { error: new Error('nope') })
    );

    expect(screen.getByText('出现了一些问题')).toBeDefined();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('falls back to the generic render message when there is no error', () => {
    render(React.createElement(ErrorFallback, { error: null }));

    expect(screen.getByText(ERROR_MESSAGES.render)).toBeDefined();
  });

  it('falls back to the generic render message for an error with an empty message', () => {
    render(React.createElement(ErrorFallback, { error: new Error('') }));

    expect(screen.getByText(ERROR_MESSAGES.render)).toBeDefined();
  });

  it('hides the retry button when onRetry is not passed', () => {
    render(React.createElement(ErrorFallback, { error: new Error('boom') }));

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('重试')).toBeNull();
  });

  it('shows the retry button when onRetry is passed', () => {
    render(React.createElement(ErrorFallback, { error: new Error('boom'), onRetry: () => {} }));

    expect(screen.getByRole('button', { name: '重试' })).toBeDefined();
  });

  it('calls onRetry when the button is clicked', () => {
    const onRetry = vi.fn();
    render(React.createElement(ErrorFallback, { error: new Error('boom'), onRetry }));

    fireEvent.click(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not call onRetry on hover', () => {
    const onRetry = vi.fn();
    render(React.createElement(ErrorFallback, { error: new Error('boom'), onRetry }));

    const button = screen.getByRole('button', { name: '重试' });
    fireEvent.mouseOver(button);
    fireEvent.mouseOut(button);

    expect(onRetry).not.toHaveBeenCalled();
  });
});

/** A child that throws until `shouldThrow` is flipped off by the test. */
let shouldThrow = true;
function Boom(): React.ReactElement {
  if (shouldThrow) {
    throw new Error('child exploded');
  }
  return React.createElement('p', null, 'children recovered');
}

/**
 * jsdom re-reports any exception that escapes to its own error reporter, which
 * is noisy but not a failure: React has already caught the error and handed it
 * to the boundary. Preventing the default action of the window `error` event
 * stops that second report without hiding anything we assert on.
 */
function silenceJsdomErrorReports(): () => void {
  const swallow = (event: Event) => event.preventDefault();
  window.addEventListener('error', swallow);
  return () => window.removeEventListener('error', swallow);
}

describe('ErrorBoundary', () => {
  let restoreErrorReporting = () => {};

  beforeEach(() => {
    shouldThrow = true;
    restoreErrorReporting = silenceJsdomErrorReports();
  });

  afterEach(() => {
    restoreErrorReporting();
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders its children when nothing throws', () => {
    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement('p', null, 'all good')
      )
    );

    expect(screen.getByText('all good')).toBeDefined();
    expect(screen.queryByText('出现了一些问题')).toBeNull();
  });

  it('renders several healthy children', () => {
    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement('p', null, 'first'),
        React.createElement('span', null, 'second')
      )
    );

    expect(screen.getByText('first')).toBeDefined();
    expect(screen.getByText('second')).toBeDefined();
  });

  it('renders the fallback instead of the children when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(Boom)
      )
    );

    expect(screen.getByText('出现了一些问题')).toBeDefined();
    expect(screen.getByText('child exploded')).toBeDefined();
    expect(screen.queryByText('children recovered')).toBeNull();
  });

  it('offers a retry button in the fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(React.createElement(ErrorBoundary, null, React.createElement(Boom)));

    expect(screen.getByRole('button', { name: '重试' })).toBeDefined();
  });

  it('logs the caught error with the [Reader] prefix', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(React.createElement(ErrorBoundary, null, React.createElement(Boom)));

    expect(error).toHaveBeenCalledWith(
      '[Reader] React error boundary caught error:',
      expect.any(Error),
      expect.anything()
    );
  });

  it('invokes onError with the error and the error info', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();

    render(
      React.createElement(ErrorBoundary, { onError }, React.createElement(Boom))
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [error, errorInfo] = onError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('child exploded');
    expect(errorInfo).toHaveProperty('componentStack');
  });

  it('does not call onError while the tree is healthy', () => {
    const onError = vi.fn();

    render(React.createElement(ErrorBoundary, { onError }, React.createElement('p', null, 'ok')));

    expect(onError).not.toHaveBeenCalled();
  });

  it('survives without onError or onRetry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(React.createElement(ErrorBoundary, null, React.createElement(Boom)))
    ).not.toThrow();
    expect(screen.getByRole('button', { name: '重试' })).toBeDefined();
  });

  it('calls onRetry when the retry button is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRetry = vi.fn();

    render(
      React.createElement(ErrorBoundary, { onRetry }, React.createElement(Boom))
    );

    fireEvent.click(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('resets hasError on retry and renders the children again', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRetry = vi.fn(() => {
      shouldThrow = false;
    });

    render(React.createElement(ErrorBoundary, { onRetry }, React.createElement(Boom)));
    expect(screen.getByText('出现了一些问题')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: '重试' }));

    expect(screen.getByText('children recovered')).toBeDefined();
    expect(screen.queryByText('出现了一些问题')).toBeNull();
  });

  it('keeps showing the fallback when the child throws again after a retry', () => {
    // A reset that did not actually fix anything must not loop: the boundary
    // only re-renders the children, and the second failure lands back in the
    // fallback with onError called twice.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    const onRetry = vi.fn();

    render(
      React.createElement(
        ErrorBoundary,
        { onError, onRetry },
        React.createElement(Boom)
      )
    );
    expect(onError).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '重试' }));
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(screen.getByText('child exploded')).toBeDefined();
  });

  it('re-renders the latest children while it has never errored', () => {
    const { rerender } = render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement('p', null, 'first child')
      )
    );
    expect(screen.getByText('first child')).toBeDefined();

    rerender(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement('p', null, 'second child')
      )
    );

    expect(screen.getByText('second child')).toBeDefined();
    expect(screen.queryByText('first child')).toBeNull();
  });

  it('getDerivedStateFromError produces the error state', () => {
    const state = ErrorBoundary.getDerivedStateFromError(new Error('derived'));

    expect(state).toEqual({ hasError: true, error: expect.any(Error) });
    expect((state.error as Error).message).toBe('derived');
  });
});
