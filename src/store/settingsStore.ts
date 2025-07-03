import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '../constants/defaultSettings';
import { UserSettings } from '../types';
import { settingsModel } from '../storage/models/SettingsModel';
import { chromeStorageMiddleware } from './chromeStorageMiddleware';

// 定义设置状态接口
interface SettingsState {
  // 设置状态
  settings: UserSettings;
  // 是否正在加载
  isLoading: boolean;
  // 是否有未保存的更改
  isDirty: boolean;
  // 初始化设置
  initSettings: () => Promise<void>;
  // 更新设置
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  // 重置设置
  resetSettings: () => Promise<void>;
  // 更新单个设置
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>;
}

// 创建设置状态管理器
export const useSettingsStore = create<SettingsState>()(
  // 使用简化的方式，不使用中间件
  (set, get) => ({
    // 初始状态
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    isDirty: false,

    // 初始化设置
    initSettings: async () => {
      try {
        set({ isLoading: true });
        const settings = await settingsModel.getSettings();
        set({ settings, isLoading: false, isDirty: false });
      } catch (error) {
        console.error('初始化设置失败', error);
        set({ settings: DEFAULT_SETTINGS, isLoading: false, isDirty: false });
      }
    },

    // 更新设置
    updateSettings: async (newSettings: Partial<UserSettings>) => {
      try {
        set({ isLoading: true });
        const updatedSettings = await settingsModel.updateSettings(newSettings);
        set({ settings: updatedSettings, isLoading: false, isDirty: false });
      } catch (error) {
        console.error('更新设置失败', error);
        set({ isLoading: false });
      }
    },

    // 重置设置
    resetSettings: async () => {
      try {
        set({ isLoading: true });
        const defaultSettings = await settingsModel.resetSettings();
        set({ settings: defaultSettings, isLoading: false, isDirty: false });
      } catch (error) {
        console.error('重置设置失败', error);
        set({ isLoading: false });
      }
    },

    // 更新单个设置
    updateSetting: async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      try {
        // 先更新本地状态，提供即时反馈
        set((state: SettingsState) => ({
          settings: { ...state.settings, [key]: value },
          isDirty: true
        }));
        
        // 然后异步保存到存储
        await settingsModel.setSetting(key, value);
        set({ isDirty: false });
      } catch (error) {
        console.error(`更新设置 ${String(key)} 失败`, error);
        // 如果保存失败，可以选择回滚状态
        const settings = await settingsModel.getSettings();
        set({ settings, isDirty: false });
      }
    }
  })
); 