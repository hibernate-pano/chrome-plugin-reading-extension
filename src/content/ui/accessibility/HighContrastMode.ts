import { HighContrastConfig, AccessibilityEvent } from './types';

/**
 * 高对比度模式管理器
 * 提供高对比度主题、自定义颜色、边框增强等功能
 */
export class HighContrastMode {
  private config: HighContrastConfig;
  private eventListeners: Map<string, (event: AccessibilityEvent) => void> = new Map();
  private isActive: boolean = false;
  private originalStyles: Map<HTMLElement, string> = new Map();
  private styleElement: HTMLStyleElement | null = null;

  constructor(config: Partial<HighContrastConfig> = {}) {
    this.config = {
      enabled: false,
      contrastLevel: 'normal',
      customColors: {
        background: '#ffffff',
        text: '#000000',
        primary: '#0000ff',
        secondary: '#808080',
        accent: '#ff0000'
      },
      enhancedBorders: true,
      textShadow: false,
      ...config,
    };

    this.initialize();
  }

  /**
   * 初始化高对比度模式
   */
  private initialize(): void {
    // 检测系统高对比度偏好
    this.detectSystemPreference();
    
    // 创建样式元素
    this.createStyleElement();
    
    // 如果配置为启用，则激活高对比度模式
    if (this.config.enabled) {
      this.enable();
    }
  }

  /**
   * 检测系统高对比度偏好
   */
  private detectSystemPreference(): void {
    // 检测系统高对比度设置
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    if (mediaQuery.matches) {
      this.config.contrastLevel = 'high';
      this.config.enabled = true;
    }

    // 监听系统偏好变化
    mediaQuery.addEventListener('change', (event) => {
      if (event.matches) {
        this.config.contrastLevel = 'high';
        this.enable();
      } else {
        this.config.contrastLevel = 'normal';
        this.disable();
      }
    });
  }

  /**
   * 创建样式元素
   */
  private createStyleElement(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'high-contrast-styles';
    document.head.appendChild(this.styleElement);
  }

  /**
   * 启用高对比度模式
   */
  public enable(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.applyHighContrastStyles();
    this.emitEvent('mode-change', { type: 'enabled', config: this.config });
  }

  /**
   * 禁用高对比度模式
   */
  public disable(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.removeHighContrastStyles();
    this.emitEvent('mode-change', { type: 'disabled' });
  }

  /**
   * 应用高对比度样式
   */
  private applyHighContrastStyles(): void {
    if (!this.styleElement) return;

    const styles = this.generateHighContrastStyles();
    this.styleElement.textContent = styles;
    
    // 添加高对比度类到body
    document.body.classList.add('high-contrast-mode');
    
    // 应用增强边框
    if (this.config.enhancedBorders) {
      this.applyEnhancedBorders();
    }
    
    // 应用文本阴影
    if (this.config.textShadow) {
      this.applyTextShadow();
    }
  }

  /**
   * 移除高对比度样式
   */
  private removeHighContrastStyles(): void {
    if (this.styleElement) {
      this.styleElement.textContent = '';
    }
    
    // 移除高对比度类
    document.body.classList.remove('high-contrast-mode');
    
    // 移除增强边框
    this.removeEnhancedBorders();
    
    // 移除文本阴影
    this.removeTextShadow();
  }

  /**
   * 生成高对比度样式
   */
  private generateHighContrastStyles(): string {
    const { customColors, contrastLevel } = this.config;
    
    let styles = `
      .high-contrast-mode {
        background-color: ${customColors.background} !important;
        color: ${customColors.text} !important;
      }
      
      .high-contrast-mode * {
        background-color: inherit !important;
        color: inherit !important;
      }
      
      .high-contrast-mode a {
        color: ${customColors.primary} !important;
        text-decoration: underline !important;
        text-decoration-thickness: 2px !important;
      }
      
      .high-contrast-mode button,
      .high-contrast-mode input[type="button"],
      .high-contrast-mode input[type="submit"],
      .high-contrast-mode input[type="reset"] {
        background-color: ${customColors.primary} !important;
        color: ${customColors.background} !important;
        border: 2px solid ${customColors.text} !important;
        padding: 8px 16px !important;
        font-weight: bold !important;
      }
      
      .high-contrast-mode input,
      .high-contrast-mode textarea,
      .high-contrast-mode select {
        background-color: ${customColors.background} !important;
        color: ${customColors.text} !important;
        border: 2px solid ${customColors.text} !important;
        padding: 4px 8px !important;
      }
      
      .high-contrast-mode h1,
      .high-contrast-mode h2,
      .high-contrast-mode h3,
      .high-contrast-mode h4,
      .high-contrast-mode h5,
      .high-contrast-mode h6 {
        color: ${customColors.text} !important;
        border-bottom: 2px solid ${customColors.primary} !important;
        padding-bottom: 4px !important;
      }
      
      .high-contrast-mode .focus-visible {
        outline: 3px solid ${customColors.accent} !important;
        outline-offset: 2px !important;
      }
      
      .high-contrast-mode .sr-only:focus {
        background-color: ${customColors.accent} !important;
        color: ${customColors.background} !important;
        padding: 8px !important;
        border-radius: 4px !important;
        position: static !important;
        width: auto !important;
        height: auto !important;
        clip: auto !important;
        white-space: normal !important;
      }
    `;

    // 根据对比度级别调整样式
    if (contrastLevel === 'high') {
      styles += `
        .high-contrast-mode {
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        
        .high-contrast-mode a {
          color: #ffff00 !important;
        }
        
        .high-contrast-mode button,
        .high-contrast-mode input[type="button"],
        .high-contrast-mode input[type="submit"],
        .high-contrast-mode input[type="reset"] {
          background-color: #ffffff !important;
          color: #000000 !important;
          border: 3px solid #ffffff !important;
        }
      `;
    } else if (contrastLevel === 'very-high') {
      styles += `
        .high-contrast-mode {
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        
        .high-contrast-mode a {
          color: #00ffff !important;
        }
        
        .high-contrast-mode button,
        .high-contrast-mode input[type="button"],
        .high-contrast-mode input[type="submit"],
        .high-contrast-mode input[type="reset"] {
          background-color: #ffffff !important;
          color: #000000 !important;
          border: 4px solid #ffffff !important;
          font-size: 1.2em !important;
        }
        
        .high-contrast-mode input,
        .high-contrast-mode textarea,
        .high-contrast-mode select {
          border: 3px solid #ffffff !important;
          font-size: 1.1em !important;
        }
      `;
    }

    return styles;
  }

