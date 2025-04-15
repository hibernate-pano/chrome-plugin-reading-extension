/**
 * 文本选择工具栏
 * 用于在用户选择文本时显示复制、搜索、翻译等功能
 */

// 工具栏选项
interface ToolbarOption {
  id: string;
  icon: string;
  label: string;
  action: (text: string) => void;
}

// 工具栏配置
interface ToolbarConfig {
  options: ToolbarOption[];
  position?: 'top' | 'bottom';
  theme?: 'light' | 'dark';
  delay?: number;
}

export class TextSelectionToolbar {
  private toolbar: HTMLElement | null = null;
  private options: ToolbarOption[] = [];
  private position: 'top' | 'bottom' = 'top';
  private theme: 'light' | 'dark' = 'light';
  private delay: number = 300;
  private timeout: number | null = null;
  private isVisible: boolean = false;
  private selectedText: string = '';

  /**
   * 构造函数
   */
  constructor(config: ToolbarConfig) {
    this.options = config.options;
    this.position = config.position || 'top';
    this.theme = config.theme || 'light';
    this.delay = config.delay || 300;

    this.createToolbar();
    this.attachEventListeners();
  }

  /**
   * 创建工具栏
   */
  private createToolbar(): void {
    // 创建工具栏元素
    this.toolbar = document.createElement('div');
    this.toolbar.className = `text-selection-toolbar ${this.theme} ${this.position}`;
    this.toolbar.style.cssText = `
      position: absolute;
      display: none;
      z-index: 9999;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      padding: 6px;
      transition: opacity 0.2s, transform 0.2s;
      opacity: 0;
      transform: translateY(10px);
      background-color: ${this.theme === 'light' ? '#ffffff' : '#333333'};
      color: ${this.theme === 'light' ? '#333333' : '#ffffff'};
      border: 1px solid ${this.theme === 'light' ? '#e0e0e0' : '#555555'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
    `;

    // 创建工具栏选项
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'toolbar-options';
    optionsContainer.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    this.options.forEach(option => {
      const button = document.createElement('button');
      button.id = `toolbar-option-${option.id}`;
      button.className = 'toolbar-option';
      button.title = option.label;
      button.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        border-radius: 4px;
        color: ${this.theme === 'light' ? '#333333' : '#ffffff'};
        transition: background-color 0.2s;
      `;
      button.innerHTML = `
        <span style="font-size: 16px;">${option.icon}</span>
        <span style="margin-left: 4px; font-size: 12px;">${option.label}</span>
      `;

      // 添加悬停效果
      button.addEventListener('mouseover', () => {
        button.style.backgroundColor = this.theme === 'light' ? '#f0f0f0' : '#444444';
      });
      button.addEventListener('mouseout', () => {
        button.style.backgroundColor = 'transparent';
      });

      // 添加点击事件
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        option.action(this.selectedText);
        this.hideToolbar();
      });

      optionsContainer.appendChild(button);
    });

    this.toolbar.appendChild(optionsContainer);
    document.body.appendChild(this.toolbar);
  }

  /**
   * 附加事件监听器
   */
  private attachEventListeners(): void {
    // 监听选择事件
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));

    // 监听点击事件，隐藏工具栏
    document.addEventListener('mousedown', (e) => {
      if (this.toolbar && !this.toolbar.contains(e.target as Node)) {
        this.hideToolbar();
      }
    });

    // 监听滚动事件，隐藏工具栏
    document.addEventListener('scroll', () => {
      this.hideToolbar();
    });

    // 监听窗口大小变化事件，隐藏工具栏
    window.addEventListener('resize', () => {
      this.hideToolbar();
    });
  }

  /**
   * 处理鼠标抬起事件
   */
  private handleMouseUp(e: MouseEvent): void {
    const selection = window.getSelection();

    if (selection && !selection.isCollapsed) {
      this.selectedText = selection.toString().trim();

      if (this.selectedText) {
        // 延迟显示工具栏，避免与其他点击事件冲突
        if (this.timeout) {
          clearTimeout(this.timeout);
        }

        this.timeout = window.setTimeout(() => {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          this.showToolbar(rect, e.clientX);
        }, this.delay);
      }
    }
  }

  /**
   * 处理选择变化事件
   */
  private handleSelectionChange(): void {
    const selection = window.getSelection();

    if (selection && selection.isCollapsed && this.isVisible) {
      this.hideToolbar();
    }
  }

  /**
   * 显示工具栏
   */
  private showToolbar(selectionRect: DOMRect, mouseX: number): void {
    if (!this.toolbar) return;

    // 计算工具栏位置
    const toolbarWidth = 200; // 估计宽度
    const toolbarHeight = 40; // 估计高度

    // 水平位置：居中于选择区域，但不超出视口
    let left = mouseX - toolbarWidth / 2;
    left = Math.max(10, left); // 不超出左边界
    left = Math.min(window.innerWidth - toolbarWidth - 10, left); // 不超出右边界

    // 垂直位置：根据配置显示在选择区域的上方或下方
    let top;
    if (this.position === 'top') {
      top = selectionRect.top - toolbarHeight - 10 + window.scrollY;
      // 如果上方空间不足，则显示在下方
      if (top < 10) {
        top = selectionRect.bottom + 10 + window.scrollY;
      }
    } else {
      top = selectionRect.bottom + 10 + window.scrollY;
      // 如果下方空间不足，则显示在上方
      if (top + toolbarHeight > window.innerHeight - 10) {
        top = selectionRect.top - toolbarHeight - 10 + window.scrollY;
      }
    }

    // 设置工具栏位置
    this.toolbar.style.left = `${left}px`;
    this.toolbar.style.top = `${top}px`;
    this.toolbar.style.display = 'block';

    // 添加动画效果
    setTimeout(() => {
      if (this.toolbar) {
        this.toolbar.style.opacity = '1';
        this.toolbar.style.transform = 'translateY(0)';
      }
    }, 10);

    this.isVisible = true;
  }

  /**
   * 隐藏工具栏
   */
  private hideToolbar(): void {
    if (!this.toolbar || !this.isVisible) return;

    this.toolbar.style.opacity = '0';
    this.toolbar.style.transform = `translateY(${this.position === 'top' ? '-10px' : '10px'})`;

    setTimeout(() => {
      if (this.toolbar) {
        this.toolbar.style.display = 'none';
      }
    }, 200);

    this.isVisible = false;
  }

  /**
   * 设置主题
   */
  public setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;

    if (this.toolbar) {
      this.toolbar.className = `text-selection-toolbar ${this.theme} ${this.position}`;
      this.toolbar.style.backgroundColor = this.theme === 'light' ? '#ffffff' : '#333333';
      this.toolbar.style.color = this.theme === 'light' ? '#333333' : '#ffffff';
      this.toolbar.style.borderColor = this.theme === 'light' ? '#e0e0e0' : '#555555';

      // 更新按钮样式
      const buttons = this.toolbar.querySelectorAll('.toolbar-option');
      buttons.forEach(button => {
        (button as HTMLElement).style.color = this.theme === 'light' ? '#333333' : '#ffffff';
      });
    }
  }

  /**
   * 设置位置
   */
  public setPosition(position: 'top' | 'bottom'): void {
    this.position = position;

    if (this.toolbar) {
      this.toolbar.className = `text-selection-toolbar ${this.theme} ${this.position}`;
    }
  }

  /**
   * 销毁工具栏
   */
  public destroy(): void {
    if (this.toolbar && document.body.contains(this.toolbar)) {
      document.body.removeChild(this.toolbar);
      this.toolbar = null;
    }

    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
  }
}

// 默认工具栏选项
export const defaultToolbarOptions: ToolbarOption[] = [
  {
    id: 'copy',
    icon: '📋',
    label: '复制',
    action: (text: string) => {
      navigator.clipboard.writeText(text)
        .then(() => {
          // 显示复制成功提示
          const toast = document.createElement('div');
          toast.textContent = '已复制到剪贴板';
          toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
          `;
          document.body.appendChild(toast);

          // 2秒后移除提示
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 2000);
        })
        .catch(err => {
          console.error('复制失败:', err);
        });
    }
  },
  {
    id: 'search',
    icon: '🔍',
    label: '搜索',
    action: (text: string) => {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
    }
  },
  {
    id: 'translate',
    icon: '🌐',
    label: '翻译',
    action: (text: string) => {
      window.open(`https://translate.google.com/?sl=auto&tl=zh-CN&text=${encodeURIComponent(text)}`, '_blank');
    }
  }
];
