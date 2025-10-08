/**
 * 内容脚本加载器 (优化版)
 * 实现超轻量级初始注入，高效按需加载
 */

// 直接使用所需常量，避免导入整个常量文件
const ACTIONS = {
  TOGGLE_READER_MODE: 'TOGGLE_READER_MODE',
  TOGGLE_READING_MODE: 'TOGGLE_READING_MODE',  // 添加别名以兼容其他地方的调用
  ENABLE_READING_MODE: 'ENABLE_READING_MODE',
  DISABLE_READING_MODE: 'DISABLE_READING_MODE',
  APPLY_PRESET: 'APPLY_PRESET',
  GET_READING_MODE_STATE: 'GET_READING_MODE_STATE',
  EXTRACT_CONTENT: 'EXTRACT_CONTENT',
  SAVE_READING_PROGRESS: 'SAVE_READING_PROGRESS'
};

// 性能优化：使用 WeakMap 缓存已加载的模块
const moduleCache = new WeakMap();

// 优化的懒加载函数
const loadModule = async (modulePath: string, options: {
  priority?: 'high' | 'low' | 'idle';
  preload?: boolean;
  cache?: boolean;
} = {}) => {
  const { priority = 'idle', cache = true } = options;
  
  // 检查缓存
  if (cache && moduleCache.has(modulePath as any)) {
    return moduleCache.get(modulePath as any);
  }
  
  // 根据优先级选择加载策略
  const loadStrategy = () => {
    switch (priority) {
      case 'high':
        return Promise.resolve();
      case 'low':
        return new Promise(resolve => setTimeout(resolve, 100));
      case 'idle':
      default:
        return new Promise(resolve => {
          if (window.requestIdleCallback) {
            window.requestIdleCallback(() => resolve(undefined));
          } else {
            setTimeout(resolve, 1000);
          }
        });
    }
  };
  
  await loadStrategy();
  
  try {
    const module = await import(modulePath);
    if (cache) {
      moduleCache.set(modulePath as any, module);
    }
    return module;
  } catch (error) {
    console.warn(`模块加载失败: ${modulePath}`, error);
    throw error;
  }
};

// 预加载关键模块
const preloadCriticalModules = () => {
  // 预加载核心功能模块
  const criticalModules = [
    './features/readingModeManager',
    './ui/FloatingUIManager'
  ];
  
  criticalModules.forEach(modulePath => {
    loadModule(modulePath, { priority: 'low', preload: true });
  });
};

// 懒加载组件 - 使用优化的加载策略
const loadButton = () => {
  loadModule('./ui/readerFloatingButton', { priority: 'idle' })
    .then(({ createFloatingButton }) => {
      // 仅当DOM完全加载后才创建按钮
      if (document.readyState === 'complete') {
        createFloatingButton();
      } else {
        // 使用passive事件监听器减少性能影响
        window.addEventListener('DOMContentLoaded', () => {
          // 延迟创建按钮，确保不阻塞页面渲染
          setTimeout(createFloatingButton, 100);
        }, { passive: true });
      }
    })
    .catch(() => {
      // 如果加载失败，记录错误但不阻止页面功能
      console.warn('无法加载浮动按钮组件，但页面功能不受影响');
    });
};

// 启动按钮加载
loadButton();

// 记录加载状态 (使用单个对象减少全局变量)
const state = {
  readerInitialized: false,
  readerActive: false
};

/**
 * 初始化内容脚本
 * 只执行绝对必要的操作
 */
function initialize() {
  // 设置消息监听
  setupMessageListeners();

  // 注意: 浮动按钮通过上面的懒加载方式创建

  // 在适当时机初始化预加载策略
  const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 3000));
  idleCallback(async () => {
    try {
      const { initPreloadStrategy } = await loadModule('./dynamic/preloadStrategy', { priority: 'low' });
      // 使用自定义配置
      initPreloadStrategy({
        idleTimeout: 2000,
        // 根据网络连接速度调整预加载行为
        useHeuristics: navigator.connection ?
          ['4g', '5g', 'wifi'].includes(navigator.connection.effectiveType) :
          true
      });
      
      // 预加载关键模块
      preloadCriticalModules();
    } catch (e) {
      // 预加载失败不影响主功能
      console.debug('预加载策略初始化失败，继续使用基本功能');
    }
  });
}

