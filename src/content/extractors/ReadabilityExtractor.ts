import { Readability } from '@mozilla/readability';
import { ExtractedContent } from '../../types';
import { performanceMonitor } from '../../utils/performance';
import { BaseExtractor } from './BaseExtractor';
import { processorManager } from './processors';

/**
 * Readability提取器选项
 */
export interface ReadabilityExtractorOptions {
  // 是否保留图片
  keepImages?: boolean;
  // 是否保留表格
  keepTables?: boolean;
  // 是否保留代码块
  keepCodeBlocks?: boolean;
  // 最大图片数量（超过则只保留前N张）
  maxImages?: number;
}

/**
 * 基于Mozilla Readability的内容提取器
 * 提供高质量的正文提取能力
 */
export class ReadabilityExtractor extends BaseExtractor {
  private options: ReadabilityExtractorOptions;

  constructor(options: Partial<ReadabilityExtractorOptions> = {}) {
    super();
    
    // 默认选项
    const defaultOptions: ReadabilityExtractorOptions = {
      keepImages: true,
      keepTables: true,
      keepCodeBlocks: true,
      maxImages: 50
    };

    this.options = { ...defaultOptions, ...options };
  }

  /**
   * 从文档中提取内容
   * @param document 当前文档
   * @param url 当前URL
   * @returns 提取的内容
   */
  public async extract(document: Document, url: string): Promise<ExtractedContent> {
    return performanceMonitor.measure('readability-extract', async () => {
      try {
        // 克隆文档，避免修改原始文档
        const docClone = document.cloneNode(true) as Document;
        
        // 预处理文档，移除不需要的元素
        this.preProcessDocument(docClone);

        // 使用Readability提取内容
        const reader = new Readability(docClone);
        
        const article = reader.parse();

        if (!article) {
          console.warn('Readability提取失败，返回空内容');
          return { 
            title: document.title || null, 
            content: '<p>无法提取主要内容。</p>', 
            author: null 
          };
        }

        // 使用处理器管理器进行后处理
        const processedContent = this.postProcessContent(article.content);

        return {
          title: article.title || document.title || null,
          content: processedContent,
          author: article.byline || null,
        };
      } catch (error) {
        console.error('Readability内容提取失败:', error);
        return { 
          title: document.title || null, 
          content: '<p>内容提取失败，请重试。</p>', 
          author: null 
        };
      }
    });
  }

  /**
   * 预处理文档，移除不需要的元素
   */
  private preProcessDocument(doc: Document): void {
    // 移除不需要的元素，如广告、导航栏等
    const elementsToRemove = [
      '.ad', '.ads', '.advertisement', 
      'nav', 'header', 'footer', 
      '.nav', '.navigation', '.menu',
      '.sidebar', '.comments', '.related',
      '[role="banner"]', '[role="navigation"]',
      '[role="complementary"]', '[role="contentinfo"]'
    ];

    elementsToRemove.forEach(selector => {
      try {
        doc.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // 忽略选择器错误
      }
    });

    // 如果不保留图片，移除所有图片
    if (!this.options.keepImages) {
      doc.querySelectorAll('img').forEach(img => img.remove());
    } else if (this.options.maxImages && this.options.maxImages > 0) {
      // 如果有最大图片数量限制，只保留前N张
      const images = Array.from(doc.querySelectorAll('img'));
      if (images.length > this.options.maxImages) {
        images.slice(this.options.maxImages).forEach(img => img.remove());
      }
    }

    // 如果不保留表格，移除所有表格
    if (!this.options.keepTables) {
      doc.querySelectorAll('table').forEach(table => table.remove());
    }
  }

  /**
   * 后处理提取的内容
   */
  private postProcessContent(content: string): string {
    // 使用处理器管理器进行后处理
    return processorManager.process(content);
  }
}

// 导出默认实例
export const readabilityExtractor = new ReadabilityExtractor(); 