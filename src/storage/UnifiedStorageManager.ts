/**
 * 统一存储管理器
 * 提供基于documentId的数据模型主键化存储
 */

import { StorageError } from '../types/errors';

// 基础数据接口
export interface BaseDocument {
  documentId: string;
  url: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

// 文档元数据
export interface DocumentMetadata extends BaseDocument {
  type: 'webpage' | 'article' | 'document' | 'other';
  language: string;
  wordCount: number;
  readingTime: number;
  tags: string[];
  category: string;
  author?: string;
  publishDate?: number;
  lastAccessed: number;
  accessCount: number;
}

// 阅读进度
export interface DocumentReadingProgress extends BaseDocument {
  scrollPosition: number;
  readingPercentage: number;
  lastReadPosition: number;
  bookmarks: Array<{
    id: string;
    position: number;
    title: string;
    createdAt: number;
  }>;
  highlights: Array<{
    id: string;
    text: string;
    position: number;
    color: string;
    note?: string;
    createdAt: number;
  }>;
  annotations: Array<{
    id: string;
    text: string;
    position: number;
    content: string;
    createdAt: number;
    updatedAt: number;
  }>;
  readingSessions: Array<{
    id: string;
    startTime: number;
    endTime: number;
    duration: number;
    progress: number;
  }>;
}

// 用户设置
export interface UserSettings extends BaseDocument {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  showImages: boolean;
  codeFontSize: number;
  codeTheme: string;
  paragraphSpacing: number;
  customCSS?: string;
  preferences: {
    autoSave: boolean;
    syncAcrossDevices: boolean;
    showReadingTime: boolean;
    enableAnnotations: boolean;
    enableHighlights: boolean;
    enableBookmarks: boolean;
  };
}

// 缓存数据
export interface CacheData extends BaseDocument {
  key: string;
  data: any;
  ttl: number;
  size: number;
  hitCount: number;
  lastAccessed: number;
  expiresAt: number;
}

// 性能统计
export interface PerformanceStats extends BaseDocument {
  extractionTime: number;
  processingTime: number;
  renderingTime: number;
  totalTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  errorCount: number;
  successCount: number;
  averageResponseTime: number;
  peakMemoryUsage: number;
}

// 存储键枚举
export enum StorageKeys {
  DOCUMENT_METADATA = 'document_metadata',
  READING_PROGRESS = 'reading_progress',
  USER_SETTINGS = 'user_settings',
  CACHE_DATA = 'cache_data',
  PERFORMANCE_STATS = 'performance_stats',
  ANNOTATIONS = 'annotations',
  HIGHLIGHTS = 'highlights',
  BOOKMARKS = 'bookmarks',
  READING_SESSIONS = 'reading_sessions'
}

// 存储区域类型
export type StorageArea = 'local' | 'sync' | 'session';

/**
 * 统一存储管理器
 */
export class UnifiedStorageManager {
  private static instance: UnifiedStorageManager;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): UnifiedStorageManager {
    if (!UnifiedStorageManager.instance) {
      UnifiedStorageManager.instance = new UnifiedStorageManager();
    }
    return UnifiedStorageManager.instance;
  }

  /**
   * 生成文档ID
   */
  public generateDocumentId(url: string, title?: string): string {
    // 使用URL和标题生成稳定的文档ID
    const urlHash = this.hashString(url);
    const titleHash = title ? this.hashString(title) : '';
    const timestamp = Date.now().toString(36);
    
    return `${urlHash}${titleHash ? '_' + titleHash : ''}_${timestamp}`;
  }

