import { Readability } from '@mozilla/readability';
import { performanceMonitor } from '../../utils/performance';
import { extractionCache } from '../../utils/cache';
import { getWorkerManager } from '../../workers/workerManager';

// 内容提取结果接口 (简化)
export interface ExtractedContent {
  title: string | null;
  content: string;
  author?: string | null;
}

/**
 * 增强型内容提取器
 * 使用 Readability 提取内容，并进行额外的预处理和后处理
 */
export class ContentExtractor {
  constructor(options: Partial<ExtractorOptions> = {}) {
    // this.options = this.mergeOptions(defaultOptions, options);
  }

  /**
   * 从当前页面提取内容 (简化为直接调用 Readability)
   */
  public async extract(document: Document, url: string): Promise<ExtractedContent> {
    // 使用性能监控器测量提取性能
    return performanceMonitor.measure('extract', async () => {
      try {
        // 使用 Readability 提取内容
        const reader = new Readability(document);
        const article = reader.parse();

        if (!article) {
          return { title: null, content: '<p>无法提取主要内容。</p>', author: null };
        }

        return {
          title: article.title || null,
          content: article.content,
          author: article.byline || null,
        };
      } catch (error) {
        console.error('内容提取失败:', error);
        return { title: null, content: '<p>内容提取失败，请重试。</p>', author: null };
      }
    });
  }
}

// 导出默认实例
export const contentExtractor = new ContentExtractor();
