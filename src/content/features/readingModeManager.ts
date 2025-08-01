/**
 * 阅读模式管理器 - 基于 Shadcn/UI 设计系统
 * 负责阅读模式的启用、禁用和样式管理
 */

import { UserSettings } from '../../types';
import { getStorage, setStorage, StorageKeys } from '../../storage/storage';
import { MESSAGE_TYPES } from '../../constants';
import { mountFloatingUI } from '../ui/FloatingUIManager';

export class ReadingModeManager {
  private isActive = false;
  private originalContent: HTMLElement | null = null;
  private readerContainer: HTMLElement | null = null;
  private settings: UserSettings;
  private styleElement: HTMLStyleElement | null = null;
  private floatingUICleanup: (() => void) | null = null;

  constructor(settings: UserSettings) {
    this.settings = settings;
    this.initializeStyles();
  }

  /**
   * 初始化阅读模式样式
   */
  private initializeStyles(): void {
    if (this.styleElement) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'reading-mode-styles';
    document.head.appendChild(this.styleElement);
    this.updateStyles();
  }

  /**
   * 更新样式变量
   */
  private updateStyles(): void {
    if (!this.styleElement) return;

    const { fontSize, lineHeight, paragraphSpacing, fontFamily, backgroundColor, theme } = this.settings;

    const cssVariables = `
      :root {
        --reading-font-size: ${fontSize}px;
        --reading-line-height: ${lineHeight};
        --reading-paragraph-spacing: ${paragraphSpacing}px;
        --reading-font-family: ${fontFamily};
      }
    `;

    this.styleElement.textContent = cssVariables;
  }

  /**
   * 启用阅读模式
   */
  async enable(): Promise<void> {
    if (this.isActive) return;

    try {
      // 提取内容
      const content = await this.extractContent();
      if (!content) {
        throw new Error('无法提取页面内容');
      }

      // 保存原始内容
      this.originalContent = document.body.cloneNode(true) as HTMLElement;

      // 创建阅读容器
      this.createReaderContainer(content);

      // 应用阅读模式样式
      this.applyReaderStyles();

      this.isActive = true;

      // 挂载浮动UI
      this.mountFloatingUI();

      // 通知背景脚本
      chrome.runtime.sendMessage({
        type: 'READING_MODE_ENABLED',
        url: window.location.href
      });

    } catch (error) {
      console.error('启用阅读模式失败:', error);
      throw error;
    }
  }

  /**
   * 禁用阅读模式
   */
  disable(): void {
    if (!this.isActive) return;

    try {
      // 恢复原始内容
      if (this.originalContent) {
        document.body.innerHTML = this.originalContent.innerHTML;
      }

      // 移除阅读模式样式
      this.removeReaderStyles();

      // 清理
      this.readerContainer = null;
      this.originalContent = null;
      this.isActive = false;

      // 清理浮动UI
      this.cleanupFloatingUI();

      // 通知背景脚本
      chrome.runtime.sendMessage({
        type: 'READING_MODE_DISABLED',
        url: window.location.href
      });

    } catch (error) {
      console.error('禁用阅读模式失败:', error);
    }
  }

  /**
   * 切换阅读模式
   */
  async toggle(): Promise<void> {
    if (this.isActive) {
      this.disable();
    } else {
      await this.enable();
    }
  }

  /**
   * 更新设置
   */
  updateSettings(newSettings: Partial<UserSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.updateStyles();

    if (this.isActive && this.readerContainer) {
      this.applySettingsToContainer();
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): { isActive: boolean; settings: UserSettings } {
    return {
      isActive: this.isActive,
      settings: this.settings
    };
  }

  /**
   * 提取页面内容
   */
  private async extractContent(): Promise<string | null> {
    try {
      // 使用 @mozilla/readability 提取内容
      const { Readability } = await import('@mozilla/readability');
      
      const documentClone = document.cloneNode(true) as Document;
      const reader = new Readability(documentClone);
      const article = reader.parse();

      if (article && article.content) {
        return `
          <article class="reading-mode-content">
            <h1 class="reading-mode-title">${article.title || document.title}</h1>
            ${article.byline ? `<div class="reading-mode-subtitle">${article.byline}</div>` : ''}
            <div class="reading-mode-body">${article.content}</div>
          </article>
        `;
      }

      return null;
    } catch (error) {
      console.error('内容提取失败:', error);
      return null;
    }
  }

  /**
   * 创建阅读容器
   */
  private createReaderContainer(content: string): void {
    // 清空 body
    document.body.innerHTML = '';

    // 创建阅读容器
    this.readerContainer = document.createElement('div');
    this.readerContainer.className = 'reading-mode-container';
    this.readerContainer.innerHTML = content;

    document.body.appendChild(this.readerContainer);
    this.applySettingsToContainer();
  }

  /**
   * 应用设置到容器
   */
  private applySettingsToContainer(): void {
    if (!this.readerContainer) return;

    const { backgroundColor, theme } = this.settings;

    // 移除旧的主题类
    this.readerContainer.className = 'reading-mode-container';

    // 添加新的主题类
    if (backgroundColor && backgroundColor !== 'default') {
      this.readerContainer.classList.add(`paper-${backgroundColor}`);
    }

    if (theme === 'dark') {
      this.readerContainer.classList.add('dark');
    }
  }

  /**
   * 应用阅读模式样式
   */
  private applyReaderStyles(): void {
    document.documentElement.classList.add('reading-mode-active');
    document.body.style.overflow = 'auto';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }

  /**
   * 移除阅读模式样式
   */
  private removeReaderStyles(): void {
    document.documentElement.classList.remove('reading-mode-active');
    document.body.style.overflow = '';
    document.body.style.margin = '';
    document.body.style.padding = '';
  }

  /**
   * 挂载浮动UI
   */
  private mountFloatingUI(): void {
    if (this.floatingUICleanup) {
      this.floatingUICleanup();
    }

    this.floatingUICleanup = mountFloatingUI({
      isReadingModeActive: this.isActive,
      settings: this.settings,
      onSettingsChange: (key: keyof UserSettings, value: any) => {
        this.updateSettings({ [key]: value });
      },
      onToggleReadingMode: () => {
        this.toggle();
      },
    });
  }

  /**
   * 清理浮动UI
   */
  private cleanupFloatingUI(): void {
    if (this.floatingUICleanup) {
      this.floatingUICleanup();
      this.floatingUICleanup = null;
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.isActive) {
      this.disable();
    }

    this.cleanupFloatingUI();

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }
}
