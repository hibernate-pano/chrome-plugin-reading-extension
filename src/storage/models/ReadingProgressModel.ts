import { STORAGE_KEYS } from '../../constants';
import { StorageError } from '../../types/errors';
import { storage } from '../index';
import { ReadingProgress } from '../../content/components/ReaderView/types';

/**
 * 阅读进度模型
 * 负责管理阅读进度的存储和检索
 */
export class ReadingProgressModel {
  private static instance: ReadingProgressModel | null = null;
  private progressCache: Map<string, ReadingProgress> | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ReadingProgressModel {
    if (!ReadingProgressModel.instance) {
      ReadingProgressModel.instance = new ReadingProgressModel();
    }
    return ReadingProgressModel.instance;
  }

  /**
   * 保存阅读进度
   * @param progress 阅读进度数据
   */
  public async saveProgress(progress: ReadingProgress): Promise<void> {
    try {
      await storage.update(STORAGE_KEYS.READING_PROGRESS, progress);
      
      // 更新缓存
      if (this.progressCache) {
        this.progressCache.set(progress.url, progress);
      }
    } catch (error) {
      throw new StorageError('保存阅读进度失败', {
        progress,
        error
      });
    }
  }

  /**
   * 获取指定URL的阅读进度
   * @param url 页面URL
   */
  public async getProgress(url: string): Promise<ReadingProgress | null> {
    try {
      // 尝试从缓存获取
      if (this.progressCache && this.progressCache.has(url)) {
        return this.progressCache.get(url) || null;
      }

      // 从数据库获取
      const progress = await storage.get<ReadingProgress>(STORAGE_KEYS.READING_PROGRESS, url);
      return progress;
    } catch (error) {
      console.error('获取阅读进度失败:', error);
      return null;
    }
  }

  /**
   * 获取所有阅读进度
   * 按最近阅读时间排序
   */
  public async getAllProgress(): Promise<ReadingProgress[]> {
    try {
      if (!this.progressCache) {
        const allProgress = await storage.getAll<ReadingProgress>(STORAGE_KEYS.READING_PROGRESS);
        
        // 初始化缓存
        this.progressCache = new Map();
        allProgress.forEach(progress => {
          this.progressCache!.set(progress.url, progress);
        });
        
        // 按最近阅读时间排序
        return allProgress.sort((a, b) => b.lastRead - a.lastRead);
      }
      
      // 从缓存返回并排序
      return Array.from(this.progressCache.values())
        .sort((a, b) => b.lastRead - a.lastRead);
    } catch (error) {
      console.error('获取所有阅读进度失败:', error);
      return [];
    }
  }

  /**
   * 删除指定URL的阅读进度
   * @param url 页面URL
   */
  public async deleteProgress(url: string): Promise<void> {
    try {
      await storage.delete(STORAGE_KEYS.READING_PROGRESS, url);
      
      // 更新缓存
      if (this.progressCache) {
        this.progressCache.delete(url);
      }
    } catch (error) {
      throw new StorageError('删除阅读进度失败', {
        url,
        error
      });
    }
  }

  /**
   * 清除所有阅读进度
   */
  public async clearAllProgress(): Promise<void> {
    try {
      await storage.clear(STORAGE_KEYS.READING_PROGRESS);
      
      // 清空缓存
      if (this.progressCache) {
        this.progressCache.clear();
      }
    } catch (error) {
      throw new StorageError('清除所有阅读进度失败', {
        error
      });
    }
  }
}

// 导出单例
export const readingProgressModel = ReadingProgressModel.getInstance(); 