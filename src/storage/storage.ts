export const StorageKeys = {
  THEME: "theme",
  FONT_SIZE: "fontSize",
  READING_MODE: "readingMode",
  LINE_HEIGHT: "lineHeight",
  LETTER_SPACING: "letterSpacing",
  PAGE_WIDTH: "pageWidth",
  TEXT_ALIGN: "textAlign",
  FIRST_LINE_INDENT: "firstLineIndent",
  SHOW_IMAGES: "showImages",
} as const;

export type StorageKeysType = (typeof StorageKeys)[keyof typeof StorageKeys];

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
  const defaultSettings = {
    [StorageKeys.THEME]: "light",
    [StorageKeys.FONT_SIZE]: 16,
    [StorageKeys.READING_MODE]: false,
    [StorageKeys.LINE_HEIGHT]: 1.5,
    [StorageKeys.LETTER_SPACING]: 0,
    [StorageKeys.PAGE_WIDTH]: 800,
    [StorageKeys.TEXT_ALIGN]: "left",
    [StorageKeys.FIRST_LINE_INDENT]: true,
    [StorageKeys.SHOW_IMAGES]: true,
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    const existingValue = await getStorage(key as StorageKeysType);
    if (existingValue === null) {
      await setStorage(key as StorageKeysType, value);
    }
  }
} 