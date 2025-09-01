import { 
  UserFeedback, 
  FeedbackType, 
  FeedbackAction, 
  ErrorInfo, 
  ErrorHandlingResult 
} from './types';

/**
 * 通知位置枚举
 */
export enum NotificationPosition {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  TOP_CENTER = 'top-center',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  BOTTOM_CENTER = 'bottom-center',
  CENTER = 'center'
}

/**
 * 通知配置接口
 */
export interface NotificationConfig {
  position: NotificationPosition;
  maxNotifications: number;
  defaultDuration: number;
  enableSound: boolean;
  enableVibration: boolean;
  autoDismiss: boolean;
  showProgress: boolean;
  theme: 'light' | 'dark' | 'auto';
}

/**
 * 用户反馈管理器
 * 
 * 功能：
 * - 显示用户友好的通知
 * - 错误信息展示
 * - 操作提示和建议
 * - 通知队列管理
 * - 主题和样式管理
 */
export class UserFeedbackManager {
  private static instance: UserFeedbackManager;
  
  // 通知存储
  private notifications: Map<string, UserFeedback> = new Map();
  private notificationQueue: UserFeedback[] = [];
  
  // 配置和状态
  private config: NotificationConfig;
  private isInitialized: boolean = false;
  private container: HTMLElement | null = null;
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;
  
  // 事件回调
  private onNotificationShow: ((notification: UserFeedback) => void) | null = null;
  private onNotificationDismiss: ((notification: UserFeedback) => void) | null = null;
  private onActionClick: ((action: FeedbackAction, notification: UserFeedback) => void) | null = null;