/**
 * 设置消息监听器 (优化版)
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 使用对象字面量替代switch语句，提高性能
    const handlers = {
      [ACTIONS.TOGGLE_READER_MODE]: async () => {
        try {
          const result = await handleToggleReaderMode();
          sendResponse({ success: true, isReaderMode: result });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('切换阅读模式失败:', errorMessage);
          sendResponse({ success: false, error: errorMessage });
        }
        return true; // 异步响应
      },

      [ACTIONS.TOGGLE_READING_MODE]: async () => {
        try {
          const result = await handleToggleReaderMode();
          sendResponse({ success: true, isReaderMode: result });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('切换阅读模式失败:', errorMessage);
          sendResponse({ success: false, error: errorMessage });
        }
        return true; // 异步响应
      },

      [ACTIONS.ENABLE_READING_MODE]: async () => {
        try {
          if (!state.readerActive) {
            const result = await handleToggleReaderMode();
            sendResponse({ success: true, readingMode: result });
          } else {
            sendResponse({ success: true, readingMode: true });
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('启用阅读模式失败:', errorMessage);
          sendResponse({ success: false, error: errorMessage });
        }
        return true; // 异步响应
      },

      [ACTIONS.DISABLE_READING_MODE]: async () => {
        try {
          if (state.readerActive) {
            const result = await handleToggleReaderMode();
            sendResponse({ success: true, readingMode: result });
          } else {
            sendResponse({ success: true, readingMode: false });
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('禁用阅读模式失败:', errorMessage);
          sendResponse({ success: false, error: errorMessage });
        }
        return true; // 异步响应
      },

      [ACTIONS.APPLY_PRESET]: async () => {
        try {
          // 应用预设样式
          const presetId = message.preset;
          if (presetId) {
            console.log('应用预设:', presetId);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: '未提供预设ID' });
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('应用预设失败:', errorMessage);
          sendResponse({ success: false, error: errorMessage });
        }
        return true; // 异步响应
      },

      [ACTIONS.EXTRACT_CONTENT]: async () => {
        try {
          const content = await handleExtractContent();
          sendResponse({ success: true, content });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('提取内容失败:', errorMessage);
          sendResponse({ success: false, error: errorMessage });
        }
        return true; // 异步响应
      },

      [ACTIONS.SAVE_READING_PROGRESS]: async () => {
        try {
          const response = await handleSaveReadingProgress(message);
          sendResponse(response);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('保存阅读进度失败:', errorMessage);
          sendResponse({ success: false, error: errorMessage });
        }
        return true; // 异步响应
      },

      [ACTIONS.GET_READING_MODE_STATE]: () => {
        // 同步响应
        sendResponse({
          readingMode: state.readerActive,
          isReaderMode: state.readerActive,
          buttonText: state.readerActive ? '退出阅读模式' : '进入阅读模式'
        });
        return false; // 同步响应
      },

      'GET_READING_MODE_STATE': () => {
        // 兼容旧版本的同步响应
        sendResponse({
          readingMode: state.readerActive,
          isReaderMode: state.readerActive,
          buttonText: state.readerActive ? '退出阅读模式' : '进入阅读模式'
        });
        return false; // 同步响应
      }
    };

    // 处理消息
    const handler = handlers[message.action];
    if (handler) {
      return handler(); // 返回是否异步响应
    } else {
      sendResponse({ success: false, error: '未知消息动作' });
      return false; // 同步响应
    }
  });
}

/**
 * 处理切换阅读模式的消息 (优化版)
 */
async function handleToggleReaderMode(): Promise<boolean> {
  try {
    // 按需加载阅读模式模块及其依赖
    if (!state.readerInitialized) {
      // 使用动态加载器更高效地管理依赖
      const { ModuleType, loadModuleWithDependencies } = await import('./dynamic/dynamicLoader');
      await loadModuleWithDependencies(ModuleType.READING_MANAGER);
      state.readerInitialized = true;
    }

    // 动态导入阅读模式模块
    const { getReadingModeManager } = await import('./services/readingModeService');
    const manager = await getReadingModeManager();
    const result = await manager.toggle();
    state.readerActive = result;

    // 懒加载按钮更新函数
    const { updateButtonState } = await import('./ui/readerFloatingButton');
    updateButtonState(state.readerActive);

    // 用户交互后，在空闲时间预加载可能需要的其他模块
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
    idleCallback(async () => {
      try {
        const { ModuleType, preloadModules } = await import('./dynamic/dynamicLoader');
        // 低优先级加载其他可能用到的模块
        preloadModules([ModuleType.SETTINGS, ModuleType.PERFORMANCE], false);
      } catch (e) {
        // 预加载失败不影响主要功能
        console.debug('预加载模块失败，忽略此错误');
      }
    });

    return result;
  } catch (err) {
    console.error('阅读模式切换失败:', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/**
 * 处理提取内容的消息 (优化版)
 */
async function handleExtractContent(): Promise<unknown> {
  // 按需加载内容提取模块
  const { extractContent } = await import('./features/contentExtraction');
  return extractContent();
}

/**
 * 处理保存阅读进度的消息 (优化版)
 */
async function handleSaveReadingProgress(message: {
  url?: string;
  scrollPosition?: number;
  title?: string;
}): Promise<unknown> {
  const { url, scrollPosition, title } = message;

  // 发送消息到background.js保存阅读进度
  return chrome.runtime.sendMessage({
    action: ACTIONS.SAVE_READING_PROGRESS,
    progress: {
      url,
      scrollPosition,
      lastRead: Date.now(),
      title
    }
  });
}

/**
 * 加载阅读模式模块 (优化版)
 * 使用更高效的资源加载策略
 */
async function _loadReaderModule(): Promise<void> {
  try {
    // 加载基础样式
    await loadStyles();

    // 并行预加载核心模块 (使用Promise.all优化)
    await Promise.all([
      import('./services/readingModeService').catch(() => { }),
      import('./features/contentExtraction').catch(() => { })
    ]);
  } catch (err) {
    console.error('加载模块失败:', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/**
 * 加载基础样式 (优化版)
 */
async function loadStyles(): Promise<void> {
  return new Promise((resolve) => {
    // 创建样式链接
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/styles/variables.css');

    // 监听加载完成
    link.onload = () => resolve();
    link.onerror = () => {
      console.warn('样式加载失败，继续执行');
      resolve();
    };

    // 添加到页面
    document.head.appendChild(link);

    // 设置超时，避免长时间等待样式
    setTimeout(resolve, 1000);
  });
}

// 初始化内容脚本
initialize(); 