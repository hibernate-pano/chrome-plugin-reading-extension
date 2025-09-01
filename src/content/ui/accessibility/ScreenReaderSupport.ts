import { ScreenReaderConfig, AccessibilityEvent } from './types';

/**
 * 屏幕阅读器支持管理器
 * 提供实时区域更新、状态通知、错误提示等功能
 */
export class ScreenReaderSupport {
  private config: ScreenReaderConfig;
  private liveRegions: Map<string, HTMLElement> = new Map();
  private eventListeners: Map<string, (event: AccessibilityEvent) => void> = new Map();
  private isActive: boolean = false;

  constructor(config: Partial<ScreenReaderConfig> = {}) {
    this.config = {
      liveRegions: true,
      statusUpdates: true,
      errorNotifications: true,
      progressIndicators: true,
      navigationHints: true,
      ...config,
    };

    this.initialize();
  }

  /**
   * 初始化屏幕阅读器支持
   */
  private initialize(): void {
    if (this.config.liveRegions) {
      this.setupLiveRegions();
    }

    if (this.config.statusUpdates) {
      this.setupStatusUpdates();
    }

    if (this.config.errorNotifications) {
      this.setupErrorNotifications();
    }

    if (this.config.progressIndicators) {
      this.setupProgressIndicators();
    }

    if (this.config.navigationHints) {
      this.setupNavigationHints();
    }

    this.bindGlobalEvents();
  }

  /**
   * 设置实时区域
   */
  private setupLiveRegions(): void {
    // 创建默认的实时区域
    const regions = [
      { id: 'status', ariaLive: 'polite', label: '状态更新' },
      { id: 'errors', ariaLive: 'assertive', label: '错误通知' },
      { id: 'progress', ariaLive: 'polite', label: '进度信息' },
      { id: 'navigation', ariaLive: 'polite', label: '导航提示' }
    ];

    regions.forEach(({ id, ariaLive, label }) => {
      this.createLiveRegion(id, ariaLive, label);
    });
  }

  /**
   * 创建实时区域
   */
  public createLiveRegion(id: string, ariaLive: 'polite' | 'assertive' | 'off' = 'polite', label?: string): HTMLElement {
    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', ariaLive);
    region.setAttribute('aria-label', label || id);
    region.className = 'sr-only';
    
    // 添加到页面
    document.body.appendChild(region);
    this.liveRegions.set(id, region);
    
    return region;
  }

  /**
   * 更新实时区域内容
   */
  public updateLiveRegion(id: string, message: string, priority: 'low' | 'high' = 'low'): void {
    const region = this.liveRegions.get(id);
    if (!region) return;

    // 清除之前的内容
    region.textContent = '';
    
    // 设置新的内容
    region.textContent = message;
    
    // 根据优先级设置aria-live
    if (priority === 'high') {
      region.setAttribute('aria-live', 'assertive');
    } else {
      region.setAttribute('aria-live', 'polite');
    }

    this.emitEvent('live-region-update', {
      regionId: id,
      message,
      priority
    });

    // 延迟清除内容，确保屏幕阅读器能够读取
    setTimeout(() => {
      if (region.textContent === message) {
        region.textContent = '';
      }
    }, 1000);
  }

  /**
   * 设置状态更新
   */
  private setupStatusUpdates(): void {
    // 监听自定义状态更新事件
    document.addEventListener('status-update', (event: CustomEvent) => {
      const { message, priority = 'low' } = event.detail;
      this.updateLiveRegion('status', message, priority);
    });
  }

