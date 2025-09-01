import { AccessibilityConfig, AccessibilityState, UseAccessibilityReturn, AccessibilityEvent } from './types';
import { FocusManager } from './FocusManager';
import { KeyboardNavigation } from './KeyboardNavigation';
import { ScreenReaderSupport } from './ScreenReaderSupport';
import { HighContrastMode } from './HighContrastMode';
import { ARIALabels } from './ARIALabels';

/**
 * 无障碍功能管理器
 * 整合所有无障碍功能模块，提供统一的API接口
 */
export class AccessibilityManager {
  private config: AccessibilityConfig;
  private state: AccessibilityState;
  private focusManager: FocusManager;
  private keyboardNavigation: KeyboardNavigation;
  private screenReaderSupport: ScreenReaderSupport;
  private highContrastMode: HighContrastMode;
  private ariaLabels: ARIALabels;
  private eventListeners: Map<string, (event: AccessibilityEvent) => void> = new Map();

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      keyboardNavigation: true,
      screenReaderSupport: true,
      highContrastMode: false,
      focusManagement: true,
      ariaLabels: true,
      reducedMotion: false,
      highContrast: false,
      fontSizeScale: 1.0,
      lineHeightScale: 1.0,
      ...config,
    };

    this.state = {
      currentFocus: null,
      focusHistory: [],
      currentMode: 'normal',
      keyboardNavigationActive: false,
      screenReaderActive: false,
      errorCount: 0,
      warningCount: 0,
    };

    this.initialize();
  }

  /**
   * 初始化无障碍功能管理器
   */
  private initialize(): void {
    try {
      // 初始化焦点管理器
      if (this.config.focusManagement) {
        this.focusManager = new FocusManager({
          trapFocus: true,
          restoreFocus: true,
          focusIndicator: 'outline',
          focusIndicatorColor: '#3b82f6',
          focusIndicatorWidth: 2,
        });

        // 监听焦点变化事件
        this.focusManager.addEventListener('focus-change', this.handleFocusChange.bind(this));
      }

      // 初始化键盘导航
      if (this.config.keyboardNavigation) {
        this.keyboardNavigation = new KeyboardNavigation({
          tabNavigation: true,
          arrowKeyNavigation: true,
          shortcuts: true,
          skipLinks: true,
          focusGroups: true,
        });

        // 监听键盘导航事件
        this.keyboardNavigation.addEventListener('focus-change', this.handleFocusChange.bind(this));
        this.keyboardNavigation.addEventListener('mode-change', this.handleModeChange.bind(this));

        // 启用键盘导航
        this.keyboardNavigation.enable();
        this.state.keyboardNavigationActive = true;
      }

      // 初始化屏幕阅读器支持
      if (this.config.screenReaderSupport) {
        this.screenReaderSupport = new ScreenReaderSupport({
          liveRegions: true,
          statusUpdates: true,
          errorNotifications: true,
          progressIndicators: true,
          navigationHints: true,
        });

        // 监听屏幕阅读器事件
        this.screenReaderSupport.addEventListener('live-region-update', this.handleLiveRegionUpdate.bind(this));
        this.screenReaderSupport.addEventListener('mode-change', this.handleModeChange.bind(this));

        // 启用屏幕阅读器支持
        this.screenReaderSupport.enable();
        this.state.screenReaderActive = true;
      }

      // 初始化高对比度模式
      if (this.config.highContrastMode) {
        this.highContrastMode = new HighContrastMode({
          enabled: this.config.highContrast,
          contrastLevel: 'normal',
          enhancedBorders: true,
          textShadow: false,
        });

        // 监听高对比度模式事件
        this.highContrastMode.addEventListener('mode-change', this.handleModeChange.bind(this));
        this.highContrastMode.addEventListener('config-change', this.handleConfigChange.bind(this));
      }

      // 初始化ARIA标签
      if (this.config.ariaLabels) {
        this.ariaLabels = new ARIALabels({
          roles: true,
          statesAndProperties: true,
          labelAssociation: true,
          descriptionAssociation: true,
          liveRegions: true,
        });

        // 监听ARIA标签事件
        this.ariaLabels.addEventListener('role-change', this.handleARIAChange.bind(this));
        this.ariaLabels.addEventListener('state-change', this.handleARIAChange.bind(this));
        this.ariaLabels.addEventListener('property-change', this.handleARIAChange.bind(this));
      }

      // 设置系统偏好监听
      this.setupSystemPreferences();

      // 创建无障碍功能切换按钮
      this.createAccessibilityToggle();

      this.emitEvent('initialized', { config: this.config, state: this.state });
    } catch (error) {
      console.error('无障碍功能管理器初始化失败:', error);
      this.state.errorCount++;
      this.emitEvent('error', { error: error.message, type: 'initialization' });
    }
  }

  /**
   * 设置系统偏好监听
   */
  private setupSystemPreferences(): void {
    // 监听减少动画偏好
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', (event) => {
      this.config.reducedMotion = event.matches;
      this.applyReducedMotion();
    });

    // 监听高对比度偏好
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastQuery.addEventListener('change', (event) => {
      this.config.highContrast = event.matches;
      if (this.highContrastMode) {
        if (event.matches) {
          this.highContrastMode.enable();
        } else {
          this.highContrastMode.disable();
        }
      }
    });

    // 应用初始偏好
    this.config.reducedMotion = reducedMotionQuery.matches;
    this.config.highContrast = highContrastQuery.matches;
    this.applyReducedMotion();
  }

  /**
   * 应用减少动画设置
   */
  private applyReducedMotion(): void {
    if (this.config.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      document.documentElement.style.setProperty('--transition-duration', '0.01ms');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
      document.documentElement.style.removeProperty('--transition-duration');
    }
  }

  /**
   * 创建无障碍功能切换按钮
   */
  private createAccessibilityToggle(): void {
    const toggleButton = document.createElement('button');
    toggleButton.id = 'accessibility-toggle';
    toggleButton.setAttribute('role', 'button');
    toggleButton.setAttribute('aria-label', '无障碍功能设置');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.className = 'accessibility-toggle sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-50 focus:px-3 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:outline-none focus:shadow-lg';
    toggleButton.innerHTML = '♿';
    toggleButton.title = '无障碍功能设置';

    toggleButton.addEventListener('click', () => {
      this.toggleAccessibilityPanel();
    });

    document.body.appendChild(toggleButton);
  }

  /**
   * 切换无障碍功能面板
   */
  private toggleAccessibilityPanel(): void {
    const existingPanel = document.getElementById('accessibility-panel');
    
    if (existingPanel) {
      existingPanel.remove();
      document.getElementById('accessibility-toggle')?.setAttribute('aria-expanded', 'false');
    } else {
      this.createAccessibilityPanel();
      document.getElementById('accessibility-toggle')?.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * 创建无障碍功能面板
   */
  private createAccessibilityPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'accessibility-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '无障碍功能设置');
    panel.setAttribute('aria-modal', 'true');
    panel.className = 'accessibility-panel fixed top-16 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-64';

    panel.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">无障碍功能设置</h3>
        <button class="close-button text-gray-500 hover:text-gray-700" aria-label="关闭">✕</button>
      </div>
      
      <div class="space-y-4">
        <div class="setting-group">
          <label class="flex items-center space-x-2">
            <input type="checkbox" id="keyboard-nav-toggle" ${this.config.keyboardNavigation ? 'checked' : ''}>
            <span>键盘导航</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label class="flex items-center space-x-2">
            <input type="checkbox" id="screen-reader-toggle" ${this.config.screenReaderSupport ? 'checked' : ''}>
            <span>屏幕阅读器支持</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label class="flex items-center space-x-2">
            <input type="checkbox" id="high-contrast-toggle" ${this.config.highContrastMode ? 'checked' : ''}>
            <span>高对比度模式</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label class="flex items-center space-x-2">
            <input type="checkbox" id="reduced-motion-toggle" ${this.config.reducedMotion ? 'checked' : ''}>
            <span>减少动画</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label class="text-sm font-medium">字体大小缩放</label>
          <input type="range" id="font-size-slider" min="0.5" max="2.0" step="0.1" value="${this.config.fontSizeScale}" class="w-full">
          <span class="text-sm text-gray-600">${Math.round(this.config.fontSizeScale * 100)}%</span>
        </div>
        
        <div class="setting-group">
          <label class="text-sm font-medium">行高缩放</label>
          <input type="range" id="line-height-slider" min="0.8" max="2.0" step="0.1" value="${this.config.lineHeightScale}" class="w-full">
          <span class="text-sm text-gray-600">${Math.round(this.config.lineHeightScale * 100)}%</span>
        </div>
      </div>
    `;

    // 添加事件监听器
    this.addPanelEventListeners(panel);

    document.body.appendChild(panel);

    // 设置焦点陷阱
    if (this.focusManager) {
      this.focusManager.createFocusTrap(panel);
    }
  }

  /**
   * 添加面板事件监听器
   */
  private addPanelEventListeners(panel: HTMLElement): void {
    // 关闭按钮
    const closeButton = panel.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.toggleAccessibilityPanel();
      });
    }

    // 键盘导航切换
    const keyboardNavToggle = panel.querySelector('#keyboard-nav-toggle') as HTMLInputElement;
    if (keyboardNavToggle) {
      keyboardNavToggle.addEventListener('change', (event) => {
        const checked = (event.target as HTMLInputElement).checked;
        this.updateConfig({ keyboardNavigation: checked });
      });
    }

    // 屏幕阅读器支持切换
    const screenReaderToggle = panel.querySelector('#screen-reader-toggle') as HTMLInputElement;
    if (screenReaderToggle) {
      screenReaderToggle.addEventListener('change', (event) => {
        const checked = (event.target as HTMLInputElement).checked;
        this.updateConfig({ screenReaderSupport: checked });
      });
    }

    // 高对比度模式切换
    const highContrastToggle = panel.querySelector('#high-contrast-toggle') as HTMLInputElement;
    if (highContrastToggle) {
      highContrastToggle.addEventListener('change', (event) => {
        const checked = (event.target as HTMLInputElement).checked;
        this.updateConfig({ highContrastMode: checked });
      });
    }

    // 减少动画切换
    const reducedMotionToggle = panel.querySelector('#reduced-motion-toggle') as HTMLInputElement;
    if (reducedMotionToggle) {
      reducedMotionToggle.addEventListener('change', (event) => {
        const checked = (event.target as HTMLInputElement).checked;
        this.updateConfig({ reducedMotion: checked });
      });
    }

    // 字体大小缩放
    const fontSizeSlider = panel.querySelector('#font-size-slider') as HTMLInputElement;
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (event) => {
        const value = parseFloat((event.target as HTMLInputElement).value);
        this.updateConfig({ fontSizeScale: value });
        this.applyFontScaling();
      });
    }

    // 行高缩放
    const lineHeightSlider = panel.querySelector('#line-height-slider') as HTMLInputElement;
    if (lineHeightSlider) {
      lineHeightSlider.addEventListener('input', (event) => {
        const value = parseFloat((event.target as HTMLInputElement).value);
        this.updateConfig({ lineHeightScale: value });
        this.applyLineHeightScaling();
      });
    }
  }

  /**
   * 应用字体缩放
   */
  private applyFontScaling(): void {
    document.documentElement.style.setProperty('--font-size-scale', this.config.fontSizeScale.toString());
    
    // 更新所有文本元素的字体大小
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, button, input, textarea, select');
    textElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlElement);
      const originalFontSize = parseFloat(computedStyle.fontSize);
      const scaledFontSize = originalFontSize * this.config.fontSizeScale;
      htmlElement.style.fontSize = `${scaledFontSize}px`;
    });
  }

  /**
   * 应用行高缩放
   */
  private applyLineHeightScaling(): void {
    document.documentElement.style.setProperty('--line-height-scale', this.config.lineHeightScale.toString());
    
    // 更新所有文本元素的行高
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, button, input, textarea, select');
    textElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlElement);
      const originalLineHeight = parseFloat(computedStyle.lineHeight);
      const scaledLineHeight = originalLineHeight * this.config.lineHeightScale;
      htmlElement.style.lineHeight = scaledLineHeight.toString();
    });
  }

  /**
   * 处理焦点变化事件
   */
  private handleFocusChange(event: AccessibilityEvent): void {
    this.state.currentFocus = event.element || null;
    
    if (event.element) {
      this.state.focusHistory.push(event.element);
      
      // 限制焦点历史长度
      if (this.state.focusHistory.length > 50) {
        this.state.focusHistory.shift();
      }
    }

    this.emitEvent('focus-change', event.data);
  }

  /**
   * 处理模式变化事件
   */
  private handleModeChange(event: AccessibilityEvent): void {
    if (event.data.type === 'enabled') {
      if (event.data.config?.keyboardNavigation) {
        this.state.keyboardNavigationActive = true;
      }
      if (event.data.config?.screenReaderSupport) {
        this.state.screenReaderActive = true;
      }
    } else if (event.data.type === 'disabled') {
      if (event.data.config?.keyboardNavigation) {
        this.state.keyboardNavigationActive = false;
      }
      if (event.data.config?.screenReaderSupport) {
        this.state.screenReaderActive = false;
      }
    }

    this.emitEvent('mode-change', event.data);
  }

  /**
   * 处理配置变化事件
   */
  private handleConfigChange(event: AccessibilityEvent): void {
    this.emitEvent('config-change', event.data);
  }

  /**
   * 处理ARIA变化事件
   */
  private handleARIAChange(event: AccessibilityEvent): void {
    this.emitEvent('aria-change', event.data);
  }

  /**
   * 处理实时区域更新事件
   */
  private handleLiveRegionUpdate(event: AccessibilityEvent): void {
    this.emitEvent('live-region-update', event.data);
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...updates };

    // 更新各个管理器的配置
    if (updates.keyboardNavigation !== undefined && this.keyboardNavigation) {
      if (updates.keyboardNavigation) {
        this.keyboardNavigation.enable();
        this.state.keyboardNavigationActive = true;
      } else {
        this.keyboardNavigation.disable();
        this.state.keyboardNavigationActive = false;
      }
    }

    if (updates.screenReaderSupport !== undefined && this.screenReaderSupport) {
      if (updates.screenReaderSupport) {
        this.screenReaderSupport.enable();
        this.state.screenReaderActive = true;
      } else {
        this.screenReaderSupport.disable();
        this.state.screenReaderActive = false;
      }
    }

    if (updates.highContrastMode !== undefined && this.highContrastMode) {
      if (updates.highContrastMode) {
        this.highContrastMode.enable();
      } else {
        this.highContrastMode.disable();
      }
    }

    if (updates.reducedMotion !== undefined) {
      this.applyReducedMotion();
    }

    this.emitEvent('config-update', { config: this.config, updates });
  }

  /**
   * 获取当前配置
   */
  public getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * 获取当前状态
   */
  public getState(): AccessibilityState {
    return { ...this.state };
  }

  /**
   * 获取当前焦点元素
   */
  public getCurrentFocus(): HTMLElement | null {
    return this.state.currentFocus;
  }

  /**
   * 设置焦点
   */
  public setFocus(element: HTMLElement): void {
    if (this.focusManager) {
      this.focusManager.setFocus(element);
    } else {
      element.focus();
    }
  }

  /**
   * 下一个焦点
   */
  public nextFocus(container: HTMLElement = document.body): void {
    if (this.focusManager) {
      this.focusManager.nextFocus(container);
    }
  }

  /**
   * 上一个焦点
   */
  public previousFocus(container: HTMLElement = document.body): void {
    if (this.focusManager) {
      this.focusManager.previousFocus(container);
    }
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
    const customEvent = new CustomEvent('accessibility-event', { detail: event });
    document.dispatchEvent(customEvent);
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    // 销毁各个管理器
    if (this.focusManager) {
      this.focusManager.destroy();
    }
    if (this.keyboardNavigation) {
      this.keyboardNavigation.destroy();
    }
    if (this.screenReaderSupport) {
      this.screenReaderSupport.destroy();
    }
    if (this.highContrastMode) {
      this.highContrastMode.destroy();
    }
    if (this.ariaLabels) {
      this.ariaLabels.destroy();
    }

    // 移除面板和切换按钮
    const panel = document.getElementById('accessibility-panel');
    if (panel) {
      panel.remove();
    }

    const toggle = document.getElementById('accessibility-toggle');
    if (toggle) {
      toggle.remove();
    }

    this.eventListeners.clear();
  }
}

/**
 * React Hook for Accessibility
 */
export function useAccessibility(config?: Partial<AccessibilityConfig>): UseAccessibilityReturn {
  // 这里应该使用React的useState和useEffect
  // 为了简化，我们返回一个模拟的实现
  const manager = new AccessibilityManager(config);
  
  return {
    config: manager.getConfig(),
    state: manager.getState(),
    updateConfig: (updates) => manager.updateConfig(updates),
    toggleMode: (mode) => {
      const currentConfig = manager.getConfig();
      const newValue = !currentConfig[mode];
      manager.updateConfig({ [mode]: newValue });
    },
    resetConfig: () => manager.updateConfig({}),
    getCurrentFocus: () => manager.getCurrentFocus(),
    setFocus: (element) => manager.setFocus(element),
    nextFocus: () => manager.nextFocus(),
    previousFocus: () => manager.previousFocus(),
  };
}
