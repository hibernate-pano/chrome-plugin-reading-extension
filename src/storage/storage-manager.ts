/**
 * 存储管理器
 * 提供统一的存储接口，用于管理扩展的本地存储
 */
export class StorageManager {
  private static instance: StorageManager;

  /**
   * 获取单例实例
   */
  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * 获取存储的值
   * @param key 键名
   */
  public async get(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] || null);
      });
    });
  }

  /**
   * 设置存储的值
   * @param key 键名
   * @param value 值
   */
  public async set(key: string, value: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  /**
   * 移除存储的值
   * @param key 键名
   */
  public async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve();
      });
    });
  }
} 