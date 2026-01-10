/**
 * 高对比度模式
 * 为视力障碍用户提供更好的可读性
 */

export interface ContrastSettings {
  enabled: boolean;
  level: 'normal' | 'high' | 'ultra';
}

class HighContrastMode {
  private storageKey = 'high_contrast_settings';
  private styleElement: HTMLStyleElement | null = null;

  /**
   * 获取高对比度设置
   */
  async getSettings(): Promise<ContrastSettings> {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      return (
        result[this.storageKey] || {
          enabled: false,
          level: 'normal',
        }
      );
    } catch (error) {
      console.error('获取高对比度设置失败:', error);
      return { enabled: false, level: 'normal' };
    }
  }

  /**
   * 保存高对比度设置
   */
  async saveSettings(settings: ContrastSettings) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: settings });
    } catch (error) {
      console.error('保存高对比度设置失败:', error);
    }
  }

  /**
   * 启用高对比度模式
   */
  enable(level: ContrastSettings['level'] = 'high') {
    this.removeStyles();

    const styles = this.generateStyles(level);

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'reading-extension-high-contrast';
    this.styleElement.textContent = styles;
    document.head.appendChild(this.styleElement);

    // 保存设置
    this.saveSettings({ enabled: true, level });
  }

  /**
   * 禁用高对比度模式
   */
  disable() {
    this.removeStyles();
    this.saveSettings({ enabled: false, level: 'normal' });
  }

  /**
   * 切换高对比度模式
   */
  async toggle() {
    const settings = await this.getSettings();

    if (settings.enabled) {
      this.disable();
    } else {
      this.enable(settings.level);
    }
  }

  /**
   * 移除样式
   */
  private removeStyles() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    const existing = document.getElementById('reading-extension-high-contrast');
    existing?.remove();
  }

  /**
   * 生成样式
   */
  private generateStyles(level: ContrastSettings['level']): string {
    const contrastLevels = {
      normal: {
        bg: '#ffffff',
        text: '#000000',
        link: '#0000ee',
        border: '#cccccc',
      },
      high: {
        bg: '#000000',
        text: '#ffffff',
        link: '#ffff00',
        border: '#ffffff',
      },
      ultra: {
        bg: '#000000',
        text: '#ffff00',
        link: '#00ff00',
        border: '#ffff00',
      },
    };

    const colors = contrastLevels[level];

    return `
      /* 高对比度模式样式 */
      body,
      .reading-mode-content {
        background-color: ${colors.bg} !important;
        color: ${colors.text} !important;
      }

      a,
      .reading-mode-content a {
        color: ${colors.link} !important;
        text-decoration: underline !important;
      }

      a:hover,
      .reading-mode-content a:hover {
        background-color: ${colors.text} !important;
        color: ${colors.bg} !important;
      }

      button,
      input,
      select,
      textarea {
        background-color: ${colors.bg} !important;
        color: ${colors.text} !important;
        border: 2px solid ${colors.border} !important;
      }

      button:hover,
      button:focus {
        background-color: ${colors.text} !important;
        color: ${colors.bg} !important;
      }

      img {
        border: 2px solid ${colors.border} !important;
        opacity: 0.9 !important;
      }

      code,
      pre {
        background-color: ${colors.text} !important;
        color: ${colors.bg} !important;
        border: 1px solid ${colors.border} !important;
      }

      hr {
        border-color: ${colors.border} !important;
      }

      /* 移除所有阴影效果 */
      * {
        box-shadow: none !important;
        text-shadow: none !important;
      }

      /* 增强焦点指示器 */
      *:focus {
        outline: 3px solid ${colors.link} !important;
        outline-offset: 2px !important;
      }
    `;
  }

  /**
   * 自动应用保存的设置
   */
  async autoApply() {
    const settings = await this.getSettings();

    if (settings.enabled) {
      this.enable(settings.level);
    }
  }
}

export const highContrastMode = new HighContrastMode();
