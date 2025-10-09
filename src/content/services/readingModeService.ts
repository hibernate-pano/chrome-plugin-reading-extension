import { ReadingModeManager } from '../features/readingModeManager';
import { UserSettings } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants/defaultSettings';
import { getStorage, StorageKeys } from '../../storage/storage';

let manager: ReadingModeManager | null = null;
let loadPromise: Promise<ReadingModeManager> | null = null;
let storageListenerRegistered = false;

// 添加一个标志来跟踪是否正在销毁
let isDestroying = false;

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
  // 如果正在销毁，等待销毁完成
  if (isDestroying) {
    console.log('⏳ [ReadingModeService] 等待销毁完成...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return ensureManager(); // 递归重试
  }

  if (manager) {
    console.log('✅ [ReadingModeService] 返回已存在的manager实例');
    return manager;
  }

  if (loadPromise) {
    console.log('⏳ [ReadingModeService] 等待正在进行的初始化...');
    return loadPromise;
  }

  console.log('🔄 [ReadingModeService] 开始创建新的manager实例...');
  
  loadPromise = (async () => {
    try {
      const settings = await loadSettings();
      console.log('📋 [ReadingModeService] 加载的设置:', settings);
      
      // 创建新实例前，确保旧实例被完全清理
      if (manager) {
        console.log('🧹 [ReadingModeService] 清理旧实例...');
        manager.destroy();
        manager = null;
      }
      
      manager = new ReadingModeManager(settings);
      console.log('✅ [ReadingModeService] 新manager实例创建成功');

      if (!storageListenerRegistered) {
        chrome.storage.onChanged.addListener(handleStorageChange);
        storageListenerRegistered = true;
        console.log('✅ [ReadingModeService] Storage监听器已注册');
      }

      return manager;
    } catch (error) {
      console.error('❌ [ReadingModeService] 创建manager失败:', error);
      manager = null;
      throw error;
    }
  })();

  try {
    const result = await loadPromise;
    // 不要立即清空 loadPromise，保持一段时间以避免并发问题
    setTimeout(() => {
      loadPromise = null;
    }, 100);
    return result;
  } catch (error) {
    loadPromise = null;
    throw error;
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
  console.log('🔄 [ReadingModeService] 开始销毁manager...');
  isDestroying = true;
  
  try {
    // 等待任何进行中的初始化完成
    if (loadPromise) {
      console.log('⏳ [ReadingModeService] 等待初始化完成后再销毁...');
      try {
        await loadPromise;
      } catch {
        // 忽略初始化错误
      }
    }

    if (manager) {
      console.log('🧹 [ReadingModeService] 销毁manager实例...');
      manager.destroy();
      manager = null;
    }

    if (storageListenerRegistered) {
      console.log('🧹 [ReadingModeService] 移除storage监听器...');
      chrome.storage.onChanged.removeListener(handleStorageChange);
      storageListenerRegistered = false;
    }

    loadPromise = null;
    console.log('✅ [ReadingModeService] manager销毁完成');
  } finally {
    isDestroying = false;
  }
}

