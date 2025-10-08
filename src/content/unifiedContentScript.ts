/**
 * 统一的阅读模式内容脚本
 * 整合所有阅读模式功能，提供单一入口点
 */

import { ReadingModeManager } from './features/readingModeManager';
import { getStorage, setStorage, StorageKeys } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import { UserSettings } from '../types';
import { logger } from '../utils/logManager';
import { enhancedProcessingManager } from './features/performance/EnhancedProcessingManager';
import { annotationManager } from './features/annotation/AnnotationManager';
import { TextSelectionToolbar, defaultToolbarOptions, exportToolbarOptions } from './components/TextSelectionToolbar';

// 导入样式
import './styles/contentTailwind.css';
import './styles/readingMode.css';

// 全局状态
let readingModeManager: ReadingModeManager | null = null;
let currentSettings: UserSettings;
let isInitialized = false;
let textSelectionToolbar: TextSelectionToolbar | null = null;

/**
 * 初始化统一内容脚本
 */
async function initialize(): Promise<void> {
  if (isInitialized) {
    console.warn('统一内容脚本已初始化，跳过重复初始化');
    return;
  }

  // 设置全局标记，防止其他内容脚本重复初始化
  (window as any).__UNIFIED_CONTENT_SCRIPT_ACTIVE = true;

  try {
    console.log('🚀 初始化统一阅读模式内容脚本');
    
    // 初始化增强处理管理器
    await enhancedProcessingManager.initialize();
    console.log('⚙️ 增强处理管理器初始化完成');

    // 初始化注释管理器
    await annotationManager.initialize();
    console.log('📝 注释管理器初始化完成');

    // 加载设置
    currentSettings = await loadSettings();
    console.log('📋 设置加载完成:', currentSettings);

    // 创建阅读模式管理器
    readingModeManager = new ReadingModeManager(currentSettings);
    console.log('🎯 阅读模式管理器创建完成');

    // 设置消息监听器
    setupMessageListeners();
    console.log('📡 消息监听器设置完成');

    // 设置存储监听器
    setupStorageListeners();
    console.log('💾 存储监听器设置完成');

    // 初始化文本选择工具栏
    initializeTextSelectionToolbar();
    console.log('🖱️ 文本选择工具栏初始化完成');

    isInitialized = true;
    console.log('✅ 统一内容脚本初始化完成');

  } catch (error) {
    console.error('❌ 统一内容脚本初始化失败:', error);
    logger.logError(error as Error);
  }
}

/**
 * 加载用户设置
 */
async function loadSettings(): Promise<UserSettings> {
  const [
    fontSize, 
    lineHeight, 
    paragraphSpacing, 
    fontFamily, 
    backgroundColor, 
    theme,
    pageWidth
  ] = await Promise.all([
    getStorage<number>(StorageKeys.FONT_SIZE),
    getStorage<number>(StorageKeys.LINE_HEIGHT),
    getStorage<number>(StorageKeys.PARAGRAPH_SPACING),
    getStorage<string>(StorageKeys.FONT_FAMILY),
    getStorage<string>(StorageKeys.BACKGROUND_COLOR),
    getStorage<string>(StorageKeys.THEME),
    getStorage<number>('pageWidth')
  ]);

  return {
    fontSize: fontSize || 18,
    lineHeight: lineHeight || 1.6,
    paragraphSpacing: paragraphSpacing || 1.2,
    fontFamily: fontFamily || 'default',
    backgroundColor: backgroundColor || 'white',
    theme: (theme as 'light' | 'dark' | 'sepia' | 'custom') || 'light',
    pageWidth: pageWidth || 800,
    presets: [],
    activePreset: null
  };
}

/**
 * 统一的消息处理函数
 */
function handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean {
  console.log('📥 收到消息:', message);

  const messageType = message.action || message.type;
  let asyncResponse = false;

  try {
    switch (messageType) {
      case MESSAGE_TYPES.TOGGLE_READING_MODE:
        console.log('🔄 处理切换阅读模式消息');
        asyncResponse = true;
        toggleReadingMode()
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('切换阅读模式失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.ENABLE_READING_MODE:
        console.log('🟢 处理启用阅读模式消息');
        asyncResponse = true;
        enableReadingMode(message.settings)
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('启用阅读模式失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.DISABLE_READING_MODE:
        console.log('🔴 处理禁用阅读模式消息');
        asyncResponse = true;
        disableReadingMode()
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('禁用阅读模式失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.GET_READING_MODE_STATE:
        console.log('📊 处理获取阅读模式状态消息');
        const status = readingModeManager?.getStatus() || { isActive: false, settings: currentSettings };
        sendResponse({
          success: true,
          readingMode: status.isActive,
          isReadingMode: status.isActive,
          settings: status.settings
        });
        break;

      case MESSAGE_TYPES.UPDATE_SETTINGS:
        console.log('⚙️ 处理更新设置消息');
        updateSettings(message.settings);
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.APPLY_PRESET:
        console.log('🎨 处理应用预设消息');
        asyncResponse = true;
        applyPreset(message.preset)
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('应用预设失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.EXTRACT_CONTENT:
        console.log('📄 处理提取内容消息');
        asyncResponse = true;
        extractContent()
          .then((content: any) => sendResponse({ success: true, content }))
          .catch((error: Error) => {
            console.error('提取内容失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.SAVE_READING_PROGRESS:
        console.log('💾 处理保存阅读进度消息');
        asyncResponse = true;
        saveReadingProgress(message)
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('保存阅读进度失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case 'GET_PERFORMANCE_STATS':
        console.log('📊 处理获取性能统计消息');
        try {
          const stats = enhancedProcessingManager.getPerformanceStats();
          sendResponse({ success: true, stats });
        } catch (error) {
          console.error('获取性能统计失败:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
        break;

      case 'GENERATE_PERFORMANCE_REPORT':
        console.log('📋 处理生成性能报告消息');
        try {
          const report = enhancedProcessingManager.generatePerformanceReport();
          sendResponse({ success: true, report });
        } catch (error) {
          console.error('生成性能报告失败:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
        break;

      case 'GET_ANNOTATION_STATS':
        console.log('📊 处理获取注释统计消息');
        try {
          const stats = annotationManager.getStats();
          sendResponse({ success: true, stats });
        } catch (error) {
          console.error('获取注释统计失败:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
        break;

      case 'EXPORT_ANNOTATIONS':
        console.log('📤 处理导出注释消息');
        asyncResponse = true;
        try {
          const { format, options } = message;
          const content = await annotationManager.exportAnnotations({
            format: format || 'markdown',
            includeMetadata: options?.includeMetadata !== false,
            includeHighlights: options?.includeHighlights !== false,
            includeNotes: options?.includeNotes !== false,
            filename: options?.filename
          });
          sendResponse({ success: true, content, format });
        } catch (error) {
          console.error('导出注释失败:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
        break;

      default:
        console.warn('⚠️ 未知消息类型:', messageType, message);
        sendResponse({ success: false, error: 'Unknown message type' });
        break;
    }
  } catch (error) {
    console.error('❌ 处理消息时发生错误:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }

  return asyncResponse;
}

/**
 * 设置消息监听器
 */
function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener(handleMessage);
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
      console.log('📋 检测到设置变化，重新加载设置');
      loadSettings().then(newSettings => {
        currentSettings = newSettings;
        readingModeManager?.updateSettings(newSettings);
        console.log('✅ 设置已更新');
      });
    }
  });
}

/**
 * 切换阅读模式
 */
async function toggleReadingMode(): Promise<void> {
  if (!readingModeManager) {
    throw new Error('阅读模式管理器未初始化');
  }

  try {
    await readingModeManager.toggle();
    const { isActive } = readingModeManager.getStatus();
    console.log('✅ 阅读模式切换成功，当前状态:', isActive);
  } catch (error) {
    console.error('❌ 切换阅读模式失败:', error);
    throw error;
  }
}

/**
 * 启用阅读模式
 */
async function enableReadingMode(settings?: UserSettings): Promise<void> {
  if (!readingModeManager) {
    throw new Error('阅读模式管理器未初始化');
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
    throw error;
  }
}

/**
 * 禁用阅读模式
 */
async function disableReadingMode(): Promise<void> {
  if (!readingModeManager) {
    throw new Error('阅读模式管理器未初始化');
  }

  try {
    const { isActive } = readingModeManager.getStatus();
    if (isActive) {
      readingModeManager.disable();
      console.log('✅ 阅读模式已禁用');
    } else {
      console.log('ℹ️ 阅读模式已经是禁用状态');
    }
  } catch (error) {
    console.error('❌ 禁用阅读模式失败:', error);
    throw error;
  }
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
    throw new Error('预设数据无效');
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
    throw error;
  }
}

/**
 * 提取内容
 */
async function extractContent(): Promise<any> {
  if (!readingModeManager) {
    throw new Error('阅读模式管理器未初始化');
  }

  try {
    const url = window.location.href;
    const html = document.documentElement.outerHTML;
    
    // 使用增强处理管理器进行内容提取（带缓存）
    const [extractionResult, metadataResult] = await Promise.all([
      enhancedProcessingManager.processContentExtraction(html, {
        useCache: true,
        cacheTTL: 600000 // 10分钟缓存
      }),
      enhancedProcessingManager.processMetadataParsing(html, {
        useCache: true,
        cacheTTL: 1800000 // 30分钟缓存
      })
    ]);
    
    console.log(`📊 内容提取完成 - 缓存命中: ${extractionResult.fromCache}, 处理时间: ${extractionResult.processingTime.toFixed(2)}ms`);
    console.log(`📊 元数据解析完成 - 缓存命中: ${metadataResult.fromCache}, 处理时间: ${metadataResult.processingTime.toFixed(2)}ms`);
    
    return {
      title: metadataResult.data.title || document.title,
      url: url,
      content: extractionResult.data,
      metadata: metadataResult.data,
      performance: {
        extractionTime: extractionResult.processingTime,
        metadataTime: metadataResult.processingTime,
        fromCache: extractionResult.fromCache || metadataResult.fromCache
      }
    };
  } catch (error) {
    console.error('提取内容失败:', error);
    throw error;
  }
}

/**
 * 保存阅读进度
 */
async function saveReadingProgress(message: any): Promise<void> {
  const { url, scrollPosition, title } = message;

  try {
    // 发送消息到background.js保存阅读进度
    await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.SAVE_READING_PROGRESS,
      progress: {
        url,
        scrollPosition,
        lastRead: Date.now(),
        title
      }
    });
    console.log('✅ 阅读进度已保存');
  } catch (error) {
    console.error('❌ 保存阅读进度失败:', error);
    throw error;
  }
}

/**
 * 初始化文本选择工具栏
 */
function initializeTextSelectionToolbar(): void {
  if (textSelectionToolbar) {
    textSelectionToolbar.destroy();
  }

  // 合并默认选项和导出选项
  const allOptions = [...defaultToolbarOptions, ...exportToolbarOptions];
  
  textSelectionToolbar = new TextSelectionToolbar({
    options: allOptions,
    position: 'top',
    theme: currentSettings.theme === 'dark' ? 'dark' : 'light',
    delay: 300
  });
}

/**
 * 清理资源
 */
function cleanup(): void {
  console.log('🧹 清理统一内容脚本资源');
  readingModeManager?.destroy();
  readingModeManager = null;
  enhancedProcessingManager.cleanup();
  annotationManager.cleanup();
  textSelectionToolbar?.destroy();
  textSelectionToolbar = null;
  isInitialized = false;
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
export { 
  toggleReadingMode, 
  updateSettings, 
  enableReadingMode, 
  disableReadingMode,
  readingModeManager 
};
