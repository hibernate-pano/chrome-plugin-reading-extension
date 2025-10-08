/**
 * 文本选择工具栏
 * 用于在用户选择文本时显示复制、搜索、翻译、高亮、注释等功能
 */

import { annotationManager } from '../features/annotation/AnnotationManager';

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
    this.addAnimationStyles();
  }

  /**
   * 添加动画样式
   */
  private addAnimationStyles(): void {
    if (document.getElementById('text-selection-toolbar-styles')) return;

    const style = document.createElement('style');
    style.id = 'text-selection-toolbar-styles';
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeOutDown {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(10px);
        }
      }
      
      @keyframes slideInFromTop {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes slideOutToTop {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }
      
      .text-selection-toolbar.show {
        animation: slideInFromTop 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      .text-selection-toolbar.hide {
        animation: slideOutToTop 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      .toolbar-option:hover .toolbar-icon {
        transform: scale(1.1);
      }
      
      .toolbar-option:active .toolbar-icon {
        transform: scale(0.95);
      }
    `;
    document.head.appendChild(style);
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
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
      padding: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      background-color: ${this.theme === 'light' ? '#ffffff' : '#2d2d2d'};
      color: ${this.theme === 'light' ? '#333333' : '#ffffff'};
      border: 1px solid ${this.theme === 'light' ? '#e1e5e9' : '#404040'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;

    // 创建工具栏选项
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'toolbar-options';
    optionsContainer.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    this.options.forEach((option, index) => {
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
        padding: 8px 12px;
        border-radius: 8px;
        color: ${this.theme === 'light' ? '#333333' : '#ffffff'};
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        transform: translateY(10px);
        animation: fadeInUp 0.3s ease-out ${index * 0.05}s forwards;
        position: relative;
        overflow: hidden;
      `;
      
      // 添加悬停效果
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = this.theme === 'light' ? '#f5f5f5' : '#404040';
        button.style.transform = 'translateY(-2px) scale(1.05)';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'transparent';
        button.style.transform = 'translateY(0) scale(1)';
        button.style.boxShadow = 'none';
      });
      
      // 添加点击效果
      button.addEventListener('mousedown', () => {
        button.style.transform = 'translateY(0) scale(0.95)';
      });
      
      button.addEventListener('mouseup', () => {
        button.style.transform = 'translateY(-2px) scale(1.05)';
      });
      
      button.innerHTML = `
        <span style="font-size: 16px; transition: transform 0.2s;">${option.icon}</span>
        <span style="margin-left: 6px; font-size: 12px; font-weight: 500;">${option.label}</span>
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

    // 添加显示动画
    this.toolbar.classList.remove('hide');
    this.toolbar.classList.add('show');

    this.isVisible = true;
  }

  /**
   * 隐藏工具栏
   */
  private hideToolbar(): void {
    if (!this.toolbar || !this.isVisible) return;

    // 添加隐藏动画
    this.toolbar.classList.remove('show');
    this.toolbar.classList.add('hide');

    setTimeout(() => {
      if (this.toolbar) {
        this.toolbar.style.display = 'none';
        this.toolbar.classList.remove('hide');
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
          showToast('已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
          showToast('复制失败', 'error');
        });
    }
  },
  {
    id: 'highlight-yellow',
    icon: '🖍️',
    label: '高亮',
    action: (text: string) => {
      const annotationId = annotationManager.createHighlight(text, '#ffeb3b');
      if (annotationId) {
        showToast('高亮已添加');
      } else {
        showToast('高亮添加失败', 'error');
      }
    }
  },
  {
    id: 'note',
    icon: '📝',
    label: '注释',
    action: (text: string) => {
      const note = prompt('请输入注释内容:');
      if (note !== null && note.trim()) {
        const annotationId = annotationManager.createHighlight(text, '#a5d6a7', note.trim());
        if (annotationId) {
          showToast('注释已添加');
        } else {
          showToast('注释添加失败', 'error');
        }
      }
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

// 导出工具栏选项
export const exportToolbarOptions: ToolbarOption[] = [
  {
    id: 'export-markdown',
    icon: '📤',
    label: '导出MD',
    action: async () => {
      try {
        const content = await annotationManager.exportAnnotations({
          format: 'markdown',
          includeMetadata: true,
          includeHighlights: true,
          includeNotes: true,
          filename: `${document.title}_annotations.md`
        });
        
        annotationManager.downloadFile(
          content,
          `${document.title}_annotations.md`,
          'text/markdown'
        );
        showToast('Markdown导出成功');
      } catch (error) {
        console.error('导出失败:', error);
        showToast('导出失败', 'error');
      }
    }
  },
  {
    id: 'export-html',
    icon: '💾',
    label: '导出HTML',
    action: async () => {
      try {
        const content = await annotationManager.exportAnnotations({
          format: 'html',
          includeMetadata: true,
          includeHighlights: true,
          includeNotes: true,
          filename: `${document.title}_annotations.html`
        });
        
        annotationManager.downloadFile(
          content,
          `${document.title}_annotations.html`,
          'text/html'
        );
        showToast('HTML导出成功');
      } catch (error) {
        console.error('导出失败:', error);
        showToast('导出失败', 'error');
      }
    }
  },
  {
    id: 'export-json',
    icon: '📊',
    label: '导出JSON',
    action: async () => {
      try {
        const content = await annotationManager.exportAnnotations({
          format: 'json',
          includeMetadata: true,
          includeHighlights: true,
          includeNotes: true,
          filename: `${document.title}_annotations.json`
        });
        
        annotationManager.downloadFile(
          content,
          `${document.title}_annotations.json`,
          'application/json'
        );
        showToast('JSON导出成功');
      } catch (error) {
        console.error('导出失败:', error);
        showToast('导出失败', 'error');
      }
    }
  }
];

// 显示提示消息
function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${type === 'success' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(220, 38, 38, 0.9)'};
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    transition: opacity 0.3s ease;
  `;
  
  document.body.appendChild(toast);

  // 2秒后移除提示
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 2000);
}
