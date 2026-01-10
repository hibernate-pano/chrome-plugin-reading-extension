/**
 * 可访问性工具
 * 提供ARIA标签、键盘导航等无障碍功能
 */

/**
 * 为元素添加ARIA标签
 */
export function addAriaLabel(element: HTMLElement, label: string) {
  element.setAttribute('aria-label', label);
}

/**
 * 设置元素的ARIA角色
 */
export function setAriaRole(element: HTMLElement, role: string) {
  element.setAttribute('role', role);
}

/**
 * 设置元素是否可访问
 */
export function setAriaHidden(element: HTMLElement, hidden: boolean) {
  element.setAttribute('aria-hidden', hidden.toString());
}

/**
 * 设置展开/折叠状态
 */
export function setAriaExpanded(element: HTMLElement, expanded: boolean) {
  element.setAttribute('aria-expanded', expanded.toString());
}

/**
 * 设置选中状态
 */
export function setAriaSelected(element: HTMLElement, selected: boolean) {
  element.setAttribute('aria-selected', selected.toString());
}

/**
 * 设置禁用状态
 */
export function setAriaDisabled(element: HTMLElement, disabled: boolean) {
  element.setAttribute('aria-disabled', disabled.toString());
}

/**
 * 键盘导航管理器
 */
export class KeyboardNavigationManager {
  private focusableElements: HTMLElement[] = [];
  private currentIndex = -1;

  /**
   * 初始化键盘导航
   */
  init(container: HTMLElement) {
    this.updateFocusableElements(container);
    this.attachEventListeners(container);
  }

  /**
   * 更新可聚焦元素列表
   */
  private updateFocusableElements(container: HTMLElement) {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    this.focusableElements = Array.from(container.querySelectorAll(selector));
  }

  /**
   * 附加事件监听器
   */
  private attachEventListeners(container: HTMLElement) {
    container.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Tab':
          this.handleTab(e);
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          if (this.shouldHandleArrowKeys(e.target as HTMLElement)) {
            this.handleArrowKeys(e);
          }
          break;
        case 'Home':
          this.focusFirst();
          e.preventDefault();
          break;
        case 'End':
          this.focusLast();
          e.preventDefault();
          break;
      }
    });
  }

  /**
   * 处理Tab键
   */
  private handleTab(e: KeyboardEvent) {
    if (this.focusableElements.length === 0) return;

    const currentElement = document.activeElement as HTMLElement;
    this.currentIndex = this.focusableElements.indexOf(currentElement);

    if (e.shiftKey) {
      // Shift+Tab - 向前
      if (this.currentIndex === 0) {
        e.preventDefault();
        this.focusLast();
      }
    } else {
      // Tab - 向后
      if (this.currentIndex === this.focusableElements.length - 1) {
        e.preventDefault();
        this.focusFirst();
      }
    }
  }

  /**
   * 处理箭头键
   */
  private handleArrowKeys(e: KeyboardEvent) {
    e.preventDefault();

    if (e.key === 'ArrowDown') {
      this.focusNext();
    } else if (e.key === 'ArrowUp') {
      this.focusPrevious();
    }
  }

  /**
   * 是否应该处理箭头键
   */
  private shouldHandleArrowKeys(element: HTMLElement): boolean {
    const role = element.getAttribute('role');
    return role === 'menu' || role === 'listbox' || role === 'tree';
  }

  /**
   * 聚焦下一个元素
   */
  focusNext() {
    if (this.focusableElements.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentIndex]?.focus();
  }

  /**
   * 聚焦上一个元素
   */
  focusPrevious() {
    if (this.focusableElements.length === 0) return;

    this.currentIndex =
      (this.currentIndex - 1 + this.focusableElements.length) % this.focusableElements.length;
    this.focusableElements[this.currentIndex]?.focus();
  }

  /**
   * 聚焦第一个元素
   */
  focusFirst() {
    if (this.focusableElements.length === 0) return;

    this.currentIndex = 0;
    this.focusableElements[0]?.focus();
  }

  /**
   * 聚焦最后一个元素
   */
  focusLast() {
    if (this.focusableElements.length === 0) return;

    this.currentIndex = this.focusableElements.length - 1;
    this.focusableElements[this.currentIndex]?.focus();
  }
}

/**
 * 焦点陷阱（用于模态框等）
 */
export class FocusTrap {
  private previousActiveElement: HTMLElement | null = null;

  /**
   * 激活焦点陷阱
   */
  activate(container: HTMLElement) {
    this.previousActiveElement = document.activeElement as HTMLElement;

    // 聚焦到容器内第一个可聚焦元素
    const firstFocusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    firstFocusable?.focus();

    // 监听Tab键
    container.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 停用焦点陷阱
   */
  deactivate(container: HTMLElement) {
    container.removeEventListener('keydown', this.handleKeyDown);

    // 恢复之前的焦点
    this.previousActiveElement?.focus();
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const container = e.currentTarget as HTMLElement;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };
}

/**
 * 宣布消息给屏幕阅读器
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';

  document.body.appendChild(announcement);

  // 延迟设置内容以确保屏幕阅读器能捕获
  setTimeout(() => {
    announcement.textContent = message;
  }, 100);

  // 清理
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
