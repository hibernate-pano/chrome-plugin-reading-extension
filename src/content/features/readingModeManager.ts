/**
 * 阅读模式管理器 - 基于 Shadcn/UI 设计系统
 * 负责阅读模式的启用、禁用和样式管理
 */

import { UserSettings } from '../../types';
import { StorageKeys, setStorage } from '../../storage/storage';
import { MESSAGE_TYPES } from '../../constants';
import { mountNewFloatingUI } from '../ui/NewFloatingUIManager';
import { cacheStrategyManager } from '../dynamic/CacheStrategyManager';
import { ExtractorFactory } from '../extractors/ExtractorFactory';
import { mountReadingSettingsPanel, updateReadingSettingsPanelSettings } from '../ui/ReadingSettingsPanelManager';
import { imageLoadingManager } from '../components/ImageLoadingManager';

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
    
    // 不要在构造函数中初始化样式！
    // 样式应该只在真正启用阅读模式时才注入
    // this.initializeStyles();
    
    // 🧹 页面加载时检测和清理残留状态
    try {
      this.detectAndCleanupStaleState();
    } catch (error) {
      console.warn('⚠️ [ReadingModeManager] 初始清理失败:', error);
    }
  }

  /**
   * 初始化阅读模式样式
   * 只在启用阅读模式时调用
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
      /* 限定作用域到阅读模式容器，避免污染全局 */
      .reading-mode-overlay,
      .reading-mode-container,
      #reading-mode-container {
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
   * 启用阅读模式（增强版 - 带详细日志和错误恢复）
   */
  async enable(): Promise<boolean> {
    console.log('🚀 [ReadingModeManager] 开始启用阅读模式...');
    console.log('   当前状态:', { isActive: this.isActive });
    
    // 增强的状态检查：同时检查内存和DOM状态
    const currentStatus = this.getStatus();
    if (currentStatus.isActive) {
      console.log('⚠️ [ReadingModeManager] 阅读模式已启用（基于完整状态检查），跳过');
      return true;
    }
    
    // 防御性清理：即使状态显示未激活，也要确保DOM是干净的
    if (!this.isActive) {
      console.log('🧹 [ReadingModeManager] 执行防御性清理...');
      try {
        this.detectAndCleanupStaleState();
      } catch (error) {
        console.warn('⚠️ 防御性清理出错:', error);
      }
    }

    try {
      // 步骤 1: 初始化样式
      console.log('1️⃣ 初始化样式...');
      this.initializeStyles();
      console.log('✅ 样式初始化完成');

      // 步骤 2: 提取内容
      console.log('2️⃣ 提取页面内容...');
      const content = await this.extractContent();
      
      if (!content) {
        throw new Error('无法提取页面内容');
      }
      console.log('✅ 内容提取完成');

      // 步骤 3: 创建阅读容器
      console.log('3️⃣ 创建阅读容器...');
      this.createReaderContainer(content);
      console.log('✅ 阅读容器创建完成');

      // 步骤 4: 应用样式
      console.log('4️⃣ 应用阅读模式样式...');
      this.applyReaderStyles();
      console.log('✅ 样式应用完成');

      // 标记为激活（在挂载 UI 之前，以便 UI 可以访问正确的状态）
      this.isActive = true;
      console.log('✅ 阅读模式状态已设置为激活');

      // 步骤 5: 挂载 UI 组件
      console.log('5️⃣ 挂载浮动 UI...');
      this.mountFloatingUI();
      console.log('✅ 浮动 UI 挂载完成');

      console.log('6️⃣ 挂载设置面板...');
      this.mountSettingsPanel();
      console.log('✅ 设置面板挂载完成');

      // 步骤 6: 初始化图片加载（非关键，失败不影响阅读模式）
      console.log('7️⃣ 初始化图片加载管理器...');
      await this.initializeImageLoading();
      console.log('✅ 图片加载管理器处理完成');

      // 步骤 7: 设置键盘事件监听
      console.log('8️⃣ 设置键盘事件监听...');
      document.removeEventListener('keydown', this.handleKeydown);
      document.addEventListener('keydown', this.handleKeydown);
      console.log('✅ 键盘事件监听已设置');

      // 步骤 8: 通知后台
      console.log('9️⃣ 通知后台脚本...');
      await this.notifyBackground(MESSAGE_TYPES.READING_MODE_ENABLED);
      console.log('✅ 后台通知完成');

      // 步骤 9: 设置焦点
      if (this.overlayElement) {
        this.overlayElement.focus({ preventScroll: true });
      }

      // 步骤 10: 最终状态验证
      const finalStatus = this.getStatus();
      console.log('📊 [ReadingModeManager] 最终状态验证:', finalStatus);
      
      if (!finalStatus.isActive) {
        throw new Error('状态验证失败：阅读模式未正确激活');
      }

      console.log('🎉 [ReadingModeManager] 阅读模式启用成功！');
      return true;
      
    } catch (error) {
      console.error('❌ [ReadingModeManager] 启用阅读模式失败:', error);
      console.error('   错误堆栈:', (error as Error).stack);
      
      // 尝试清理
      console.log('🧹 尝试清理失败的状态...');
      try {
        this.teardownReaderContainer();
        this.removeReaderStyles();
        this.isActive = false;
        console.log('✅ 清理完成');
      } catch (cleanupError) {
        console.error('⚠️ 清理过程中出错:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * 禁用阅读模式（增强版 - 修复状态清理问题）
   */
  async disable(): Promise<boolean> {
    console.log('🔄 [ReadingModeManager] 开始禁用阅读模式...');
    console.log('   当前状态:', { isActive: this.isActive });
    
    if (!this.isActive) {
      console.log('⚠️ [ReadingModeManager] 阅读模式未启用，跳过禁用');
      return false;
    }

    try {
      console.log('1️⃣ 拆除阅读容器...');
      this.teardownReaderContainer();

      console.log('2️⃣ 移除阅读模式样式...');
      this.removeReaderStyles();

      console.log('3️⃣ 更新状态...');
      this.isActive = false;

      console.log('4️⃣ 清理浮动UI...');
      this.cleanupFloatingUI();

      console.log('5️⃣ 清理设置面板...');
      this.cleanupSettingsPanel();

      console.log('6️⃣ 清理图片加载管理器...');
      this.cleanupImageLoading();

      console.log('7️⃣ 移除键盘事件监听...');
      document.removeEventListener('keydown', this.handleKeydown);

      console.log('8️⃣ 通知后台脚本...');
      await this.notifyBackground(MESSAGE_TYPES.READING_MODE_DISABLED);

      console.log('9️⃣ 清理localStorage和残留数据...');
      this.cleanupLocalStorage();

      console.log('✅ [ReadingModeManager] 阅读模式禁用完成');
      return false;
    } catch (error) {
      console.error('❌ [ReadingModeManager] 禁用阅读模式失败:', error);
      // 即使禁用失败，也要确保状态是false
      this.isActive = false;
      return false;
    }
  }

  /**
   * 切换阅读模式（增强版 - 修复状态同步问题）
   */
  async toggle(): Promise<boolean> {
    console.log('🔄 [ReadingModeManager] 开始切换阅读模式...');
    
    // 使用 getStatus 获取准确的当前状态
    const currentStatus = this.getStatus();
    console.log('   当前实际状态:', currentStatus);
    
    const wasActive = currentStatus.isActive;
    
    try {
      if (wasActive) {
        console.log('📖 → 📄 切换为普通模式');
        await this.disable();
        
        // 确认状态
        const newStatus = this.getStatus();
        console.log('✅ 切换完成，新状态:', newStatus);
        
        // 确保状态确实改变了
        if (newStatus.isActive === wasActive) {
          console.error('⚠️ 状态未改变，强制清理');
          this.isActive = false;
          this.teardownReaderContainer();
          this.removeReaderStyles();
        }
        
        return newStatus.isActive;
      } else {
        console.log('📄 → 📖 切换为阅读模式');
        const result = await this.enable();
        
        // 确认状态
        const newStatus = this.getStatus();
        console.log('✅ 切换完成，新状态:', newStatus);
        
        // 如果启用失败，返回实际状态
        if (!result && !newStatus.isActive) {
          console.warn('⚠️ 阅读模式启用失败');
          return false;
        }
        
        return newStatus.isActive;
      }
    } catch (error) {
      console.error('❌ [ReadingModeManager] 切换失败:', error);
      
      // 发生错误时，执行清理
      console.log('🧹 执行错误恢复清理...');
      try {
        this.detectAndCleanupStaleState();
      } catch (cleanupError) {
        console.warn('清理失败:', cleanupError);
      }
      
      // 返回当前实际状态
      const finalStatus = this.getStatus();
      console.log('📊 错误后最终状态:', finalStatus);
      
      return finalStatus.isActive;
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

    // 更新图片加载管理器设置
    imageLoadingManager.updateSettings(newSettings);

    // 保存设置到 Chrome storage
    this.saveSettingsToStorage(newSettings).catch(error => {
      console.error('保存设置到 Chrome storage 失败:', error);
    });
  }

  /**
   * 保存设置到 Chrome storage
   */
  private async saveSettingsToStorage(settings: Partial<UserSettings>): Promise<void> {
    console.log('💾 [ReadingModeManager] 开始保存设置到 Chrome storage:', settings);
    
    const settingsKeyMap: { [K in keyof UserSettings]?: StorageKeys } = {
      theme: StorageKeys.THEME,
      fontSize: StorageKeys.FONT_SIZE,
      lineHeight: StorageKeys.LINE_HEIGHT,
      fontFamily: StorageKeys.FONT_FAMILY,
      backgroundColor: StorageKeys.BACKGROUND_COLOR,
      paragraphSpacing: StorageKeys.PARAGRAPH_SPACING,
      pageWidth: StorageKeys.PAGE_WIDTH,
      enableTextSelectionToolbar: StorageKeys.ENABLE_TEXT_SELECTION_TOOLBAR,
      presets: StorageKeys.CUSTOM_PRESETS,
      activePreset: StorageKeys.ACTIVE_PRESET,
    };

    const savePromises: Promise<void>[] = [];

    for (const [key, value] of Object.entries(settings)) {
      const storageKey = settingsKeyMap[key as keyof UserSettings];
      if (storageKey !== undefined && value !== undefined) {
        console.log(`💾 [ReadingModeManager] 保存 ${key} = ${value} 到存储键 ${storageKey}`);
        savePromises.push(setStorage(storageKey, value));
      } else {
        console.warn(`⚠️ [ReadingModeManager] 跳过保存 ${key} (storageKey: ${storageKey}, value: ${value})`);
      }
    }

    await Promise.all(savePromises);
    console.log('✅ [ReadingModeManager] 设置已保存到 Chrome storage');
  }

  /**
   * 清理localStorage残留数据
   */
  private cleanupLocalStorage(): void {
    try {
      console.log('🧹 [ReadingModeManager] 清理localStorage残留数据...');
      
      // 清理缓存管理器数据
      const cacheKeys = [
        'chrome-extension-cache',
        'reading-extension-cache',
        'ai-reading-extension-cache'
      ];
      
      cacheKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // 忽略清理失败
        }
      });
      
      // 清理性能管理器数据
      const performanceKeys = [
        'reading-extension-performance-metrics',
        'reading-extension-performance-thresholds',
        'reading-extension-performance-data'
      ];
      
      performanceKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // 忽略清理失败
        }
      });
      
      // 清理UI位置数据（可能过期）
      const uiKeys = [
        'reading-button-position',
        'reading-panel-position'
      ];
      
      uiKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            // 检查是否过期（超过24小时）
            const stored = JSON.parse(data);
            if (stored.timestamp && (Date.now() - stored.timestamp) > 24 * 60 * 60 * 1000) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // 清理损坏的数据
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ [ReadingModeManager] localStorage清理完成');
    } catch (error) {
      console.warn('⚠️ [ReadingModeManager] localStorage清理失败:', error);
    }
  }

  /**
   * 检测和清理残留状态（页面刷新后初始化时调用）
   */
  private detectAndCleanupStaleState(): void {
    console.log('🔍 [ReadingModeManager] 检测页面残留状态...');
    
    try {
      // 检查是否有残留的阅读模式DOM元素
      const staleElements = document.querySelectorAll([
        '#reading-mode-overlay',
        '#reading-mode-styles', 
        '.reading-mode-container',
        '.reading-extension-floating-ui'
      ].join(','));
      
      if (staleElements.length > 0) {
        console.log(`🧹 [ReadingModeManager] 发现 ${staleElements.length} 个残留DOM元素，开始清理...`);
        staleElements.forEach((element, index) => {
          console.log(`  清理元素 ${index + 1}: ${element.tagName}#${element.id || 'no-id'}.${element.className || 'no-class'}`);
          element.remove();
        });
      }
      
      // 检查和清理CSS类
      const staleClasses = ['reading-mode-active', 'reading-mode-locked'];
      let cleanedClasses = 0;
      
      staleClasses.forEach(className => {
        if (document.documentElement.classList.contains(className)) {
          document.documentElement.classList.remove(className);
          cleanedClasses++;
        }
        if (document.body.classList.contains(className)) {
          document.body.classList.remove(className);
          cleanedClasses++;
        }
      });
      
      if (cleanedClasses > 0) {
        console.log(`🧹 [ReadingModeManager] 清理了 ${cleanedClasses} 个残留CSS类`);
      }
      
      // 重置body样式
      const bodyStylesToReset = ['overflow', 'paddingRight'];
      bodyStylesToReset.forEach(style => {
        if (document.body.style.getPropertyValue(style)) {
          document.body.style.removeProperty(style);
        }
      });
      
      // 清理localStorage
      this.cleanupLocalStorage();
      
      // 强制重置内存状态
      this.isActive = false;
      this.overlayElement = null;
      this.readerContainer = null;
      
      console.log('✅ [ReadingModeManager] 残留状态清理完成');
    } catch (error) {
      console.warn('⚠️ [ReadingModeManager] 清理残留状态时出错:', error);
    }
  }

  /**
   * 获取当前状态（增强版 - 检查DOM实际状态）
   */
  getStatus(): { isActive: boolean; settings: UserSettings } {
    // 检查DOM中是否实际存在阅读模式容器
    const hasReaderOverlay = !!document.getElementById('reading-mode-overlay');
    const hasReaderStyles = !!document.getElementById('reading-mode-styles');
    const hasActiveClass = document.documentElement.classList.contains('reading-mode-active');
    
    // DOM状态检查：如果DOM中没有阅读模式元素，则状态应该是false
    const domIndicatesActive = hasReaderOverlay && hasActiveClass;
    
    // 实际状态应该是内存状态和DOM状态的交集
    const actualIsActive = this.isActive && domIndicatesActive;
    
    // 如果检测到状态不一致，修正内存状态
    if (this.isActive !== actualIsActive) {
      console.warn('🔧 [ReadingModeManager] 检测到状态不一致，修正中...', {
        memoryState: this.isActive,
        domState: domIndicatesActive,
        hasOverlay: hasReaderOverlay,
        hasStyles: hasReaderStyles,
        hasClass: hasActiveClass
      });
      this.isActive = actualIsActive;
    }
    
    return {
      isActive: actualIsActive,
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
      
      interface CachedContent {
        title?: string | null;
        byline?: string | null;
        content: string;
      }
      
      const cached = cacheStrategyManager.get<CachedContent>(cacheKey);
      if (cached && cached.content) {
        return this.wrapArticleHtml(cached.title || document.title, cached.byline || undefined, cached.content);
      }

      const extractor = await ExtractorFactory.createExtractor(url);
      const result = await extractor.extract(document, url);
      cacheStrategyManager.set(cacheKey, result, { type: 'extract', url });
      if (result && result.content) {
        // ExtractedContent may have a byline field
        const resultWithByline = result as CachedContent;
        return this.wrapArticleHtml(result.title || document.title, resultWithByline.byline || undefined, result.content);
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
      onSettingsChange: (key: keyof UserSettings, value: unknown) => {
        this.updateSettings({ [key]: value });
      },
      onToggleReadingMode: () => {
        this.toggle().catch((error) => {
          console.error('切换阅读模式失败:', error);
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
      onSettingsChange: (key: keyof UserSettings, value: unknown) => {
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

    // 清理 body 样式，防止残留
    this.removeReaderStyles();

    // 🧹 最终清理：确保所有localStorage数据被清理
    this.cleanupLocalStorage();

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

  /**
   * 初始化图片加载管理器（防御性实现）
   */
  private async initializeImageLoading(): Promise<void> {
    try {
      console.log('🔄 开始初始化图片加载管理器...');
      
      // 防御性清理：确保从干净的状态开始
      try {
        imageLoadingManager.cleanup();
        console.log('✅ 已清理旧的图片加载管理器状态');
      } catch (cleanupError) {
        console.warn('清理旧状态时出错（可能是首次加载）:', cleanupError);
      }

      // 重新初始化
      await imageLoadingManager.initialize();
      console.log('✅ 图片加载管理器初始化完成');

      // 等待DOM完全渲染
      await new Promise(resolve => setTimeout(resolve, 100));

      // 注册阅读容器中的所有图片
      if (this.readerContainer) {
        const images = this.readerContainer.querySelectorAll('img');
        console.log(`📸 发现 ${images.length} 张图片，开始注册到图片加载管理器`);
        
        let registeredCount = 0;
        images.forEach((img, index) => {
          try {
            // 设置优先级，越靠前的图片优先级越高
            const priority = Math.max(1, 10 - Math.floor(index / 3));
            
            // 确保图片有src属性
            if (!img.src && !img.dataset.src) {
              console.warn('图片缺少src属性，跳过:', img);
              return;
            }

            // 注册图片
            imageLoadingManager.registerImage(img, priority);
            registeredCount++;
          } catch (registerError) {
            console.warn(`注册图片 ${index} 失败:`, registerError);
          }
        });

        console.log(`✅ 图片注册完成，成功注册 ${registeredCount}/${images.length} 张图片`);
      }
    } catch (error) {
      console.error('❌ 初始化图片加载失败:', error);
      // 不抛出错误，允许阅读模式继续（图片加载失败不应该阻止阅读模式启用）
      console.warn('⚠️ 图片加载功能可能不可用，但阅读模式将继续');
    }
  }

  /**
   * 清理图片加载管理器
   */
  private cleanupImageLoading(): void {
    try {
      imageLoadingManager.cleanup();
    } catch (error) {
      console.error('清理图片加载管理器失败:', error);
    }
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
