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
  // 是否启用智能内容检测
  enableSmartDetection?: boolean;
  // 是否启用降级策略
  enableFallback?: boolean;
  // 最大重试次数
  maxRetries?: number;
  // 超时时间（毫秒）
  timeout?: number;
}

/**
 * 提取结果统计
 */
interface ExtractionStats {
  startTime: number;
  endTime: number;
  duration: number;
  contentLength: number;
  imageCount: number;
  tableCount: number;
  codeBlockCount: number;
  success: boolean;
  error?: string;
}

/**
 * 基于Mozilla Readability的内容提取器
 * 提供高质量的正文提取能力，包含性能优化和错误处理
 */
export class ReadabilityExtractor extends BaseExtractor {
  private options: ReadabilityExtractorOptions;
  private stats: ExtractionStats | null = null;

  constructor(options: Partial<ReadabilityExtractorOptions> = {}) {
    super();
    
    // 默认选项
    const defaultOptions: ReadabilityExtractorOptions = {
      keepImages: true,
      keepTables: true,
      keepCodeBlocks: true,
      maxImages: 50,
      enableSmartDetection: true,
      enableFallback: true,
      maxRetries: 2,
      timeout: 10000
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
      this.stats = {
        startTime: performance.now(),
        endTime: 0,
        duration: 0,
        contentLength: 0,
        imageCount: 0,
        tableCount: 0,
        codeBlockCount: 0,
        success: false
      };

      try {
        // 验证输入
        if (!this.validateInput(document, url)) {
          throw new Error('Invalid input: document or URL is invalid');
        }

        // 使用超时控制
        const result = await this.extractWithTimeout(document, url);
        
        // 更新统计信息
        this.updateStats(result);
        
        return result;
      } catch (error) {
        console.error('Readability内容提取失败:', error);
        
        // 更新统计信息
        this.stats.success = false;
        this.stats.error = error instanceof Error ? error.message : String(error);
        this.stats.endTime = performance.now();
        this.stats.duration = this.stats.endTime - this.stats.startTime;
        
        // 如果启用降级策略，尝试降级提取
        if (this.options.enableFallback) {
          return this.fallbackExtraction(document, url);
        }
        
        return { 
          title: document.title || null, 
          content: '<p>内容提取失败，请重试。</p>', 
          author: null 
        };
      }
    });
  }

  /**
   * 验证输入参数
   */
  private validateInput(document: Document, url: string): boolean {
    if (!document || !url) {
      return false;
    }
    
    if (!document.body || !document.head) {
      return false;
    }
    
    if (typeof url !== 'string' || url.trim() === '') {
      return false;
    }
    
    return true;
  }

  /**
   * 带超时的内容提取
   */
  private async extractWithTimeout(document: Document, url: string): Promise<ExtractedContent> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Content extraction timeout'));
      }, this.options.timeout);

      this.performExtraction(document, url)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * 执行实际的内容提取
   */
  private async performExtraction(document: Document, url: string): Promise<ExtractedContent> {
    let lastError: Error | null = null;
    
    // 尝试多次提取
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        // 克隆文档，避免修改原始文档
        const docClone = this.cloneDocument(document);
        
        // 预处理文档，移除不需要的元素
        this.preProcessDocument(docClone);

        // 使用Readability提取内容
        const reader = new Readability(docClone, {
          charThreshold: 500,
          classesToPreserve: ['code', 'pre', 'table', 'img'],
          keepClasses: true
        });
        
        const article = reader.parse();

        if (!article || !article.content || article.content.trim().length < 100) {
          throw new Error('Readability提取结果为空或内容过少');
        }

        // 使用处理器管理器进行后处理
        const processedContent = this.postProcessContent(article.content);

        return {
          title: article.title || document.title || null,
          content: processedContent,
          author: article.byline || null,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Readability提取尝试 ${attempt + 1} 失败:`, lastError.message);
        
        // 如果不是最后一次尝试，等待一段时间后重试
        if (attempt < this.options.maxRetries) {
          await this.delay(100 * (attempt + 1)); // 递增延迟
        }
      }
    }
    
    throw lastError || new Error('All extraction attempts failed');
  }

  /**
   * 智能文档克隆，优化内存使用
   */
  private cloneDocument(document: Document): Document {
    try {
      // 尝试使用更高效的克隆方法
      if (document.cloneNode && typeof document.cloneNode === 'function') {
        return document.cloneNode(true) as Document;
      }
      
      // 降级到手动克隆关键部分
      return this.manualCloneDocument(document);
    } catch (error) {
      console.warn('Document cloning failed, using manual clone:', error);
      return this.manualCloneDocument(document);
    }
  }

  /**
   * 手动克隆文档（降级方案）
   */
  private manualCloneDocument(document: Document): Document {
    const newDoc = document.implementation.createHTMLDocument(document.title);
    
    // 只克隆body内容，避免克隆整个文档
    if (document.body) {
      newDoc.body.innerHTML = document.body.innerHTML;
    }
    
    return newDoc;
  }

  /**
   * 预处理文档，移除不需要的元素
   */
  private preProcessDocument(doc: Document): void {
    try {
      // 使用更高效的选择器批量处理
      const selectorsToRemove = [
        '.ad, .ads, .advertisement, .banner',
        'nav, header, footer, .nav, .navigation, .menu',
        '.sidebar, .comments, .related, .social',
        '[role="banner"], [role="navigation"]',
        '[role="complementary"], [role="contentinfo"]',
        '.popup, .modal, .overlay, .tooltip'
      ];

      selectorsToRemove.forEach(selector => {
        try {
          const elements = doc.querySelectorAll(selector);
          elements.forEach(el => {
            if (el && el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
        } catch (e) {
          // 忽略选择器错误
        }
      });

      // 智能内容检测和清理
      if (this.options.enableSmartDetection) {
        this.smartContentCleanup(doc);
      }

      // 处理图片
      this.processImages(doc);
      
      // 处理表格
      this.processTables(doc);
      
      // 处理代码块
      this.processCodeBlocks(doc);
      
    } catch (error) {
      console.warn('Document preprocessing failed:', error);
    }
  }

  /**
   * 智能内容清理
   */
  private smartContentCleanup(doc: Document): void {
    try {
      // 移除低质量内容
      const lowQualitySelectors = [
        'script', 'style', 'noscript',
        '.hidden', '.invisible', '[style*="display: none"]',
        '.advertisement', '.sponsored', '.promoted'
      ];

      lowQualitySelectors.forEach(selector => {
        try {
          const elements = doc.querySelectorAll(selector);
          elements.forEach(el => {
            if (el && el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
        } catch (e) {
          // 忽略错误
        }
      });

      // 移除空元素
      this.removeEmptyElements(doc);
      
    } catch (error) {
      console.warn('Smart content cleanup failed:', error);
    }
  }

  /**
   * 移除空元素
   */
  private removeEmptyElements(doc: Document): void {
    try {
      const emptySelectors = ['p', 'div', 'span'];
      
      emptySelectors.forEach(selector => {
        const elements = doc.querySelectorAll(selector);
        elements.forEach(el => {
          if (el && el.textContent && el.textContent.trim().length === 0 && 
              !el.querySelector('img, video, audio, canvas')) {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          }
        });
      });
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 处理图片
   */
  private processImages(doc: Document): void {
    if (!this.options.keepImages) {
      doc.querySelectorAll('img').forEach(img => {
        if (img && img.parentNode) {
          img.parentNode.removeChild(img);
        }
      });
      return;
    }

    if (this.options.maxImages && this.options.maxImages > 0) {
      const images = Array.from(doc.querySelectorAll('img'));
      if (images.length > this.options.maxImages) {
        // 保留最重要的图片（有alt文本、合适的尺寸等）
        const sortedImages = images.sort((a, b) => {
          const aScore = this.calculateImageScore(a);
          const bScore = this.calculateImageScore(b);
          return bScore - aScore;
        });
        
        // 移除低分图片
        sortedImages.slice(this.options.maxImages).forEach(img => {
          if (img && img.parentNode) {
            img.parentNode.removeChild(img);
          }
        });
      }
    }
  }

  /**
   * 计算图片重要性分数
   */
  private calculateImageScore(img: HTMLImageElement): number {
    let score = 0;
    
    // 有alt文本加分
    if (img.alt && img.alt.trim().length > 0) {
      score += 10;
    }
    
    // 合适的尺寸加分
    if (img.naturalWidth > 100 && img.naturalHeight > 100) {
      score += 5;
    }
    
    // 有title属性加分
    if (img.title && img.title.trim().length > 0) {
      score += 3;
    }
    
    return score;
  }

  /**
   * 处理表格
   */
  private processTables(doc: Document): void {
    if (!this.options.keepTables) {
      doc.querySelectorAll('table').forEach(table => {
        if (table && table.parentNode) {
          table.parentNode.removeChild(table);
        }
      });
    }
  }

  /**
   * 处理代码块
   */
  private processCodeBlocks(doc: Document): void {
    if (!this.options.keepCodeBlocks) {
      doc.querySelectorAll('pre, code').forEach(code => {
        if (code && code.parentNode) {
          code.parentNode.removeChild(code);
        }
      });
    }
  }

  /**
   * 后处理提取的内容
   */
  private postProcessContent(content: string): string {
    try {
      // 使用处理器管理器进行后处理
      return processorManager.process(content);
    } catch (error) {
      console.warn('Content post-processing failed:', error);
      return content; // 返回原始内容
    }
  }

  /**
   * 降级提取策略
   */
  private fallbackExtraction(document: Document, url: string): ExtractedContent {
    try {
      // 简单的文本提取
      const body = document.body;
      if (!body) {
        return { title: document.title || null, content: '<p>无法提取内容。</p>', author: null };
      }

      // 提取所有文本内容
      const textContent = body.textContent || '';
      const cleanText = textContent
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 2000); // 限制长度

      return {
        title: document.title || null,
        content: `<p>${cleanText}</p>`,
        author: null
      };
    } catch (error) {
      console.error('Fallback extraction failed:', error);
      return { 
        title: document.title || null, 
        content: '<p>内容提取失败，请重试。</p>', 
        author: null 
      };
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(result: ExtractedContent): void {
    if (this.stats) {
      this.stats.endTime = performance.now();
      this.stats.duration = this.stats.endTime - this.stats.startTime;
      this.stats.success = true;
      this.stats.contentLength = result.content.length;
      
      // 统计内容元素
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = result.content;
      this.stats.imageCount = tempDiv.querySelectorAll('img').length;
      this.stats.tableCount = tempDiv.querySelectorAll('table').length;
      this.stats.codeBlockCount = tempDiv.querySelectorAll('pre, code').length;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取提取统计信息
   */
  public getStats(): ExtractionStats | null {
    return this.stats;
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.stats = null;
  }

  /**
   * 获取提取器选项
   */
  public getOptions(): ReadabilityExtractorOptions {
    return { ...this.options };
  }

  /**
   * 更新提取器选项
   */
  public updateOptions(newOptions: Partial<ReadabilityExtractorOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}

// 导出默认实例
export const readabilityExtractor = new ReadabilityExtractor(); 