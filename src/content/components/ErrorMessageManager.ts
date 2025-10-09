/**
 * 用户友好的错误消息管理器
 * 将技术错误转换为用户可理解的消息，并提供解决方案
 */

import { ErrorType } from './RetryManager';

export interface ErrorMessage {
  title: string;
  message: string;
  solution?: string;
  action?: {
    label: string;
    handler: () => void;
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
}

export interface ErrorContext {
  operation: string;
  component: string;
  timestamp: number;
  userAgent: string;
  url: string;
  additionalInfo?: any;
}

/**
 * 用户友好的错误消息管理器
 */
export class ErrorMessageManager {
  private static instance: ErrorMessageManager;
  private errorMessages = new Map<string, ErrorMessage>();
  private errorHistory: Array<{ error: Error; context: ErrorContext; message: ErrorMessage }> = [];
  private notificationContainer: HTMLElement | null = null;
  private stylesInjected = false;

  private constructor() {
    this.initializeErrorMessages();
  }

  public static getInstance(): ErrorMessageManager {
    if (!ErrorMessageManager.instance) {
      ErrorMessageManager.instance = new ErrorMessageManager();
    }
    return ErrorMessageManager.instance;
  }

  /**
   * 初始化错误消息
   */
  private initializeErrorMessages(): void {
    // 网络相关错误
    this.errorMessages.set('NETWORK_ERROR', {
      title: '网络连接问题',
      message: '无法连接到服务器，请检查您的网络连接。',
      solution: '请检查网络连接，或稍后重试。',
      severity: 'error',
      category: 'network'
    });

    this.errorMessages.set('TIMEOUT_ERROR', {
      title: '请求超时',
      message: '操作时间过长，服务器没有响应。',
      solution: '请稍后重试，或检查网络连接。',
      severity: 'warning',
      category: 'network'
    });

    // 权限相关错误
    this.errorMessages.set('PERMISSION_ERROR', {
      title: '权限不足',
      message: '没有足够的权限执行此操作。',
      solution: '请检查浏览器权限设置，或重新安装扩展。',
      severity: 'error',
      category: 'permission'
    });

    this.errorMessages.set('STORAGE_QUOTA_ERROR', {
      title: '存储空间不足',
      message: '浏览器存储空间已满，无法保存数据。',
      solution: '请清理浏览器数据，或使用无痕模式。',
      action: {
        label: '清理存储',
        handler: () => this.clearStorage()
      },
      severity: 'warning',
      category: 'storage'
    });

    // 内容提取错误
    this.errorMessages.set('CONTENT_EXTRACTION_ERROR', {
      title: '内容提取失败',
      message: '无法从当前页面提取阅读内容。',
      solution: '请尝试刷新页面，或手动选择要阅读的内容。',
      severity: 'warning',
      category: 'content'
    });

    this.errorMessages.set('DOM_ERROR', {
      title: '页面结构问题',
      message: '页面结构发生变化，无法正常处理。',
      solution: '请刷新页面后重试。',
      severity: 'info',
      category: 'content'
    });

    // Web Worker 错误
    this.errorMessages.set('WORKER_ERROR', {
      title: '后台处理失败',
      message: '后台处理任务失败，可能影响性能。',
      solution: '请刷新页面重试，或关闭其他标签页释放内存。',
      severity: 'warning',
      category: 'performance'
    });

    this.errorMessages.set('MEMORY_ERROR', {
      title: '内存不足',
      message: '系统内存不足，无法完成操作。',
      solution: '请关闭其他标签页，或重启浏览器。',
      severity: 'critical',
      category: 'performance'
    });

    // 设置相关错误
    this.errorMessages.set('SETTINGS_ERROR', {
      title: '设置保存失败',
      message: '无法保存您的设置。',
      solution: '请检查浏览器权限，或尝试重新设置。',
      severity: 'warning',
      category: 'settings'
    });

    // 注释相关错误
    this.errorMessages.set('ANNOTATION_ERROR', {
      title: '注释保存失败',
      message: '无法保存您的注释和高亮。',
      solution: '请检查存储权限，或尝试重新添加注释。',
      severity: 'warning',
      category: 'annotation'
    });

    // 通用错误
    this.errorMessages.set('UNKNOWN_ERROR', {
      title: '未知错误',
      message: '发生了意外错误，请重试。',
      solution: '如果问题持续存在，请刷新页面或重启浏览器。',
      severity: 'error',
      category: 'general'
    });
  }

