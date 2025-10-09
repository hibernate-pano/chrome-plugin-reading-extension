import { ReadingModeManager } from '../features/readingModeManager';
import { UserSettings } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants/defaultSettings';
import { getStorage, StorageKeys } from '../../storage/storage';

let manager: ReadingModeManager | null = null;
let loadPromise: Promise<ReadingModeManager> | null = null;
let storageListenerRegistered = false;

const SETTINGS_KEYS = new Set<string>([
  StorageKeys.FONT_SIZE,
  StorageKeys.LINE_HEIGHT,
  StorageKeys.PARAGRAPH_SPACING,
  StorageKeys.FONT_FAMILY,
  StorageKeys.BACKGROUND_COLOR,
  StorageKeys.THEME,
  StorageKeys.PAGE_WIDTH,
]);

async function loadSettings(): Promise<UserSettings> {
  const [
    fontSize,
    lineHeight,
    paragraphSpacing,
    fontFamily,
    backgroundColor,
    theme,
    pageWidth,
  ] = await Promise.all([
    getStorage<number>(StorageKeys.FONT_SIZE),
    getStorage<number>(StorageKeys.LINE_HEIGHT),
    getStorage<number>(StorageKeys.PARAGRAPH_SPACING),
    getStorage<string>(StorageKeys.FONT_FAMILY),
    getStorage<string>(StorageKeys.BACKGROUND_COLOR),
    getStorage<string>(StorageKeys.THEME),
    getStorage<number>(StorageKeys.PAGE_WIDTH),
  ]);

  return {
    fontSize: fontSize ?? DEFAULT_SETTINGS.fontSize,
    lineHeight: lineHeight ?? DEFAULT_SETTINGS.lineHeight,
    paragraphSpacing: paragraphSpacing ?? DEFAULT_SETTINGS.paragraphSpacing,
    fontFamily: fontFamily ?? DEFAULT_SETTINGS.fontFamily,
    backgroundColor: backgroundColor ?? DEFAULT_SETTINGS.backgroundColor,
    theme: (theme as UserSettings['theme']) ?? DEFAULT_SETTINGS.theme,
    pageWidth: pageWidth ?? DEFAULT_SETTINGS.pageWidth,
    presets: DEFAULT_SETTINGS.presets,
    activePreset: DEFAULT_SETTINGS.activePreset,
  };
}

async function ensureManager(): Promise<ReadingModeManager> {
  if (manager) {
    return manager;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const settings = await loadSettings();
    manager = new ReadingModeManager(settings);

    if (!storageListenerRegistered) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      storageListenerRegistered = true;
    }

    return manager;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

async function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string,
): Promise<void> {
  if (!manager) return;
  if (areaName !== 'local' && areaName !== 'sync') return;

  const relevant = Object.keys(changes).some((key) => SETTINGS_KEYS.has(key));
  if (!relevant) return;

  const newSettings = await loadSettings();
  manager.updateSettings(newSettings);
}

export async function getReadingModeManager(): Promise<ReadingModeManager> {
  return ensureManager();
}

export async function destroyReadingModeManager(): Promise<void> {
  if (manager) {
    manager.destroy();
    manager = null;
  }

  if (storageListenerRegistered) {
    chrome.storage.onChanged.removeListener(handleStorageChange);
    storageListenerRegistered = false;
  }
}

