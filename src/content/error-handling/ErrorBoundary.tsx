import React, { Component, ReactNode } from 'react';
import { ErrorInfo as ReactErrorInfo, ErrorType, ErrorSeverity } from './types';
import { errorManager } from './ErrorManager';
import { userFeedbackManager } from './UserFeedbackManager';

/**
 * 错误边界属性接口
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ReactErrorInfo) => ReactNode);
  onError?: (error: Error, errorInfo: ReactErrorInfo) => void;
  errorBoundaryId?: string;
  enableRecovery?: boolean;
  showFallbackUI?: boolean;
}

/**
 * 错误边界状态接口
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ReactErrorInfo | null;
  recoveryAttempted: boolean;
  fallbackUI: boolean;
}

/**
 * React错误边界组件
 * 
 * 功能：
 * - 捕获React组件树中的JavaScript错误
 * - 记录错误信息
 * - 显示降级UI
 * - 尝试错误恢复
 * - 与错误管理系统集成
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempted: false,
      fallbackUI: props.showFallbackUI ?? true
    };
  }

  /**
   * 捕获错误
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  /**
   * 错误处理
   */
  componentDidCatch(error: Error, errorInfo: ReactErrorInfo): void {
    // 更新状态
    this.setState({
      error,
      errorInfo
    });

    // 记录错误到错误管理器
    const errorId = errorManager.handleError(error, {
      type: ErrorType.RENDERING,
      severity: ErrorSeverity.HIGH,
      source: this.props.errorBoundaryId || 'react-error-boundary',
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundaryId: this.props.errorBoundaryId,
        componentName: this.constructor.name
      }
    });

    // 显示用户友好的错误通知
    const errorDetail = errorManager.getError(errorId);
    if (errorDetail) {
      userFeedbackManager.showErrorNotification(errorDetail);
    }

    // 调用自定义错误处理函数
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (onErrorError) {
        console.error('Error in onError callback:', onErrorError);
      }
    }

    // 尝试自动恢复（如果启用）
    if (this.props.enableRecovery && !this.state.recoveryAttempted) {
      this.attemptRecovery();
    }
  }

  /**
   * 尝试错误恢复
   */
  private async attemptRecovery(): Promise<void> {
    this.setState({ recoveryAttempted: true });

    try {
      // 等待一段时间后尝试恢复
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 检查错误是否仍然存在
      if (this.state.error && this.state.errorInfo) {
        // 尝试重新渲染
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          recoveryAttempted: false
        });

        // 显示恢复成功通知
        userFeedbackManager.showSuccessNotification(
          '错误已恢复',
          '组件已成功恢复，请继续使用',
          3000
        );
      }
    } catch (recoveryError) {
      console.error('Error recovery failed:', recoveryError);
      
      // 显示恢复失败通知
      userFeedbackManager.showWarningNotification(
        '恢复失败',
        '无法自动恢复，请刷新页面或联系技术支持',
        [
          {
            id: 'refresh',
            label: '刷新页面',
            type: 'button',
            primary: true,
            onClick: () => window.location.reload()
          }
        ]
      );
    }
  }

  /**
   * 手动重试
   */
  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempted: false
    });
  };

  /**
   * 切换到降级UI
   */
  private handleFallbackUI = (): void => {
    this.setState({ fallbackUI: true });
  };

  /**
   * 报告错误
   */
  private handleReportError = (): void => {
    if (this.state.error && this.state.errorInfo) {
      // 生成错误报告
      const _errorId = errorManager.handleError(this.state.error, {
        type: ErrorType.RENDERING,
        severity: ErrorSeverity.HIGH,
        source: this.props.errorBoundaryId || 'react-error-boundary',
        context: {
          componentStack: this.state.errorInfo.componentStack,
          errorBoundaryId: this.props.errorBoundaryId,
          componentName: this.constructor.name,
          userAction: 'manual-report'
        }
      });

      // 显示报告成功通知
      userFeedbackManager.showSuccessNotification(
        '错误已报告',
        '感谢您的反馈！问题已记录并将在后续版本中修复。',
        3000
      );
    }
  };

  /**
   * 渲染降级UI
   */
  private renderFallbackUI(): ReactNode {
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(this.state.error!, this.state.errorInfo!);
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    // 默认降级UI
    return (
      <div className="error-boundary-fallback" style={this.getFallbackStyles()}>
        <div className="error-boundary-content">
          <div className="error-boundary-icon">⚠️</div>
          <h3 className="error-boundary-title">出现错误</h3>
          <p className="error-boundary-message">
            组件渲染时出现问题，我们正在尝试恢复。
          </p>
          
          {this.state.error && (
            <details className="error-boundary-details">
              <summary>错误详情</summary>
              <div className="error-boundary-error">
                <strong>错误信息:</strong> {this.state.error.message}
              </div>
              {this.state.errorInfo && (
                <div className="error-boundary-stack">
                  <strong>组件堆栈:</strong>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              )}
            </details>
          )}
          
          <div className="error-boundary-actions">
            <button
              className="error-boundary-button error-boundary-button--primary"
              onClick={this.handleRetry}
            >
              重试
            </button>
            
            <button
              className="error-boundary-button error-boundary-button--secondary"
              onClick={this.handleReportError}
            >
              报告问题
            </button>
            
            <button
              className="error-boundary-button error-boundary-button--secondary"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * 获取降级UI样式
   */
  private getFallbackStyles(): React.CSSProperties {
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      margin: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    };
  }

  /**
   * 渲染
   */
  render(): ReactNode {
    if (this.state.hasError) {
      if (this.state.fallbackUI) {
        return this.renderFallbackUI();
      } else {
        // 如果禁用降级UI，返回null
        return null;
      }
    }

    return this.props.children;
  }
}

/**
 * 高阶组件：包装组件以添加错误边界
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * 函数组件错误边界Hook
 */
export function useErrorBoundary() {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
      
      // 记录错误
      errorManager.handleError(event.error, {
        type: ErrorType.RENDERING,
        severity: ErrorSeverity.HIGH,
        source: 'use-error-boundary',
        context: {
          errorEvent: event
        }
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setHasError(true);
      setError(new Error(event.reason));
      
      // 记录错误
      errorManager.handleError(new Error(event.reason), {
        type: ErrorType.RENDERING,
        severity: ErrorSeverity.HIGH,
        source: 'use-error-boundary',
        context: {
          rejectionEvent: event
        }
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const resetError = React.useCallback(() => {
    setHasError(false);
    setError(null);
  }, []);

  return {
    hasError,
    error,
    resetError
  };
}

// 导出默认组件
export default ErrorBoundary;
