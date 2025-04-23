import { BUILT_IN_THEMES, STORAGE_KEYS } from '../../constants';
import { ThemeConfig } from '../../types';
import { StorageError } from '../../types/errors';
import { storage } from '../index';

/**
 * 主题管理
 */
export class ThemeModel {
  private themeCache: Map<string, ThemeConfig> = new Map();

  constructor() {
    // 初始化内置主题缓存
    Object.values(BUILT_IN_THEMES).forEach(theme => {
      this.themeCache.set(theme.id, theme);
    });
  }

  /**
   * 获取所有主题
   */
  public async getAllThemes(): Promise<ThemeConfig[]> {
    try {
      // 先从存储中加载自定义主题
      const customThemes = await storage.getAll<ThemeConfig>(STORAGE_KEYS.THEMES);
      
      // 将自定义主题添加到缓存
      customThemes.forEach(theme => {
        this.themeCache.set(theme.id, theme);
      });
      
      // 合并内置主题和自定义主题
      return Array.from(this.themeCache.values());
    } catch (error) {
      throw new StorageError('获取所有主题失败', error);
    }
  }

  /**
   * 获取单个主题
   */
  public async getTheme(id: string): Promise<ThemeConfig | null> {
    try {
      // 检查缓存
      if (this.themeCache.has(id)) {
        return this.themeCache.get(id) || null;
      }
      
      // 如果是内置主题
      if (id in BUILT_IN_THEMES) {
        const theme = BUILT_IN_THEMES[id as keyof typeof BUILT_IN_THEMES];
        this.themeCache.set(id, theme);
        return theme;
      }
      
      // 从存储中获取
      const theme = await storage.get<ThemeConfig>(STORAGE_KEYS.THEMES, id);
      
      if (theme) {
        this.themeCache.set(id, theme);
      }
      
      return theme;
    } catch (error) {
      throw new StorageError('获取主题失败', {
        id,
        error
      });
    }
  }

  /**
   * 保存自定义主题
   */
  public async saveTheme(theme: ThemeConfig): Promise<void> {
    try {
      // 不允许覆盖内置主题
      if (theme.id in BUILT_IN_THEMES) {
        throw new StorageError('不能修改内置主题', {
          theme
        });
      }
      
      // 保存到存储
      await storage.update(STORAGE_KEYS.THEMES, theme);
      
      // 更新缓存
      this.themeCache.set(theme.id, theme);
    } catch (error) {
      throw new StorageError('保存主题失败', {
        theme,
        error
      });
    }
  }

  /**
   * 删除自定义主题
   */
  public async deleteTheme(id: string): Promise<void> {
    try {
      // 不允许删除内置主题
      if (id in BUILT_IN_THEMES) {
        throw new StorageError('不能删除内置主题', {
          id
        });
      }
      
      // 从存储中删除
      await storage.delete(STORAGE_KEYS.THEMES, id);
      
      // 从缓存中删除
      this.themeCache.delete(id);
    } catch (error) {
      throw new StorageError('删除主题失败', {
        id,
        error
      });
    }
  }

  /**
   * 创建新主题
   */
  public async createTheme(theme: Omit<ThemeConfig, 'id'>): Promise<ThemeConfig> {
    try {
      // 生成唯一ID
      const id = `theme_${Date.now()}`;
      
      const newTheme: ThemeConfig = {
        id,
        ...theme
      };
      
      // 保存到存储
      await storage.add(STORAGE_KEYS.THEMES, newTheme);
      
      // 更新缓存
      this.themeCache.set(id, newTheme);
      
      return newTheme;
    } catch (error) {
      throw new StorageError('创建主题失败', {
        theme,
        error
      });
    }
  }

  /**
   * 重置所有自定义主题
   */
  public async resetCustomThemes(): Promise<void> {
    try {
      // 清空主题存储
      await storage.clear(STORAGE_KEYS.THEMES);
      
      // 重置缓存
      this.themeCache.clear();
      
      // 恢复内置主题
      Object.values(BUILT_IN_THEMES).forEach(theme => {
        this.themeCache.set(theme.id, theme);
      });
    } catch (error) {
      throw new StorageError('重置自定义主题失败', error);
    }
  }
}

// 创建并导出单例
export const themeModel = new ThemeModel(); 