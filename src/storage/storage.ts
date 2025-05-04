import { DEFAULT_LINE_HEIGHT } from '../constants/options';

export enum StorageKeys {
  THEME = 'theme',
  FONT_SIZE = 'fontSize',
  LINE_HEIGHT = 'lineHeight',
  LINE_SPACING = 'lineSpacing',
  LETTER_SPACING = 'letterSpacing',
  PAGE_WIDTH = 'pageWidth',
  TEXT_ALIGN = 'textAlign',
  FIRST_LINE_INDENT = 'firstLineIndent',
  SHOW_IMAGES = 'showImages',
  SHOW_DIRECTORY = 'showDirectory',
  FONT_FAMILY = 'fontFamily',
  BACKGROUND_COLOR = 'backgroundColor',
  CODE_FONT_SIZE = 'codeFontSize',
  CODE_THEME = 'codeTheme',
  PARAGRAPH_SPACING = 'paragraphSpacing',
  DEBUG = 'debug',
  ACTIVE_PRESET = 'activePreset',
  CUSTOM_PRESETS = 'customPresets'
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
  // 检查是否已经初始化过
  const theme = await getStorage<'light' | 'dark'>(StorageKeys.THEME);
  const fontSize = await getStorage<number>(StorageKeys.FONT_SIZE);

  // 如果已经有设置，则不再初始化
  if (theme !== null && fontSize !== null) {
    console.log('设置已存在，无需初始化');
    return;
  }

  // 使用统一的默认设置对象
  console.log('初始化默认设置...');

  await setStorage(StorageKeys.THEME, DEFAULT_SETTINGS.theme);
  await setStorage(StorageKeys.FONT_SIZE, DEFAULT_SETTINGS.fontSize);
  await setStorage(StorageKeys.CODE_FONT_SIZE, DEFAULT_SETTINGS.codeFontSize);
  await setStorage(StorageKeys.CODE_THEME, DEFAULT_SETTINGS.codeTheme);
  await setStorage(StorageKeys.LINE_HEIGHT, DEFAULT_SETTINGS.lineHeight);
  await setStorage(StorageKeys.LINE_SPACING, DEFAULT_SETTINGS.lineSpacing);
  await setStorage(StorageKeys.LETTER_SPACING, DEFAULT_SETTINGS.letterSpacing);
  await setStorage(StorageKeys.PAGE_WIDTH, DEFAULT_SETTINGS.pageWidth);
  await setStorage(StorageKeys.TEXT_ALIGN, DEFAULT_SETTINGS.textAlign);
  await setStorage(StorageKeys.FIRST_LINE_INDENT, DEFAULT_SETTINGS.firstLineIndent);
  await setStorage(StorageKeys.SHOW_IMAGES, DEFAULT_SETTINGS.showImages);
  await setStorage(StorageKeys.SHOW_DIRECTORY, DEFAULT_SETTINGS.showDirectory);
  await setStorage(StorageKeys.FONT_FAMILY, DEFAULT_SETTINGS.fontFamily);
  await setStorage(StorageKeys.BACKGROUND_COLOR, DEFAULT_SETTINGS.backgroundColor);
  await setStorage(StorageKeys.PARAGRAPH_SPACING, DEFAULT_SETTINGS.paragraphSpacing);
  await setStorage(StorageKeys.DEBUG, DEFAULT_SETTINGS.debug);

  console.log('默认设置初始化完成');
}

/**
 * 检查设置是否完整，如果不完整则应用默认设置
 */
export async function ensureCompleteSettings(): Promise<void> {
  console.log('检查设置是否完整...');

  // 检查关键设置是否存在
  const theme = await getStorage<'light' | 'dark'>(StorageKeys.THEME);
  const fontSize = await getStorage<number>(StorageKeys.FONT_SIZE);
  const fontFamily = await getStorage<string>(StorageKeys.FONT_FAMILY);
  const backgroundColor = await getStorage<string>(StorageKeys.BACKGROUND_COLOR);

  // 如果任何一个关键设置不存在，则初始化所有设置
  if (theme === null || fontSize === null || fontFamily === null || backgroundColor === null) {
    console.warn('检测到设置不完整，执行初始化...');
    await initializeDefaultSettings();
    return;
  }

  console.log('设置检查完成，设置完整');
}

export interface ReadingPreset {
  id: string;
  name: string;
  description?: string;
  isBuiltIn?: boolean;
  settings: {
    theme?: 'light' | 'dark';
    fontSize?: number;
    codeFontSize?: number;
    codeTheme?: keyof typeof CODE_THEMES;
    lineHeight?: number;
    lineSpacing?: number;
    letterSpacing?: number;
    pageWidth?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    firstLineIndent?: boolean;
    showImages?: boolean;
    showDirectory?: boolean;
    fontFamily?: keyof typeof FONT_FAMILIES;
    backgroundColor?: keyof typeof BACKGROUND_COLORS;
    paragraphSpacing?: number;
  };
}

export interface StorageData {
  lineHeight: number;
  lineSpacing: number;
  activePreset?: string;
  customPresets?: ReadingPreset[];
  // ... existing fields ...
}

export const defaultStorage: StorageData = {
  lineHeight: DEFAULT_LINE_HEIGHT,
  lineSpacing: 0.5,
  // ... existing fields ...
};
