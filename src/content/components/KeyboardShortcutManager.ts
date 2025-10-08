/**
 * 键盘快捷键管理器
 * 管理全局键盘快捷键，提供统一的快捷键处理
 */

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: ShortcutConfig[];
}

/**
 * 键盘快捷键管理器
 */
export class KeyboardShortcutManager {
  private static instance: KeyboardShortcutManager;
  private shortcuts = new Map<string, ShortcutConfig>();
  private isEnabled = true;
  private helpDialog: HTMLElement | null = null;

  private constructor() {
    this.attachEventListeners();
  }

  public static getInstance(): KeyboardShortcutManager {
    if (!KeyboardShortcutManager.instance) {
      KeyboardShortcutManager.instance = new KeyboardShortcutManager();
    }
    return KeyboardShortcutManager.instance;
  }

  /**
   * 注册快捷键
   */
  public registerShortcut(config: ShortcutConfig): void {
    const key = this.getKeyString(config);
    this.shortcuts.set(key, config);
    console.log(`⌨️ 注册快捷键: ${key} - ${config.description}`);
  }

  /**
   * 批量注册快捷键
   */
  public registerShortcuts(shortcuts: ShortcutConfig[]): void {
    shortcuts.forEach(shortcut => this.registerShortcut(shortcut));
  }

  /**
   * 注册快捷键组
   */
  public registerShortcutGroup(group: ShortcutGroup): void {
    console.log(`⌨️ 注册快捷键组: ${group.name}`);
    group.shortcuts.forEach(shortcut => this.registerShortcut(shortcut));
  }

  /**
   * 注销快捷键
   */
  public unregisterShortcut(config: ShortcutConfig): void {
    const key = this.getKeyString(config);
    this.shortcuts.delete(key);
    console.log(`⌨️ 注销快捷键: ${key}`);
  }

  /**
   * 启用/禁用快捷键
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`⌨️ 快捷键${enabled ? '已启用' : '已禁用'}`);
  }

  /**
   * 获取快捷键字符串
   */
  private getKeyString(config: ShortcutConfig): string {
    const modifiers = [];
    if (config.ctrl) modifiers.push('Ctrl');
    if (config.alt) modifiers.push('Alt');
    if (config.shift) modifiers.push('Shift');
    if (config.meta) modifiers.push('Meta');
    
    return [...modifiers, config.key].join('+');
  }

