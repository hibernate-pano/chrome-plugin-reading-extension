import { 
  FeedbackType, 
  NotificationPosition, 
  ProgressType,
  ToastOptions, 
  ProgressOptions,
  FeedbackConfig,
  FeedbackStats
} from './types';
import { toastManager } from './ToastManager';
import { progressManager } from './ProgressManager';

/**
 * 统一用户反馈系统
 * 整合Toast通知和进度指示器功能
 */
export class UserFeedbackSystem {
  private static instance: UserFeedbackSystem;
  private config: FeedbackConfig;
  private stats: FeedbackStats;

  private constructor() {
    this.config = {
      position: NotificationPosition.TOP_RIGHT,
      maxNotifications: 5,
      defaultDuration: 5000,
      showProgress: true,
      dismissible: true,
      theme: 'auto',
      enableSound: false,
      enableVibration: false,
      enableAnimations: true,
      zIndex: 9999
    };

    this.stats = {
      totalShown: 0,
      totalClosed: 0,
      totalActions: 0,
      averageDisplayTime: 0,
      typeDistribution: {
        [FeedbackType.INFO]: 0,
        [FeedbackType.SUCCESS]: 0,
        [FeedbackType.WARNING]: 0,
        [FeedbackType.ERROR]: 0,
        [FeedbackType.LOADING]: 0
      },
      positionDistribution: {
        [NotificationPosition.TOP_LEFT]: 0,
        [NotificationPosition.TOP_RIGHT]: 0,
        [NotificationPosition.TOP_CENTER]: 0,
        [NotificationPosition.BOTTOM_LEFT]: 0,
        [NotificationPosition.BOTTOM_RIGHT]: 0,
        [NotificationPosition.BOTTOM_CENTER]: 0,
        [NotificationPosition.CENTER]: 0
      }
    };

    this.initializeSystem();
  }

  public static getInstance(): UserFeedbackSystem {
    if (!UserFeedbackSystem.instance) {
      UserFeedbackSystem.instance = new UserFeedbackSystem();
    }
    return UserFeedbackSystem.instance;
  }

  /**
   * 初始化系统
   */
  private initializeSystem(): void {
    // 更新Toast管理器配置
    toastManager.updateConfig(this.config);
    
    // 设置主题检测
    this.setupThemeDetection();
    
    // 添加样式
    this.addStyles();
  }

  /**
   * 设置主题检测
   */
  private setupThemeDetection(): void {
    if (this.config.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.applyTheme(mediaQuery.matches ? 'dark' : 'light');
      
      mediaQuery.addEventListener('change', (e) => {
        this.applyTheme(e.matches ? 'dark' : 'light');
      });
    } else {
      this.applyTheme(this.config.theme);
    }
  }

  /**
   * 应用主题
   */
  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * 添加样式
   */
  private addStyles(): void {
    if (document.getElementById('chrome-extension-feedback-styles')) return;

    const style = document.createElement('style');
    style.id = 'chrome-extension-feedback-styles';
    style.textContent = this.getStyles();
    document.head.appendChild(style);
  }

