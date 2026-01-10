/**
 * 阅读进度管理
 * 自动保存和恢复用户的阅读位置
 */

interface ReadingProgress {
  url: string;
  scrollPosition: number;
  timestamp: number;
  title?: string;
}

class ReadingProgressManager {
  private storageKey = 'reading_progress';
  private saveDelay = 1000; // 1秒防抖
  private saveTimeout: NodeJS.Timeout | null = null;

  /**
   * 保存当前阅读进度
   */
  async saveProgress(url: string, scrollPosition: number, title?: string) {
    // 防抖保存
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      const progress: ReadingProgress = {
        url,
        scrollPosition,
        timestamp: Date.now(),
        title,
      };

      try {
        const stored = await this.getAllProgress();
        stored[url] = progress;

        // 只保留最近100条记录
        const entries = Object.entries(stored);
        if (entries.length > 100) {
          entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
          const limited = Object.fromEntries(entries.slice(0, 100));
          await chrome.storage.local.set({ [this.storageKey]: limited });
        } else {
          await chrome.storage.local.set({ [this.storageKey]: stored });
        }
      } catch (error) {
        console.error('保存阅读进度失败:', error);
      }
    }, this.saveDelay);
  }

  /**
   * 获取指定URL的阅读进度
   */
  async getProgress(url: string): Promise<ReadingProgress | null> {
    try {
      const stored = await this.getAllProgress();
      return stored[url] || null;
    } catch (error) {
      console.error('获取阅读进度失败:', error);
      return null;
    }
  }

  /**
   * 获取所有阅读进度
   */
  async getAllProgress(): Promise<Record<string, ReadingProgress>> {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      return result[this.storageKey] || {};
    } catch (error) {
      console.error('获取所有阅读进度失败:', error);
      return {};
    }
  }

  /**
   * 删除指定URL的阅读进度
   */
  async deleteProgress(url: string) {
    try {
      const stored = await this.getAllProgress();
      delete stored[url];
      await chrome.storage.local.set({ [this.storageKey]: stored });
    } catch (error) {
      console.error('删除阅读进度失败:', error);
    }
  }

  /**
   * 清除所有阅读进度
   */
  async clearAll() {
    try {
      await chrome.storage.local.remove(this.storageKey);
    } catch (error) {
      console.error('清除所有阅读进度失败:', error);
    }
  }

  /**
   * 恢复阅读进度（滚动到保存的位置）
   */
  async restoreProgress(url: string): Promise<boolean> {
    const progress = await this.getProgress(url);
    if (!progress) return false;

    try {
      window.scrollTo({
        top: progress.scrollPosition,
        behavior: 'smooth',
      });
      return true;
    } catch (error) {
      console.error('恢复阅读进度失败:', error);
      return false;
    }
  }

  /**
   * 开始监听滚动并自动保存进度
   */
  startTracking(url: string, title?: string) {
    const handleScroll = () => {
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      this.saveProgress(url, scrollPosition, title);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // 返回清理函数
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
    };
  }
}

export const readingProgressManager = new ReadingProgressManager();
