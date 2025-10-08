import { UserSettings } from '../types';

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: UserSettings = {
  // 显示设置
  theme: 'light',
  fontSize: 18,
  lineHeight: 1.6,
  fontFamily: 'default',
  paragraphSpacing: 1.2,
  pageWidth: 900,
  backgroundColor: 'white',

  // 预设相关
  presets: [],
  activePreset: null,
};

/**
 * 获取完整的默认设置
 * 用于确保所有设置都有默认值
 */
export function getCompleteSettings<T extends Partial<typeof DEFAULT_SETTINGS>>(
  partialSettings: T
): typeof DEFAULT_SETTINGS {
  return {
    ...DEFAULT_SETTINGS,
    ...partialSettings
  };
}