  private ensureContainer(): void {
    if (this.notificationContainer && document.body.contains(this.notificationContainer)) {
      return;
    }

    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'reading-extension-error-container';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 360px;
      pointer-events: none;
    `;

    document.body.appendChild(this.notificationContainer);
  }

  private ensureStyles(): void {
    if (this.stylesInjected || document.getElementById('error-notification-styles')) {
      this.stylesInjected = true;
      return;
    }

    const style = document.createElement('style');
    style.id = 'error-notification-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .error-notification-item {
        pointer-events: auto;
      }
      .error-action-btn:hover {
        background: #0056b3 !important;
      }
      .error-close-btn:hover {
        color: #333 !important;
      }
    `;

    document.head.appendChild(style);
    this.stylesInjected = true;
  }

  /**
   * 获取用户友好的错误消息
   */
  public getErrorMessage(error: Error, context: ErrorContext): ErrorMessage {
    const errorType = this.classifyError(error);
    const errorKey = this.getErrorKey(error, errorType, context);
    
    let message = this.errorMessages.get(errorKey);
    
    if (!message) {
      // 如果没有找到具体错误，使用通用错误
      message = this.errorMessages.get('UNKNOWN_ERROR')!;
    }

    // 记录错误历史
    this.errorHistory.push({ error, context, message });
    
    // 限制历史记录长度
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-50);
    }