  /**
   * 应用增强边框
   */
  private applyEnhancedBorders(): void {
    const elements = document.querySelectorAll('button, input, textarea, select, a, img, table, th, td');
    
    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlElement);
      
      // 保存原始样式
      this.originalStyles.set(htmlElement, htmlElement.style.cssText);
      
      // 应用增强边框
      if (htmlElement.tagName === 'BUTTON' || htmlElement.tagName === 'INPUT') {
        htmlElement.style.border = '2px solid currentColor';
        htmlElement.style.borderRadius = '4px';
      } else if (htmlElement.tagName === 'A') {
        htmlElement.style.borderBottom = '2px solid currentColor';
        htmlElement.style.textDecoration = 'none';
      } else if (htmlElement.tagName === 'IMG') {
        htmlElement.style.border = '2px solid currentColor';
      } else if (htmlElement.tagName === 'TABLE' || htmlElement.tagName === 'TH' || htmlElement.tagName === 'TD') {
        htmlElement.style.border = '2px solid currentColor';
      }
    });
  }

  /**
   * 移除增强边框
   */
  private removeEnhancedBorders(): void {
    this.originalStyles.forEach((originalStyle, element) => {
      element.style.cssText = originalStyle;
    });
    this.originalStyles.clear();
  }

  /**
   * 应用文本阴影
   */
  private applyTextShadow(): void {
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
    
    textElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlElement);
      
      if (computedStyle.color !== 'transparent' && computedStyle.color !== 'rgba(0, 0, 0, 0)') {
        htmlElement.style.textShadow = '1px 1px 2px currentColor';
      }
    });
  }

  /**
   * 移除文本阴影
   */
  private removeTextShadow(): void {
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
    
    textElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.textShadow = '';
    });
  }

  /**
   * 更新自定义颜色
   */
  public updateCustomColors(colors: Partial<HighContrastConfig['customColors']>): void {
    this.config.customColors = { ...this.config.customColors, ...colors };
    
    if (this.isActive) {
      this.applyHighContrastStyles();
    }
    
    this.emitEvent('config-change', { type: 'custom-colors', colors: this.config.customColors });
  }

  /**
   * 设置对比度级别
   */
  public setContrastLevel(level: 'normal' | 'high' | 'very-high'): void {
    this.config.contrastLevel = level;
    
    if (this.isActive) {
      this.applyHighContrastStyles();
    }
    
    this.emitEvent('config-change', { type: 'contrast-level', level });
  }

  /**
   * 切换增强边框
   */
  public toggleEnhancedBorders(): void {
    this.config.enhancedBorders = !this.config.enhancedBorders;
    
    if (this.isActive) {
      if (this.config.enhancedBorders) {
        this.applyEnhancedBorders();
      } else {
        this.removeEnhancedBorders();
      }
    }
    
    this.emitEvent('config-change', { type: 'enhanced-borders', enabled: this.config.enhancedBorders });
  }

  /**
   * 切换文本阴影
   */
  public toggleTextShadow(): void {
    this.config.textShadow = !this.config.textShadow;
    
    if (this.isActive) {
      if (this.config.textShadow) {
        this.applyTextShadow();
      } else {
        this.removeTextShadow();
      }
    }
    
    this.emitEvent('config-change', { type: 'text-shadow', enabled: this.config.textShadow });
  }

  /**
   * 获取当前配置
   */
  public getConfig(): HighContrastConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<HighContrastConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.isActive) {
      this.applyHighContrastStyles();
    }
    
    this.emitEvent('config-change', { type: 'config-update', config: this.config });
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
    const customEvent = new CustomEvent('high-contrast-event', { detail: event });
    document.dispatchEvent(customEvent);
  }

  /**
   * 销毁高对比度模式管理器
   */
  public destroy(): void {
    // 移除事件监听器
    this.eventListeners.clear();
    
    // 恢复原始样式
    this.originalStyles.forEach((originalStyle, element) => {
      element.style.cssText = originalStyle;
    });
    this.originalStyles.clear();
    
    // 移除样式元素
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    
    // 移除高对比度类
    document.body.classList.remove('high-contrast-mode');
    
    this.isActive = false;
  }
}
