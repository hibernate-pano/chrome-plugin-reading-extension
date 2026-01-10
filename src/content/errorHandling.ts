/**
 * Error Handling Module
 * Simplified error handling with user-friendly messages
 * Requirements: 8.1, 8.2, 8.3
 */

import React, { Component, type ReactNode, type ErrorInfo, type JSX } from 'react';

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
  return ERROR_MESSAGES[context] ?? ERROR_MESSAGES.default;
}

/**
 * Show a toast notification to the user
 */
export function showToast(options: ToastOptions): void {
  const { type, message, duration = 5000 } = options;

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `reader-toast reader-toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;

  // Add styles inline for isolation
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    zIndex: '2147483647',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    animation: 'reader-toast-in 0.3s ease-out',
    backgroundColor: type === 'error' ? '#fee2e2' : '#f0f9ff',
    color: type === 'error' ? '#991b1b' : '#1e40af',
    border: `1px solid ${type === 'error' ? '#fecaca' : '#bfdbfe'}`,
  });

  // Add animation keyframes if not already present
  if (!document.getElementById('reader-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'reader-toast-styles';
    style.textContent = `
      @keyframes reader-toast-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes reader-toast-out {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(20px); }
      }
    `;
    document.head.appendChild(style);
  }

  // Add to document
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
  // Extract error message
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Log to console for debugging
  console.error(`[Reader] ${context}:`, errorMessage);
  
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
  onRetry?: () => void;
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
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return React.createElement(ErrorFallback, {
        error: this.state.error,
        onRetry: this.handleRetry,
      });
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
 */
export function ErrorFallback({ error, onRetry }: ErrorFallbackProps): JSX.Element {
  return React.createElement(
    'div',
    {
      className: 'reader-error-fallback',
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        padding: '40px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#374151',
      },
    },
    // Error icon
    React.createElement(
      'div',
      {
        style: {
          width: '64px',
          height: '64px',
          marginBottom: '16px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      React.createElement(
        'svg',
        {
          width: '32',
          height: '32',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: '#dc2626',
          strokeWidth: '2',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
        React.createElement('line', { x1: '12', y1: '8', x2: '12', y2: '12' }),
        React.createElement('line', { x1: '12', y1: '16', x2: '12.01', y2: '16' })
      )
    ),
    // Error title
    React.createElement(
      'h2',
      {
        style: {
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
        },
      },
      '出现了一些问题'
    ),
    // Error message
    React.createElement(
      'p',
      {
        style: {
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: '#6b7280',
          maxWidth: '400px',
        },
      },
      error?.message || ERROR_MESSAGES.render
    ),
    // Retry button
    onRetry &&
      React.createElement(
        'button',
        {
          onClick: onRetry,
          style: {
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#ffffff',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          },
          onMouseOver: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          },
          onMouseOut: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          },
        },
        '重试'
      )
  );
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = 'default'
): (...args: T) => Promise<R | undefined> {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      return undefined;
    }
  };
}

/**
 * Safe execution wrapper that catches errors
 */
export function safeExecute<T>(
  fn: () => T,
  context: ErrorContext = 'default',
  fallback?: T
): T | undefined {
  try {
    return fn();
  } catch (error) {
    handleError(error, context);
    return fallback;
  }
}
