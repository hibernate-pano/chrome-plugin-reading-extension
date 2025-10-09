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

// 注意：样式将在需要时动态加载，而不是在初始化时加载
// 这样可以避免影响未启用阅读模式的页面

// 全局状态
let readingModeManager: Awaited<ReturnType<typeof getReadingModeManager>> | null = null;
let currentSettings: UserSettings;
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;
let textSelectionToolbar: TextSelectionToolbar | null = null;
let stylesLoaded = false;

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
 * 动态加载样式文件
 */
async function loadStyles(): Promise<void> {
  if (stylesLoaded) {
    return;
  }

  try {
    // 动态导入样式
    await Promise.all([
      import('./styles/contentTailwind.css'),
      import('./styles/readingMode.css'),
      import('./styles/image-loading.css')
    ]);
    
    stylesLoaded = true;
    console.log('✅ 阅读模式样式已加载');
  } catch (error) {
    console.error('❌ 加载样式失败:', error);
    throw error;
  }
}

/**
 * 初始化统一内容脚本
 */
async function initialize(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // 设置全局标记，防止其他内容脚本重复初始化
  (window as any).__UNIFIED_CONTENT_SCRIPT_ACTIVE = true;
  
  console.log('🚀 [UnifiedContentScript] 开始初始化...');
  console.log('   URL:', window.location.href);
  console.log('   时间戳:', new Date().toISOString());

  try {
    // 先不加载样式，等到真正需要时再加载
    // 这样可以避免影响未启用阅读模式的页面

    // 初始化增强处理管理器
    await enhancedProcessingManager.initialize();

    // 初始化注释管理器
    await annotationManager.initialize();

    // 加载设置
    currentSettings = await loadSettings();

    // 创建阅读模式管理器
    readingModeManager = await getReadingModeManager();
    readingModeManager.updateSettings(currentSettings);

    // 设置存储监听器
    setupStorageListeners();

    // 初始化文本选择工具栏
    initializeTextSelectionToolbar();

    // 注册键盘快捷键
    registerKeyboardShortcuts();

    isInitialized = true;
    console.log('✅ 内容脚本已初始化（样式将在需要时加载）');

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
    theme,
    pageWidth
  ] = await Promise.all([
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
 * 统一的消息处理函数
 */
function handleMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean {
  const messageType = message.action || message.type;
  let asyncResponse = false;

  try {
    switch (messageType) {
      case MESSAGE_TYPES.TOGGLE_READING_MODE:
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
        asyncResponse = true;
        ensureInitialized()
          .then(async () => {
            // 确保管理器存在
            if (!readingModeManager) {
              readingModeManager = await getReadingModeManager();
            }
            
            // 检查当前状态
            const currentStatus = readingModeManager.getStatus();
            if (!currentStatus.isActive) {
              // 如果未激活，则启用
              await enableReadingMode(message.settings);
            } else {
              console.log('⚠️ 阅读模式已经激活，跳过启用');
            }
          })
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('启用阅读模式失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.DISABLE_READING_MODE:
        asyncResponse = true;
        // 如果还没初始化，说明阅读模式根本没启用过，直接返回成功
        if (!isInitialized) {
          sendResponse({ success: true });
          break;
        }
        disableReadingMode()
          .then(() => sendResponse({ success: true }))
          .catch((error: Error) => {
            console.error('禁用阅读模式失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;

      case MESSAGE_TYPES.GET_READING_MODE_STATE:
        // 查询状态不应该触发初始化
        // 只有在已经初始化的情况下才返回真实状态
        if (isInitialized && readingModeManager) {
          const status = readingModeManager.getStatus();
          sendResponse({
            success: true,
            readingMode: status.isActive,
            isReadingMode: status.isActive,
            settings: status.settings
          });
        } else {
          // 未初始化时返回默认状态（未启用）
          sendResponse({
            success: true,
            readingMode: false,
            isReadingMode: false,
            settings: currentSettings || {}
          });
        }
        break;

      case MESSAGE_TYPES.UPDATE_SETTINGS:
        asyncResponse = true;
        // 更新设置：如果已初始化则实时更新，否则只保存到本地变量
        if (isInitialized) {
          updateSettings(message.settings);
          sendResponse({ success: true });
        } else {
          // 未初始化时只更新本地设置，不触发初始化
          currentSettings = { ...currentSettings, ...message.settings };
          sendResponse({ success: true });
        }
        break;

      case MESSAGE_TYPES.APPLY_PRESET:
        asyncResponse = true;
        // 应用预设需要已初始化
        if (!isInitialized) {
          sendResponse({ 
            success: false, 
            error: '请先启用阅读模式后再应用预设' 
          });
        } else {
          applyPreset(message.preset)
            .then(() => sendResponse({ success: true }))
            .catch((error: Error) => {
              console.error('应用预设失败:', error);
              sendResponse({ success: false, error: error.message });
            });
        }
        break;

      case MESSAGE_TYPES.EXTRACT_CONTENT:
        asyncResponse = true;
        // 内容提取需要已初始化
        if (!isInitialized) {
          sendResponse({ 
            success: false, 
            error: '请先启用阅读模式后再提取内容' 
          });
        } else {
          extractContent()
            .then((content: any) => sendResponse({ success: true, content }))
            .catch((error: Error) => {
              console.error('提取内容失败:', error);
              sendResponse({ success: false, error: error.message });
            });
        }
        break;

      case MESSAGE_TYPES.SAVE_READING_PROGRESS:
        asyncResponse = true;
        // 保存进度需要已初始化
        if (!isInitialized) {
          sendResponse({ 
            success: false, 
            error: '请先启用阅读模式后再保存进度' 
          });
        } else {
          saveReadingProgress(message)
            .then(() => sendResponse({ success: true }))
            .catch((error: Error) => {
              console.error('保存阅读进度失败:', error);
              sendResponse({ success: false, error: error.message });
            });
        }
        break;

      case 'GET_PERFORMANCE_STATS':
        // 查询类消息不触发初始化
        if (!isInitialized) {
          sendResponse({ success: true, stats: null });
        } else {
          const stats = enhancedProcessingManager.getPerformanceStats();
          sendResponse({ success: true, stats });
        }
        break;

      case 'GENERATE_PERFORMANCE_REPORT':
        // 查询类消息不触发初始化
        if (!isInitialized) {
          sendResponse({ success: true, report: null });
        } else {
          const report = enhancedProcessingManager.generatePerformanceReport();
          sendResponse({ success: true, report });
        }
        break;

      case 'GET_ANNOTATION_STATS':
        // 查询类消息不触发初始化
        if (!isInitialized) {
          sendResponse({ success: true, stats: null });
        } else {
          const stats = annotationManager.getStats();
          sendResponse({ success: true, stats });
        }
        break;

      case 'EXPORT_ANNOTATIONS':
        asyncResponse = true;
        // 导出功能需要已初始化
        if (!isInitialized) {
          sendResponse({ 
            success: false, 
            error: '请先启用阅读模式后再导出注释' 
          });
        } else {
          (async () => {
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
              sendResponse({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
            }
          })();
        }
        break;

      case 'PING':
        // 用于检测 content script 是否已注入
        console.log('🏓 [Content] 收到 PING，返回 PONG');
        sendResponse({ success: true, pong: true });
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
    // 监听 local 和 sync 存储的变化
    if (namespace !== 'local' && namespace !== 'sync') return;

    const settingsChanged = Object.keys(changes).some(key =>
      Object.values(StorageKeys).includes(key as any)
    );

    if (settingsChanged) {
      console.log('📢 [UnifiedContentScript] 检测到设置变化:', changes);
      loadSettings().then(newSettings => {
        console.log('🔄 [UnifiedContentScript] 已重新加载设置:', newSettings);
        currentSettings = newSettings;
        readingModeManager?.updateSettings(newSettings);
      });
    }
  });
}

/**
 * 切换阅读模式（增强版 - 修复刷新后无法切换的问题）
 */
async function toggleReadingMode(): Promise<void> {
  console.log('🔄 [ToggleReadingMode] 开始切换阅读模式...');
  
  // 确保已初始化
  await ensureInitialized();
  
  if (!readingModeManager) {
    console.log('🔄 [ToggleReadingMode] 获取阅读模式管理器...');
    readingModeManager = await getReadingModeManager();
  }
  
  const loadingId = 'toggle-reading-mode';
  
  try {
    console.log('🔄 [ToggleReadingMode] 确保样式已加载...');
    
    // 确保样式已加载（加强错误处理）
    try {
      await loadStyles();
      console.log('✅ [ToggleReadingMode] 样式加载完成');
    } catch (styleError) {
      console.warn('⚠️ [ToggleReadingMode] 样式加载失败，但继续执行:', styleError);
      // 样式加载失败不应该阻止阅读模式切换
      // 因为阅读模式管理器有自己的样式系统
    }
    
    // 显示加载状态
    loadingStateManager.showLoading(loadingId, {
      message: '正在切换阅读模式...',
      timeout: 8000 // 增加超时时间
    });

    console.log('🔄 [ToggleReadingMode] 调用管理器切换...');
    
    // 记录切换前的状态
    const beforeStatus = readingModeManager.getStatus();
    console.log('📊 [ToggleReadingMode] 切换前状态:', beforeStatus);
    
    // 执行切换
    const toggleResult = await readingModeManager.toggle();
    console.log('🔄 [ToggleReadingMode] 切换返回值:', toggleResult);
    
    // 获取切换后的状态
    const afterStatus = readingModeManager.getStatus();
    console.log('📊 [ToggleReadingMode] 切换后状态:', afterStatus);
    
    // 验证状态是否真的改变了
    if (beforeStatus.isActive === afterStatus.isActive) {
      console.error('⚠️ [ToggleReadingMode] 状态未改变，执行强制切换');
      
      // 如果状态没有改变，尝试强制切换
      if (beforeStatus.isActive) {
        // 强制禁用
        await readingModeManager.disable();
      } else {
        // 强制启用 - 先重置再启用
        const { resetReadingModeManager } = await import('./services/readingModeService');
        await resetReadingModeManager();
        readingModeManager = await getReadingModeManager();
        await readingModeManager.enable();
      }
      
      // 再次获取状态
      const finalStatus = readingModeManager.getStatus();
      console.log('📊 [ToggleReadingMode] 最终状态:', finalStatus);
    }
    
    const { isActive } = readingModeManager.getStatus();
    console.log(`✅ [ToggleReadingMode] 切换完成, 当前状态: ${isActive ? '已启用' : '已关闭'}`);
    
    // 显示成功状态
    loadingStateManager.showSuccess(loadingId, 
      isActive ? '阅读模式已启用' : '阅读模式已关闭'
    );
  } catch (error) {
    console.error('❌ [ToggleReadingMode] 切换阅读模式失败:', error);
    
    // 尝试重置状态
    try {
      console.log('🔄 [ToggleReadingMode] 尝试重置状态...');
      if (readingModeManager) {
        // 确保阅读模式处于一致的状态
        const currentStatus = readingModeManager.getStatus();
        console.log('📊 [ToggleReadingMode] 当前状态:', currentStatus);
      }
    } catch (resetError) {
      console.error('❌ [ToggleReadingMode] 重置状态失败:', resetError);
    }
    
    loadingStateManager.showError(loadingId, '切换阅读模式失败，请刷新页面重试');
    
    // 显示用户友好的错误消息
    const errorContext = {
      operation: 'toggle-reading-mode',
      component: 'unifiedContentScript',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      readingModeStatus: readingModeManager?.getStatus() || null
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
    // 确保样式已加载
    await loadStyles();
    
    if (settings) {
      await updateSettings(settings);
    }

    const { isActive } = readingModeManager.getStatus();
    if (!isActive) {
      await readingModeManager.enable();
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
  const oldEnableTextSelectionToolbar = currentSettings.enableTextSelectionToolbar;
  currentSettings = { ...currentSettings, ...newSettings };
  readingModeManager?.updateSettings(newSettings);

  // 如果文本选择工具栏的启用状态发生变化，需要重新初始化
  if (oldEnableTextSelectionToolbar !== currentSettings.enableTextSelectionToolbar) {
    initializeTextSelectionToolbar();
  }
}

/**
 * 应用预设
 */
async function applyPreset(preset: any): Promise<void> {
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
    textSelectionToolbar = null;
  }

  // 检查是否启用文本选择工具栏
  if (!currentSettings.enableTextSelectionToolbar) {
    return;
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
}

/**
 * 清理资源
 */
function cleanup(): void {
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

// 内容脚本加载时立即输出日志（用于调试）
console.log('📦 [UnifiedContentScript] 内容脚本已加载');
console.log('   URL:', window.location.href);
console.log('   时间:', new Date().toISOString());

// 立即注册消息监听器（在初始化之前）
// 这样可以确保即使初始化还在进行中，popup 的消息也能被接收到
chrome.runtime.onMessage.addListener(handleMessage);
console.log('👂 [UnifiedContentScript] 消息监听器已设置');

// 页面卸载时清理资源
window.addEventListener('beforeunload', cleanup);

// 动态注入模式：content script 只在需要时被注入
// 不输出任何日志，保持完全静默，确保零污染

// 导出供其他模块使用
export { 
  toggleReadingMode, 
  updateSettings, 
  enableReadingMode, 
  disableReadingMode,
  readingModeManager 
};