  /**
   * 检查按键是否匹配快捷键
   */
  private matchesShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
    return (
      event.key.toLowerCase() === config.key.toLowerCase() &&
      !!event.ctrlKey === !!config.ctrl &&
      !!event.altKey === !!config.alt &&
      !!event.shiftKey === !!config.shift &&
      !!event.metaKey === !!config.meta
    );
  }

  /**
   * 处理键盘事件
   */
  private handleKeydown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    // 检查是否按下了帮助快捷键 (Ctrl+Shift+?)
    if (event.ctrlKey && event.shiftKey && event.key === '?') {
      event.preventDefault();
      this.showHelpDialog();
      return;
    }

    // 查找匹配的快捷键
    for (const [key, config] of this.shortcuts) {
      if (this.matchesShortcut(event, config)) {
        if (config.preventDefault) {
          event.preventDefault();
        }
        if (config.stopPropagation) {
          event.stopPropagation();
        }

        try {
          config.action();
          console.log(`⌨️ 执行快捷键: ${key} - ${config.description}`);
        } catch (error) {
          console.error(`⌨️ 快捷键执行失败: ${key}`, error);
        }
        break;
      }
    }
  };

  /**
   * 绑定事件监听器
   */
  private attachEventListeners(): void {
    document.addEventListener('keydown', this.handleKeydown, true);
  }

  /**
   * 解绑事件监听器
   */
  private detachEventListeners(): void {
    document.removeEventListener('keydown', this.handleKeydown, true);
  }

  /**
   * 显示帮助对话框
   */
  public showHelpDialog(): void {
    if (this.helpDialog) {
      this.hideHelpDialog();
      return;
    }

    this.createHelpDialog();
    this.helpDialog!.style.display = 'block';
    
    // 添加显示动画
    setTimeout(() => {
      if (this.helpDialog) {
        this.helpDialog.classList.add('show');
      }
    }, 10);
  }

  /**
   * 隐藏帮助对话框
   */
  public hideHelpDialog(): void {
    if (!this.helpDialog) return;

    this.helpDialog.classList.remove('show');
    setTimeout(() => {
      if (this.helpDialog) {
        this.helpDialog.style.display = 'none';
      }
    }, 200);
  }

  /**
   * 创建帮助对话框
   */
  private createHelpDialog(): void {
    this.helpDialog = document.createElement('div');
    this.helpDialog.id = 'keyboard-shortcuts-help';
    this.helpDialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      transform: scale(0.9);
      transition: transform 0.3s ease;
    `;

    const title = document.createElement('h2');
    title.textContent = '键盘快捷键';
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    `;

    const shortcutsList = document.createElement('div');
    shortcutsList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // 按功能分组显示快捷键
    const groups = this.getShortcutGroups();
    groups.forEach(group => {
      const groupTitle = document.createElement('h3');
      groupTitle.textContent = group.name;
      groupTitle.style.cssText = `
        margin: 16px 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;

      const groupShortcuts = document.createElement('div');
      groupShortcuts.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;

      group.shortcuts.forEach(shortcut => {
        const shortcutItem = document.createElement('div');
        shortcutItem.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
        `;

        const description = document.createElement('span');
        description.textContent = shortcut.description;
        description.style.cssText = `
          font-size: 14px;
          color: #333;
        `;

        const keyCombo = document.createElement('div');
        keyCombo.style.cssText = `
          display: flex;
          gap: 4px;
        `;

        const keyString = this.getKeyString(shortcut);
        keyString.split('+').forEach(key => {
          const keyElement = document.createElement('kbd');
          keyElement.textContent = key;
          keyElement.style.cssText = `
            background: #e9ecef;
            border: 1px solid #ced4da;
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 12px;
            font-family: monospace;
            color: #495057;
          `;
          keyCombo.appendChild(keyElement);
        });

        shortcutItem.appendChild(description);
        shortcutItem.appendChild(keyCombo);
        groupShortcuts.appendChild(shortcutItem);
      });

      shortcutsList.appendChild(groupTitle);
      shortcutsList.appendChild(groupShortcuts);
    });

    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭 (Esc)';
    closeButton.style.cssText = `
      margin-top: 20px;
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    `;

    closeButton.addEventListener('click', () => this.hideHelpDialog());
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = '#0056b3';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = '#007bff';
    });

    dialog.appendChild(title);
    dialog.appendChild(shortcutsList);
    dialog.appendChild(closeButton);
    this.helpDialog.appendChild(dialog);

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #keyboard-shortcuts-help.show {
        opacity: 1 !important;
      }
      #keyboard-shortcuts-help.show > div {
        transform: scale(1) !important;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.helpDialog);

    // 点击背景关闭
    this.helpDialog.addEventListener('click', (e) => {
      if (e.target === this.helpDialog) {
        this.hideHelpDialog();
      }
    });

    // ESC键关闭
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hideHelpDialog();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * 获取快捷键分组
   */
  private getShortcutGroups(): ShortcutGroup[] {
    const groups: { [key: string]: ShortcutConfig[] } = {};
    
    for (const shortcut of this.shortcuts.values()) {
      const groupName = this.getGroupName(shortcut);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(shortcut);
    }

    return Object.entries(groups).map(([name, shortcuts]) => ({
      name,
      shortcuts
    }));
  }

  /**
   * 根据快捷键获取分组名称
   */
  private getGroupName(shortcut: ShortcutConfig): string {
    const description = shortcut.description.toLowerCase();
    
    if (description.includes('阅读') || description.includes('模式')) {
      return '阅读模式';
    } else if (description.includes('复制') || description.includes('搜索') || description.includes('翻译')) {
      return '文本操作';
    } else if (description.includes('高亮') || description.includes('注释')) {
      return '注释功能';
    } else if (description.includes('设置') || description.includes('帮助')) {
      return '系统功能';
    } else {
      return '其他';
    }
  }

  /**
   * 获取所有快捷键
   */
  public getAllShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.detachEventListeners();
    this.hideHelpDialog();
    if (this.helpDialog && this.helpDialog.parentNode) {
      this.helpDialog.parentNode.removeChild(this.helpDialog);
    }
    this.shortcuts.clear();
  }
}

// 导出单例实例
export const keyboardShortcutManager = KeyboardShortcutManager.getInstance();
