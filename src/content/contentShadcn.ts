/**
 * 基于 Shadcn/UI 的内容脚本
 * 使用新的阅读模式管理器和现代化UI组件
 */

import { getReadingModeManager } from './services/readingModeService';
import { getStorage, StorageKeys } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import { UserSettings } from '../types';

// 导入样式
import './styles/contentTailwind.css';
import './styles/readingMode.css';

// 全局状态
let readingModeManager: Awaited<ReturnType<typeof getReadingModeManager>> | null = null;
let currentSettings: UserSettings;

/**
 * 初始化内容脚本
 */
async function initialize(): Promise<void> {
  // 防重复初始化标记（避免与统一内容脚本和旧版 content.ts 冲突）
  if ((window as any).__UNIFIED_CONTENT_SCRIPT_ACTIVE || (window as any).__READER_SHADCN_ACTIVE) {
    console.warn('统一内容脚本或Shadcn内容脚本已激活，跳过重复初始化');
    return;
  }
  (window as any).__READER_SHADCN_ACTIVE = true;
  try {
    // 加载设置
    currentSettings = await loadSettings();

    // 创建阅读模式管理器
    readingModeManager = await getReadingModeManager();
    readingModeManager.updateSettings(currentSettings);

    // 监听来自popup的消息
    setupMessageListeners();

    // 监听设置变化
    setupStorageListeners();

    console.log('Shadcn/UI 内容脚本初始化完成');

  } catch (error) {
    console.error('内容脚本初始化失败:', error);
  }
}

/**
 * 加载用户设置
 */
async function loadSettings(): Promise<UserSettings> {
  const [fontSize, lineHeight, paragraphSpacing, fontFamily, backgroundColor, theme, pageWidth] = await Promise.all([
    getStorage<number>(StorageKeys.FONT_SIZE),
    getStorage<number>(StorageKeys.LINE_HEIGHT),
    getStorage<number>(StorageKeys.PARAGRAPH_SPACING),
    getStorage<string>(StorageKeys.FONT_FAMILY),
    getStorage<string>(StorageKeys.BACKGROUND_COLOR),
    getStorage<string>(StorageKeys.THEME),
    getStorage<number>(StorageKeys.PAGE_WIDTH)
  ]);

  return {
    fontSize: fontSize || 18,
    lineHeight: lineHeight || 1.6,
    paragraphSpacing: paragraphSpacing || 1.2,
    fontFamily: fontFamily || 'default',
    backgroundColor: backgroundColor || 'white',
    theme: (theme as 'light' | 'dark' | 'sepia' | 'custom') || 'light',
    pageWidth: pageWidth || 900,
    presets: [],
    activePreset: null
  };
}

/**
 * 切换阅读模式
 */
async function toggleReadingMode(): Promise<void> {
  console.log('🔄 切换阅读模式');
  if (!readingModeManager) {
    readingModeManager = await getReadingModeManager();
  }

  try {
    await readingModeManager.toggle();
    const { isActive } = readingModeManager.getStatus();
    console.log('✅ 阅读模式切换成功，当前状态:', isActive);

  } catch (error) {
    console.error('❌ 切换阅读模式失败:', error);
    showErrorNotification('阅读模式切换失败，请重试');
  }
}

/**
 * 启用阅读模式
 */
async function enableReadingMode(settings?: UserSettings): Promise<void> {
  console.log('🟢 启用阅读模式，设置:', settings);
  if (!readingModeManager) {
    readingModeManager = await getReadingModeManager();
  }

  try {
    if (settings) {
      await updateSettings(settings);
    }

    const { isActive } = readingModeManager.getStatus();
    if (!isActive) {
          await readingModeManager.enable();
      console.log('✅ 阅读模式已启用');
    } else {
      console.log('ℹ️ 阅读模式已经是启用状态');
    }
  } catch (error) {
    console.error('❌ 启用阅读模式失败:', error);
  }
}

/**
 * 禁用阅读模式
 */