    return {
      ...message,
      message: this.customizeMessage(message.message, context)
    };
  }

  /**
   * 分类错误
   */
  private classifyError(error: Error): ErrorType {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') || 
        errorMessage.includes('connection')) {
      return ErrorType.NETWORK;
    }
    
    if (errorMessage.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    
    if (errorMessage.includes('permission') || 
        errorMessage.includes('access')) {
      return ErrorType.PERMISSION;
    }
    
    if (errorMessage.includes('quota') || 
        errorMessage.includes('storage')) {
      return ErrorType.QUOTA;
    }
    
    if (errorMessage.includes('parse') || 
        errorMessage.includes('invalid') || 
        errorMessage.includes('malformed')) {
      return ErrorType.PARSING;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * 获取错误键
   */
  private getErrorKey(error: Error, errorType: ErrorType, context: ErrorContext): string {
    // 根据错误类型和上下文确定错误键
    switch (errorType) {
      case ErrorType.NETWORK:
        return 'NETWORK_ERROR';
      case ErrorType.TIMEOUT:
        return 'TIMEOUT_ERROR';
      case ErrorType.PERMISSION:
        return 'PERMISSION_ERROR';
      case ErrorType.QUOTA:
        return 'STORAGE_QUOTA_ERROR';
      case ErrorType.PARSING:
        if (context.operation.includes('extract')) {
          return 'CONTENT_EXTRACTION_ERROR';
        }
        return 'DOM_ERROR';
      default:
        // 根据上下文进一步分类
        if (context.operation.includes('worker')) {
          return 'WORKER_ERROR';
        }
        if (context.operation.includes('memory')) {
          return 'MEMORY_ERROR';
        }
        if (context.operation.includes('settings')) {
          return 'SETTINGS_ERROR';
        }
        if (context.operation.includes('annotation')) {
          return 'ANNOTATION_ERROR';
        }
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * 自定义错误消息
   */
  private customizeMessage(message: string, context: ErrorContext): string {
    // 根据上下文添加更多信息
    if (context.operation.includes('extract')) {
      return message + ' 当前页面可能不支持自动提取。';
    }
    
    if (context.operation.includes('save')) {
      return message + ' 您的数据可能未保存。';
    }
    
    return message;
  }

  /**
   * 显示错误消息
   */
  public showErrorMessage(errorMessage: ErrorMessage, context: ErrorContext): void {
    console.error(`🚨 错误: ${errorMessage.title}`, {
      message: errorMessage.message,
      solution: errorMessage.solution,
      context
    });

    // 创建错误通知
    this.showNotification(errorMessage, context);
  }

  /**
   * 创建错误通知
   */
  private showNotification(errorMessage: ErrorMessage, context: ErrorContext): void {
    this.ensureContainer();
    this.ensureStyles();

    const notification = document.createElement('div');
    notification.className = 'error-notification-item';
    notification.style.cssText = `
      background: ${this.getBackgroundColor(errorMessage.severity)};
      border: 1px solid ${this.getBorderColor(errorMessage.severity)};
      border-radius: 12px;
      padding: 16px 18px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(16px);
      display: flex;
      gap: 12px;
      align-items: flex-start;
      animation: slideInRight 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #333;
      pointer-events: auto;
    `;

    const icon = this.getSeverityIcon(errorMessage.severity);
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 20px; flex-shrink: 0;">${icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px; color: ${this.getTitleColor(errorMessage.severity)};">
            ${errorMessage.title}
          </div>
          <div style="margin-bottom: 8px; line-height: 1.4;">
            ${errorMessage.message}
          </div>
          ${errorMessage.solution ? `
            <div style="font-size: 12px; color: #666; margin-bottom: 12px;">
              💡 ${errorMessage.solution}
            </div>
          ` : ''}
          <div style="display: flex; gap: 8px; align-items: center;">
            ${errorMessage.action ? `
              <button class="error-action-btn" style="
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
              ">${errorMessage.action.label}</button>
            ` : ''}
            <button class="error-close-btn" style="
              background: none;
              border: none;
              color: #666;
              cursor: pointer;
              font-size: 16px;
              padding: 0;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">×</button>
          </div>
        </div>
      </div>
    `;

    this.notificationContainer?.appendChild(notification);

    // 绑定事件
    const closeBtn = notification.querySelector('.error-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    if (errorMessage.action) {
      const actionBtn = notification.querySelector('.error-action-btn');
      actionBtn?.addEventListener('click', () => {
        errorMessage.action!.handler();
        this.removeNotification(notification);
      });
    }

    // 自动关闭
    setTimeout(() => {
      this.removeNotification(notification);
    }, this.getAutoCloseDelay(errorMessage.severity));
  }

  /**
   * 移除通知
   */
  private removeNotification(notification: HTMLElement): void {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * 获取严重程度图标
   */
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'critical': return '🚨';
      default: return '❓';
    }
  }

  /**
   * 获取背景颜色
   */
  private getBackgroundColor(severity: string): string {
    switch (severity) {
      case 'info': return '#e3f2fd';
      case 'warning': return '#fff3e0';
      case 'error': return '#ffebee';
      case 'critical': return '#fce4ec';
      default: return '#f5f5f5';
    }
  }

  /**
   * 获取边框颜色
   */
  private getBorderColor(severity: string): string {
    switch (severity) {
      case 'info': return '#2196f3';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      case 'critical': return '#e91e63';
      default: return '#ccc';
    }
  }

  /**
   * 获取标题颜色
   */
  private getTitleColor(severity: string): string {
    switch (severity) {
      case 'info': return '#1976d2';
      case 'warning': return '#f57c00';
      case 'error': return '#d32f2f';
      case 'critical': return '#c2185b';
      default: return '#333';
    }
  }

  /**
   * 获取自动关闭延迟
   */
  private getAutoCloseDelay(severity: string): number {
    switch (severity) {
      case 'info': return 5000;
      case 'warning': return 8000;
      case 'error': return 10000;
      case 'critical': return 15000;
      default: return 5000;
    }
  }

  /**
   * 清理存储
   */
  private clearStorage(): void {
    try {
      // 清理 Chrome 存储
      chrome.storage.local.clear();
      chrome.storage.sync.clear();
      
      // 清理 IndexedDB
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('ReadingExtensionDB');
      }
      
      console.log('✅ 存储已清理');
    } catch (error) {
      console.error('❌ 清理存储失败:', error);
    }
  }

  /**
   * 获取错误历史
   */
  public getErrorHistory(): Array<{ error: Error; context: ErrorContext; message: ErrorMessage }> {
    return [...this.errorHistory];
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): { total: number; byCategory: Record<string, number>; bySeverity: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errorHistory.forEach(({ message }) => {
      byCategory[message.category] = (byCategory[message.category] || 0) + 1;
      bySeverity[message.severity] = (bySeverity[message.severity] || 0) + 1;
    });

    return {
      total: this.errorHistory.length,
      byCategory,
      bySeverity
    };
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.destroy();
  }

  public destroy(): void {
    if (this.notificationContainer && this.notificationContainer.parentNode) {
      this.notificationContainer.parentNode.removeChild(this.notificationContainer);
    }
    this.notificationContainer = null;

    const style = document.getElementById('error-notification-styles');
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
    this.stylesInjected = false;

    this.errorHistory = [];
  }
}

// 导出单例实例
export const errorMessageManager = ErrorMessageManager.getInstance();
