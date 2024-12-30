export enum StorageKeys {
  THEME = 'theme',
  FONT_SIZE = 'fontSize',
  LINE_HEIGHT = 'lineHeight',
  LETTER_SPACING = 'letterSpacing',
  PAGE_WIDTH = 'pageWidth',
  TEXT_ALIGN = 'textAlign',
  FIRST_LINE_INDENT = 'firstLineIndent',
  SHOW_IMAGES = 'showImages',
  SHOW_DIRECTORY = 'showDirectory',
  FONT_FAMILY = 'fontFamily',
  BACKGROUND_COLOR = 'backgroundColor',
  CODE_FONT_SIZE = 'codeFontSize'
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

export async function getStorage<T>(
  key: StorageKeysType,
  storageArea: "sync" | "local" = "sync"
): Promise<T | null> {
  const result = await chrome.storage[storageArea].get(key);
  return result[key] ?? null;
}

export async function setStorage<T>(
  key: StorageKeysType,
  value: T,
  storageArea: "sync" | "local" = "sync"
): Promise<void> {
  await chrome.storage[storageArea].set({ [key]: value });
}

export async function removeStorage(
  key: StorageKeysType,
  storageArea: "sync" | "local" = "sync"
): Promise<void> {
  await chrome.storage[storageArea].remove(key);
}

export async function clearStorage(
  storageArea: "sync" | "local" = "sync"
): Promise<void> {
  await chrome.storage[storageArea].clear();
}

// 初始化默认设置
export async function initializeDefaultSettings(): Promise<void> {
  await setStorage(StorageKeys.THEME, 'light');
  await setStorage(StorageKeys.FONT_SIZE, 16);
  await setStorage(StorageKeys.CODE_FONT_SIZE, 14);
  await setStorage(StorageKeys.LINE_HEIGHT, 1.5);
  await setStorage(StorageKeys.LETTER_SPACING, 0);
  await setStorage(StorageKeys.PAGE_WIDTH, 800);
  await setStorage(StorageKeys.TEXT_ALIGN, 'left');
  await setStorage(StorageKeys.FIRST_LINE_INDENT, true);
  await setStorage(StorageKeys.SHOW_IMAGES, true);
  await setStorage(StorageKeys.SHOW_DIRECTORY, true);
  await setStorage(StorageKeys.FONT_FAMILY, 'default');
  await setStorage(StorageKeys.BACKGROUND_COLOR, 'white');
} 