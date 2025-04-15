/**
 * Toast 通知组件
 * 用于显示临时的操作反馈信息
 */

export interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showIcon?: boolean;
  showProgress?: boolean;
  onClick?: () => void;
  onClose?: () => void;
}

export class Toast {
  private static container: HTMLElement | null = null;
  private static queue: HTMLElement[] = [];
  private static maxVisible: number = 5;

  /**
   * 显示 Toast 通知
   */
  public static show(options: ToastOptions): { close: () => void } {
    // 确保容器存在
    this.ensureContainer();

    // 创建 Toast 元素
    const toast = this.createToastElement(options);
    
    // 添加到队列
    this.queue.push(toast);
    
    // 添加到容器
    if (this.container) {
      this.container.appendChild(toast);
    }
    
    // 限制可见数量
    this.limitVisibleToasts();
    
    // 设置自动关闭
    const duration = options.duration || 3000;
    let timeoutId: number | null = null;
    
    if (duration > 0) {
      timeoutId = window.setTimeout(() => {
        this.close(toast);
      }, duration);
    }
    
    // 如果显示进度条
    if (options.showProgress) {
      const progress = document.createElement('div');
      progress.className = 'toast-progress';
      toast.appendChild(progress);
      
      // 动画进度条
      progress.style.transition = `width ${duration}ms linear`;
      setTimeout(() => {
        progress.style.width = '0%';
      }, 10);
    }
    
    // 返回关闭函数
    return {
      close: () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        this.close(toast);
      }
    };
  }

  /**
   * 显示成功 Toast
   */
  public static success(message: string, options: Partial<ToastOptions> = {}): { close: () => void } {
    return this.show({
      message,
      type: 'success',
      showIcon: true,
      ...options
    });
  }

  /**
   * 显示错误 Toast
   */
  public static error(message: string, options: Partial<ToastOptions> = {}): { close: () => void } {
    return this.show({
      message,
      type: 'error',
      showIcon: true,
      ...options
    });
  }

  /**
   * 显示信息 Toast
   */
  public static info(message: string, options: Partial<ToastOptions> = {}): { close: () => void } {
    return this.show({
      message,
      type: 'info',
      showIcon: true,
      ...options
    });
  }

  /**
   * 显示警告 Toast
   */
  public static warning(message: string, options: Partial<ToastOptions> = {}): { close: () => void } {
    return this.show({
      message,
      type: 'warning',
      showIcon: true,
      ...options
    });
  }

  /**
   * 关闭所有 Toast
   */
  public static closeAll(): void {
    if (!this.container) return;
    
    // 复制队列，避免在迭代过程中修改
    const toasts = [...this.queue];
    toasts.forEach(toast => this.close(toast));
  }

  /**
   * 确保容器存在
   */
  private static ensureContainer(): void {
    if (this.container) return;
    
    // 创建容器
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.style.cssText = `
      position: fixed;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 100%;
      width: 320px;
      pointer-events: none;
      transition: all 0.3s ease;
    `;
    
    // 添加到文档
    document.body.appendChild(this.container);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .toast-container {
        --toast-success-color: #10b981;
        --toast-error-color: #ef4444;
        --toast-info-color: #3b82f6;
        --toast-warning-color: #f59e0b;
        --toast-text-color: #ffffff;
        --toast-bg-color: rgba(0, 0, 0, 0.8);
        --toast-border-radius: 8px;
        --toast-font-size: 14px;
        --toast-padding: 12px 16px;
        --toast-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .toast {
        display: flex;
        align-items: center;
        padding: var(--toast-padding);
        background-color: var(--toast-bg-color);
        color: var(--toast-text-color);
        border-radius: var(--toast-border-radius);
        box-shadow: var(--toast-shadow);
        font-size: var(--toast-font-size);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s, transform 0.3s;
        overflow: hidden;
        position: relative;
        pointer-events: auto;
        cursor: default;
      }
      
      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      .toast.closing {
        opacity: 0;
        transform: translateY(-10px);
      }
      
      .toast-icon {
        margin-right: 8px;
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .toast-message {
        flex-grow: 1;
        word-break: break-word;
      }
      
      .toast-close {
        margin-left: 8px;
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      
      .toast-close:hover {
        opacity: 1;
      }
      
      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background-color: rgba(255, 255, 255, 0.3);
      }
      
      .toast-success {
        border-left: 3px solid var(--toast-success-color);
      }
      
      .toast-error {
        border-left: 3px solid var(--toast-error-color);
      }
      
      .toast-info {
        border-left: 3px solid var(--toast-info-color);
      }
      
      .toast-warning {
        border-left: 3px solid var(--toast-warning-color);
      }
      
      /* 深色主题 */
      @media (prefers-color-scheme: dark) {
        .toast-container {
          --toast-bg-color: rgba(30, 30, 30, 0.9);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 创建 Toast 元素
   */
  private static createToastElement(options: ToastOptions): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `toast ${options.type ? `toast-${options.type}` : ''}`;
    
    // 添加图标
    if (options.showIcon) {
      const icon = document.createElement('div');
      icon.className = 'toast-icon';
      
      // 根据类型设置图标
      switch (options.type) {
        case 'success':
          icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
          break;
        case 'error':
          icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
          break;
        case 'info':
          icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
          break;
        case 'warning':
          icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
          break;
      }
      
      toast.appendChild(icon);
    }
    
    // 添加消息
    const message = document.createElement('div');
    message.className = 'toast-message';
    message.textContent = options.message;
    toast.appendChild(message);
    
    // 添加关闭按钮
    const close = document.createElement('div');
    close.className = 'toast-close';
    close.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close(toast);
      if (options.onClose) {
        options.onClose();
      }
    });
    toast.appendChild(close);
    
    // 添加点击事件
    if (options.onClick) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', options.onClick);
    }
    
    // 设置位置
    if (options.position) {
      if (this.container) {
        switch (options.position) {
          case 'top':
            this.container.style.top = '16px';
            this.container.style.left = '50%';
            this.container.style.transform = 'translateX(-50%)';
            break;
          case 'bottom':
            this.container.style.bottom = '16px';
            this.container.style.left = '50%';
            this.container.style.transform = 'translateX(-50%)';
            break;
          case 'top-left':
            this.container.style.top = '16px';
            this.container.style.left = '16px';
            this.container.style.transform = 'none';
            break;
          case 'top-right':
            this.container.style.top = '16px';
            this.container.style.right = '16px';
            this.container.style.left = 'auto';
            this.container.style.transform = 'none';
            break;
          case 'bottom-left':
            this.container.style.bottom = '16px';
            this.container.style.left = '16px';
            this.container.style.top = 'auto';
            this.container.style.transform = 'none';
            break;
          case 'bottom-right':
            this.container.style.bottom = '16px';
            this.container.style.right = '16px';
            this.container.style.left = 'auto';
            this.container.style.top = 'auto';
            this.container.style.transform = 'none';
            break;
        }
      }
    } else {
      // 默认位置：右下角
      if (this.container) {
        this.container.style.bottom = '16px';
        this.container.style.right = '16px';
        this.container.style.left = 'auto';
        this.container.style.top = 'auto';
        this.container.style.transform = 'none';
      }
    }
    
    // 显示动画
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    return toast;
  }

  /**
   * 关闭 Toast
   */
  private static close(toast: HTMLElement): void {
    // 添加关闭动画
    toast.classList.add('closing');
    
    // 动画结束后移除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // 从队列中移除
      const index = this.queue.indexOf(toast);
      if (index !== -1) {
        this.queue.splice(index, 1);
      }
      
      // 显示下一个 Toast
      this.showNextToast();
    }, 300);
  }

  /**
   * 限制可见 Toast 数量
   */
  private static limitVisibleToasts(): void {
    if (this.queue.length > this.maxVisible) {
      // 隐藏超出的 Toast
      for (let i = 0; i < this.queue.length - this.maxVisible; i++) {
        const toast = this.queue[i];
        toast.style.display = 'none';
      }
    }
  }

  /**
   * 显示下一个 Toast
   */
  private static showNextToast(): void {
    // 查找第一个隐藏的 Toast
    for (const toast of this.queue) {
      if (toast.style.display === 'none') {
        toast.style.display = 'flex';
        
        // 重新触发显示动画
        toast.classList.remove('visible');
        setTimeout(() => {
          toast.classList.add('visible');
        }, 10);
        
        break;
      }
    }
  }
}