async function disableReadingMode(): Promise<void> {
  console.log('🔴 禁用阅读模式');
  if (!readingModeManager) {
    readingModeManager = await getReadingModeManager();
  }

  try {
    const { isActive } = readingModeManager.getStatus();
    if (isActive) {
      await readingModeManager.disable();
      console.log('✅ 阅读模式已禁用');
    } else {
      console.log('ℹ️ 阅读模式已经是禁用状态');
    }
  } catch (error) {
    console.error('❌ 禁用阅读模式失败:', error);
  }
}



/**
 * 设置消息监听器
 */
function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('📥 内容脚本收到消息:', message);

    // 支持 action 和 type 两种字段格式
    const messageType = message.action || message.type;

    switch (messageType) {
      case MESSAGE_TYPES.TOGGLE_READING_MODE:
        console.log('🔄 处理切换阅读模式消息');
        toggleReadingMode();
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.ENABLE_READING_MODE:
        console.log('🟢 处理启用阅读模式消息');
        enableReadingMode(message.settings);
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.DISABLE_READING_MODE:
        console.log('🔴 处理禁用阅读模式消息');
        disableReadingMode();
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.GET_READING_MODE_STATE: {
        console.log('📊 处理获取阅读模式状态消息');
        const status = readingModeManager?.getStatus() || { isActive: false, settings: currentSettings };
        console.log('📤 返回状态:', status);
        sendResponse({
          success: true,
          readingMode: status.isActive,
          isReadingMode: status.isActive,
          settings: status.settings
        });
        break;
      }

      case MESSAGE_TYPES.UPDATE_SETTINGS:
        console.log('⚙️ 处理更新设置消息');
        updateSettings(message.settings);
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.APPLY_PRESET:
        console.log('🎨 处理应用预设消息');
        applyPreset(message.preset);
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.GET_PAGE_STATUS: {
        console.log('📊 处理获取页面状态消息');
        const pageStatus = readingModeManager?.getStatus() || { isActive: false, settings: currentSettings };
        sendResponse({
          success: true,
          isActive: pageStatus.isActive,
          settings: pageStatus.settings
        });
        break;
      }

      default:
        console.warn('⚠️ 未知消息类型:', messageType, message);
        sendResponse({ success: false, error: 'Unknown message type' });
        break;
    }
  });
}

/**
 * 设置存储监听器
 */
function setupStorageListeners(): void {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;

    const settingsChanged = Object.keys(changes).some(key =>
      Object.values(StorageKeys).includes(key as any)
    );

    if (settingsChanged) {
      loadSettings().then(newSettings => {
        currentSettings = newSettings;
        readingModeManager?.updateSettings(newSettings);
      });
    }
  });
}

/**
 * 更新设置
 */
function updateSettings(newSettings: Partial<UserSettings>): void {
  console.log('⚙️ 更新设置:', newSettings);
  currentSettings = { ...currentSettings, ...newSettings };
  readingModeManager?.updateSettings(newSettings);
}

/**
 * 应用预设
 */
async function applyPreset(preset: any): Promise<void> {
  console.log('🎨 应用预设:', preset);
  if (!preset || !preset.settings) {
    console.warn('⚠️ 预设数据无效');
    return;
  }

  try {
    // 更新设置
    updateSettings(preset.settings);

    // 如果阅读模式已启用，立即应用新设置
    const { isActive } = readingModeManager?.getStatus() || { isActive: false };
    if (isActive) {
      await readingModeManager?.updateSettings(preset.settings);
      console.log('✅ 预设已应用到当前阅读模式');
    } else {
      console.log('ℹ️ 预设已保存，将在下次启用阅读模式时生效');
    }
  } catch (error) {
    console.error('❌ 应用预设失败:', error);
  }
}

/**
 * 显示错误通知
 */
function showErrorNotification(message: string): void {
  // 创建简单的错误通知
  const notification = document.createElement('div');
  notification.className = 'reading-mode-error-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: hsl(var(--destructive));
    color: hsl(var(--destructive-foreground));
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    z-index: 10001;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  // 3秒后自动移除
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * 清理资源
 */
function cleanup(): void {
  readingModeManager?.destroy();
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', cleanup);

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// 导出供其他模块使用
export { toggleReadingMode, updateSettings };