  /**
   * 字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取存储数据
   */
  public async get<T extends BaseDocument>(
    key: StorageKeys,
    documentId: string,
    storageArea: StorageArea = 'local'
  ): Promise<T | null> {
    try {
      const cacheKey = `${key}_${documentId}`;
      
      // 检查内存缓存
      if (this.cache.has(cacheKey)) {
        const expiry = this.cacheExpiry.get(cacheKey);
        if (expiry && Date.now() < expiry) {
          return this.cache.get(cacheKey);
        } else {
          this.cache.delete(cacheKey);
          this.cacheExpiry.delete(cacheKey);
        }
      }

      // 从Chrome存储获取
      const result = await chrome.storage[storageArea].get(cacheKey);
      const data = result[cacheKey];

      if (data) {
        // 更新内存缓存（5分钟过期）
        this.cache.set(cacheKey, data);
        this.cacheExpiry.set(cacheKey, Date.now() + 5 * 60 * 1000);
        
        return data as T;
      }

      return null;
    } catch (error) {
      throw new StorageError(`获取存储数据失败: ${key}`, {
        documentId,
        storageArea,
        error
      });
    }
  }

  /**
   * 设置存储数据
   */
  public async set<T extends BaseDocument>(
    key: StorageKeys,
    documentId: string,
    data: T,
    storageArea: StorageArea = 'local'
  ): Promise<void> {
    try {
      const cacheKey = `${key}_${documentId}`;
      
      // 更新数据时间戳
      const now = Date.now();
      data.updatedAt = now;
      if (!data.createdAt) {
        data.createdAt = now;
      }
      if (!data.version) {
        data.version = 1;
      } else {
        data.version += 1;
      }

      // 保存到Chrome存储
      await chrome.storage[storageArea].set({ [cacheKey]: data });

      // 更新内存缓存
      this.cache.set(cacheKey, data);
      this.cacheExpiry.set(cacheKey, Date.now() + 5 * 60 * 1000);

    } catch (error) {
      throw new StorageError(`设置存储数据失败: ${key}`, {
        documentId,
        storageArea,
        data,
        error
      });
    }
  }