  constructor() {
    this.config = {
      position: NotificationPosition.TOP_RIGHT,
      maxNotifications: 5,
      defaultDuration: 5000,
      enableSound: true,
      enableVibration: true,
      autoDismiss: true,
      showProgress: true,
      theme: 'auto'
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): UserFeedbackManager {
    if (!UserFeedbackManager.instance) {
      UserFeedbackManager.instance = new UserFeedbackManager();
    }
    return UserFeedbackManager.instance;
  }

  /**
   * 初始化用户反馈管理器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // 创建通知容器
    this.createNotificationContainer();
    
    // 设置主题
    this.setupTheme();
    
    // 设置声音和振动
    this.setupAudioAndVibration();
    
    this.isInitialized = true;
    console.log('用户反馈管理器已初始化');
  }

  /**
   * 创建通知容器
   */
  private createNotificationContainer(): void {
    // 检查是否已存在容器
    const existingContainer = document.getElementById('chrome-extension-notifications');
    if (existingContainer) {
      this.container = existingContainer;
      return;
    }
    
    // 创建新容器
    this.container = document.createElement('div');
    this.container.id = 'chrome-extension-notifications';
    this.container.className = `chrome-extension-notifications chrome-extension-notifications--${this.config.position}`;
    
    // 添加样式
    this.addNotificationStyles();
    
    // 添加到页面
    document.body.appendChild(this.container);
  }

  /**
   * 添加通知样式
   */
  private addNotificationStyles(): void {
    if (document.getElementById('chrome-extension-notification-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'chrome-extension-notification-styles';
    style.textContent = `
      .chrome-extension-notifications {
        position: fixed;
        z-index: 999999;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .chrome-extension-notifications--top-left {
        top: 20px;
        left: 20px;
      }
      
      .chrome-extension-notifications--top-right {
        top: 20px;
        right: 20px;
      }
      
      .chrome-extension-notifications--top-center {
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .chrome-extension-notifications--bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .chrome-extension-notifications--bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .chrome-extension-notifications--bottom-center {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .chrome-extension-notifications--center {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
      
      .chrome-extension-notification {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 12px;
        max-width: 400px;
        min-width: 300px;
        pointer-events: auto;
        overflow: hidden;
        animation: slideIn 0.3s ease-out;
        border-left: 4px solid #007bff;
      }
      
      .chrome-extension-notification--info {
        border-left-color: #17a2b8;
      }
      
      .chrome-extension-notification--success {
        border-left-color: #28a745;
      }
      
      .chrome-extension-notification--warning {
        border-left-color: #ffc107;
      }
      
      .chrome-extension-notification--error {
        border-left-color: #dc3545;
      }
      
      .chrome-extension-notification--loading {
        border-left-color: #6c757d;
      }
      
      .chrome-extension-notification__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px 8px;
      }
      
      .chrome-extension-notification__title {
        font-weight: 600;
        font-size: 14px;
        color: #333;
        margin: 0;
      }
      
      .chrome-extension-notification__dismiss {
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
      }
      
      .chrome-extension-notification__dismiss:hover {
        background-color: #f0f0f0;
        color: #666;
      }
      
      .chrome-extension-notification__content {
        padding: 0 16px 12px;
      }
      
      .chrome-extension-notification__message {
        font-size: 13px;
        color: #666;
        margin: 0 0 12px 0;
        line-height: 1.4;
      }
      
      .chrome-extension-notification__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .chrome-extension-notification__action {
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
        font-weight: 500;
      }
      
      .chrome-extension-notification__action:hover {
        background: #0056b3;
      }
      
      .chrome-extension-notification__action--secondary {
        background: #6c757d;
      }
      
      .chrome-extension-notification__action--secondary:hover {
        background: #545b62;
      }
      
      .chrome-extension-notification__action:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      
      .chrome-extension-notification__progress {
        height: 3px;
        background: #e9ecef;
        overflow: hidden;
      }
      
      .chrome-extension-notification__progress-bar {
        height: 100%;
        background: #007bff;
        transition: width 0.1s linear;
      }
      
      .chrome-extension-notification__progress-bar--info {
        background: #17a2b8;
      }
      
      .chrome-extension-notification__progress-bar--success {
        background: #28a745;
      }
      
      .chrome-extension-notification__progress-bar--warning {
        background: #ffc107;
      }
      
      .chrome-extension-notification__progress-bar--error {
        background: #dc3545;
      }
      
      .chrome-extension-notification__progress-bar--loading {
        background: #6c757d;
        animation: progressAnimation 2s infinite;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-20px);
        }
      }
      
      @keyframes progressAnimation {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      .chrome-extension-notification--dark {
        background: #2d3748;
        color: white;
      }
      
      .chrome-extension-notification--dark .chrome-extension-notification__title {
        color: white;
      }
      
      .chrome-extension-notification--dark .chrome-extension-notification__message {
        color: #cbd5e0;
      }
      
      .chrome-extension-notification--dark .chrome-extension-notification__dismiss:hover {
        background-color: #4a5568;
        color: #e2e8f0;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 设置主题
   */
  private setupTheme(): void {
    if (this.config.theme === 'auto') {
      // 检测系统主题
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.applyTheme(mediaQuery.matches ? 'dark' : 'light');
      
      // 监听主题变化
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
    if (this.container) {
      this.container.className = `chrome-extension-notifications chrome-extension-notifications--${this.config.position}`;
      if (theme === 'dark') {
        this.container.classList.add('chrome-extension-notifications--dark');
      }
    }
  }

  /**
   * 设置声音和振动
   */
  private setupAudioAndVibration(): void {
    // 检查浏览器支持
    this.soundEnabled = this.config.enableSound && 'AudioContext' in window;
    this.vibrationEnabled = this.config.enableVibration && 'vibrate' in navigator;
  }

  /**
   * 显示通知
   */
  public showNotification(notification: UserFeedback): string {
    if (!this.isInitialized) {
      throw new Error('用户反馈管理器未初始化');
    }
    
    // 生成ID（如果没有提供）
    if (!notification.id) {
      notification.id = this.generateNotificationId();
    }
    
    // 设置时间戳
    notification.timestamp = Date.now();
    
    // 添加到队列
    this.notificationQueue.push(notification);
    
    // 处理队列
    this.processNotificationQueue();
    
    // 触发事件
    this.onNotificationShow?.(notification);
    
    return notification.id;
  }

  /**
   * 显示错误通知
   */
  public showErrorNotification(
    error: ErrorInfo, 
    result?: ErrorHandlingResult
  ): string {
    const actions: FeedbackAction[] = [];
    
    // 添加重试操作（如果错误可恢复）
    if (error.recoverable && error.retryCount < error.maxRetries) {
      actions.push({
        id: 'retry',
        label: '重试',
        type: 'button',
        primary: true,
        onClick: () => {
          // 这里应该调用错误管理器的重试方法
          console.log('重试错误:', error.id);
        }
      });
    }
    
    // 添加报告操作
    actions.push({
      id: 'report',
      label: '报告问题',
      type: 'button',
      primary: false,
      onClick: () => {
        this.showNotification({
          id: this.generateNotificationId(),
          type: FeedbackType.INFO,
          title: '问题报告',
          message: '感谢您的反馈！问题已记录并将在后续版本中修复。',
          duration: 3000,
          dismissible: true,
          timestamp: Date.now()
        });
      }
    });
    
    // 添加帮助操作
    actions.push({
      id: 'help',
      label: '获取帮助',
      type: 'link',
      primary: false,
      onClick: () => {
        window.open('https://github.com/your-repo/issues', '_blank');
      }
    });
    
    const notification: UserFeedback = {
      id: this.generateNotificationId(),
      type: FeedbackType.ERROR,
      title: '出现错误',
      message: result?.userMessage || error.message,
      duration: 0, // 错误通知不自动消失
      actions,
      dismissible: true,
      timestamp: Date.now()
    };
    
    return this.showNotification(notification);
  }

  /**
   * 显示成功通知
   */
  public showSuccessNotification(
    title: string, 
    message: string, 
    duration?: number
  ): string {
    const notification: UserFeedback = {
      id: this.generateNotificationId(),
      type: FeedbackType.SUCCESS,
      title,
      message,
      duration: duration || this.config.defaultDuration,
      actions: [],
      dismissible: true,
      timestamp: Date.now()
    };
    
    return this.showNotification(notification);
  }

  /**
   * 显示警告通知
   */
  public showWarningNotification(
    title: string, 
    message: string, 
    actions?: FeedbackAction[]
  ): string {
    const notification: UserFeedback = {
      id: this.generateNotificationId(),
      type: FeedbackType.WARNING,
      title,
      message,
      duration: this.config.defaultDuration,
      actions: actions || [],
      dismissible: true,
      timestamp: Date.now()
    };
    
    return this.showNotification(notification);
  }

  /**
   * 显示信息通知
   */
  public showInfoNotification(
    title: string, 
    message: string, 
    duration?: number
  ): string {
    const notification: UserFeedback = {
      id: this.generateNotificationId(),
      type: FeedbackType.INFO,
      title,
      message,
      duration: duration || this.config.defaultDuration,
      actions: [],
      dismissible: true,
      timestamp: Date.now()
    };
    
    return this.showNotification(notification);
  }

  /**
   * 显示加载通知
   */
  public showLoadingNotification(
    title: string, 
    message: string
  ): string {
    const notification: UserFeedback = {
      id: this.generateNotificationId(),
      type: FeedbackType.LOADING,
      title,
      message,
      duration: 0, // 加载通知不自动消失
      actions: [],
      dismissible: false,
      timestamp: Date.now()
    };
    
    return this.showNotification(notification);
  }

  /**
   * 处理通知队列
   */
  private processNotificationQueue(): void {
    if (!this.container || this.notificationQueue.length === 0) {
      return;
    }
    
    // 检查是否超过最大通知数量
    const currentNotifications = this.container.children.length;
    if (currentNotifications >= this.config.maxNotifications) {
      // 移除最旧的通知
      this.removeOldestNotification();
    }
    
    // 获取下一个通知
    const notification = this.notificationQueue.shift();
    if (!notification) return;
    
    // 创建通知元素
    const notificationElement = this.createNotificationElement(notification);
    
    // 添加到容器
    this.container.appendChild(notificationElement);
    
    // 存储通知引用
    this.notifications.set(notification.id, notification);
    
    // 播放声音和振动
    this.playNotificationEffects(notification.type);
    
    // 设置自动消失
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, notification.duration);
    }
    
    // 设置进度条（如果启用）
    if (this.config.showProgress && notification.duration && notification.duration > 0) {
      this.setupProgressBar(notificationElement, notification.duration);
    }
  }

  /**
   * 创建通知元素
   */
  private createNotificationElement(notification: UserFeedback): HTMLElement {
    const element = document.createElement('div');
    element.className = `chrome-extension-notification chrome-extension-notification--${notification.type}`;
    element.dataset.notificationId = notification.id;
    
    // 创建头部
    const header = document.createElement('div');
    header.className = 'chrome-extension-notification__header';
    
    const title = document.createElement('h4');
    title.className = 'chrome-extension-notification__title';
    title.textContent = notification.title;
    
    header.appendChild(title);
    
    // 添加关闭按钮（如果可关闭）
    if (notification.dismissible) {
      const dismissButton = document.createElement('button');
      dismissButton.className = 'chrome-extension-notification__dismiss';
      dismissButton.innerHTML = '×';
      dismissButton.addEventListener('click', () => {
        this.dismissNotification(notification.id);
      });
      header.appendChild(dismissButton);
    }
    
    element.appendChild(header);
    
    // 创建内容
    const content = document.createElement('div');
    content.className = 'chrome-extension-notification__content';
    
    const message = document.createElement('p');
    message.className = 'chrome-extension-notification__message';
    message.textContent = notification.message;
    
    content.appendChild(message);
    
    // 添加操作按钮
    if (notification.actions && notification.actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'chrome-extension-notification__actions';
      
      notification.actions.forEach(action => {
        const actionElement = this.createActionElement(action, notification);
        actionsContainer.appendChild(actionElement);
      });
      
      content.appendChild(actionsContainer);
    }
    
    element.appendChild(content);
    
    // 添加进度条
    if (this.config.showProgress && notification.duration && notification.duration > 0) {
      const progress = document.createElement('div');
      progress.className = 'chrome-extension-notification__progress';
      
      const progressBar = document.createElement('div');
      progressBar.className = `chrome-extension-notification__progress-bar chrome-extension-notification__progress-bar--${notification.type}`;
      progressBar.style.width = '100%';
      
      progress.appendChild(progressBar);
      element.appendChild(progress);
    }
    
    return element;
  }

  /**
   * 创建操作元素
   */
  private createActionElement(action: FeedbackAction, notification: UserFeedback): HTMLElement {
    if (action.type === 'button') {
      const button = document.createElement('button');
      button.className = `chrome-extension-notification__action ${action.primary ? '' : 'chrome-extension-notification__action--secondary'}`;
      button.textContent = action.label;
      button.disabled = action.disabled || false;
      
      button.addEventListener('click', async () => {
        try {
          await action.onClick();
          // 如果操作成功，关闭通知
          this.dismissNotification(notification.id);
        } catch (error) {
          console.error('操作执行失败:', error);
        }
      });
      
      return button;
    } else {
      const link = document.createElement('a');
      link.className = 'chrome-extension-notification__action chrome-extension-notification__action--secondary';
      link.textContent = action.label;
      link.href = '#';
      link.style.textDecoration = 'none';
      
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await action.onClick();
        } catch (error) {
          console.error('操作执行失败:', error);
        }
      });
      
      return link;
    }
  }

  /**
   * 设置进度条
   */
  private setupProgressBar(element: HTMLElement, duration: number): void {
    const progressBar = element.querySelector('.chrome-extension-notification__progress-bar') as HTMLElement;
    if (!progressBar) return;
    
    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.max(0, 100 - (elapsed / duration) * 100);
      
      progressBar.style.width = `${progress}%`;
      
      if (progress > 0) {
        requestAnimationFrame(updateProgress);
      }
    };
    
    requestAnimationFrame(updateProgress);
  }

  /**
   * 播放通知效果
   */
  private playNotificationEffects(type: FeedbackType): void {
    // 播放声音
    if (this.soundEnabled && type === FeedbackType.ERROR) {
      this.playNotificationSound();
    }
    
    // 振动
    if (this.vibrationEnabled && type === FeedbackType.ERROR) {
      this.playNotificationVibration();
    }
  }

  /**
   * 播放通知声音
   */
  private playNotificationSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('无法播放通知声音:', error);
    }
  }

  /**
   * 播放通知振动
   */
  private playNotificationVibration(): void {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      console.warn('无法播放通知振动:', error);
    }
  }

  /**
   * 关闭通知
   */
  public dismissNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;
    
    const element = this.container?.querySelector(`[data-notification-id="${notificationId}"]`) as HTMLElement;
    if (element) {
      element.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        element.remove();
        this.notifications.delete(notificationId);
        this.onNotificationDismiss?.(notification);
      }, 300);
    }
  }

  /**
   * 移除最旧的通知
   */
  private removeOldestNotification(): void {
    if (!this.container || this.container.children.length === 0) return;
    
    const oldestElement = this.container.children[0] as HTMLElement;
    const notificationId = oldestElement.dataset.notificationId;
    
    if (notificationId) {
      this.dismissNotification(notificationId);
    }
  }

  /**
   * 生成通知ID
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 设置配置
   */
  public setConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果位置改变，重新创建容器
    if (config.position && this.container) {
      this.container.remove();
      this.createNotificationContainer();
    }
    
    // 如果主题改变，重新应用主题
    if (config.theme) {
      this.setupTheme();
    }
  }

  /**
   * 获取配置
   */
  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * 设置事件回调
   */
  public onNotificationShow(callback: (notification: UserFeedback) => void): void {
    this.onNotificationShow = callback;
  }

  public onNotificationDismiss(callback: (notification: UserFeedback) => void): void {
    this.onNotificationDismiss = callback;
  }

  public onActionClick(callback: (action: FeedbackAction, notification: UserFeedback) => void): void {
    this.onActionClick = callback;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    // 移除所有通知
    this.notifications.clear();
    this.notificationQueue = [];
    
    // 移除容器
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    
    // 移除样式
    const styleElement = document.getElementById('chrome-extension-notification-styles');
    if (styleElement) {
      styleElement.remove();
    }
    
    this.isInitialized = false;
  }
}

// 导出单例实例
export const userFeedbackManager = UserFeedbackManager.getInstance();
