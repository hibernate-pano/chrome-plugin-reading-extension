/**
 * 加载状态管理器
 * 管理各种操作的加载状态，提供统一的加载指示器
 */

export interface LoadingState {
  id: string;
  message: string;
  progress?: number;
  startTime: number;
  timeout?: number;
}

export interface LoadingOptions {
  message: string;
  progress?: number;
  timeout?: number;
  showProgress?: boolean;
}

/**
 * 加载状态管理器
 */
export class LoadingStateManager {
  private static instance: LoadingStateManager;
  private loadingStates = new Map<string, LoadingState>();
  private loadingContainer: HTMLElement | null = null;
  private isContainerCreated = false;

  private constructor() {
    // 延迟初始化 DOM，避免在未使用时污染页面
  }

  public static getInstance(): LoadingStateManager {
    if (!LoadingStateManager.instance) {
      LoadingStateManager.instance = new LoadingStateManager();
    }
    return LoadingStateManager.instance;
  }

  /**
   * 确保加载指示器容器存在
   */
  private ensureContainer(): void {
    if (this.isContainerCreated && this.loadingContainer) {
      return;
    }

    this.loadingContainer = document.createElement('div');
    this.loadingContainer.id = 'reading-extension-loading-container';
    this.loadingContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      display: none;
      flex-direction: column;
      gap: 8px;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    document.body.appendChild(this.loadingContainer);
    this.isContainerCreated = true;
  }

  /**
   * 创建加载指示器容器
   */
  private createLoadingContainer(): void {
    // 保留旧方法以兼容, 但内部只调用 ensureContainer
    this.ensureContainer();
  }

  /**
   * 确保动画样式已注入
   */
  private ensureAnimationStyles(): void {
    if (document.getElementById('loading-animations')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'loading-animations';
    style.textContent = `
      @keyframes reading-extension-slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes reading-extension-slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      @keyframes reading-extension-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes reading-extension-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .reading-extension-loading-item {
        animation: reading-extension-slideInRight 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 显示加载状态
   */
  public showLoading(id: string, options: LoadingOptions): void {
    this.ensureContainer();

    const loadingState: LoadingState = {
      id,
      message: options.message,
      progress: options.progress,
      startTime: Date.now(),
      timeout: options.timeout
    };

    this.loadingStates.set(id, loadingState);
    this.updateLoadingUI();

    // 设置超时
    if (options.timeout) {
      setTimeout(() => {
        this.hideLoading(id);
      }, options.timeout);
    }
  }

  /**
   * 更新加载进度
   */
  public updateProgress(id: string, progress: number, message?: string): void {
    const loadingState = this.loadingStates.get(id);
    if (loadingState) {
      loadingState.progress = Math.max(0, Math.min(100, progress));
      if (message) {
        loadingState.message = message;
      }
      this.updateLoadingUI();
    }
  }

  /**
   * 隐藏加载状态
   */
  public hideLoading(id: string): void {
    this.loadingStates.delete(id);
    this.updateLoadingUI();
  }

  /**
   * 隐藏所有加载状态
   */
  public hideAllLoading(): void {
    this.loadingStates.clear();
    this.updateLoadingUI();
  }

  /**
   * 获取加载状态
   */
  public getLoadingState(id: string): LoadingState | null {
    return this.loadingStates.get(id) || null;
  }

  /**
   * 检查是否有加载状态
   */
  public hasLoading(): boolean {
    return this.loadingStates.size > 0;
  }

  /**
   * 更新加载UI
   */
  private updateLoadingUI(): void {
    if (!this.loadingContainer) return;

    if (this.loadingStates.size === 0) {
      this.loadingContainer.style.display = 'none';
      return;
    }

    this.loadingContainer.style.display = 'flex';
    this.loadingContainer.innerHTML = '';

    for (const [id, state] of this.loadingStates) {
      const loadingItem = this.createLoadingItem(id, state);
      this.loadingContainer.appendChild(loadingItem);
    }
  }

  /**
   * 创建单个加载项
   */
  private createLoadingItem(id: string, state: LoadingState): HTMLElement {
    this.ensureAnimationStyles();

    const item = document.createElement('div');
    item.className = 'reading-extension-loading-item';
    item.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      min-width: 200px;
    `;

    // 创建内容
    const content = document.createElement('div');
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    // 加载图标
    const icon = document.createElement('div');
    icon.className = 'loading-icon';
    icon.style.cssText = `
      width: 20px;
      height: 20px;
      border: 2px solid #e1e5e9;
      border-top: 2px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      flex-shrink: 0;
    `;

    // 文本内容
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `
      flex: 1;
      min-width: 0;
    `;

    const message = document.createElement('div');
    message.className = 'loading-message';
    message.textContent = state.message;
    message.style.cssText = `
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    textContainer.appendChild(message);

    // 进度条（如果有进度）
    if (state.progress !== undefined) {
      const progressContainer = document.createElement('div');
      progressContainer.style.cssText = `
        width: 100%;
        height: 4px;
        background: #e1e5e9;
        border-radius: 2px;
        overflow: hidden;
        margin-top: 4px;
      `;

      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        height: 100%;
        background: linear-gradient(90deg, #007bff, #0056b3);
        border-radius: 2px;
        width: ${state.progress}%;
        transition: width 0.3s ease;
      `;

      progressContainer.appendChild(progressBar);
      textContainer.appendChild(progressContainer);
    }

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 18px;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    `;

    closeButton.addEventListener('click', () => {
      this.hideLoading(id);
    });

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = '#f0f0f0';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'transparent';
    });

    content.appendChild(icon);
    content.appendChild(textContainer);
    content.appendChild(closeButton);
    item.appendChild(content);

    return item;
  }

  /**
   * 显示成功消息
   */
  public showSuccess(id: string, message: string, duration: number = 3000): void {
    this.showLoading(id, { message, timeout: duration });
    
    // 更新为成功样式
    setTimeout(() => {
      const item = this.loadingContainer?.querySelector(`[data-id="${id}"]`);
      if (item) {
        const icon = item.querySelector('.loading-icon') as HTMLElement;
        if (icon) {
          icon.style.cssText = `
            width: 20px;
            height: 20px;
            background: #28a745;
            border: none;
            border-radius: 50%;
            animation: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
          `;
          icon.textContent = '✓';
        }
      }
    }, 100);
  }

  /**
   * 显示错误消息
   */
  public showError(id: string, message: string, duration: number = 5000): void {
    this.showLoading(id, { message, timeout: duration });
    
    // 更新为错误样式
    setTimeout(() => {
      const item = this.loadingContainer?.querySelector(`[data-id="${id}"]`);
      if (item) {
        const icon = item.querySelector('.loading-icon') as HTMLElement;
        if (icon) {
          icon.style.cssText = `
            width: 20px;
            height: 20px;
            background: #dc3545;
            border: none;
            border-radius: 50%;
            animation: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
          `;
          icon.textContent = '!';
        }
      }
    }, 100);
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.hideAllLoading();
    this.destroy();
  }

  /**
   * 销毁管理器，释放资源
   */
  public destroy(): void {
    this.hideAllLoading();

    if (this.loadingContainer && this.loadingContainer.parentNode) {
      this.loadingContainer.parentNode.removeChild(this.loadingContainer);
    }
    this.loadingContainer = null;
    this.isContainerCreated = false;
  }
}

// 导出单例实例
export const loadingStateManager = LoadingStateManager.getInstance();
