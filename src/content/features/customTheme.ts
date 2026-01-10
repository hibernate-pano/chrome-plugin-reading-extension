/**
 * 自定义主题系统
 * 允许用户创建和管理自己的阅读主题
 */

export interface CustomTheme {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  codeBackgroundColor: string;
  codeTextColor: string;
  borderColor?: string;
  createdAt: number;
  isDefault?: boolean;
}

export const DEFAULT_THEMES: CustomTheme[] = [
  {
    id: 'light',
    name: '浅色',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    linkColor: '#3b82f6',
    codeBackgroundColor: '#f3f4f6',
    codeTextColor: '#374151',
    borderColor: '#e5e7eb',
    createdAt: 0,
    isDefault: true,
  },
  {
    id: 'dark',
    name: '深色',
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    linkColor: '#60a5fa',
    codeBackgroundColor: '#374151',
    codeTextColor: '#e5e7eb',
    borderColor: '#4b5563',
    createdAt: 0,
    isDefault: true,
  },
  {
    id: 'sepia',
    name: '护眼',
    backgroundColor: '#f5f3eb',
    textColor: '#5c4b37',
    linkColor: '#8b7355',
    codeBackgroundColor: '#ebe8df',
    codeTextColor: '#5c4b37',
    borderColor: '#d4cec0',
    createdAt: 0,
    isDefault: true,
  },
];

class CustomThemeManager {
  private storageKey = 'custom_themes';

  /**
   * 获取所有主题（包括预设和自定义）
   */
  async getAllThemes(): Promise<CustomTheme[]> {
    try {
      const custom = await this.getCustomThemes();
      return [...DEFAULT_THEMES, ...custom];
    } catch (error) {
      console.error('获取主题失败:', error);
      return DEFAULT_THEMES;
    }
  }

  /**
   * 获取自定义主题
   */
  async getCustomThemes(): Promise<CustomTheme[]> {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error('获取自定义主题失败:', error);
      return [];
    }
  }

  /**
   * 保存自定义主题
   */
  async saveTheme(theme: Omit<CustomTheme, 'id' | 'createdAt' | 'isDefault'>): Promise<string> {
    try {
      const customThemes = await this.getCustomThemes();

      const newTheme: CustomTheme = {
        ...theme,
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        isDefault: false,
      };

      customThemes.push(newTheme);
      await chrome.storage.local.set({ [this.storageKey]: customThemes });

      return newTheme.id;
    } catch (error) {
      console.error('保存主题失败:', error);
      throw error;
    }
  }

  /**
   * 更新主题
   */
  async updateTheme(id: string, updates: Partial<CustomTheme>): Promise<void> {
    try {
      const customThemes = await this.getCustomThemes();
      const index = customThemes.findIndex((t) => t.id === id);

      if (index === -1) {
        throw new Error('主题不存在');
      }

      // 不允许修改默认主题
      if (customThemes[index].isDefault) {
        throw new Error('无法修改默认主题');
      }

      customThemes[index] = { ...customThemes[index], ...updates };
      await chrome.storage.local.set({ [this.storageKey]: customThemes });
    } catch (error) {
      console.error('更新主题失败:', error);
      throw error;
    }
  }

  /**
   * 删除主题
   */
  async deleteTheme(id: string): Promise<void> {
    try {
      const customThemes = await this.getCustomThemes();
      const theme = customThemes.find((t) => t.id === id);

      if (!theme) {
        throw new Error('主题不存在');
      }

      if (theme.isDefault) {
        throw new Error('无法删除默认主题');
      }

      const filtered = customThemes.filter((t) => t.id !== id);
      await chrome.storage.local.set({ [this.storageKey]: filtered });
    } catch (error) {
      console.error('删除主题失败:', error);
      throw error;
    }
  }

  /**
   * 应用主题到页面
   */
  applyTheme(theme: CustomTheme) {
    const root = document.documentElement;

    root.style.setProperty('--theme-bg', theme.backgroundColor);
    root.style.setProperty('--theme-text', theme.textColor);
    root.style.setProperty('--theme-link', theme.linkColor);
    root.style.setProperty('--theme-code-bg', theme.codeBackgroundColor);
    root.style.setProperty('--theme-code-text', theme.codeTextColor);

    if (theme.borderColor) {
      root.style.setProperty('--theme-border', theme.borderColor);
    }
  }

  /**
   * 从当前颜色导出主题
   */
  exportThemeFromColors(name: string): Omit<CustomTheme, 'id' | 'createdAt' | 'isDefault'> {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    return {
      name,
      backgroundColor: computedStyle.getPropertyValue('--theme-bg') || '#ffffff',
      textColor: computedStyle.getPropertyValue('--theme-text') || '#000000',
      linkColor: computedStyle.getPropertyValue('--theme-link') || '#0000ee',
      codeBackgroundColor: computedStyle.getPropertyValue('--theme-code-bg') || '#f5f5f5',
      codeTextColor: computedStyle.getPropertyValue('--theme-code-text') || '#000000',
      borderColor: computedStyle.getPropertyValue('--theme-border') || '#e0e0e0',
    };
  }
}

export const customThemeManager = new CustomThemeManager();
