import { KeyboardNavigationConfig, AccessibilityEvent } from './types';

/**
 * 键盘导航管理器
 * 提供完整的键盘导航支持，包括Tab导航、箭头键导航、快捷键等
 */
export class KeyboardNavigation {
  private config: KeyboardNavigationConfig;
  private shortcuts: Map<string, () => void> = new Map();
  private navigationGroups: Map<string, HTMLElement[]> = new Map();
  private eventListeners: Map<string, (event: AccessibilityEvent) => void> = new Map();
  private isActive: boolean = false;

  constructor(config: Partial<KeyboardNavigationConfig> = {}) {
    this.config = {
      tabNavigation: true,
      arrowKeyNavigation: true,
      shortcuts: true,
      skipLinks: true,
      focusGroups: true,
      ...config,
    };

    this.initialize();
  }

  /**
   * 初始化键盘导航
   */
  private initialize(): void {
    if (this.config.tabNavigation) {
      this.setupTabNavigation();
    }

    if (this.config.arrowKeyNavigation) {
      this.setupArrowKeyNavigation();
    }

    if (this.config.shortcuts) {
      this.setupShortcuts();
    }

    if (this.config.skipLinks) {
      this.setupSkipLinks();
    }

    this.bindGlobalEvents();
  }

  /**
   * 设置Tab键导航
   */
  private setupTabNavigation(): void {
    // 监听Tab键事件
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        this.handleTabNavigation(event);
      }
    });
  }

  /**
   * 处理Tab键导航
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const currentElement = document.activeElement as HTMLElement;
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex === -1) {
      // 如果没有当前焦点，设置第一个元素为焦点
      if (focusableElements.length > 0) {
        event.preventDefault();
        focusableElements[0].focus();
      }
      return;
    }

    let nextIndex: number;
    if (event.shiftKey) {
      // Shift+Tab: 向前导航
      nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
    } else {
      // Tab: 向后导航
      nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
    }

    event.preventDefault();
    focusableElements[nextIndex].focus();
    
    this.emitEvent('focus-change', {
      type: 'tab-navigation',
      element: focusableElements[nextIndex],
      direction: event.shiftKey ? 'backward' : 'forward'
    });
  }

  /**
   * 设置箭头键导航
   */
  private setupArrowKeyNavigation(): void {
    document.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.handleArrowKeyNavigation(event);
      }
    });
  }

  /**
   * 处理箭头键导航
   */
  private handleArrowKeyNavigation(event: KeyboardEvent): void {
    const currentElement = document.activeElement as HTMLElement;
    if (!currentElement) return;

    // 检查当前元素是否在导航组中
    const group = this.findNavigationGroup(currentElement);
    if (!group) return;

    const currentIndex = group.indexOf(currentElement);
    if (currentIndex === -1) return;

    let nextIndex: number;
    let preventDefault = false;

    switch (event.key) {
      case 'ArrowUp':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : group.length - 1;
        preventDefault = true;
        break;
      case 'ArrowDown':
        nextIndex = currentIndex < group.length - 1 ? currentIndex + 1 : 0;
        preventDefault = true;
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : group.length - 1;
        preventDefault = true;
        break;
      case 'ArrowRight':
        nextIndex = currentIndex < group.length - 1 ? currentIndex + 1 : 0;
        preventDefault = true;
        break;
      default:
        return;
    }

    if (preventDefault) {
      event.preventDefault();
      group[nextIndex].focus();
      
      this.emitEvent('focus-change', {
        type: 'arrow-navigation',
        element: group[nextIndex],
        direction: event.key
      });
    }
  }

  /**
   * 设置快捷键
   */
  private setupShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // 检查是否在输入框中
      if (this.isInInputElement(event.target as HTMLElement)) {
        return;
      }

      const key = this.getShortcutKey(event);
      const handler = this.shortcuts.get(key);
      
      if (handler) {
        event.preventDefault();
        handler();
      }
    });
  }

  /**
   * 获取快捷键组合
   */
  private getShortcutKey(event: KeyboardEvent): string {
    const modifiers: string[] = [];
    
    if (event.ctrlKey || event.metaKey) modifiers.push('Ctrl');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.altKey) modifiers.push('Alt');
    
    modifiers.push(event.key.toUpperCase());
    
    return modifiers.join('+');
  }

  /**
   * 检查是否在输入元素中
   */
  private isInInputElement(element: HTMLElement): boolean {
    if (!element) return false;
    
    const inputSelectors = [
      'input',
      'textarea',
      'select',
      '[contenteditable="true"]',
      '[role="textbox"]',
      '[role="combobox"]',
      '[role="searchbox"]'
    ];
    
    return inputSelectors.some(selector => 
      element.matches(selector) || element.closest(selector)
    );
  }

  /**
   * 设置跳过链接
   */
  private setupSkipLinks(): void {
    // 创建跳过链接
    const skipLinks = [
      { text: '跳到主要内容', target: 'main-content' },
      { text: '跳到导航', target: 'navigation' },
      { text: '跳到搜索', target: 'search' },
      { text: '跳到设置', target: 'settings' }
    ];

    skipLinks.forEach(({ text, target }) => {
      const skipLink = this.createSkipLink(text, target);
      document.body.insertBefore(skipLink, document.body.firstChild);
    });
  }

  /**
   * 创建跳过链接
   */
  private createSkipLink(text: string, targetId: string): HTMLAnchorElement {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:outline-none focus:shadow-lg';
    
    return skipLink;
  }

  /**
   * 绑定全局事件
   */
  private bindGlobalEvents(): void {
    // 监听焦点变化
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.emitEvent('focus-change', {
          type: 'focus-in',
          element: target
        });
      }
    });

    // 监听键盘事件
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.handleEscapeKey(event);
      }
    });
  }

  /**
   * 处理Escape键
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    // 关闭模态框或弹出菜单
    const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (activeModal) {
      event.preventDefault();
      this.closeModal(activeModal as HTMLElement);
    }
  }

  /**
   * 关闭模态框
   */
  private closeModal(modal: HTMLElement): void {
    // 触发关闭事件
    const closeEvent = new CustomEvent('modal-close', { detail: { modal } });
    modal.dispatchEvent(closeEvent);
    
    // 恢复焦点
    const previousFocus = modal.getAttribute('data-previous-focus');
    if (previousFocus) {
      const element = document.getElementById(previousFocus);
      if (element) {
        element.focus();
      }
    }
  }

  /**
   * 添加快捷键
   */
  public addShortcut(key: string, handler: () => void): void {
    this.shortcuts.set(key, handler);
  }

  /**
   * 移除快捷键
   */
  public removeShortcut(key: string): void {
    this.shortcuts.delete(key);
  }

  /**
   * 创建导航组
   */
  public createNavigationGroup(name: string, elements: HTMLElement[]): void {
    if (elements.length === 0) return;
    
    this.navigationGroups.set(name, elements);
    
    // 设置第一个元素为焦点
    elements[0].focus();
    
    this.emitEvent('focus-change', {
      type: 'navigation-group-created',
      element: elements[0],
      groupName: name
    });
  }

  /**
   * 查找导航组
   */
  private findNavigationGroup(element: HTMLElement): HTMLElement[] | null {
    for (const group of this.navigationGroups.values()) {
      if (group.includes(element)) {
        return group;
      }
    }
    return null;
  }

  /**
   * 获取可聚焦元素
   */
  private getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * 启用键盘导航
   */
  public enable(): void {
    this.isActive = true;
    this.emitEvent('mode-change', { type: 'enabled' });
  }

  /**
   * 禁用键盘导航
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
    const customEvent = new CustomEvent('keyboard-navigation-event', { detail: event });
    document.dispatchEvent(customEvent);
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<KeyboardNavigationConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // 重新初始化相关功能
    if (updates.tabNavigation !== undefined) {
      this.setupTabNavigation();
    }
    
    if (updates.arrowKeyNavigation !== undefined) {
      this.setupArrowKeyNavigation();
    }
    
    if (updates.shortcuts !== undefined) {
      this.setupShortcuts();
    }
    
    if (updates.skipLinks !== undefined) {
      this.setupSkipLinks();
    }
  }

  /**
   * 销毁键盘导航管理器
   */
  public destroy(): void {
    // 移除事件监听器
    this.eventListeners.clear();
    
    // 清理快捷键
    this.shortcuts.clear();
    
    // 清理导航组
    this.navigationGroups.clear();
    
    // 移除全局事件监听
    document.removeEventListener('keydown', this.handleTabNavigation.bind(this));
    document.removeEventListener('keydown', this.handleArrowKeyNavigation.bind(this));
    document.removeEventListener('keydown', this.setupShortcuts.bind(this));
    
    // 清理跳过链接
    const skipLinks = Array.from(document.body.children).filter(
      (child) => child.classList.contains('sr-only') && child.classList.contains('focus:not-sr-only')
    );
    skipLinks.forEach(link => link.remove());
    
    this.isActive = false;
  }
}
