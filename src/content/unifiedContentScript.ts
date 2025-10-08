/**
 * 统一的阅读模式内容脚本
 * 整合所有阅读模式功能，提供单一入口点
 */

import { getReadingModeManager } from './services/readingModeService';
import { getStorage, StorageKeys } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import { UserSettings } from '../types';
import { logger } from '../utils/logManager';
import { enhancedProcessingManager } from './features/performance/EnhancedProcessingManager';
import { annotationManager } from './features/annotation/AnnotationManager';
import { TextSelectionToolbar, defaultToolbarOptions, exportToolbarOptions } from './components/TextSelectionToolbar';
import { loadingStateManager } from './components/LoadingStateManager';
import { keyboardShortcutManager } from './components/KeyboardShortcutManager';
import { retryManager } from './components/RetryManager';
import { errorMessageManager } from './components/ErrorMessageManager';
import { errorMonitor } from './components/ErrorMonitor';
import { 
  documentMetadataModel, 
  documentReadingProgressModel
} from '../storage/models/UnifiedDocumentModel';

// 导入样式
import './styles/contentTailwind.css';
import './styles/readingMode.css';

// 全局状态
let readingModeManager: Awaited<ReturnType<typeof getReadingModeManager>> | null = null;
let currentSettings: UserSettings;
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;
let textSelectionToolbar: TextSelectionToolbar | null = null;

/**
 * 确保内容脚本已初始化
 */
async function ensureInitialized(): Promise<void> {
  if (isInitialized) {
    return;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = initialize();
  return initializationPromise;
}

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
    readingModeManager = await getReadingModeManager();
    readingModeManager.updateSettings(currentSettings);
    console.log('🎯 阅读模式管理器创建完成');

    // 设置存储监听器
    setupStorageListeners();
    console.log('💾 存储监听器设置完成');

    // 初始化文本选择工具栏
    initializeTextSelectionToolbar();
    console.log('🖱️ 文本选择工具栏初始化完成');

    // 注册键盘快捷键
    registerKeyboardShortcuts();
    console.log('⌨️ 键盘快捷键注册完成');

    isInitialized = true;
    console.log('✅ 统一内容脚本初始化完成');

  } catch (error) {
    console.error('❌ 统一内容脚本初始化失败:', error);
    logger.logError(error as any);
    throw error;
  } finally {
    initializationPromise = null;
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
    theme
  ] = await Promise.all([
    getStorage<number>(StorageKeys.FONT_SIZE),
    getStorage<number>(StorageKeys.LINE_HEIGHT),
    getStorage<number>(StorageKeys.PARAGRAPH_SPACING),
    getStorage<string>(StorageKeys.FONT_FAMILY),
    getStorage<string>(StorageKeys.BACKGROUND_COLOR),
    getStorage<string>(StorageKeys.THEME),
    getStorage<number>(StorageKeys.FONT_SIZE)
  ]);

  return {
    fontSize: fontSize || 18,
    lineHeight: lineHeight || 1.6,
    paragraphSpacing: paragraphSpacing || 1.2,
    fontFamily: fontFamily || 'default',
    backgroundColor: backgroundColor || 'white',
    theme: (theme as 'light' | 'dark' | 'sepia' | 'custom') || 'light',
    pageWidth: 900,
    presets: [],
    activePreset: null
  };
}

/**
 * 统一的消息处理函数
 */
function handleMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean {
  console.log('📥 收到消息:', message);

  const messageType = message.action || message.type;
  let asyncResponse = false;

  try {
    switch (messageType) {
      case MESSAGE_TYPES.TOGGLE_READING_MODE:
        console.log('🔄 处理切换阅读模式消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => toggleReadingMode())
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((error: Error) => {
            console.error('切换阅读模式失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.ENABLE_READING_MODE:
        console.log('🟢 处理启用阅读模式消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => enableReadingMode(message.settings))
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('启用阅读模式失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.DISABLE_READING_MODE:
        console.log('🔴 处理禁用阅读模式消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => disableReadingMode())
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('禁用阅读模式失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.GET_READING_MODE_STATE:
        console.log('📊 处理获取阅读模式状态消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => {
            const status = readingModeManager?.getStatus() || { isActive: false, settings: currentSettings };
            sendResponse({
              success: true,
              readingMode: status.isActive,
              isReadingMode: status.isActive,
              settings: status.settings
            });
          })
          .catch((error: Error) => {
            console.error('获取阅读模式状态失败:', error);
            // 即使初始化失败，也返回默认状态
            sendResponse({
              success: true,
              readingMode: false,
              isReadingMode: false,
              settings: currentSettings || {}
            });
          });
        break;

      case MESSAGE_TYPES.UPDATE_SETTINGS:
        console.log('⚙️ 处理更新设置消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => {
            updateSettings(message.settings);
            sendResponse({ success: true });
          })
          .catch((error: Error) => {
            console.error('更新设置失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.APPLY_PRESET:
        console.log('🎨 处理应用预设消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => applyPreset(message.preset))
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('应用预设失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.EXTRACT_CONTENT:
        console.log('📄 处理提取内容消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => extractContent())
          .then((content: any) => sendResponse({ success: true, content }))
          .catch((error: Error) => {
            console.error('提取内容失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.SAVE_READING_PROGRESS:
        console.log('💾 处理保存阅读进度消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => saveReadingProgress(message))
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('保存阅读进度失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case 'GET_PERFORMANCE_STATS':
        console.log('📊 处理获取性能统计消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => {
            const stats = enhancedProcessingManager.getPerformanceStats();
            sendResponse({ success: true, stats });
          })
          .catch((error) => {
            console.error('获取性能统计失败:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          });
        break;

      case 'GENERATE_PERFORMANCE_REPORT':
        console.log('📋 处理生成性能报告消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => {
            const report = enhancedProcessingManager.generatePerformanceReport();
            sendResponse({ success: true, report });
          })
          .catch((error) => {
            console.error('生成性能报告失败:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          });
        break;

      case 'GET_ANNOTATION_STATS':
        console.log('📊 处理获取注释统计消息');
        asyncResponse = true;
        ensureInitialized()
          .then(() => {
            const stats = annotationManager.getStats();
            sendResponse({ success: true, stats });
          })
          .catch((error) => {
            console.error('获取注释统计失败:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          });
        break;

      case 'EXPORT_ANNOTATIONS':
        console.log('📤 处理导出注释消息');
        asyncResponse = true;
        ensureInitialized()
          .then(async () => {
            const { format, options } = message;
            const content = await annotationManager.exportAnnotations({
              format: format || 'markdown',
              includeMetadata: options?.includeMetadata !== false,
              includeHighlights: options?.includeHighlights !== false,
              includeNotes: options?.includeNotes !== false,
              filename: options?.filename
            });
            sendResponse({ success: true, content, format });
          })
          .catch((error) => {
            console.error('导出注释失败:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          });
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
    readingModeManager = await getReadingModeManager();
  }
  const loadingId = 'toggle-reading-mode';
  
  try {
    // 显示加载状态
    loadingStateManager.showLoading(loadingId, {
      message: '正在切换阅读模式...',
      timeout: 5000
    });

    await readingModeManager.toggle();
    const { isActive } = readingModeManager.getStatus();
    
    // 显示成功状态
    loadingStateManager.showSuccess(loadingId, 
      isActive ? '阅读模式已启用' : '阅读模式已关闭'
    );
    
    console.log('✅ 阅读模式切换成功，当前状态:', isActive);
  } catch (error) {
    console.error('❌ 切换阅读模式失败:', error);
    loadingStateManager.showError(loadingId, '切换阅读模式失败，请重试');
    
    // 显示用户友好的错误消息
    const errorContext = {
      operation: 'toggle-reading-mode',
      component: 'unifiedContentScript',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const errorMessage = errorMessageManager.getErrorMessage(error as Error, errorContext);
    errorMessageManager.showErrorMessage(errorMessage, errorContext);
    
    // 记录错误到监控系统
    errorMonitor.captureError(error as Error, errorContext);
    
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

  const loadingId = 'extract-content';
  
  try {
    // 显示加载状态
    loadingStateManager.showLoading(loadingId, {
      message: '正在提取页面内容...',
      showProgress: true
    });

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
    
    // 更新加载进度
    loadingStateManager.updateProgress(loadingId, 70, '正在保存文档元数据...');
    
    const title = metadataResult.data.title || document.title;
    const content = extractionResult.data;

    // 保存文档元数据到统一存储
    try {
      await documentMetadataModel.createMetadata(url, title, content, {
        type: 'webpage',
        language: metadataResult.data.language || 'zh-CN',
        author: metadataResult.data.author,
        publishDate: metadataResult.data.publishDate,
        tags: metadataResult.data.tags || [],
        category: metadataResult.data.category || 'uncategorized'
      });
      console.log('📝 文档元数据已保存到统一存储');
    } catch (error) {
      console.warn('保存文档元数据失败:', error);
    }
    
    // 完成加载
    loadingStateManager.updateProgress(loadingId, 100, '内容提取完成');
    setTimeout(() => {
      loadingStateManager.hideLoading(loadingId);
    }, 500);
    
    return {
      title,
      url: url,
      content,
      metadata: metadataResult.data,
      performance: {
        extractionTime: extractionResult.processingTime,
        metadataTime: metadataResult.processingTime,
        fromCache: extractionResult.fromCache || metadataResult.fromCache
      }
    };
  } catch (error) {
    console.error('提取内容失败:', error);
    loadingStateManager.showError(loadingId, '内容提取失败，请重试');
    
    // 显示用户友好的错误消息
    const errorContext = {
      operation: 'content-extraction',
      component: 'unifiedContentScript',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const errorMessage = errorMessageManager.getErrorMessage(error as Error, errorContext);
    errorMessageManager.showErrorMessage(errorMessage, errorContext);
    
    // 记录错误到监控系统
    errorMonitor.captureError(error as Error, errorContext);
    
    throw error;
  }
}

/**
 * 保存阅读进度
 */
async function saveReadingProgress(message: any): Promise<void> {
  const { url, scrollPosition, title, readingPercentage } = message;

  // 使用重试机制保存阅读进度
  const result = await retryManager.executeWithRetry(
    async () => {
      // 使用统一存储系统保存阅读进度
      const existingProgress = await documentReadingProgressModel.getByUrl(url);
      
      if (existingProgress) {
        // 更新现有进度
        await documentReadingProgressModel.updatePosition(
          existingProgress.documentId,
          scrollPosition,
          readingPercentage || 0
        );
      } else {
        // 创建新的阅读进度
        await documentReadingProgressModel.createProgress(url, title || document.title, scrollPosition);
      }

      // 同时发送消息到background.js（保持兼容性）
      await chrome.runtime.sendMessage({
        action: MESSAGE_TYPES.SAVE_READING_PROGRESS,
        progress: {
          url,
          scrollPosition,
          lastRead: Date.now(),
          title
        }
      });
      
      console.log('✅ 阅读进度已保存到统一存储');
    },
    'storage'
  );

  if (!result.success) {
    console.error('❌ 保存阅读进度失败:', result.error);
    
    // 显示用户友好的错误消息
    const errorContext = {
      operation: 'save-reading-progress',
      component: 'unifiedContentScript',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const errorMessage = errorMessageManager.getErrorMessage(result.error!, errorContext);
    errorMessageManager.showErrorMessage(errorMessage, errorContext);
    
    // 记录错误到监控系统
    errorMonitor.captureError(result.error!, errorContext);
    
    throw result.error;
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
 * 注册键盘快捷键
 */
function registerKeyboardShortcuts(): void {
  // 阅读模式快捷键
  keyboardShortcutManager.registerShortcuts([
    {
      key: 'r',
      ctrl: true,
      description: '切换阅读模式',
      action: () => toggleReadingMode(),
      preventDefault: true
    },
    {
      key: 'e',
      ctrl: true,
      description: '启用阅读模式',
      action: () => enableReadingMode(),
      preventDefault: true
    },
    {
      key: 'd',
      ctrl: true,
      description: '禁用阅读模式',
      action: () => disableReadingMode(),
      preventDefault: true
    }
  ]);

  // 文本操作快捷键
  keyboardShortcutManager.registerShortcuts([
    {
      key: 'c',
      ctrl: true,
      shift: true,
      description: '复制选中文本',
      action: () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          navigator.clipboard.writeText(selection.toString());
          loadingStateManager.showSuccess('copy-text', '文本已复制到剪贴板');
        }
      },
      preventDefault: true
    },
    {
      key: 's',
      ctrl: true,
      shift: true,
      description: '搜索选中文本',
      action: () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selection.toString())}`;
          window.open(searchUrl, '_blank');
          loadingStateManager.showSuccess('search-text', '正在搜索选中文本');
        }
      },
      preventDefault: true
    }
  ]);

  // 注释功能快捷键
  keyboardShortcutManager.registerShortcuts([
    {
      key: 'h',
      ctrl: true,
      shift: true,
      description: '高亮选中文本',
      action: () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          const annotationId = annotationManager.createHighlight(selection.toString(), '#ffeb3b');
          if (annotationId) {
            loadingStateManager.showSuccess('highlight-text', '文本已高亮');
          } else {
            loadingStateManager.showError('highlight-text', '高亮失败');
          }
        }
      },
      preventDefault: true
    },
    {
      key: 'n',
      ctrl: true,
      shift: true,
      description: '为选中文本添加注释',
      action: () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          const note = prompt('请输入注释内容:');
          if (note !== null && note.trim()) {
            const annotationId = annotationManager.createHighlight(selection.toString(), '#a5d6a7', note.trim());
            if (annotationId) {
              loadingStateManager.showSuccess('note-text', '注释已添加');
            } else {
              loadingStateManager.showError('note-text', '注释添加失败');
            }
          }
        }
      },
      preventDefault: true
    }
  ]);

  // 系统功能快捷键
  keyboardShortcutManager.registerShortcuts([
    {
      key: '?',
      ctrl: true,
      shift: true,
      description: '显示快捷键帮助',
      action: () => keyboardShortcutManager.showHelpDialog(),
      preventDefault: true
    },
    {
      key: 's',
      ctrl: true,
      description: '保存当前页面阅读进度',
      action: () => {
        const scrollPosition = window.pageYOffset;
        const readingPercentage = (scrollPosition / (document.body.scrollHeight - window.innerHeight)) * 100;
        
        saveReadingProgress({
          url: window.location.href,
          scrollPosition,
          title: document.title,
          readingPercentage
        });
        
        loadingStateManager.showSuccess('save-progress', '阅读进度已保存');
      },
      preventDefault: true
    }
  ]);

  console.log('⌨️ 键盘快捷键注册完成');
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
  loadingStateManager.cleanup();
  keyboardShortcutManager.cleanup();
  retryManager.cleanup();
  errorMessageManager.cleanup();
  errorMonitor.cleanup();
  isInitialized = false;
}

// 立即注册消息监听器（在初始化之前）
// 这样可以确保即使初始化还在进行中，popup 的消息也能被接收到
console.log('📡 注册消息监听器（立即执行）');
chrome.runtime.onMessage.addListener(handleMessage);

// 页面卸载时清理资源
window.addEventListener('beforeunload', cleanup);

// 启动初始化（异步进行，不阻塞消息监听器）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize().catch((error) => {
      console.error('❌ 延迟初始化失败:', error);
    });
  });
} else {
  initialize().catch((error) => {
    console.error('❌ 立即初始化失败:', error);
  });
}

// 导出供其他模块使用
export { 
  toggleReadingMode, 
  updateSettings, 
  enableReadingMode, 
  disableReadingMode,
  readingModeManager 
};