  /**
   * 设置错误通知
   */
  private setupErrorNotifications(): void {
    // 监听错误事件
    document.addEventListener('error-notification', (event: CustomEvent) => {
      const { message, priority = 'high' } = event.detail;
      this.updateLiveRegion('errors', message, priority);
    });

    // 监听全局错误
    window.addEventListener('error', (event) => {
      this.updateLiveRegion('errors', `发生错误: ${event.message}`, 'high');
    });

    // 监听未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.updateLiveRegion('errors', `未处理的Promise拒绝: ${event.reason}`, 'high');
    });
  }

  /**
   * 设置进度指示器
   */
  private setupProgressIndicators(): void {
    // 监听进度更新事件
    document.addEventListener('progress-update', (event: CustomEvent) => {
      const { message, progress, total } = event.detail;
      const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
      const progressMessage = `${message}: ${percentage}%`;
      
      this.updateLiveRegion('progress', progressMessage);
    });
  }

  /**
   * 设置导航提示
   */
  private setupNavigationHints(): void {
    // 监听导航事件
    document.addEventListener('navigation-hint', (event: CustomEvent) => {
      const { message, priority = 'low' } = event.detail;
      this.updateLiveRegion('navigation', message, priority);
    });
  }

  /**
   * 绑定全局事件
   */
  private bindGlobalEvents(): void {
    // 监听焦点变化，提供导航提示
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.provideNavigationHint(target);
      }
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateLiveRegion('status', '页面已恢复可见', 'low');
      }
    });
  }

  /**
   * 提供导航提示
   */
  private provideNavigationHint(element: HTMLElement): void {
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledby = element.getAttribute('aria-labelledby');
    const tagName = element.tagName.toLowerCase();
    
    let hint = '';

    if (role) {
      hint = this.getRoleHint(role, element);
    } else if (tagName === 'button') {
      hint = '按钮';
    } else if (tagName === 'a') {
      hint = '链接';
    } else if (tagName === 'input') {
      hint = '输入框';
    } else if (tagName === 'select') {
      hint = '下拉选择';
    }

    if (ariaLabel) {
      hint += `: ${ariaLabel}`;
    } else if (ariaLabelledby) {
      const labelElement = document.getElementById(ariaLabelledby);
      if (labelElement) {
        hint += `: ${labelElement.textContent}`;
      }
    } else if (element.textContent && element.textContent.trim()) {
      hint += `: ${element.textContent.trim()}`;
    }

    if (hint) {
      this.updateLiveRegion('navigation', hint, 'low');
    }
  }

  /**
   * 获取角色提示
   */
  private getRoleHint(role: string, element: HTMLElement): string {
    const roleHints: Record<string, string> = {
      'button': '按钮',
      'link': '链接',
      'textbox': '文本输入框',
      'combobox': '组合框',
      'listbox': '列表框',
      'menuitem': '菜单项',
      'menubar': '菜单栏',
      'tab': '标签页',
      'tabpanel': '标签面板',
      'dialog': '对话框',
      'alert': '警告',
      'status': '状态',
      'progressbar': '进度条',
      'slider': '滑块',
      'checkbox': '复选框',
      'radio': '单选按钮',
      'switch': '开关',
      'searchbox': '搜索框',
      'tree': '树形结构',
      'treeitem': '树形项目'
    };

    return roleHints[role] || role;
  }

  /**
   * 通知状态更新
   */
  public notifyStatus(message: string, priority: 'low' | 'high' = 'low'): void {
    this.updateLiveRegion('status', message, priority);
  }

  /**
   * 通知错误
   */
  public notifyError(message: string, priority: 'low' | 'high' = 'high'): void {
    this.updateLiveRegion('errors', message, priority);
  }

  /**
   * 更新进度
   */
  public updateProgress(message: string, progress: number, total: number): void {
    const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
    const progressMessage = `${message}: ${percentage}%`;
    
    this.updateLiveRegion('progress', progressMessage);
  }

  /**
   * 提供导航提示
   */
  public provideHint(message: string, priority: 'low' | 'high' = 'low'): void {
    this.updateLiveRegion('navigation', message, priority);
  }

  /**
   * 创建进度条
   */
  public createProgressBar(id: string, label: string): HTMLElement {
    const progressContainer = document.createElement('div');
    progressContainer.id = id;
    progressContainer.setAttribute('role', 'progressbar');
    progressContainer.setAttribute('aria-label', label);
    progressContainer.setAttribute('aria-valuemin', '0');
    progressContainer.setAttribute('aria-valuemax', '100');
    progressContainer.setAttribute('aria-valuenow', '0');
    
    const progressBar = document.createElement('div');
    progressBar.setAttribute('role', 'progressbar');
    progressBar.className = 'progress-bar';
    
    progressContainer.appendChild(progressBar);
    
    return progressContainer;
  }

  /**
   * 更新进度条
   */
  public updateProgressBar(id: string, value: number, max: number = 100): void {
    const progressContainer = document.getElementById(id);
    if (!progressContainer) return;

    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    progressContainer.setAttribute('aria-valuenow', percentage.toString());
    progressContainer.setAttribute('aria-valuetext', `${percentage}%`);
    
    const progressBar = progressContainer.querySelector('.progress-bar') as HTMLElement;
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }

    // 通知屏幕阅读器
    this.updateProgress('进度更新', value, max);
  }

  /**
   * 创建状态指示器
   */
  public createStatusIndicator(id: string, label: string): HTMLElement {
    const statusContainer = document.createElement('div');
    statusContainer.id = id;
    statusContainer.setAttribute('role', 'status');
    statusContainer.setAttribute('aria-live', 'polite');
    statusContainer.setAttribute('aria-label', label);
    statusContainer.className = 'sr-only';
    
    return statusContainer;
  }

  /**
   * 更新状态指示器
   */
  public updateStatusIndicator(id: string, message: string): void {
    const statusContainer = document.getElementById(id);
    if (!statusContainer) return;

    statusContainer.textContent = message;
    
    // 通知屏幕阅读器
    this.notifyStatus(message);
  }

  /**
   * 启用屏幕阅读器支持
   */
  public enable(): void {
    this.isActive = true;
    this.emitEvent('mode-change', { type: 'enabled' });
  }

  /**
   * 禁用屏幕阅读器支持
   */
  public disable(): void {
    this.isActive = false;
    this.emitEvent('mode-change', { type: 'disabled' });
  }

  /**
   * 检查是否启用
   */
  public isEnabled(): boolean {
    return this.isActive;
  }

  /**
   * 添加事件监听器
   */
  public addEventListener(type: string, listener: (event: AccessibilityEvent) => void): void {
    this.eventListeners.set(type, listener);
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener(type: string): void {
    this.eventListeners.delete(type);
  }

  /**
   * 发送事件
   */
  private emitEvent(type: string, data: any): void {
    const event: AccessibilityEvent = {
      type: type as any,
      data,
      timestamp: Date.now(),
    };

    const listener = this.eventListeners.get(type);
    if (listener) {
      listener(event);
    }

    // 触发自定义事件
    const customEvent = new CustomEvent('screen-reader-event', { detail: event });
    document.dispatchEvent(customEvent);
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<ScreenReaderConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // 重新初始化相关功能
    if (updates.liveRegions !== undefined) {
      this.setupLiveRegions();
    }
    
    if (updates.statusUpdates !== undefined) {
      this.setupStatusUpdates();
    }
    
    if (updates.errorNotifications !== undefined) {
      this.setupErrorNotifications();
    }
    
    if (updates.progressIndicators !== undefined) {
      this.setupProgressIndicators();
    }
    
    if (updates.navigationHints !== undefined) {
      this.setupNavigationHints();
    }
  }

  /**
   * 销毁屏幕阅读器支持管理器
   */
  public destroy(): void {
    // 移除事件监听器
    this.eventListeners.clear();
    
    // 清理实时区域
    this.liveRegions.forEach(region => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });
    this.liveRegions.clear();
    
    // 清理状态通知
    // this.statusNotifications.forEach(notification => {
    //   if (notification.parentNode) {
    //     notification.parentNode.removeChild(notification);
    //   }
    // });
    // this.statusNotifications = [];
    
    // 清理错误通知
    // this.errorNotifications.forEach(notification => {
    //   if (notification.parentNode) {
    //     notification.parentNode.removeChild(notification);
    //   }
    // });
    // this.errorNotifications = [];
    
    // 清理进度指示器
    // this.progressIndicators.forEach(indicator => {
    //   if (indicator.parentNode) {
    //     indicator.parentNode.removeChild(indicator);
    //   }
    // });
    // this.progressIndicators = [];
    
    this.isActive = false;
  }
}
