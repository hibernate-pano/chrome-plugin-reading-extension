import { 
  ToastOptions, 
  ToastInstance, 
  FeedbackType, 
  NotificationPosition,
  FeedbackConfig 
} from './types';

/**
 * Toast管理器
 * 负责管理所有Toast实例的生命周期
 */
export class ToastManager {
  private static instance: ToastManager;
  private toasts: Map<string, ToastInstance> = new Map();
  private containers: Map<NotificationPosition, HTMLElement> = new Map();
  private config: FeedbackConfig;
  private nextId = 1;

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

    this.initializeContainers();
    this.setupThemeDetection();
  }

  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  /**
   * 初始化通知容器
   */
  private initializeContainers(): void {
    Object.values(NotificationPosition).forEach(position => {
      const container = this.createContainer(position);
      this.containers.set(position, container);
    });
  }

  /**
   * 创建通知容器
   */
  private createContainer(position: NotificationPosition): HTMLElement {
    const container = document.createElement('div');
    container.className = `chrome-extension-toast-container chrome-extension-toast-container--${position}`;
    container.style.cssText = this.getContainerStyles(position);
    
    document.body.appendChild(container);
    return container;
  }

  /**
   * 获取容器样式
   */
  private getContainerStyles(position: NotificationPosition): string {
    const baseStyles = `
      position: fixed;
      z-index: ${this.config.zIndex};
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      pointer-events: none;
      max-width: 400px;
    `;

    switch (position) {
      case NotificationPosition.TOP_LEFT:
        return baseStyles + 'top: 0; left: 0;';
      case NotificationPosition.TOP_RIGHT:
        return baseStyles + 'top: 0; right: 0;';
      case NotificationPosition.TOP_CENTER:
        return baseStyles + 'top: 0; left: 50%; transform: translateX(-50%);';
      case NotificationPosition.BOTTOM_LEFT:
        return baseStyles + 'bottom: 0; left: 0;';
      case NotificationPosition.BOTTOM_RIGHT:
        return baseStyles + 'bottom: 0; right: 0;';
      case NotificationPosition.BOTTOM_CENTER:
        return baseStyles + 'bottom: 0; left: 50%; transform: translateX(-50%);';
      case NotificationPosition.CENTER:
        return baseStyles + 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
      default:
        return baseStyles + 'top: 0; right: 0;';
    }
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
    this.containers.forEach(container => {
      container.classList.remove('chrome-extension-toast-container--light', 'chrome-extension-toast-container--dark');
      container.classList.add(`chrome-extension-toast-container--${theme}`);
    });
  }

  /**
   * 显示Toast
   */
  public show(options: ToastOptions): ToastInstance {
    const id = options.id || `toast-${this.nextId++}`;
    const position = options.position || this.config.position;
    const duration = options.duration ?? this.config.defaultDuration;
    const showProgress = options.showProgress ?? this.config.showProgress;
    const dismissible = options.dismissible ?? this.config.dismissible;

    // 创建Toast元素
    const toastElement = this.createToastElement({
      ...options,
      id,
      duration,
      showProgress,
      dismissible
    });

    // 获取容器
    const container = this.containers.get(position);
    if (!container) {
      throw new Error(`Toast container not found for position: ${position}`);
    }

    // 添加到容器
    container.appendChild(toastElement);

    // 创建Toast实例
    const toastInstance: ToastInstance = {
      id,
      close: () => this.close(id),
      update: (newOptions: Partial<ToastOptions>) => this.update(id, newOptions)
    };

    // 存储实例
    this.toasts.set(id, toastInstance);

    // 管理容器中的Toast数量
    this.manageContainerSize(container);

    // 自动关闭
    if (duration > 0) {
      setTimeout(() => {
        this.close(id);
      }, duration);
    }

    // 播放效果
    this.playEffects(options.type || FeedbackType.INFO);

    return toastInstance;
  }

  /**
   * 创建Toast元素
   */
  private createToastElement(options: ToastOptions & { id: string }): HTMLElement {
    const toast = document.createElement('div');
    toast.className = 'chrome-extension-toast';
    toast.dataset.toastId = options.id;
    toast.style.cssText = this.getToastStyles(options.type || FeedbackType.INFO);

    // 创建内容
    const content = this.createToastContent(options);
    toast.appendChild(content);

    // 添加进度条
    if (options.showProgress && options.duration && options.duration > 0) {
      const progress = this.createProgressBar(options.duration);
      toast.appendChild(progress);
    }

    // 添加动画
    if (this.config.enableAnimations) {
      this.addToastAnimation(toast);
    }

    return toast;
  }

  /**
   * 创建Toast内容
   */
  private createToastContent(options: ToastOptions & { id: string }): HTMLElement {
    const content = document.createElement('div');
    content.className = 'chrome-extension-toast__content';

    // 图标
    const icon = document.createElement('div');
    icon.className = `chrome-extension-toast__icon chrome-extension-toast__icon--${options.type || FeedbackType.INFO}`;
    icon.innerHTML = this.getIconSvg(options.type || FeedbackType.INFO);
    content.appendChild(icon);

    // 文本内容
    const textContent = document.createElement('div');
    textContent.className = 'chrome-extension-toast__text';

    if (options.title) {
      const title = document.createElement('h4');
      title.className = 'chrome-extension-toast__title';
      title.textContent = options.title;
      textContent.appendChild(title);
    }

    if (options.message) {
      const message = document.createElement('p');
      message.className = 'chrome-extension-toast__message';
      message.textContent = options.message;
      textContent.appendChild(message);
    }

    content.appendChild(textContent);

    // 关闭按钮
    if (options.dismissible !== false) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'chrome-extension-toast__close';
      closeBtn.innerHTML = '×';
      closeBtn.addEventListener('click', () => this.close(options.id!));
      content.appendChild(closeBtn);
    }

    // 操作按钮
    if (options.actions && options.actions.length > 0) {
      const actions = this.createActionButtons(options.actions);
      content.appendChild(actions);
    }

    return content;
  }

  /**
   * 创建进度条
   */
  private createProgressBar(duration: number): HTMLElement {
    const progress = document.createElement('div');
    progress.className = 'chrome-extension-toast__progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'chrome-extension-toast__progress-bar';
    
    progress.appendChild(progressBar);
    
    // 启动进度动画
    this.startProgressAnimation(progressBar, duration);
    
    return progress;
  }

  /**
   * 启动进度动画
   */
  private startProgressAnimation(progressBar: HTMLElement, duration: number): void {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.max(0, 100 - (elapsed / duration) * 100);
      
      progressBar.style.width = `${progress}%`;
      
      if (progress > 0) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * 创建操作按钮
   */
  private createActionButtons(actions: any[]): HTMLElement {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'chrome-extension-toast__actions';
    
    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = `chrome-extension-toast__action chrome-extension-toast__action--${action.variant || 'default'}`;
      button.textContent = action.label;
      button.disabled = action.disabled || false;
      
      button.addEventListener('click', async () => {
        try {
          await action.onClick();
        } catch (error) {
          console.error('Toast action failed:', error);
        }
      });
      
      actionsContainer.appendChild(button);
    });
    
    return actionsContainer;
  }

  /**
   * 获取图标SVG
   */
  private getIconSvg(type: FeedbackType): string {
    switch (type) {
      case FeedbackType.SUCCESS:
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      case FeedbackType.ERROR:
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
      case FeedbackType.WARNING:
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';
      case FeedbackType.LOADING:
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>';
      default:
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
    }
  }

  /**
   * 获取Toast样式
   */
  private getToastStyles(type: FeedbackType): string {
    const baseStyles = `
      display: flex;
      flex-direction: column;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      margin-bottom: 8px;
      pointer-events: auto;
      max-width: 400px;
      min-width: 300px;
    `;

    const typeStyles = {
      [FeedbackType.SUCCESS]: 'border-green-200 bg-green-50',
      [FeedbackType.ERROR]: 'border-red-200 bg-red-50',
      [FeedbackType.WARNING]: 'border-yellow-200 bg-yellow-50',
      [FeedbackType.LOADING]: 'border-blue-200 bg-blue-50',
      [FeedbackType.INFO]: 'border-blue-200 bg-blue-50'
    };

    return baseStyles + typeStyles[type];
  }

  /**
   * 添加Toast动画
   */
  private addToastAnimation(toast: HTMLElement): void {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    
    requestAnimationFrame(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
  }

  /**
   * 管理容器大小
   */
  private manageContainerSize(container: HTMLElement): void {
    const toasts = container.querySelectorAll('.chrome-extension-toast');
    
    if (toasts.length > this.config.maxNotifications) {
      const oldestToast = toasts[0];
      if (oldestToast) {
        oldestToast.remove();
      }
    }
  }

  /**
   * 关闭Toast
   */
  public close(id: string): void {
    const toastInstance = this.toasts.get(id);
    if (!toastInstance) return;

    // 查找Toast元素
    const toastElement = document.querySelector(`[data-toast-id="${id}"]`);
    if (toastElement) {
      // 添加关闭动画
      if (this.config.enableAnimations) {
        toastElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toastElement.style.opacity = '0';
        toastElement.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
          toastElement.remove();
        }, 300);
      } else {
        toastElement.remove();
      }
    }

    // 移除实例
    this.toasts.delete(id);
  }

  /**
   * 更新Toast
   */
  public update(id: string, options: Partial<ToastOptions>): void {
    const toastInstance = this.toasts.get(id);
    if (!toastInstance) return;

    // 查找Toast元素
    const toastElement = document.querySelector(`[data-toast-id="${id}"]`);
    if (toastElement) {
      // 更新内容
      if (options.message) {
        const messageElement = toastElement.querySelector('.chrome-extension-toast__message');
        if (messageElement) {
          messageElement.textContent = options.message;
        }
      }

      if (options.title) {
        const titleElement = toastElement.querySelector('.chrome-extension-toast__title');
        if (titleElement) {
          titleElement.textContent = options.title;
        }
      }

      // 更新类型样式
      if (options.type) {
        toastElement.className = `chrome-extension-toast ${this.getToastStyles(options.type)}`;
      }
    }
  }

  /**
   * 播放效果
   */
  private playEffects(type: FeedbackType): void {
    if (this.config.enableSound && type === FeedbackType.ERROR) {
      this.playSound();
    }

    if (this.config.enableVibration && type === FeedbackType.ERROR) {
      this.playVibration();
    }
  }

  /**
   * 播放声音
   */
  private playSound(): void {
    // 实现声音播放逻辑
    console.log('Playing notification sound');
  }

  /**
   * 播放振动
   */
  private playVibration(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  }

  /**
   * 关闭所有Toast
   */
  public closeAll(): void {
    this.toasts.forEach((_, id) => {
      this.close(id);
    });
  }

  /**
   * 获取统计信息
   */
  public getStats(): { total: number; active: number } {
    return {
      total: this.toasts.size,
      active: this.toasts.size
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<FeedbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 重新应用主题
    if (newConfig.theme) {
      this.applyTheme(newConfig.theme === 'auto' ? 'light' : newConfig.theme);
    }
  }
}

export const toastManager = ToastManager.getInstance();
export default toastManager;
