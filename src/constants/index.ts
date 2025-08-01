/**
 * 存储键
 */
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  THEMES: 'themes',
  HISTORY: 'history',
  ANNOTATIONS: 'annotations',
  EXTRACTOR_RULES: 'extractorRules',
  READING_PROGRESS: 'readingProgress',
};

/**
 * 消息类型
 */
export const MESSAGE_TYPES = {
  // 内容脚本消息
  EXTRACT_CONTENT: 'EXTRACT_CONTENT',
  APPLY_SETTINGS: 'APPLY_SETTINGS',
  TOGGLE_READER_MODE: 'TOGGLE_READER_MODE',
  TOGGLE_READING_MODE: 'TOGGLE_READING_MODE',
  ENABLE_READING_MODE: 'ENABLE_READING_MODE',
  DISABLE_READING_MODE: 'DISABLE_READING_MODE',
  APPLY_PRESET: 'APPLY_PRESET',
  GET_READING_MODE_STATE: 'GET_READING_MODE_STATE',
  GET_READING_STATUS: 'GET_READING_STATUS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SAVE_ANNOTATIONS: 'SAVE_ANNOTATIONS',
  LOAD_ANNOTATIONS: 'LOAD_ANNOTATIONS',
  SAVE_READING_PROGRESS: 'SAVE_READING_PROGRESS',

  // 后台消息
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  THEME_UPDATED: 'THEME_UPDATED',

  // 弹出窗口消息
  GET_PAGE_STATUS: 'GET_PAGE_STATUS',
  GET_SETTINGS: 'GET_SETTINGS',
  SET_SETTINGS: 'SET_SETTINGS',
};

/**
 * 默认设置已移至 constants/defaultSettings.ts
 */
import { DEFAULT_SETTINGS } from './defaultSettings';

/**
 * 内置主题
 */
export const BUILT_IN_THEMES = {
  light: {
    id: 'light',
    name: '浅色',
    isDark: false,
    colors: {
      background: '#ffffff',
      text: '#333333',
      primary: '#4a7bab',
      secondary: '#a3c0db',
      border: '#e1e1e1',
      highlight: '#ffeeba',
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      headingFontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      codeFontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
      baseFontSize: DEFAULT_SETTINGS.fontSize,
      baseLineHeight: 1.6,
    },
  },
  dark: {
    id: 'dark',
    name: '深色',
    isDark: true,
    colors: {
      background: '#282c35',
      text: '#e5e5e5',
      primary: '#6d9ed8',
      secondary: '#557399',
      border: '#3e4452',
      highlight: '#7d6a31',
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      headingFontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      codeFontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
      baseFontSize: DEFAULT_SETTINGS.fontSize,
      baseLineHeight: 1.6,
    },
  },
  sepia: {
    id: 'sepia',
    name: '护眼',
    isDark: false,
    colors: {
      background: '#f8f3e4',
      text: '#5b4636',
      primary: '#996633',
      secondary: '#c4b59d',
      border: '#e0d6c2',
      highlight: '#ffe0a6',
    },
    typography: {
      fontFamily: 'Georgia, serif',
      headingFontFamily: 'Georgia, serif',
      codeFontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
      baseFontSize: 19,
      baseLineHeight: 1.7,
    },
  },
};

/**
 * 注释颜色
 */
export const ANNOTATION_COLORS = [
  '#ffeb3b', // 黄色
  '#a5d6a7', // 绿色
  '#90caf9', // 蓝色
  '#f48fb1', // 粉色
  '#ce93d8', // 紫色
];

/**
 * 数据库版本
 */
export const DATABASE_VERSION = 1;

/**
 * 数据库名称
 */
export const DATABASE_NAME = 'reader_extension';

/**
 * 最大历史记录数
 */
export const MAX_HISTORY_ITEMS = 100;

/**
 * 最大错误日志数
 */
export const MAX_ERROR_LOGS = 50;