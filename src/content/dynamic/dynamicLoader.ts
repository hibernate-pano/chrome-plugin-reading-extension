/**
 * 动态资源加载器
 * 用于管理和优化Chrome扩展中的代码分块加载
 */

// 缓存已加载的模块
const loadedModules: Record<string, boolean> = {};

// 模块加载状态
enum LoadStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

// 模块类型
export enum ModuleType {
  READER_MODE = 'reader-mode',
  CONTENT_EXTRACTION = 'content-extraction',
  PERFORMANCE = 'performance',
  UTILS = 'utils',
  UI_COMPONENTS = 'ui-components',
  SETTINGS = 'settings',
  STORAGE = 'storage',
  ANIMATIONS = 'animations'
}

// 模块加载器状态
type ModuleLoaderState = {
  [key in ModuleType]: {
    status: LoadStatus;
    error?: Error;
  };
};

// 初始化状态
const moduleState: ModuleLoaderState = Object.values(ModuleType).reduce((acc, type) => {
  acc[type] = { status: LoadStatus.IDLE };
  return acc;
}, {} as ModuleLoaderState);

/**
 * 加载特定类型的模块
 * @param type 模块类型
 * @returns Promise<void>
 */
export async function loadModule(type: ModuleType): Promise<void> {
  // 如果模块已加载，直接返回
  if (moduleState[type].status === LoadStatus.LOADED) {
    return;
  }
  
  // 如果模块正在加载，等待加载完成
  if (moduleState[type].status === LoadStatus.LOADING) {
    return new Promise<void>((resolve, reject) => {
      const checkStatus = () => {
        setTimeout(() => {
          if (moduleState[type].status === LoadStatus.LOADED) {
            resolve();
          } else if (moduleState[type].status === LoadStatus.ERROR) {
            reject(moduleState[type].error);
          } else {
            checkStatus();
          }
        }, 100);
      };
      
      checkStatus();
    });
  }
  
  // 开始加载
  moduleState[type].status = LoadStatus.LOADING;
  
  try {
    switch (type) {
      case ModuleType.READER_MODE:
        await import('../../content/features/readingMode');
        break;
      case ModuleType.CONTENT_EXTRACTION:
        await import('../../content/features/contentExtraction');
        break;
      case ModuleType.PERFORMANCE:
        await import('../../utils/performance');
        break;
      case ModuleType.UTILS:
        await import('../../utils/common');
        break;
      case ModuleType.UI_COMPONENTS:
        // 动态导入UI组件 (例子)
        await import('../../components/ReaderUI');
        break;
      case ModuleType.SETTINGS:
        await import('../../settings/UserSettings');
        break;
      case ModuleType.STORAGE:
        await import('../../storage/storage-manager');
        break;
      case ModuleType.ANIMATIONS:
        await import('../../content/ui/buttonAnimations');
        break;
      default:
        throw new Error(`Unknown module type: ${type}`);
    }
    
    // 标记为已加载
    moduleState[type].status = LoadStatus.LOADED;
  } catch (error) {
    // 标记为加载失败
    moduleState[type].status = LoadStatus.ERROR;
    moduleState[type].error = error instanceof Error ? error : new Error(String(error));
    throw error;
  }
}

/**
 * 预加载模块
 * @param types 模块类型数组
 * @param priority 是否为高优先级
 */
export function preloadModules(types: ModuleType[], priority = false): void {
  // 高优先级使用Promise.all并行加载
  if (priority) {
    Promise.all(types.map(type => loadModule(type)))
      .catch(error => console.warn('Module preloading failed:', error));
    return;
  }
  
  // 非高优先级使用requestIdleCallback延迟加载
  const idleLoad = window.requestIdleCallback || ((cb) => setTimeout(cb, 1000));
  
  types.forEach(type => {
    idleLoad(() => {
      loadModule(type).catch(error => {
        console.warn(`Failed to preload module ${type}:`, error);
      });
    });
  });
}

/**
 * 获取模块加载状态
 * @param type 模块类型
 * @returns 加载状态
 */
export function getModuleStatus(type: ModuleType): LoadStatus {
  return moduleState[type].status;
}

/**
 * 加载模块依赖图
 * 定义模块之间的依赖关系，用于优化加载顺序
 */
const moduleDependencies: Record<ModuleType, ModuleType[]> = {
  [ModuleType.READER_MODE]: [ModuleType.CONTENT_EXTRACTION, ModuleType.UI_COMPONENTS],
  [ModuleType.CONTENT_EXTRACTION]: [ModuleType.UTILS],
  [ModuleType.PERFORMANCE]: [ModuleType.UTILS],
  [ModuleType.UTILS]: [],
  [ModuleType.UI_COMPONENTS]: [ModuleType.ANIMATIONS],
  [ModuleType.SETTINGS]: [ModuleType.STORAGE, ModuleType.UI_COMPONENTS],
  [ModuleType.STORAGE]: [],
  [ModuleType.ANIMATIONS]: []
};

/**
 * 加载模块及其所有依赖
 * @param type 模块类型
 * @returns Promise<void>
 */
export async function loadModuleWithDependencies(type: ModuleType): Promise<void> {
  // 递归加载依赖
  const loadDependencies = async (moduleType: ModuleType, visited: Set<ModuleType> = new Set()): Promise<void> => {
    // 防止循环依赖
    if (visited.has(moduleType)) return;
    visited.add(moduleType);
    
    // 加载所有依赖
    const dependencies = moduleDependencies[moduleType] || [];
    await Promise.all(dependencies.map(dep => loadDependencies(dep, visited)));
    
    // 加载当前模块
    await loadModule(moduleType);
  };
  
  // 开始加载
  await loadDependencies(type);
} 