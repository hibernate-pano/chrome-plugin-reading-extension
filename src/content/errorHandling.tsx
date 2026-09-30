/**
 * Error Handling Module
 * User-facing failure surfaces: a snackbar for anything recoverable, and a
 * centred empty state for the one failure that leaves nothing to read.
 */

import { Component, type ReactNode, type ErrorInfo, type JSX } from 'react';
import { ErrorIcon, ICON_PATHS, RefreshIcon } from './icons';

// Injected into the *page's* document, because that is where the toast lives.
// See host.css for why it cannot come from the shadow root's stylesheet.
import hostCSS from './host.css?inline';

/** Id of the injected toast stylesheet. */
const TOAST_STYLE_ID = 'reader-toast-styles';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Error context types for categorizing errors
 */
export type ErrorContext =
  | 'extraction'
  | 'storage'
  | 'render'
  | 'initialization'
  | 'disable'
  | 'default';

/**
 * User-friendly error messages mapped by context
 */
export const ERROR_MESSAGES: Record<ErrorContext, string> = {
  extraction: '无法提取页面内容，请尝试其他页面',
  storage: '保存设置失败，请重试',
  render: '显示内容时出现问题',
  initialization: '初始化失败，请刷新页面重试',
  disable: '关闭阅读模式时出现问题',
  default: '发生意外错误',
};

/**
 * Toast notification type
 */
interface ToastOptions {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  duration?: number;
}

/**
 * Get user-friendly error message for a given context
 */
export function getErrorMessage(context: ErrorContext): string {
  // `??` is not enough: an inherited key such as 'toString' resolves to a
  // function off Object.prototype, which would be rendered as the message.
  return Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, context)
    ? ERROR_MESSAGES[context]
    : ERROR_MESSAGES.default;
}

/** The glyph that tells four otherwise identical snackbars apart. */
const TOAST_ICONS: Record<ToastOptions['type'], keyof typeof ICON_PATHS | null> = {
  error: 'error',
  warning: 'error',
  success: 'check',
  info: null,
};

/**
 * Build a Material glyph with the DOM API.
 *
 * The toast is not React — it is appended to the host page's body and removed
 * on a timer — so it cannot be rendered as an element tree. Drawing it from
 * `ICON_PATHS` keeps one copy of the path data in the project.
 */
function createIconNode(name: keyof typeof ICON_PATHS, size = 20): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICON_PATHS[name]);
  svg.appendChild(path);
  return svg;
}

/**
 * Inject the toast stylesheet exactly once.
 *
 * Guarded on the element id: several failures can land in the same tick, and
 * each one would otherwise append another copy of the same rules.
 */
function injectToastStyles(): void {
  if (document.getElementById(TOAST_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TOAST_STYLE_ID;
  style.textContent = hostCSS;
  document.head.appendChild(style);
}

/**
 * Show a toast notification to the user
 *
 * The message is set as `textContent` on its own element, never as markup: it
 * can carry anything a failing layer put into an Error, and an error string
 * containing markup must not become live DOM on someone else's page.
 */
export function showToast(options: ToastOptions): void {
  const { type, message, duration = 5000 } = options;

  const toast = document.createElement('div');
  toast.className = `reader-toast reader-toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  const iconName = TOAST_ICONS[type];
  if (iconName) {
    const iconSlot = document.createElement('span');
    iconSlot.className = 'reader-toast__icon';
    iconSlot.setAttribute('aria-hidden', 'true');
    iconSlot.appendChild(createIconNode(iconName));
    toast.appendChild(iconSlot);
  }

  const text = document.createElement('span');
  text.className = 'reader-toast__message';
  text.textContent = message;
  toast.appendChild(text);

  injectToastStyles();

  toast.style.animation = 'reader-toast-in 0.3s ease-out';
  document.body.appendChild(toast);

  // Remove after duration
  setTimeout(() => {
    toast.style.animation = 'reader-toast-out 0.3s ease-in forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

/**
 * Handle an error with logging and user notification
 */
export function handleError(error: unknown, context: ErrorContext = 'default'): void {
  // Log to console for debugging. Pass the error itself, not just its
  // message — the stack is the only thing that locates the failure, and the
  // toast below is a fixed localized string regardless of the error.
  console.error(`[Reader] ${context}:`, error);

  // Show user-friendly toast notification
  showToast({
    type: 'error',
    message: getErrorMessage(context),
    duration: 5000,
  });
}

/**
 * ErrorBoundary Props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Called when the user retries. May be async — a retry re-runs the work that
   * failed, which in this extension means re-extracting the article — so its
   * promise is absorbed here rather than discarded. The reporter that produced
   * the rejection owns the user-facing message.
   */
  onRetry?: () => void | Promise<void>;
}

/**
 * ErrorBoundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary Component
 * Catches errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Reader] React error boundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    // `Promise.resolve` normalizes the sync/async callback. Dropping the promise
    // instead would turn a failure the caller already reported into an
    // unhandled rejection.
    void Promise.resolve(this.props.onRetry?.()).catch(() => {});
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

/**
 * ErrorFallback Props
 */
interface ErrorFallbackProps {
  error: Error | null;
  onRetry?: () => void;
}

/**
 * Error Fallback Component
 * Displayed when an error is caught by the ErrorBoundary
 *
 * This is the only state with no article behind it, so it is laid out as a
 * centred empty state rather than an error page: one mark, one sentence about
 * what happened, one way forward.
 */
export function ErrorFallback({ error, onRetry }: ErrorFallbackProps): JSX.Element {
  return (
    <div className="reader-error-fallback">
      <span className="reader-error-fallback__badge">
        <ErrorIcon size={32} />
      </span>
      <h2 className="reader-error-fallback__title">出现了一些问题</h2>
      <p className="reader-error-fallback__message">{error?.message || ERROR_MESSAGES.render}</p>
      {onRetry && (
        <button className="reader-error-fallback__action" onClick={onRetry} type="button">
          <RefreshIcon size={18} />
          重试
        </button>
      )}
    </div>
  );
}
