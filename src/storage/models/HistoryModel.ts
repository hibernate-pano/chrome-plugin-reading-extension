import { MAX_HISTORY_ITEMS, STORAGE_KEYS } from '../../constants';
import { HistoryItem } from '../../types';
import { StorageError } from '../../types/errors';
import { storage } from '../index';

/**
 * 历史记录管理
 */
export class HistoryModel {
  /**
   * 保存阅读历史记录
   */
  public async saveHistory(item: HistoryItem): Promise<void> {
    try {
      // 查询是否已存在该URL的记录
      const existingItem = await storage.get<HistoryItem>(STORAGE_KEYS.HISTORY, item.url);
      
      if (existingItem) {
        // 更新现有记录
        const updatedItem: HistoryItem = {
          ...existingItem,
          ...item,
          lastVisit: Date.now() // 更新访问时间
        };
        
        await storage.update(STORAGE_KEYS.HISTORY, updatedItem);
      } else {
        // 添加新记录
        const newItem: HistoryItem = {
          ...item,
          lastVisit: Date.now()
        };
        
        await storage.add(STORAGE_KEYS.HISTORY, newItem);
        
        // 清理旧记录
        await this.pruneOldHistory();
      }
    } catch (error) {
      throw new StorageError('保存历史记录失败', {
        item,
        error
      });
    }
  }

  /**
   * 获取所有历史记录，按最后访问时间倒序排列
   */
  public async getAllHistory(): Promise<HistoryItem[]> {
    try {
      const items = await storage.getAll<HistoryItem>(STORAGE_KEYS.HISTORY);
      
      // 按最后访问时间排序（最近的在前）
      return items.sort((a, b) => b.lastVisit - a.lastVisit);
    } catch (error) {
      throw new StorageError('获取历史记录失败', error);
    }
  }

  /**
   * 获取单个历史记录
   */
  public async getHistory(url: string): Promise<HistoryItem | null> {
    try {
      return await storage.get<HistoryItem>(STORAGE_KEYS.HISTORY, url);
    } catch (error) {
      throw new StorageError('获取单个历史记录失败', {
        url,
        error
      });
    }
  }

  /**
   * 删除单个历史记录
   */
  public async deleteHistory(url: string): Promise<void> {
    try {
      await storage.delete(STORAGE_KEYS.HISTORY, url);
    } catch (error) {
      throw new StorageError('删除历史记录失败', {
        url,
        error
      });
    }
  }

  /**
   * 清空所有历史记录
   */
  public async clearAllHistory(): Promise<void> {
    try {
      await storage.clear(STORAGE_KEYS.HISTORY);
    } catch (error) {
      throw new StorageError('清空历史记录失败', error);
    }
  }

  /**
   * 更新阅读进度
   */
  public async updateReadingProgress(url: string, progress: number, scrollPosition: number): Promise<void> {
    try {
      const item = await this.getHistory(url);
      
      if (!item) {
        return; // 不存在该记录
      }
      
      const updatedItem: HistoryItem = {
        ...item,
        readingProgress: progress,
        scrollPosition,
        lastVisit: Date.now()
      };
      
      await storage.update(STORAGE_KEYS.HISTORY, updatedItem);
    } catch (error) {
      throw new StorageError('更新阅读进度失败', {
        url,
        progress,
        scrollPosition,
        error
      });
    }
  }

  /**
   * 获取最近的历史记录
   * @param limit 限制数量
   */
  public async getRecentHistory(limit = 10): Promise<HistoryItem[]> {
    try {
      const allHistory = await this.getAllHistory();
      return allHistory.slice(0, limit);
    } catch (error) {
      throw new StorageError('获取最近历史记录失败', {
        limit,
        error
      });
    }
  }

  /**
   * 清理旧的历史记录，保持记录数不超过最大限制
   */
  private async pruneOldHistory(): Promise<void> {
    try {
      const allHistory = await this.getAllHistory();
      
      if (allHistory.length <= MAX_HISTORY_ITEMS) {
        return; // 不需要清理
      }
      
      // 需要删除的记录数
      const deleteCount = allHistory.length - MAX_HISTORY_ITEMS;
      
      // 获取最旧的记录
      const oldestItems = allHistory
        .sort((a, b) => a.lastVisit - b.lastVisit)
        .slice(0, deleteCount);
      
      // 批量删除
      const deletePromises = oldestItems.map(item => 
        storage.delete(STORAGE_KEYS.HISTORY, item.url)
      );
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('清理旧历史记录失败', error);
      // 不抛出错误，因为这是后台操作
    }
  }
}

// 创建并导出单例
export const historyModel = new HistoryModel(); 