  /**
   * 获取样式
   */
  private getStyles(): string {
    return `
      /* Toast 样式 */
      .chrome-extension-toast {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .chrome-extension-toast__content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .chrome-extension-toast__icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chrome-extension-toast__icon--success { color: #10b981; }
      .chrome-extension-toast__icon--error { color: #ef4444; }
      .chrome-extension-toast__icon--warning { color: #f59e0b; }
      .chrome-extension-toast__icon--loading { color: #3b82f6; }
      .chrome-extension-toast__icon--info { color: #3b82f6; }

      .chrome-extension-toast__text {
        flex: 1;
        min-width: 0;
      }

      .chrome-extension-toast__title {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
        color: #111827;
      }

      .chrome-extension-toast__message {
        margin: 0;
        font-size: 13px;
        color: #6b7280;
        line-height: 1.4;
      }

      .chrome-extension-toast__close {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color: #9ca3af;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .chrome-extension-toast__close:hover {
        background: #f3f4f6;
        color: #6b7280;
      }

      .chrome-extension-toast__actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .chrome-extension-toast__action {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        background: white;
        color: #374151;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .chrome-extension-toast__action:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }

      .chrome-extension-toast__action--destructive {
        border-color: #fecaca;
        color: #dc2626;
      }

      .chrome-extension-toast__action--destructive:hover {
        background: #fef2f2;
        border-color: #f87171;
      }

      .chrome-extension-toast__progress {
        height: 3px;
        background: #f3f4f6;
        border-radius: 0 0 8px 8px;
        overflow: hidden;
        margin-top: 12px;
      }

      .chrome-extension-toast__progress-bar {
        height: 100%;
        background: #3b82f6;
        transition: width 0.1s linear;
      }

      /* 进度指示器样式 */
      .chrome-extension-progress__content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .chrome-extension-progress__label {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }

      .chrome-extension-progress__container {
        width: 100%;
      }

      .chrome-extension-progress__linear .chrome-extension-progress__track {
        width: 100%;
        height: 8px;
        background: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
      }

      .chrome-extension-progress__linear .chrome-extension-progress__bar {
        height: 100%;
        background: #3b82f6;
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      .chrome-extension-progress__linear .chrome-extension-progress__bar--striped {
        background-image: linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.15) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255, 255, 255, 0.15) 50%,
          rgba(255, 255, 255, 0.15) 75%,
          transparent 75%,
          transparent
        );
        background-size: 20px 20px;
        animation: progressStripes 1s linear infinite;
      }

      .chrome-extension-progress__circular {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chrome-extension-progress__steps {
        display: flex;
        gap: 4px;
      }

      .chrome-extension-progress__step {
        flex: 1;
        height: 8px;
        background: #f3f4f6;
        border-radius: 4px;
        transition: background-color 0.3s ease;
      }

      .chrome-extension-progress__step--completed {
        background: #3b82f6;
      }

      .chrome-extension-progress__indeterminate .chrome-extension-progress__track {
        width: 100%;
        height: 8px;
        background: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
      }

      .chrome-extension-progress__indeterminate .chrome-extension-progress__bar--indeterminate {
        height: 100%;
        width: 100%;
        animation: progressIndeterminate 2s infinite;
      }

      .chrome-extension-progress__value {
        font-size: 12px;
        color: #6b7280;
        text-align: center;
        font-weight: 500;
      }

      /* 动画 */
      @keyframes progressStripes {
        0% { background-position: 0 0; }
        100% { background-position: 20px 0; }
      }

      @keyframes progressIndeterminate {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      /* 暗色主题 */
      [data-theme="dark"] .chrome-extension-toast {
        background: #1f2937;
        border-color: #374151;
        color: white;
      }

      [data-theme="dark"] .chrome-extension-toast__title {
        color: #f9fafb;
      }

      [data-theme="dark"] .chrome-extension-toast__message {
        color: #d1d5db;
      }

      [data-theme="dark"] .chrome-extension-progress {
        background: #1f2937;
        border-color: #374151;
        color: white;
      }

      [data-theme="dark"] .chrome-extension-progress__label {
        color: #f9fafb;
      }

      [data-theme="dark"] .chrome-extension-progress__value {
        color: #d1d5db;
      }
    `;
  }

  // ==================== Toast 方法 ====================

  /**
   * 显示信息Toast
   */
  public info(message: string, options?: Partial<ToastOptions>): any {
    return this.showToast({
      type: FeedbackType.INFO,
      message,
      ...options
    });
  }

  /**
   * 显示成功Toast
   */
  public success(message: string, options?: Partial<ToastOptions>): any {
    return this.showToast({
      type: FeedbackType.SUCCESS,
      message,
      ...options
    });
  }

  /**
   * 显示警告Toast
   */
  public warning(message: string, options?: Partial<ToastOptions>): any {
    return this.showToast({
      type: FeedbackType.WARNING,
      message,
      ...options
    });
  }

  /**
   * 显示错误Toast
   */
  public error(message: string, options?: Partial<ToastOptions>): any {
    return this.showToast({
      type: FeedbackType.ERROR,
      message,
      ...options
    });
  }

  /**
   * 显示加载Toast
   */
  public loading(message: string, options?: Partial<ToastOptions>): any {
    return this.showToast({
      type: FeedbackType.LOADING,
      message,
      duration: 0, // 不自动关闭
      ...options
    });
  }

  /**
   * 显示Toast
   */
  private showToast(options: ToastOptions): any {
    this.updateStats('show', options.type || FeedbackType.INFO, options.position || this.config.position);
    
    return toastManager.show({
      ...options,
      position: options.position || this.config.position,
      duration: options.duration ?? this.config.defaultDuration,
      showProgress: options.showProgress ?? this.config.showProgress,
      dismissible: options.dismissible ?? this.config.dismissible
    });
  }

  // ==================== 进度指示器方法 ====================

