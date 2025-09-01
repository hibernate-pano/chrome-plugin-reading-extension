import { ARIAConfig, AccessibilityEvent } from './types';

/**
 * ARIA标签管理器
 * 提供ARIA角色、状态、属性、标签关联等功能
 */
export class ARIALabels {
  private config: ARIAConfig;
  private eventListeners: Map<string, (event: AccessibilityEvent) => void> = new Map();
  private isActive: boolean = false;
  private labeledElements: Map<string, HTMLElement> = new Map();
  private describedElements: Map<string, HTMLElement> = new Map();
  private observer: MutationObserver | null = null;

  constructor(config: Partial<ARIAConfig> = {}) {
    this.config = {
      roles: true,
      statesAndProperties: true,
      labelAssociation: true,
      descriptionAssociation: true,
      liveRegions: true,
      ...config,
    };

    this.initialize();
  }

  /**
   * 初始化ARIA标签管理器
   */
  private initialize(): void {
    if (this.config.roles) {
      this.setupRoles();
    }

    if (this.config.statesAndProperties) {
      this.setupStatesAndProperties();
    }

    if (this.config.labelAssociation) {
      this.setupLabelAssociation();
    }

    if (this.config.descriptionAssociation) {
      this.setupDescriptionAssociation();
    }

    if (this.config.liveRegions) {
      this.setupLiveRegions();
    }

    this.bindGlobalEvents();
  }

  /**
   * 设置ARIA角色
   */
  private setupRoles(): void {
    // 为常见元素添加默认角色
    this.addDefaultRoles();
  }

