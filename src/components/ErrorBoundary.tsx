import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 错误边界组件
 * 捕获子组件的渲染错误并显示降级UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '20px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            margin: '20px',
          }}
        >
          <h2 style={{ color: '#c33', fontSize: '18px', marginBottom: '10px' }}>
            ⚠️ 出错了
          </h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
            页面渲染时发生错误，请刷新页面重试
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', color: '#666', fontSize: '12px' }}>
                错误详情
              </summary>
              <pre
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                }}
              >
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
