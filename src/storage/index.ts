import { DATABASE_NAME, DATABASE_VERSION, STORAGE_KEYS } from '../constants';
import { StorageError } from '../types/errors';

/**
 * 存储系统
 */
class Storage {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * 获取数据库连接
   */
  public async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    
    if (this.dbPromise) return this.dbPromise;
    
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.setupDatabase(db);
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      
      request.onerror = (event) => {
        reject(new StorageError('无法打开数据库', {
          error: (event.target as IDBOpenDBRequest).error
        }));
      };
    });
    
    return this.dbPromise;
  }

  /**
   * 设置数据库架构
   */
  private setupDatabase(db: IDBDatabase): void {
    // 设置存储
    if (!db.objectStoreNames.contains(STORAGE_KEYS.SETTINGS)) {
      db.createObjectStore(STORAGE_KEYS.SETTINGS, { keyPath: 'key' });
    }
    
    // 主题存储
    if (!db.objectStoreNames.contains(STORAGE_KEYS.THEMES)) {
      db.createObjectStore(STORAGE_KEYS.THEMES, { keyPath: 'id' });
    }
    
    // 历史记录存储
    if (!db.objectStoreNames.contains(STORAGE_KEYS.HISTORY)) {
      const historyStore = db.createObjectStore(STORAGE_KEYS.HISTORY, { keyPath: 'url' });
      historyStore.createIndex('lastVisit', 'lastVisit', { unique: false });
    }
    
    // 注释存储
    if (!db.objectStoreNames.contains(STORAGE_KEYS.ANNOTATIONS)) {
      const annotationsStore = db.createObjectStore(STORAGE_KEYS.ANNOTATIONS, { keyPath: 'id' });
      annotationsStore.createIndex('url', 'url', { unique: false });
    }
    
    // 提取规则存储
    if (!db.objectStoreNames.contains(STORAGE_KEYS.EXTRACTOR_RULES)) {
      db.createObjectStore(STORAGE_KEYS.EXTRACTOR_RULES, { keyPath: 'domain' });
    }

    // 阅读进度存储
    if (!db.objectStoreNames.contains(STORAGE_KEYS.READING_PROGRESS)) {
      const progressStore = db.createObjectStore(STORAGE_KEYS.READING_PROGRESS, { keyPath: 'url' });
      progressStore.createIndex('lastRead', 'lastRead', { unique: false });
    }
  }

  /**
   * 获取指定存储的单个值
   */
  public async get<T>(storeName: string, key: string): Promise<T | null> {
    try {
      const db = await this.getDb();
      return new Promise<T | null>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => {
          resolve(request.result?.value || null);
        };
        
        request.onerror = () => {
          reject(new StorageError('获取存储项失败', {
            storeName,
            key,
            error: request.error
          }));
        };
      });
    } catch (error) {
      throw new StorageError('获取存储项失败', {
        storeName,
        key,
        error
      });
    }
  }

  /**
   * 获取指定存储的所有值
   */
  public async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const db = await this.getDb();
      return new Promise<T[]>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          reject(new StorageError('获取所有存储项失败', {
            storeName,
            error: request.error
          }));
        };
      });
    } catch (error) {
      throw new StorageError('获取所有存储项失败', {
        storeName,
        error
      });
    }
  }

  /**
   * 设置存储值
   */
  public async set<T>(storeName: string, key: string, value: T): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put({ key, value });
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new StorageError('设置存储项失败', {
            storeName,
            key,
            value,
            error: request.error
          }));
        };
      });
    } catch (error) {
      throw new StorageError('设置存储项失败', {
        storeName,
        key,
        value,
        error
      });
    }
  }

  /**
   * 添加对象到存储
   */
  public async add<T>(storeName: string, object: T): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(object);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new StorageError('添加存储项失败', {
            storeName,
            object,
            error: request.error
          }));
        };
      });
    } catch (error) {
      throw new StorageError('添加存储项失败', {
        storeName,
        object,
        error
      });
    }
  }

  /**
   * 更新对象
   */
  public async update<T>(storeName: string, object: T): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(object);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new StorageError('更新存储项失败', {
            storeName,
            object,
            error: request.error
          }));
        };
      });
    } catch (error) {
      throw new StorageError('更新存储项失败', {
        storeName,
        object,
        error
      });
    }
  }

  /**
   * 删除指定键的值
   */
  public async delete(storeName: string, key: string): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new StorageError('删除存储项失败', {
            storeName,
            key,
            error: request.error
          }));
        };
      });
    } catch (error) {
      throw new StorageError('删除存储项失败', {
        storeName,
        key,
        error
      });
    }
  }

  /**
   * 通过索引获取对象
   */
  public async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    try {
      const db = await this.getDb();
      return new Promise<T[]>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          reject(new StorageError('通过索引获取失败', {
            storeName,
            indexName,
            value,
            error: request.error
          }));
        };
      });
    } catch (error) {
      throw new StorageError('通过索引获取失败', {
        storeName,
        indexName,
        value,
        error
      });
    }
  }

  /**
   * 清空指定存储
   */
  public async clear(storeName: string): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new StorageError('清空存储失败', {
            storeName,
            error: request.error
          }));
        };
      });
    } catch (error) {
      throw new StorageError('清空存储失败', {
        storeName,
        error
      });
    }
  }
}

// 创建并导出单例
export const storage = new Storage(); 