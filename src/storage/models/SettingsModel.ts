import { DEFAULT_SETTINGS } from '../../constants/defaultSettings';
import { UserSettings } from '../../types';
import { StorageError } from '../../types/errors';
import { storage } from '../index';
import { STORAGE_KEYS } from '../../constants';

/**
 * 设置管理
 */
export class SettingsModel {
  private settingsCache: UserSettings | null = null;

  /**
   * 获取所有设置
   */
  public async getSettings(): Promise<UserSettings> {
    try {
      // 使用缓存如果存在
      if (this.settingsCache) {
        return this.settingsCache;
      }

      const storedSettings = await this.loadSettings();

      // 合并默认设置和存储的设置
      this.settingsCache = {
        ...DEFAULT_SETTINGS,
        ...storedSettings
      };

      return this.settingsCache;
    } catch (error) {
      console.error('获取设置失败', error);
      // 出错时返回默认设置
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 从存储加载设置
   */
  private async loadSettings(): Promise<Partial<UserSettings>> {
    try {
      // 遍历设置存储中的所有键值对
      const allSettings = await storage.getAll(STORAGE_KEYS.SETTINGS);

      // 转换为设置对象
      const settings: Partial<UserSettings> = {};

      for (const item of allSettings) {
        const key = item.key;
        const value = item.value;

        if (key in DEFAULT_SETTINGS) {
          // 使用索引签名赋值
          (settings as any)[key] = value;
        }
      }

      return settings;
    } catch (error) {
      throw new StorageError('加载设置失败', error);
    }
  }

  /**
   * 更新设置
   */
  public async updateSettings(newSettings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      // 获取当前设置
      const currentSettings = await this.getSettings();

      // 合并设置
      const mergedSettings = {
        ...currentSettings,
        ...newSettings
      };

      // 保存到存储
      const savePromises = Object.entries(newSettings).map(([key, value]) =>
        storage.set(STORAGE_KEYS.SETTINGS, key, value)
      );

      await Promise.all(savePromises);

      // 更新缓存
      this.settingsCache = mergedSettings;

      return mergedSettings;
    } catch (error) {
      throw new StorageError('更新设置失败', {
        newSettings,
        error
      });
    }
  }

  /**
   * 重置设置
   */
  public async resetSettings(): Promise<UserSettings> {
    try {
      // 清空设置存储
      await storage.clear(STORAGE_KEYS.SETTINGS);

      // 重置缓存
      this.settingsCache = { ...DEFAULT_SETTINGS };

      return this.settingsCache;
    } catch (error) {
      throw new StorageError('重置设置失败', error);
    }
  }

  /**
   * 获取单个设置项
   */
  public async getSetting<K extends keyof UserSettings>(key: K): Promise<UserSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * 设置单个设置项
   */
  public async setSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<void> {
    try {
      await storage.set(STORAGE_KEYS.SETTINGS, key as string, value);

      // 更新缓存（如果存在）
      if (this.settingsCache) {
        this.settingsCache[key] = value;
      }
    } catch (error) {
      throw new StorageError('设置单个设置项失败', {
        key,
        value,
        error
      });
    }
  }
}

// 创建并导出单例
export const settingsModel = new SettingsModel();