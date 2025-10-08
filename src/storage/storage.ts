import { DEFAULT_LINE_HEIGHT } from '../constants/options';

export enum StorageKeys {
  THEME = 'theme',
  FONT_SIZE = 'fontSize',
  LINE_HEIGHT = 'lineHeight',
  TEXT_ALIGN = 'textAlign',
  SHOW_IMAGES = 'showImages',
  FONT_FAMILY = 'fontFamily',
  BACKGROUND_COLOR = 'backgroundColor',
  CODE_FONT_SIZE = 'codeFontSize',
  CODE_THEME = 'codeTheme',
  PARAGRAPH_SPACING = 'paragraphSpacing',
  ENABLE_TEXT_SELECTION_TOOLBAR = 'enableTextSelectionToolbar',
  ACTIVE_PRESET = 'activePreset',
  CUSTOM_PRESETS = 'customPresets',
  READING_PROGRESS = 'readingProgress'
}

export type StorageKeysType = `${StorageKeys}`;

// 预定义的字体选项
export const FONT_FAMILIES = {
  default: 'system-ui, -apple-system, sans-serif',
  songti: '"Songti SC", "STSong", "宋体", SimSun, serif',
  heiti: '"Heiti SC", "STHeiti", "黑体", SimHei, sans-serif',
  kaiti: '"Kaiti SC", "STKaiti", "楷体", KaiTi, serif',
  pingfang: '"PingFang SC", "PingFang TC", "苹方", sans-serif',
  microsoft: '"Microsoft YaHei", "微软雅黑", sans-serif',
} as const;

// 预定义的背景颜色选项
export const BACKGROUND_COLORS = {
  white: '#ffffff',
  warm: '#f5e6d3',
  cool: '#e8f1f2',
  sepia: '#f4ecd8',
  cream: '#fff9e9',
  mint: '#e9f7ef',
  gray: '#f5f5f5',
} as const;

// 预定义的代码主题选项
export const CODE_THEMES = {
  github: 'GitHub',
  'one-dark': 'One Dark',
  'one-light': 'One Light',
  'material-dark': 'Material Dark',
  'material-light': 'Material Light',
  'night-owl': 'Night Owl',
  dracula: 'Dracula',
  'solarized-dark': 'Solarized Dark',
  'solarized-light': 'Solarized Light',
} as const;

export async function getStorage<T>(
  key: StorageKeysType,
  storageArea: "sync" | "local" = "local"
): Promise<T | null> {
  const result = await chrome.storage[storageArea].get(key);
  return result[key] ?? null;
}

export async function setStorage<T>(
  key: StorageKeysType,
  value: T,
  storageArea: "sync" | "local" = "local"
): Promise<void> {
  await chrome.storage[storageArea].set({ [key]: value });
}

export async function removeStorage(
  key: StorageKeysType,
  storageArea: "sync" | "local" = "local"
): Promise<void> {
  await chrome.storage[storageArea].remove(key);
}

export async function clearStorage(
  storageArea: "sync" | "local" = "local"
): Promise<void> {
  await chrome.storage[storageArea].clear();
}

// 初始化默认设置
import { DEFAULT_SETTINGS } from '../constants/defaultSettings';

export async function initializeDefaultSettings(): Promise<void> {
  // 使用统一的默认设置对象
  await setStorage(StorageKeys.THEME, DEFAULT_SETTINGS.theme);
  await setStorage(StorageKeys.FONT_SIZE, DEFAULT_SETTINGS.fontSize);
  await setStorage(StorageKeys.CODE_FONT_SIZE, DEFAULT_SETTINGS.codeFontSize);
  await setStorage(StorageKeys.CODE_THEME, DEFAULT_SETTINGS.codeTheme);
  await setStorage(StorageKeys.LINE_HEIGHT, DEFAULT_SETTINGS.lineHeight);
  await setStorage(StorageKeys.TEXT_ALIGN, DEFAULT_SETTINGS.textAlign);
  await setStorage(StorageKeys.SHOW_IMAGES, DEFAULT_SETTINGS.showImages);
  await setStorage(StorageKeys.FONT_FAMILY, DEFAULT_SETTINGS.fontFamily);
  await setStorage(StorageKeys.BACKGROUND_COLOR, DEFAULT_SETTINGS.backgroundColor);
  await setStorage(StorageKeys.PARAGRAPH_SPACING, DEFAULT_SETTINGS.paragraphSpacing);
  await setStorage(StorageKeys.ENABLE_TEXT_SELECTION_TOOLBAR, DEFAULT_SETTINGS.enableTextSelectionToolbar);
  // activePreset 和 customPresets 不在 DEFAULT_SETTINGS 中，由 presetManager 初始化
}

export interface ReadingPreset {
  id: string;
  name: string;
  displayName?: string;
  icon?: string;
  description?: string;
  isBuiltIn?: boolean;
  settings: {
    theme?: 'light' | 'dark';
    fontSize?: number;
    codeFontSize?: number;
    codeTheme?: keyof typeof CODE_THEMES;
    lineHeight?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    showImages?: boolean;
    fontFamily?: keyof typeof FONT_FAMILIES;
    backgroundColor?: keyof typeof BACKGROUND_COLORS;
    paragraphSpacing?: number;
  };
}

export interface StorageData {
  lineHeight: number;
  activePreset?: string;
  customPresets?: ReadingPreset[];
}

export const defaultStorage: StorageData = {
  lineHeight: DEFAULT_LINE_HEIGHT,
};
