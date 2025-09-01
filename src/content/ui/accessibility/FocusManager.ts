import { FocusConfig, AccessibilityEvent } from './types';

/**
 * 焦点管理器
 * 提供完整的焦点管理功能，包括焦点陷阱、焦点恢复、焦点指示器等
 */
export class FocusManager {
  private config: FocusConfig;
  private currentFocus: HTMLElement | null = null;
  private focusHistory: HTMLElement[] = [];
  private focusableElements: HTMLElement[] = [];
  private eventListeners: Map<string, (event: AccessibilityEvent) => void> = new Map();
  private focusTrapStack: HTMLElement[][] = [];
  private styleElement: HTMLStyleElement | null = null;

  constructor(config: Partial<FocusConfig> = {}) {
    this.config = {
      trapFocus: true,
      restoreFocus: true,
      focusIndicator: 'outline',
      focusIndicatorColor: '#3b82f6',
      focusIndicatorWidth: 2,
      ...config,
    };

    this.initializeFocusIndicators();
    this.bindGlobalEvents();
  }

  /**
   * 初始化焦点指示器样式
   */
  private initializeFocusIndicators(): void {
    const style = document.createElement('style');
    style.textContent = `
      .focus-visible {
        outline: ${this.config.focusIndicatorWidth}px solid ${this.config.focusIndicatorColor} !important;
        outline-offset: 2px !important;
      }
      
      .focus-ring {
        box-shadow: 0 0 0 ${this.config.focusIndicatorWidth}px ${this.config.focusIndicatorColor} !important;
      }
      
      .focus-custom {
        border: ${this.config.focusIndicatorWidth}px solid ${this.config.focusIndicatorColor} !important;
        border-radius: 4px !important;
      }
      
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
    `;
    document.head.appendChild(style);
    this.styleElement = style;
  }

  /**
   * 绑定全局事件
   */
  private bindGlobalEvents(): void {
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * 处理焦点进入事件
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target && target !== this.currentFocus) {
      this.currentFocus = target;
      this.focusHistory.push(target);
      
      // 限制焦点历史长度
      if (this.focusHistory.length > 50) {
        this.focusHistory.shift();
      }

      this.updateFocusIndicator(target);
      this.emitEvent('focus-change', { element: target, type: 'focus-in' });
    }
  }

  /**
   * 处理焦点离开事件
   */
  private handleFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target) {
      this.removeFocusIndicator(target);
      this.emitEvent('focus-change', { element: target, type: 'focus-out' });
    }
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.handleTabNavigation(event);
    } else if (event.key === 'Escape') {
      this.handleEscapeKey(event);
    }
  }

  /**
   * 处理Tab键导航
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    if (this.config.trapFocus && this.focusTrapStack.length > 0) {
      const currentTrap = this.focusTrapStack[this.focusTrapStack.length - 1];
      const firstElement = currentTrap[0];
      const lastElement = currentTrap[currentTrap.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * 处理Escape键
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    if (this.focusTrapStack.length > 0) {
      this.removeFocusTrap();
      this.emitEvent('focus-change', { type: 'trap-removed' });
    }
  }

  /**
   * 更新焦点指示器
   */
  private updateFocusIndicator(element: HTMLElement): void {
    this.removeFocusIndicator(element);
    
    switch (this.config.focusIndicator) {
      case 'outline':
        element.classList.add('focus-visible');
        break;
      case 'ring':
        element.classList.add('focus-ring');
        break;
      case 'custom':
        element.classList.add('focus-custom');
        break;
    }
  }

  /**
   * 移除焦点指示器
   */
  private removeFocusIndicator(element: HTMLElement): void {
    element.classList.remove('focus-visible', 'focus-ring', 'focus-custom');
  }

  /**
   * 获取可聚焦元素
   */
  public getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * 设置焦点
   */
  public setFocus(element: HTMLElement): void {
    if (element && element.focus) {
      element.focus();
      this.currentFocus = element;
      this.emitEvent('focus-change', { element, type: 'programmatic-focus' });
    }
  }

  /**
   * 获取当前焦点元素
   */
  public getCurrentFocus(): HTMLElement | null {
    return this.currentFocus;
  }

  /**
   * 下一个焦点
   */
  public nextFocus(container: HTMLElement = document.body): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const currentIndex = this.currentFocus 
      ? focusableElements.indexOf(this.currentFocus)
      : -1;
    
    const nextIndex = currentIndex < focusableElements.length - 1 
      ? currentIndex + 1 
      : 0;
    
    this.setFocus(focusableElements[nextIndex]);
  }

  /**
   * 上一个焦点
   */
  public previousFocus(container: HTMLElement = document.body): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const currentIndex = this.currentFocus 
      ? focusableElements.indexOf(this.currentFocus)
      : -1;
    
    const prevIndex = currentIndex > 0 
      ? currentIndex - 1 
      : focusableElements.length - 1;
    
    this.setFocus(focusableElements[prevIndex]);
  }

  /**
   * 创建焦点陷阱
   */
  public createFocusTrap(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    this.focusTrapStack.push(focusableElements);
    
    // 设置第一个元素为焦点
    this.setFocus(focusableElements[0]);
    
    this.emitEvent('focus-change', { 
      type: 'trap-created', 
      element: container,
      trapElements: focusableElements 
    });
  }

  /**
   * 移除焦点陷阱
   */
  public removeFocusTrap(): void {
    if (this.focusTrapStack.length > 0) {
      this.focusTrapStack.pop();
      
      // 恢复之前的焦点
      if (this.config.restoreFocus && this.focusHistory.length > 1) {
        const previousFocus = this.focusHistory[this.focusHistory.length - 2];
        if (previousFocus) {
          this.setFocus(previousFocus);
        }
      }
    }
  }

  /**
   * 跳过链接
   */
  public createSkipLink(text: string, targetId: string): HTMLAnchorElement {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:outline-none';
    
    return skipLink;
  }

  /**
   * 焦点组管理
   */
  public createFocusGroup(elements: HTMLElement[]): void {
    if (elements.length === 0) return;

    // 设置第一个元素为焦点
    this.setFocus(elements[0]);
    
    // 监听组内焦点变化
    elements.forEach(element => {
      element.addEventListener('focus', () => {
        this.currentFocus = element;
      });
    });
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
      element: this.currentFocus || undefined,
    };

    const listener = this.eventListeners.get(type);
    if (listener) {
      listener(event);
    }

    // 触发自定义事件
    const customEvent = new CustomEvent('accessibility-event', { detail: event });
    document.dispatchEvent(customEvent);
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<FocusConfig>): void {
    this.config = { ...this.config, ...updates };
    this.initializeFocusIndicators();
  }

  /**
   * 销毁焦点管理器
   */
  public destroy(): void {
    // 移除事件监听器
    this.eventListeners.clear();
    
    // 清理焦点历史
    this.focusHistory = [];
    
    // 移除焦点指示器样式
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    
    // 清理焦点陷阱
    this.focusTrapStack = [];
    
    // 移除全局事件监听
    document.removeEventListener('focusin', this.handleFocusIn.bind(this));
    document.removeEventListener('focusout', this.handleFocusOut.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
}