  /**
   * 创建线性进度条
   */
  public createLinearProgress(options?: Partial<ProgressOptions>): any {
    return this.createProgress({
      type: ProgressType.LINEAR,
      ...options
    });
  }

  /**
   * 创建圆形进度条
   */
  public createCircularProgress(options?: Partial<ProgressOptions>): any {
    return this.createProgress({
      type: ProgressType.CIRCULAR,
      ...options
    });
  }

  /**
   * 创建步骤进度条
   */
  public createStepsProgress(options?: Partial<ProgressOptions>): any {
    return this.createProgress({
      type: ProgressType.STEPS,
      ...options
    });
  }

  /**
   * 创建不确定进度条
   */
  public createIndeterminateProgress(options?: Partial<ProgressOptions>): any {
    return this.createProgress({
      type: ProgressType.INDETERMINATE,
      ...options
    });
  }

  /**
   * 创建进度指示器
   */
  private createProgress(options: ProgressOptions): any {
    return progressManager.create({
      ...options,
      animated: options.animated ?? this.config.enableAnimations
    });
  }

  // ==================== 便捷方法 ====================

  /**
   * 显示操作成功提示
   */
  public showSuccess(title: string, message?: string): any {
    return this.success(message || title, { title });
  }

  /**
   * 显示操作失败提示
   */
  public showError(title: string, message?: string): any {
    return this.error(message || title, { title });
  }

  /**
   * 显示操作进行中提示
   */
  public showProgress(title: string, message?: string): any {
    return this.loading(message || title, { title });
  }

  /**
   * 显示确认对话框
   */
  public showConfirm(
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel?: () => void
  ): any {
    return this.showToast({
      title,
      message,
      type: FeedbackType.INFO,
      duration: 0,
      actions: [
        {
          id: 'confirm',
          label: '确认',
          variant: 'default',
          onClick: () => {
            onConfirm();
            this.closeAll();
          }
        },
        {
          id: 'cancel',
          label: '取消',
          variant: 'outline',
          onClick: () => {
            onCancel?.();
            this.closeAll();
          }
        }
      ]
    });
  }

  /**
   * 显示操作结果
   */
  public showResult(success: boolean, title: string, message?: string): any {
    if (success) {
      return this.showSuccess(title, message);
    } else {
      return this.showError(title, message);
    }
  }

  // ==================== 管理方法 ====================

  /**
   * 关闭所有通知
   */
  public closeAll(): void {
    toastManager.closeAll();
    progressManager.destroyAll();
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<FeedbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    toastManager.updateConfig(this.config);
  }

  /**
   * 获取配置
   */
  public getConfig(): FeedbackConfig {
    return { ...this.config };
  }

  /**
   * 获取统计信息
   */
  public getStats(): FeedbackStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.stats = {
      totalShown: 0,
      totalClosed: 0,
      totalActions: 0,
      averageDisplayTime: 0,
      typeDistribution: {
        [FeedbackType.INFO]: 0,
        [FeedbackType.SUCCESS]: 0,
        [FeedbackType.WARNING]: 0,
        [FeedbackType.ERROR]: 0,
        [FeedbackType.LOADING]: 0
      },
      positionDistribution: {
        [NotificationPosition.TOP_LEFT]: 0,
        [NotificationPosition.TOP_RIGHT]: 0,
        [NotificationPosition.TOP_CENTER]: 0,
        [NotificationPosition.BOTTOM_LEFT]: 0,
        [NotificationPosition.BOTTOM_RIGHT]: 0,
        [NotificationPosition.BOTTOM_CENTER]: 0,
        [NotificationPosition.CENTER]: 0
      }
    };
  }

  /**
   * 更新统计信息
   */
  private updateStats(action: 'show' | 'close' | 'action', type: FeedbackType, position: NotificationPosition): void {
    if (action === 'show') {
      this.stats.totalShown++;
      this.stats.typeDistribution[type]++;
      this.stats.positionDistribution[position]++;
    } else if (action === 'close') {
      this.stats.totalClosed++;
    } else if (action === 'action') {
      this.stats.totalActions++;
    }
  }
}

// 创建便捷的API函数
export const feedback = UserFeedbackSystem.getInstance();

// 导出便捷方法
export const {
  info,
  success,
  warning,
  error,
  loading,
  createLinearProgress,
  createCircularProgress,
  createStepsProgress,
  createIndeterminateProgress,
  showSuccess,
  showError,
  showProgress,
  showConfirm,
  showResult,
  closeAll,
  updateConfig,
  getConfig,
  getStats,
  resetStats
} = feedback;

export default feedback;
