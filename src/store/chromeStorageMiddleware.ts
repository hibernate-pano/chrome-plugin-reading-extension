import { StateCreator, StoreApi } from 'zustand';

/**
 * Chrome存储区域类型
 */
type StorageArea = 'sync' | 'local';

/**
 * Chrome存储中间件选项
 */
interface ChromeStorageOptions {
  /**
   * 存储键名
   */
  key: string;
  
  /**
   * 存储区域，默认为'local'
   */
  area?: StorageArea;
  
  /**
   * 是否在初始化时从存储加载
   */
  loadOnInit?: boolean;
  
  /**
   * 状态过滤器，决定哪些状态需要持久化
   * @param state 完整状态
   * @returns 需要持久化的状态
   */
  filter?: <T>(state: T) => Partial<T>;
}

/**
 * Chrome存储中间件
 * 自动将状态同步到Chrome存储
 */
export const chromeStorageMiddleware = <T>(
  options: ChromeStorageOptions
) => (
  config: StateCreator<T>
) => (
  set: StoreApi<T>['setState'],
  get: StoreApi<T>['getState'],
  api: StoreApi<T>
): T => {
  const {
    key,
    area = 'local',
    loadOnInit = true,
    filter = state => state as Partial<T>
  } = options;

  // 从Chrome存储加载状态
  const loadFromStorage = async () => {
    try {
      const result = await chrome.storage[area].get(key);
      const storedState = result[key];
      
      if (storedState) {
        set(storedState);
      }
    } catch (error) {
      console.error('从Chrome存储加载状态失败', error);
    }
  };

  // 保存状态到Chrome存储
  const saveToStorage = async (state: T) => {
    try {
      const filteredState = filter(state);
      await chrome.storage[area].set({ [key]: filteredState });
    } catch (error) {
      console.error('保存状态到Chrome存储失败', error);
    }
  };

  // 重写set方法，在状态变更时自动保存到存储
  const newSet: typeof set = (...args) => {
    set(...args);
    saveToStorage(get());
  };

  // 初始化时加载状态
  if (loadOnInit) {
    setTimeout(loadFromStorage, 0);
  }

  // 返回带有中间件的配置
  return config(newSet, get, api);
}; 