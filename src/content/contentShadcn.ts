/**
 * 基于 Shadcn/UI 的内容脚本
 * 使用新的阅读模式管理器和现代化UI组件
 */

import { ReadingModeManager } from './features/readingModeManager';
import { getStorage, setStorage, StorageKeys } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import { UserSettings } from '../types';
import { createFloatingButton, removeFloatingButton } from './ui/readerFloatingButton';

// 导入样式
import './styles/readingMode.css';

// 全局状态
let readingModeManager: ReadingModeManager | null = null;
let currentSettings: UserSettings;

/**
 * 初始化内容脚本
 */
async function initialize(): Promise<void> {
  try {
    // 加载设置
    currentSettings = await loadSettings();

    // 创建阅读模式管理器
    readingModeManager = new ReadingModeManager(currentSettings);

    // 创建浮动按钮
    createFloatingButton(toggleReadingMode);

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
  const [fontSize, lineHeight, paragraphSpacing, fontFamily, backgroundColor, theme] = await Promise.all([
    getStorage<number>(StorageKeys.FONT_SIZE),
    getStorage<number>(StorageKeys.LINE_HEIGHT),
    getStorage<number>(StorageKeys.PARAGRAPH_SPACING),
    getStorage<string>(StorageKeys.FONT_FAMILY),
    getStorage<string>(StorageKeys.BACKGROUND_COLOR),
    getStorage<string>(StorageKeys.THEME)
  ]);

  return {
    fontSize: fontSize || 18,
    lineHeight: lineHeight || 1.6,
    paragraphSpacing: paragraphSpacing || 1.2,
    fontFamily: fontFamily || 'default',
    backgroundColor: backgroundColor || 'white',
    theme: (theme as 'light' | 'dark' | 'sepia' | 'custom') || 'light',
    pageWidth: 800,
    presets: [],
    activePreset: null
  };
}

/**
 * 切换阅读模式
 */
async function toggleReadingMode(): Promise<void> {
  if (!readingModeManager) {
    console.error('阅读模式管理器未初始化');
    return;
  }

  try {
    await readingModeManager.toggle();

    // 更新浮动按钮状态
    const { isActive } = readingModeManager.getStatus();
    updateFloatingButtonState(isActive);

  } catch (error) {
    console.error('切换阅读模式失败:', error);

    // 显示错误提示
    showErrorNotification('阅读模式切换失败，请重试');
  }
}

/**
 * 更新浮动按钮状态
 */
function updateFloatingButtonState(isActive: boolean): void {
  const button = document.querySelector('#reading-mode-floating-button') as HTMLElement;
  if (button) {
    button.classList.toggle('active', isActive);
    button.title = isActive ? '退出阅读模式' : '进入阅读模式';
  }
}

/**
 * 设置消息监听器
 */
function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case MESSAGE_TYPES.TOGGLE_READING_MODE:
        toggleReadingMode();
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.UPDATE_SETTINGS:
        updateSettings(message.settings);
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.GET_READING_STATUS:
        const status = readingModeManager?.getStatus() || { isActive: false, settings: currentSettings };
        sendResponse(status);
        break;

      default:
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
  currentSettings = { ...currentSettings, ...newSettings };
  readingModeManager?.updateSettings(newSettings);
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
  removeFloatingButton();
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
