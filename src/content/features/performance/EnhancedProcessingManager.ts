/**
 * 增强的处理管理器
 * 整合WebWorkerManager和CacheStrategyManager，提供高性能的内容处理
 */

import { webWorkerManager } from './WebWorkerManager';
import { cacheStrategyManager } from '../../dynamic/CacheStrategyManager';

export interface ProcessingOptions {
  useCache?: boolean;
  cacheTTL?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  forceRefresh?: boolean;
}

export interface ProcessingResult<T = any> {
  data: T;
  fromCache: boolean;
  processingTime: number;
  cacheKey: string;
}

/**
 * 增强的处理管理器
 */
export class EnhancedProcessingManager {
  private static instance: EnhancedProcessingManager;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): EnhancedProcessingManager {
    if (!EnhancedProcessingManager.instance) {
      EnhancedProcessingManager.instance = new EnhancedProcessingManager();
    }
    return EnhancedProcessingManager.instance;
  }

  /**
   * 初始化管理器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 注意：Content Script 环境无法使用 Worker（跨域限制）
      // WebWorker 功能已禁用，直接使用同步处理
      console.log('ℹ️ WebWorker 在 Content Script 中不可用，使用同步处理');
      
      // 初始化缓存策略管理器
      await cacheStrategyManager.initialize();
      
      // 设置缓存事件监听
      this.setupCacheEventListeners();
      
      this.isInitialized = true;
      console.log('✅ 增强处理管理器初始化完成（Worker已禁用）');
    } catch (error) {
      console.error('❌ 增强处理管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置缓存事件监听
   */
  private setupCacheEventListeners(): void {
    cacheStrategyManager.setCacheHitCallback((key) => {
      console.log(`🎯 缓存命中: ${key}`);
    });

    cacheStrategyManager.setCacheMissCallback((key) => {
      console.log(`❌ 缓存未命中: ${key}`);
    });

    cacheStrategyManager.setCacheEvictionCallback((key, reason) => {
      console.log(`🗑️ 缓存驱逐: ${key} (原因: ${reason})`);
    });
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(operation: string, data: any): string {
    const dataHash = this.simpleHash(JSON.stringify(data));
    return `${operation}:${dataHash}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 处理HTML转Markdown（带缓存）
   */
  public async processHtmlToMarkdown(
    html: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult<string>> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey('html-to-markdown', { html });
    
    // 检查缓存
    if (options.useCache !== false && !options.forceRefresh) {
      const cached = cacheStrategyManager.get<string>(cacheKey);
      if (cached) {
        return {
          data: cached,
          fromCache: true,
          processingTime: performance.now() - startTime,
          cacheKey
        };
      }
    }

    // 直接同步处理（Worker在Content Script中不可用）
    const result = this.convertHtmlToMarkdownSync(html);
    
    // 缓存结果
    if (options.useCache !== false) {
      cacheStrategyManager.set(cacheKey, result, {
        type: 'markdown',
        ttl: options.cacheTTL || 300000 // 默认5分钟
      });
    }

    return {
      data: result,
      fromCache: false,
      processingTime: performance.now() - startTime,
      cacheKey
    };
  }

  /**
   * 同步转换 HTML 到 Markdown
   */
  private convertHtmlToMarkdownSync(html: string): string {
    if (!html || typeof html !== 'string') return '';
    
    let text = html;
    
    // 移除 script 和 style
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/<style[\s\S]*?<\/style>/gi, '');
    
    // 标题
    for (let i = 6; i >= 1; i--) {
      const re = new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, 'gi');
      text = text.replace(re, (_, content) => '\n' + '#'.repeat(i) + ' ' + this.stripTags(content).trim() + '\n\n');
    }
    
    // 粗体和斜体
    text = text.replace(/<(strong|b)[^>]*>([\\s\\S]*?)<\/(strong|b)>/gi, '**$2**')
               .replace(/<(em|i)[^>]*>([\\s\\S]*?)<\/(em|i)>/gi, '*$2*');
    
    // 链接和图片
    text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>/gi, '![$1]($2)')
               .replace(/<a[^>]*href="([^"]+)"[^>]*>([\\s\\S]*?)<\/a>/gi, '[$2]($1)');
    
    // 列表
    text = text.replace(/<li[^>]*>([\\s\\S]*?)<\/li>/gi, (_, content) => '\n- ' + this.stripTags(content).trim());
    text = text.replace(/<\/(ul|ol)>/gi, '\n\n');
    
    // 段落
    text = text.replace(/<p[^>]*>([\\s\\S]*?)<\/p>/gi, (_, content) => '\n' + this.stripTags(content).trim() + '\n\n')
               .replace(/<br\s*\/?>/gi, '\n');
    
    // 移除剩余标签
    text = this.stripTags(text);
    
    // 规范空行
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    
    return text;
  }

  /**
   * 移除 HTML 标签
   */
  private stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, '')
               .replace(/&nbsp;/g, ' ')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&amp;/g, '&');
  }

  /**
   * 处理内容提取（带缓存）
   */
  public async processContentExtraction(
    html: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult<string>> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey('content-extraction', { html });
    
    // 检查缓存
    if (options.useCache !== false && !options.forceRefresh) {
      const cached = cacheStrategyManager.get<string>(cacheKey);
      if (cached) {
        return {
          data: cached,
          fromCache: true,
          processingTime: performance.now() - startTime,
          cacheKey
        };
      }
    }

    // 直接同步处理
    const result = this.extractContentSync(html);
    
    // 缓存结果
    if (options.useCache !== false) {
      cacheStrategyManager.set(cacheKey, result, {
        type: 'extraction',
        ttl: options.cacheTTL || 600000 // 默认10分钟
      });
    }

    return {
      data: result,
      fromCache: false,
      processingTime: performance.now() - startTime,
      cacheKey
    };
  }

  /**
   * 同步提取内容
   */
  private extractContentSync(html: string): string {
    // 简单的文本提取
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    
    return this.stripTags(cleaned).trim();
  }

  /**
   * 处理元数据解析（带缓存）
   */
  public async processMetadataParsing(
    html: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult<any>> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey('metadata-parsing', { html });
    
    // 检查缓存
    if (options.useCache !== false && !options.forceRefresh) {
      const cached = cacheStrategyManager.get<any>(cacheKey);
      if (cached) {
        return {
          data: cached,
          fromCache: true,
          processingTime: performance.now() - startTime,
          cacheKey
        };
      }
    }

    // 直接同步处理
    const result = this.parseMetadataSync(html);
    
    // 缓存结果
    if (options.useCache !== false) {
      cacheStrategyManager.set(cacheKey, result, {
        type: 'metadata',
        ttl: options.cacheTTL || 1800000 // 默认30分钟
      });
    }

    return {
      data: result,
      fromCache: false,
      processingTime: performance.now() - startTime,
      cacheKey
    };
  }

  /**
   * 同步解析元数据
   */
  private parseMetadataSync(html: string): any {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';
    
    return {
      title,
      language: document.documentElement.lang || 'zh-CN',
      author: null,
      publishDate: null,
      tags: [],
      category: 'uncategorized'
    };
  }

  /**
   * 处理代码高亮（带缓存）
   */
  public async processCodeHighlighting(
    code: string,
    language: string = 'text',
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult<string>> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey('code-highlighting', { code, language });
    
    // 检查缓存
    if (options.useCache !== false && !options.forceRefresh) {
      const cached = cacheStrategyManager.get<string>(cacheKey);
      if (cached) {
        return {
          data: cached,
          fromCache: true,
          processingTime: performance.now() - startTime,
          cacheKey
        };
      }
    }

    // 直接同步处理（简化版，不做复杂高亮）
    const result = code; // 直接返回原代码
    
    // 缓存结果
    if (options.useCache !== false) {
      cacheStrategyManager.set(cacheKey, result, {
        type: 'code-highlighting',
        language,
        ttl: options.cacheTTL || 3600000 // 默认1小时
      });
    }

    return {
      data: result,
      fromCache: false,
      processingTime: performance.now() - startTime,
      cacheKey
    };
  }

  /**
   * 批量处理（优化性能）
   */
  public async batchProcess<T>(
    operations: Array<{
      type: string;
      data: any;
      options?: ProcessingOptions;
    }>
  ): Promise<ProcessingResult<T>[]> {
    const startTime = performance.now();
    const results: ProcessingResult<T>[] = [];

    // 并行处理所有操作
    const promises = operations.map(async (operation) => {
      const operationStartTime = performance.now();
      const cacheKey = this.generateCacheKey(operation.type, operation.data);
      
      // 检查缓存
      if (operation.options?.useCache !== false && !operation.options?.forceRefresh) {
        const cached = cacheStrategyManager.get<T>(cacheKey);
        if (cached) {
          return {
            data: cached,
            fromCache: true,
            processingTime: performance.now() - operationStartTime,
            cacheKey
          };
        }
      }

      // 根据类型选择处理方法
      let result: T;
      switch (operation.type) {
        case 'html-to-markdown':
          result = await webWorkerManager.convertHtmlToMarkdown(operation.data) as T;
          break;
        case 'content-extraction':
          result = await webWorkerManager.extractContent(operation.data) as T;
          break;
        case 'metadata-parsing':
          result = await webWorkerManager.parseMetadata(operation.data) as T;
          break;
        case 'code-highlighting':
          result = await webWorkerManager.highlightCode(operation.data.code, operation.data.language) as T;
          break;
        default:
          throw new Error(`未知的操作类型: ${operation.type}`);
      }

      // 缓存结果
      if (operation.options?.useCache !== false) {
        cacheStrategyManager.set(cacheKey, result, {
          type: operation.type,
          ttl: operation.options?.cacheTTL || 300000
        });
      }

      return {
        data: result,
        fromCache: false,
        processingTime: performance.now() - operationStartTime,
        cacheKey
      };
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    console.log(`📊 批量处理完成: ${operations.length} 个操作，总耗时: ${(performance.now() - startTime).toFixed(2)}ms`);
    
    return results;
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): {
    workerStats: any;
    cacheStats: any;
    combinedStats: {
      totalOperations: number;
      cacheHitRate: number;
      averageProcessingTime: number;
    };
  } {
    const workerStats = webWorkerManager.getStats();
    const cacheStats = cacheStrategyManager.getStats();

    return {
      workerStats,
      cacheStats,
      combinedStats: {
        totalOperations: workerStats.completedTasks + workerStats.failedTasks,
        cacheHitRate: cacheStats.hitRate,
        averageProcessingTime: workerStats.averageTaskTime
      }
    };
  }

  /**
   * 生成性能报告
   */
  public generatePerformanceReport(): string {
    const stats = this.getPerformanceStats();
    const cacheReport = cacheStrategyManager.generateReport();
    
    let report = '增强处理管理器性能报告\n';
    report += '========================\n\n';
    
    report += 'WebWorker统计:\n';
    report += `- 活跃Worker: ${stats.workerStats.activeWorkers}\n`;
    report += `- 队列任务: ${stats.workerStats.queuedTasks}\n`;
    report += `- 完成任务: ${stats.workerStats.completedTasks}\n`;
    report += `- 失败任务: ${stats.workerStats.failedTasks}\n`;
    report += `- 平均任务时间: ${stats.workerStats.averageTaskTime.toFixed(2)}ms\n`;
    report += `- 总内存使用: ${stats.workerStats.totalMemoryUsage}MB\n\n`;
    
    report += '缓存统计:\n';
    report += `- 命中率: ${(stats.cacheStats.hitRate * 100).toFixed(1)}%\n`;
    report += `- 总项数: ${stats.cacheStats.totalItems}\n`;
    report += `- 总大小: ${(stats.cacheStats.totalSize / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- 命中次数: ${stats.cacheStats.hitCount}\n`;
    report += `- 未命中次数: ${stats.cacheStats.missCount}\n\n`;
    
    report += '综合统计:\n';
    report += `- 总操作数: ${stats.combinedStats.totalOperations}\n`;
    report += `- 缓存命中率: ${(stats.combinedStats.cacheHitRate * 100).toFixed(1)}%\n`;
    report += `- 平均处理时间: ${stats.combinedStats.averageProcessingTime.toFixed(2)}ms\n\n`;
    
    report += cacheReport;
    
    return report;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    webWorkerManager.cleanup();
    cacheStrategyManager.cleanup();
    this.isInitialized = false;
  }
}

// 导出单例实例
export const enhancedProcessingManager = EnhancedProcessingManager.getInstance();