  /**
   * 删除存储数据
   */
  public async delete(
    key: StorageKeys,
    documentId: string,
    storageArea: StorageArea = 'local'
  ): Promise<void> {
    try {
      const cacheKey = `${key}_${documentId}`;
      
      // 从Chrome存储删除
      await chrome.storage[storageArea].remove(cacheKey);

      // 从内存缓存删除
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);

    } catch (error) {
      throw new StorageError(`删除存储数据失败: ${key}`, {
        documentId,
        storageArea,
        error
      });
    }
  }

  /**
   * 获取所有文档
   */
  public async getAll<T extends BaseDocument>(
    key: StorageKeys,
    storageArea: StorageArea = 'local'
  ): Promise<T[]> {
    try {
      const result = await chrome.storage[storageArea].get(null);
      const documents: T[] = [];

      for (const [storageKey, value] of Object.entries(result)) {
        if (storageKey.startsWith(key + '_')) {
          documents.push(value as T);
        }
      }

      // 按更新时间排序
      return documents.sort((a, b) => b.updatedAt - a.updatedAt);

    } catch (error) {
      throw new StorageError(`获取所有文档失败: ${key}`, {
        storageArea,
        error
      });
    }
  }

  /**
   * 根据URL查找文档
   */
  public async findByUrl<T extends BaseDocument>(
    key: StorageKeys,
    url: string,
    storageArea: StorageArea = 'local'
  ): Promise<T | null> {
    try {
      const allDocuments = await this.getAll<T>(key, storageArea);
      return allDocuments.find(doc => doc.url === url) || null;

    } catch (error) {
      throw new StorageError(`根据URL查找文档失败: ${key}`, {
        url,
        storageArea,
        error
      });
    }
  }

  /**
   * 批量操作
   */
  public async batch<T extends BaseDocument>(
    operations: Array<{
      type: 'get' | 'set' | 'delete';
      key: StorageKeys;
      documentId: string;
      data?: T;
      storageArea?: StorageArea;
    }>
  ): Promise<Array<T | null>> {
    try {
      const results: Array<T | null> = [];
      
      for (const operation of operations) {
        switch (operation.type) {
          case 'get':
            const getResult = await this.get<T>(operation.key, operation.documentId, operation.storageArea);
            results.push(getResult);
            break;
          case 'set':
            if (operation.data) {
              await this.set(operation.key, operation.documentId, operation.data, operation.storageArea);
              results.push(operation.data);
            } else {
              results.push(null);
            }
            break;
          case 'delete':
            await this.delete(operation.key, operation.documentId, operation.storageArea);
            results.push(null);
            break;
        }
      }

      return results;

    } catch (error) {
      throw new StorageError('批量操作失败', {
        operations,
        error
      });
    }
  }

  /**
   * 清理过期缓存
   */
  public async cleanupExpiredCache(): Promise<void> {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, expiry] of this.cacheExpiry.entries()) {
        if (now >= expiry) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }

      console.log(`🧹 清理了 ${expiredKeys.length} 个过期缓存项`);

    } catch (error) {
      console.error('清理过期缓存失败:', error);
    }
  }

  /**
   * 获取存储统计信息
   */
  public async getStorageStats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    byType: Record<string, number>;
    oldestDocument: number;
    newestDocument: number;
  }> {
    try {
      const allData = await chrome.storage.local.get(null);
      const stats = {
        totalDocuments: 0,
        totalSize: 0,
        byType: {} as Record<string, number>,
        oldestDocument: Date.now(),
        newestDocument: 0
      };

      for (const [key, value] of Object.entries(allData)) {
        if (value && typeof value === 'object' && 'documentId' in value) {
          stats.totalDocuments++;
          stats.totalSize += JSON.stringify(value).length;
          
          const type = (value as any).type || 'unknown';
          stats.byType[type] = (stats.byType[type] || 0) + 1;
          
          const createdAt = (value as any).createdAt || 0;
          if (createdAt < stats.oldestDocument) {
            stats.oldestDocument = createdAt;
          }
          if (createdAt > stats.newestDocument) {
            stats.newestDocument = createdAt;
          }
        }
      }

      return stats;

    } catch (error) {
      throw new StorageError('获取存储统计信息失败', { error });
    }
  }

  /**
   * 导出数据
   */
  public async exportData(keys?: StorageKeys[]): Promise<string> {
    try {
      const allData = await chrome.storage.local.get(null);
      const exportData: Record<string, any> = {};

      for (const [key, value] of Object.entries(allData)) {
        if (value && typeof value === 'object' && 'documentId' in value) {
          const storageKey = key.split('_')[0] as StorageKeys;
          
          if (!keys || keys.includes(storageKey)) {
            if (!exportData[storageKey]) {
              exportData[storageKey] = [];
            }
            exportData[storageKey].push(value);
          }
        }
      }

      return JSON.stringify({
        exportTime: new Date().toISOString(),
        version: '1.0.0',
        data: exportData
      }, null, 2);

    } catch (error) {
      throw new StorageError('导出数据失败', { error });
    }
  }

  /**
   * 导入数据
   */
  public async importData(jsonData: string): Promise<void> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.data || typeof importData.data !== 'object') {
        throw new Error('无效的导入数据格式');
      }

      const operations: Array<{
        type: 'set';
        key: StorageKeys;
        documentId: string;
        data: any;
      }> = [];

      for (const [storageKey, documents] of Object.entries(importData.data)) {
        if (Array.isArray(documents)) {
          for (const doc of documents) {
            if (doc && doc.documentId) {
              operations.push({
                type: 'set',
                key: storageKey as StorageKeys,
                documentId: doc.documentId,
                data: doc
              });
            }
          }
        }
      }

      await this.batch(operations);
      console.log(`📥 成功导入 ${operations.length} 个文档`);

    } catch (error) {
      throw new StorageError('导入数据失败', { error });
    }
  }

  /**
   * 清空所有数据
   */
  public async clearAll(storageArea: StorageArea = 'local'): Promise<void> {
    try {
      await chrome.storage[storageArea].clear();
      this.cache.clear();
      this.cacheExpiry.clear();
      console.log('🧹 所有存储数据已清空');

    } catch (error) {
      throw new StorageError('清空存储数据失败', {
        storageArea,
        error
      });
    }
  }
}

// 导出单例实例
export const unifiedStorageManager = UnifiedStorageManager.getInstance();
