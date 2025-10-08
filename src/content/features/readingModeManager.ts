/**
 * 阅读模式管理器 - 基于 Shadcn/UI 设计系统
 * 负责阅读模式的启用、禁用和样式管理
 */

import { UserSettings } from '../../types';
import { getStorage, StorageKeys } from '../../storage/storage';
import { MESSAGE_TYPES } from '../../constants';
import { mountNewFloatingUI } from '../ui/NewFloatingUIManager';
import { cacheStrategyManager } from '../dynamic/CacheStrategyManager';
import { ExtractorFactory } from '../extractors/ExtractorFactory';
import { mountReadingSettingsPanel, unmountReadingSettingsPanel, updateReadingSettingsPanelSettings } from '../ui/ReadingSettingsPanelManager';

export class ReadingModeManager {
  private isActive = false;
  private readerContainer: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private settings: UserSettings;
  private styleElement: HTMLStyleElement | null = null;
  private floatingUICleanup: (() => void) | null = null;
  private settingsPanelCleanup: (() => void) | null = null;
  private previousBodyOverflow: string | null = null;
  private previousBodyPaddingRight: string | null = null;
  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.disable().catch((error) => {
        console.error('退出阅读模式时发生错误:', error);
      });
    }
  };

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

    const { fontSize, lineHeight, paragraphSpacing, fontFamily, pageWidth, theme } = this.settings;

    // 字体映射
    const fontFamilyMap: Record<string, string> = {
      default: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      songti: '"Songti SC", "SimSun", STSong, serif',
      heiti: '"Heiti SC", "SimHei", STHeiti, sans-serif',
      kaiti: '"Kaiti SC", "KaiTi", STKaiti, serif',
      fangsong: '"Fangsong SC", "FangSong", STFangsong, serif',
      georgia: 'Georgia, serif',
      times: '"Times New Roman", Times, serif',
    };

    const actualFontFamily = fontFamilyMap[fontFamily] || fontFamilyMap.default;

    // 主题颜色
    let bgColor = '#ffffff';
    let textColor = '#1a1a1a';
    
    if (theme === 'dark') {
      bgColor = '#0f172a'; // slate-900
      textColor = '#f1f5f9'; // slate-100
    } else if (theme === 'sepia') {
      bgColor = '#f5f2e9';
      textColor = '#4a3728';
    }

    const cssVariables = `
      :root {
        --reading-font-size: ${fontSize}px;
        --reading-line-height: ${lineHeight};
        --reading-paragraph-spacing: ${paragraphSpacing}em;
        --font-reading: ${actualFontFamily};
        --reading-page-width: ${pageWidth}px;
        --reading-bg-color: ${bgColor};
        --reading-text-color: ${textColor};
      }
      
      .reading-mode-container {
        font-family: ${actualFontFamily} !important;
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        background-color: ${bgColor} !important;
        color: ${textColor} !important;
        max-width: ${pageWidth}px !important;
      }
      
      .reading-mode-content,
      .reading-mode-body {
        font-family: ${actualFontFamily} !important;
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        color: ${textColor} !important;
      }
      
      .reading-mode-content p,
      .reading-mode-body p {
        margin-bottom: ${paragraphSpacing}em !important;
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        color: ${textColor} !important;
      }
      
      .reading-mode-content div,
      .reading-mode-content span,
      .reading-mode-body div,
      .reading-mode-body span {
        font-size: inherit !important;
        line-height: inherit !important;
        color: inherit !important;
      }
      
      .reading-mode-content li,
      .reading-mode-body li {
        color: ${textColor} !important;
      }
      
      .reading-mode-content blockquote,
      .reading-mode-body blockquote {
        color: ${textColor} !important;
        opacity: 0.9;
      }
      
      .reading-mode-title,
      .reading-mode-content h1,
      .reading-mode-content h2,
      .reading-mode-content h3,
      .reading-mode-content h4,
      .reading-mode-content h5,
      .reading-mode-content h6 {
        color: ${textColor} !important;
        font-family: ${actualFontFamily} !important;
      }
      
      .reading-mode-content a {
        color: ${theme === 'dark' ? '#60a5fa' : '#2563eb'} !important;
      }
    `;

    this.styleElement.textContent = cssVariables;
  }

  /**
   * 启用阅读模式
   */
  async enable(): Promise<boolean> {
    if (this.isActive) return true;

    try {
      // 提取内容
      const content = await this.extractContent();
      
      if (!content) {
        throw new Error('无法提取页面内容');
      }

      // 创建阅读容器
      this.createReaderContainer(content);

      // 应用阅读模式样式
      this.applyReaderStyles();

      this.isActive = true;

      // 挂载浮动UI
      this.mountFloatingUI();

      // 挂载设置面板
      this.mountSettingsPanel();

      document.removeEventListener('keydown', this.handleKeydown);
      document.addEventListener('keydown', this.handleKeydown);

      await this.notifyBackground(MESSAGE_TYPES.READING_MODE_ENABLED);

      if (this.overlayElement) {
        // 聚焦覆盖层，便于辅助功能
        this.overlayElement.focus({ preventScroll: true });
      }

      return true;
    } catch (error) {
      console.error('启用阅读模式失败:', error);
      this.teardownReaderContainer();
      this.removeReaderStyles();
      throw error;
    }
  }

  /**
   * 禁用阅读模式
   */
  async disable(): Promise<boolean> {
    if (!this.isActive) return false;

    try {
      this.teardownReaderContainer();

      // 移除阅读模式样式
      this.removeReaderStyles();

      // 清理
      this.isActive = false;

      // 清理浮动UI
      this.cleanupFloatingUI();

      // 清理设置面板
      this.cleanupSettingsPanel();

      document.removeEventListener('keydown', this.handleKeydown);

      await this.notifyBackground(MESSAGE_TYPES.READING_MODE_DISABLED);

      return false;
    } catch (error) {
      console.error('禁用阅读模式失败:', error);
      return false;
    }
  }

  /**
   * 切换阅读模式
   */
  async toggle(): Promise<boolean> {
    if (this.isActive) {
      await this.disable();
      return false;
    } else {
      return this.enable();
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

    // 更新设置面板的显示值（但不重新挂载整个组件）
    if (this.isActive && this.settingsPanelCleanup) {
      updateReadingSettingsPanelSettings(this.settings);
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
      await cacheStrategyManager.initialize();
      const url = window.location.href;
      const cacheKey = `extract:${url}`;
      const cached = cacheStrategyManager.get<any>(cacheKey);
      if (cached && cached.content) {
        return this.wrapArticleHtml(cached.title || document.title, cached.byline, cached.content);
      }

      const extractor = await ExtractorFactory.createExtractor(url);
      const result = await extractor.extract(document, url);
      cacheStrategyManager.set(cacheKey, result, { type: 'extract', url });
      if (result && result.content) {
        return this.wrapArticleHtml(result.title || document.title, (result as any).byline, result.content);
      }
      return null;
    } catch (error) {
      console.error('内容提取失败:', error);
      return null;
    }
  }

  private wrapArticleHtml(title: string, byline: string | undefined, content: string): string {
    const safeTitle = this.escapeHtml(title) || this.escapeHtml(document.title) || '阅读模式';
    const safeByline = this.escapeHtml(byline);
    const url = new URL(window.location.href);
    const safeHost = this.escapeHtml(url.hostname);
    const sanitizedContent = this.sanitizeHtml(content);

    return `
      <div class="reading-mode-header" role="toolbar" aria-label="阅读模式工具栏">
        <div class="reading-mode-header__meta">
          <span class="reading-mode-header__site">${safeHost}</span>
          ${safeByline ? `<span class="reading-mode-header__byline">${safeByline}</span>` : ''}
        </div>
        <button type="button" class="reading-mode-close-button" data-reading-mode-close aria-label="退出阅读模式">✕</button>
      </div>
      <article class="reading-mode-content" aria-labelledby="reading-mode-title">
        <h1 id="reading-mode-title" class="reading-mode-title">${safeTitle}</h1>
        <div class="reading-mode-body">${sanitizedContent}</div>
      </article>
    `;
  }

  /**
   * 创建阅读容器
   */
  private createReaderContainer(content: string): void {
    this.teardownReaderContainer();

    const overlay = document.createElement('div');
    overlay.id = 'reading-mode-overlay';
    overlay.className = 'reading-mode-overlay reading-mode-overlay--light';
    overlay.tabIndex = -1;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const container = document.createElement('div');
    container.className = 'reading-mode-container';
    container.innerHTML = content;
    container.setAttribute('role', 'document');

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.disable().catch((error) => {
          console.error('退出阅读模式时发生错误:', error);
        });
      }
    });

    const closeButton = container.querySelector('[data-reading-mode-close]');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.disable().catch((error) => {
          console.error('退出阅读模式时发生错误:', error);
        });
      });
    }

    this.overlayElement = overlay;
    this.readerContainer = container;

    this.applySettingsToContainer();
  }

  private teardownReaderContainer(): void {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
    this.readerContainer = null;
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

    if (this.overlayElement) {
      this.overlayElement.classList.remove('reading-mode-overlay--dark', 'reading-mode-overlay--light');
      this.overlayElement.classList.add(theme === 'dark' ? 'reading-mode-overlay--dark' : 'reading-mode-overlay--light');
    }
  }

  /**
   * 应用阅读模式样式
   */
  private applyReaderStyles(): void {
    document.documentElement.classList.add('reading-mode-active');
    document.body.classList.add('reading-mode-locked');

    if (this.previousBodyOverflow === null) {
      this.previousBodyOverflow = document.body.style.overflow || '';
    }

    if (this.previousBodyPaddingRight === null) {
      this.previousBodyPaddingRight = document.body.style.paddingRight || '';
    }

    const scrollbarCompensation = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarCompensation > 0) {
      document.body.style.paddingRight = `${scrollbarCompensation}px`;
    }

    document.body.style.overflow = 'hidden';
  }

  /**
   * 移除阅读模式样式
   */
  private removeReaderStyles(): void {
    document.documentElement.classList.remove('reading-mode-active');
    document.body.classList.remove('reading-mode-locked');

    if (this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
    } else {
      document.body.style.overflow = '';
    }
    this.previousBodyOverflow = null;

    if (this.previousBodyPaddingRight !== null) {
      document.body.style.paddingRight = this.previousBodyPaddingRight;
    } else {
      document.body.style.paddingRight = '';
    }
    this.previousBodyPaddingRight = null;
  }

  /**
   * 挂载浮动UI
   */
  private mountFloatingUI(): void {
    if (this.floatingUICleanup) {
      this.floatingUICleanup();
    }

    this.floatingUICleanup = mountNewFloatingUI({
      isReadingModeActive: this.isActive,
      settings: this.settings,
      onSettingsChange: (key: keyof UserSettings, value: any) => {
        this.updateSettings({ [key]: value });
      },
      onToggleReadingMode: () => {
        this.toggle().catch((error) => {
          console.error('切换阅读模式失败:', error);
        });
      },
      onClose: () => {
        this.disable().catch((error) => {
          console.error('退出阅读模式失败:', error);
        });
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
   * 挂载设置面板
   */
  private mountSettingsPanel(): void {
    if (this.settingsPanelCleanup) {
      this.settingsPanelCleanup();
    }

    this.settingsPanelCleanup = mountReadingSettingsPanel({
      settings: this.settings,
      onSettingsChange: (key: keyof UserSettings, value: any) => {
        this.updateSettings({ [key]: value });
      },
    });
  }

  /**
   * 清理设置面板
   */
  private cleanupSettingsPanel(): void {
    if (this.settingsPanelCleanup) {
      this.settingsPanelCleanup();
      this.settingsPanelCleanup = null;
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.isActive) {
      this.disable().catch((error) => {
        console.error('销毁阅读模式失败:', error);
      });
    }

    this.cleanupFloatingUI();
    this.cleanupSettingsPanel();

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    document.removeEventListener('keydown', this.handleKeydown);
  }

  private sanitizeHtml(html: string): string {
    if (!html) {
      return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('script, style, iframe, object, embed, link, meta, base').forEach((element) => element.remove());

    doc.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attr) => {
        const { name, value } = attr;
        if (name.startsWith('on') || /javascript:/i.test(value)) {
          element.removeAttribute(name);
        }
      });
    });

    return doc.body.innerHTML;
  }

  private escapeHtml(value: string | undefined | null): string {
    if (!value) {
      return '';
    }

    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  private async notifyBackground(eventType: string): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        action: eventType,
        type: eventType,
        url: window.location.href
      });
    } catch (error) {
      console.debug('通知背景脚本失败:', error);
    }
  }
}