  /**
   * 添加默认角色
   */
  private addDefaultRoles(): void {
    const roleMappings = [
      { selector: 'button:not([role])', role: 'button' },
      { selector: 'a[href]:not([role])', role: 'link' },
      { selector: 'input[type="text"]:not([role])', role: 'textbox' },
      { selector: 'input[type="search"]:not([role])', role: 'searchbox' },
      { selector: 'input[type="checkbox"]:not([role])', role: 'checkbox' },
      { selector: 'input[type="radio"]:not([role])', role: 'radio' },
      { selector: 'select:not([role])', role: 'combobox' },
      { selector: 'textarea:not([role])', role: 'textbox' },
      { selector: 'nav:not([role])', role: 'navigation' },
      { selector: 'main:not([role])', role: 'main' },
      { selector: 'aside:not([role])', role: 'complementary' },
      { selector: 'header:not([role])', role: 'banner' },
      { selector: 'footer:not([role])', role: 'contentinfo' },
      { selector: 'section:not([role])', role: 'region' },
      { selector: 'article:not([role])', role: 'article' },
      { selector: 'ul:not([role])', role: 'list' },
      { selector: 'ol:not([role])', role: 'list' },
      { selector: 'li:not([role])', role: 'listitem' },
      { selector: 'table:not([role])', role: 'table' },
      { selector: 'thead:not([role])', role: 'rowgroup' },
      { selector: 'tbody:not([role])', role: 'rowgroup' },
      { selector: 'tr:not([role])', role: 'row' },
      { selector: 'th:not([role])', role: 'columnheader' },
      { selector: 'td:not([role])', role: 'cell' }
    ];

    roleMappings.forEach(({ selector, role }) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        element.setAttribute('role', role);
      });
    });
  }

  /**
   * 设置状态和属性
   */
  private setupStatesAndProperties(): void {
    // 为交互元素添加默认状态
    this.addDefaultStates();
  }

  /**
   * 添加默认状态
   */
  private addDefaultStates(): void {
    // 为按钮添加默认状态
    const buttons = document.querySelectorAll('button, [role="button"]');
    buttons.forEach((button) => {
      if (!button.hasAttribute('aria-pressed')) {
        button.setAttribute('aria-pressed', 'false');
      }
    });

    // 为复选框添加默认状态
    const checkboxes = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
    checkboxes.forEach((checkbox) => {
      if (!checkbox.hasAttribute('aria-checked')) {
        const input = checkbox as HTMLInputElement;
        checkbox.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      }
    });

    // 为单选按钮添加默认状态
    const radios = document.querySelectorAll('input[type="radio"], [role="radio"]');
    radios.forEach((radio) => {
      if (!radio.hasAttribute('aria-checked')) {
        const input = radio as HTMLInputElement;
        radio.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      }
    });

    // 为输入框添加默认状态
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea, [role="textbox"]');
    inputs.forEach((input) => {
      if (!input.hasAttribute('aria-required')) {
        const htmlInput = input as HTMLInputElement;
        input.setAttribute('aria-required', htmlInput.required ? 'true' : 'false');
      }
    });
  }

  /**
   * 设置标签关联
   */
  private setupLabelAssociation(): void {
    // 为表单元素添加标签关联
    this.associateFormLabels();
  }

  /**
   * 关联表单标签
   */
  private associateFormLabels(): void {
    const formElements = document.querySelectorAll('input, textarea, select');
    
    formElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const id = htmlElement.getAttribute('id');
      
      if (id) {
        // 查找对应的label
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) {
          htmlElement.setAttribute('aria-labelledby', id);
          label.setAttribute('id', id);
        }
      }
      
      // 如果没有id，生成一个
      if (!id) {
        const generatedId = `form-element-${Math.random().toString(36).substr(2, 9)}`;
        htmlElement.setAttribute('id', generatedId);
        
        // 查找相邻的label
        const parent = htmlElement.parentElement;
        if (parent) {
          const label = parent.querySelector('label');
          if (label) {
            label.setAttribute('for', generatedId);
            htmlElement.setAttribute('aria-labelledby', generatedId);
            label.setAttribute('id', generatedId);
          }
        }
      }
    });
  }

  /**
   * 设置描述关联
   */
  private setupDescriptionAssociation(): void {
    // 为元素添加描述关联
    this.associateDescriptions();
  }

  /**
   * 关联描述
   */
  private associateDescriptions(): void {
    const elements = document.querySelectorAll('[data-description], [aria-describedby]');
    
    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const description = htmlElement.getAttribute('data-description');
      
      if (description) {
        // 创建描述元素
        const descElement = document.createElement('div');
        const descId = `desc-${Math.random().toString(36).substr(2, 9)}`;
        
        descElement.id = descId;
        descElement.className = 'sr-only';
        descElement.textContent = description;
        
        // 添加到页面
        document.body.appendChild(descElement);
        
        // 关联描述
        htmlElement.setAttribute('aria-describedby', descId);
        this.describedElements.set(descId, htmlElement);
      }
    });
  }

  /**
   * 设置实时区域
   */
  private setupLiveRegions(): void {
    // 创建默认的实时区域
    this.createDefaultLiveRegions();
  }

  /**
   * 创建默认实时区域
   */
  private createDefaultLiveRegions(): void {
    const liveRegions = [
      { id: 'status', ariaLive: 'polite', label: '状态更新' },
      { id: 'errors', ariaLive: 'assertive', label: '错误通知' },
      { id: 'progress', ariaLive: 'polite', label: '进度信息' },
      { id: 'navigation', ariaLive: 'polite', label: '导航提示' }
    ];

    liveRegions.forEach(({ id, ariaLive, label }) => {
      this.createLiveRegion(id, ariaLive, label);
    });
  }

  /**
   * 创建实时区域
   */
  public createLiveRegion(id: string, ariaLive: 'polite' | 'assertive' | 'off' = 'polite', label?: string): HTMLElement {
    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', ariaLive);
    region.setAttribute('aria-label', label || id);
    region.className = 'sr-only';
    
    // 添加到页面
    document.body.appendChild(region);
    
    return region;
  }

  /**
   * 添加ARIA标签
   */
  public addLabel(element: HTMLElement, label: string, type: 'label' | 'description' = 'label'): void {
    const id = `${type}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (type === 'label') {
      element.setAttribute('aria-label', label);
      element.setAttribute('aria-labelledby', id);
      this.labeledElements.set(id, element);
    } else {
      element.setAttribute('aria-describedby', id);
      this.describedElements.set(id, element);
    }
  }

  /**
   * 设置ARIA角色
   */
  public setRole(element: HTMLElement, role: string): void {
    element.setAttribute('role', role);
    
    this.emitEvent('role-change', { element, role });
  }

  /**
   * 设置ARIA状态
   */
  public setState(element: HTMLElement, state: string, value: string | boolean): void {
    element.setAttribute(`aria-${state}`, value.toString());
    
    this.emitEvent('state-change', { element, state, value });
  }

  /**
   * 设置ARIA属性
   */
  public setProperty(element: HTMLElement, property: string, value: string): void {
    element.setAttribute(`aria-${property}`, value);
    
    this.emitEvent('property-change', { element, property, value });
  }

  /**
   * 创建跳过链接
   */
  public createSkipLink(text: string, targetId: string): HTMLAnchorElement {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:outline-none focus:shadow-lg';
    skipLink.setAttribute('role', 'link');
    skipLink.setAttribute('aria-label', `跳到${text}`);
    
    return skipLink;
  }

  /**
   * 创建进度条
   */
  public createProgressBar(id: string, label: string, value: number = 0, max: number = 100): HTMLElement {
    const progressContainer = document.createElement('div');
    progressContainer.id = id;
    progressContainer.setAttribute('role', 'progressbar');
    progressContainer.setAttribute('aria-label', label);
    progressContainer.setAttribute('aria-valuemin', '0');
    progressContainer.setAttribute('aria-valuemax', max.toString());
    progressContainer.setAttribute('aria-valuenow', value.toString());
    progressContainer.setAttribute('aria-valuetext', `${Math.round((value / max) * 100)}%`);
    
    const progressBar = document.createElement('div');
    progressBar.setAttribute('role', 'progressbar');
    progressBar.className = 'progress-bar';
    progressBar.style.width = `${(value / max) * 100}%`;
    
    progressContainer.appendChild(progressBar);
    
    return progressContainer;
  }

  /**
   * 更新进度条
   */
  public updateProgressBar(id: string, value: number, max: number = 100): void {
    const progressContainer = document.getElementById(id);
    if (!progressContainer) return;

    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    progressContainer.setAttribute('aria-valuenow', value.toString());
    progressContainer.setAttribute('aria-valuetext', `${Math.round(percentage)}%`);
    
    const progressBar = progressContainer.querySelector('.progress-bar') as HTMLElement;
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
  }

  /**
   * 创建标签页
   */
  public createTab(id: string, label: string, selected: boolean = false): HTMLElement {
    const tab = document.createElement('button');
    tab.id = id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', selected.toString());
    tab.setAttribute('aria-label', label);
    tab.textContent = label;
    tab.className = 'tab-button';
    
    return tab;
  }

  /**
   * 创建标签面板
   */
  public createTabPanel(id: string, label: string, tabId: string): HTMLElement {
    const panel = document.createElement('div');
    panel.id = id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-label', label);
    panel.setAttribute('aria-labelledby', tabId);
    panel.className = 'tab-panel';
    
    return panel;
  }

  /**
   * 创建对话框
   */
  public createDialog(id: string, label: string, modal: boolean = true): HTMLElement {
    const dialog = document.createElement('div');
    dialog.id = id;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', label);
    dialog.setAttribute('aria-modal', modal.toString());
    dialog.className = 'dialog';
    
    if (modal) {
      dialog.setAttribute('aria-describedby', `${id}-description`);
      
      const description = document.createElement('div');
      description.id = `${id}-description`;
      description.className = 'sr-only';
      description.textContent = label;
      
      dialog.appendChild(description);
    }
    
    return dialog;
  }

  /**
   * 绑定全局事件
   */
  private bindGlobalEvents(): void {
    // 监听DOM变化，自动添加ARIA属性
    this.observeDOMChanges();
    
    // 监听焦点变化，提供ARIA提示
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.provideARIAHint(target);
      }
    });
  }

  /**
   * 观察DOM变化
   */
  private observeDOMChanges(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              this.processNewElement(element);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    this.observer = observer;
  }

  /**
   * 处理新元素
   */
  private processNewElement(element: HTMLElement): void {
    // 为新元素添加默认ARIA属性
    if (this.config.roles) {
      this.addDefaultRolesToElement(element);
    }
    
    if (this.config.statesAndProperties) {
      this.addDefaultStatesToElement(element);
    }
    
    // 递归处理子元素
    const children = element.querySelectorAll('*');
    children.forEach((child) => {
      this.processNewElement(child as HTMLElement);
    });
  }

  /**
   * 为元素添加默认角色
   */
  private addDefaultRolesToElement(element: HTMLElement): void {
    const tagName = element.tagName.toLowerCase();
    const roleMappings: Record<string, string> = {
      'button': 'button',
      'a': 'link',
      'input': 'textbox',
      'textarea': 'textbox',
      'select': 'combobox',
      'nav': 'navigation',
      'main': 'main',
      'aside': 'complementary',
      'header': 'banner',
      'footer': 'contentinfo',
      'section': 'region',
      'article': 'article',
      'ul': 'list',
      'ol': 'list',
      'li': 'listitem',
      'table': 'table',
      'thead': 'rowgroup',
      'tbody': 'rowgroup',
      'tr': 'row',
      'th': 'columnheader',
      'td': 'cell'
    };

    const role = roleMappings[tagName];
    if (role && !element.hasAttribute('role')) {
      element.setAttribute('role', role);
    }
  }

  /**
   * 为元素添加默认状态
   */
  private addDefaultStatesToElement(element: HTMLElement): void {
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'button' && !element.hasAttribute('aria-pressed')) {
      element.setAttribute('aria-pressed', 'false');
    } else if (tagName === 'input') {
      const input = element as HTMLInputElement;
      if (input.type === 'checkbox' && !element.hasAttribute('aria-checked')) {
        element.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      } else if (input.type === 'radio' && !element.hasAttribute('aria-checked')) {
        element.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      } else if ((input.type === 'text' || input.type === 'search') && !element.hasAttribute('aria-required')) {
        element.setAttribute('aria-required', input.required ? 'true' : 'false');
      }
    }
  }

  /**
   * 提供ARIA提示
   */
  private provideARIAHint(element: HTMLElement): void {
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledby = element.getAttribute('aria-labelledby');
    
    if (role || ariaLabel || ariaLabelledby) {
      this.emitEvent('aria-hint', { element, role, ariaLabel, ariaLabelledby });
    }
  }

  /**
   * 启用ARIA标签管理器
   */
  public enable(): void {
    this.isActive = true;
    this.emitEvent('mode-change', { type: 'enabled' });
  }

  /**
   * 禁用ARIA标签管理器
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
    const customEvent = new CustomEvent('aria-labels-event', { detail: event });
    document.dispatchEvent(customEvent);
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<ARIAConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // 重新初始化相关功能
    if (updates.roles !== undefined) {
      this.setupRoles();
    }
    
    if (updates.statesAndProperties !== undefined) {
      this.setupStatesAndProperties();
    }
    
    if (updates.labelAssociation !== undefined) {
      this.setupLabelAssociation();
    }
    
    if (updates.descriptionAssociation !== undefined) {
      this.setupDescriptionAssociation();
    }
    
    if (updates.liveRegions !== undefined) {
      this.setupLiveRegions();
    }
  }

  /**
   * 移除所有ARIA属性
   */
  private removeAllARIA(): void {
    document.querySelectorAll('[role]').forEach(element => {
      element.removeAttribute('role');
    });
    document.querySelectorAll('[aria-label]').forEach(element => {
      element.removeAttribute('aria-label');
    });
    document.querySelectorAll('[aria-labelledby]').forEach(element => {
      element.removeAttribute('aria-labelledby');
    });
    document.querySelectorAll('[aria-checked]').forEach(element => {
      element.removeAttribute('aria-checked');
    });
    document.querySelectorAll('[aria-required]').forEach(element => {
      element.removeAttribute('aria-required');
    });
    document.querySelectorAll('[aria-valuemin]').forEach(element => {
      element.removeAttribute('aria-valuemin');
    });
    document.querySelectorAll('[aria-valuemax]').forEach(element => {
      element.removeAttribute('aria-valuemax');
    });
    document.querySelectorAll('[aria-valuenow]').forEach(element => {
      element.removeAttribute('aria-valuenow');
    });
    document.querySelectorAll('[aria-valuetext]').forEach(element => {
      element.removeAttribute('aria-valuetext');
    });
    document.querySelectorAll('[aria-modal]').forEach(element => {
      element.removeAttribute('aria-modal');
    });
    document.querySelectorAll('[aria-describedby]').forEach(element => {
      element.removeAttribute('aria-describedby');
    });
    document.querySelectorAll('[aria-live]').forEach(element => {
      element.removeAttribute('aria-live');
    });
    document.querySelectorAll('[aria-label]').forEach(element => {
      element.removeAttribute('aria-label');
    });
  }

  /**
   * 销毁ARIA标签管理器
   */
  public destroy(): void {
    // 移除事件监听器
    this.eventListeners.clear();
    
    // 停止DOM观察器
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // 清理标签关联
    this.labeledElements.clear();
    
    // 清理描述关联
    this.describedElements.clear();
    
    // 移除所有ARIA属性
    this.removeAllARIA();
    
    this.isActive = false;
  }
}
