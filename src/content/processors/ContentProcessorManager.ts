import { ReadingModeSettings } from '../types';

/**
 * 内容处理器接口
 */
export interface ContentProcessor {
  name: string;
  priority: number;
  process(content: string, settings?: ReadingModeSettings): Promise<string>;
  canProcess(content: string): boolean;
}

/**
 * 处理结果统计
 */
export interface ProcessingStats {
  processorName: string;
  startTime: number;
  endTime: number;
  duration: number;
  contentLengthBefore: number;
  contentLengthAfter: number;
  success: boolean;
  error?: string;
}

/**
 * 高性能内容处理器管理器
 * 支持并行处理、缓存、性能监控等特性
 */
export class ContentProcessorManager {
  private processors: Map<string, ContentProcessor> = new Map();
  private processingStats: ProcessingStats[] = [];
  private cache: Map<string, string> = new Map();
  private cacheSize: number = 100;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private enabled: boolean = true;

  constructor() {
    this.initializeDefaultProcessors();
  }

  /**
   * 初始化默认处理器
   */
  private initializeDefaultProcessors(): void {
    // 默认处理器将在子类中注册
  }

  /**
   * 注册内容处理器
   * @param processor 内容处理器
   */
  public registerProcessor(processor: ContentProcessor): void {
    if (this.processors.has(processor.name)) {
      console.warn(`Processor ${processor.name} already exists, overwriting...`);
    }
    this.processors.set(processor.name, processor);
    console.log(`Registered processor: ${processor.name} with priority ${processor.priority}`);
  }

  /**
   * 注销内容处理器
   * @param name 处理器名称
   */
  public unregisterProcessor(name: string): boolean {
    return this.processors.delete(name);
  }

  /**
   * 获取所有处理器
   */
  public getProcessors(): ContentProcessor[] {
    return Array.from(this.processors.values());
  }

  /**
   * 获取处理器
   * @param name 处理器名称
   */
  public getProcessor(name: string): ContentProcessor | undefined {
    return this.processors.get(name);
  }

  /**
   * 处理HTML内容
   * @param content HTML内容
   * @param settings 阅读模式设置
   * @param options 处理选项
   * @returns 处理后的HTML内容
   */
  public async process(
    content: string, 
    settings?: ReadingModeSettings,
    options: {
      enableCache?: boolean;
      enableParallel?: boolean;
      enableStats?: boolean;
      processors?: string[];
    } = {}
  ): Promise<string> {
    const {
      enableCache = true,
      enableParallel = true,
      enableStats = true,
      processors = []
    } = options;

    // 检查缓存
    if (enableCache) {
      const cacheKey = this.generateCacheKey(content, settings, processors);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        this.cacheHits++;
        return cachedResult;
      }
      this.cacheMisses++;
    }

    const startTime = performance.now();
    let processedContent = content;

    try {
      // 确定要使用的处理器
      const activeProcessors = this.getActiveProcessors(processors);
      
      if (activeProcessors.length === 0) {
        console.warn('No active processors found');
        return content;
      }

      // 按优先级排序处理器
      const sortedProcessors = activeProcessors.sort((a, b) => b.priority - a.priority);

      if (enableParallel && sortedProcessors.length > 1) {
        // 并行处理
        processedContent = await this.processParallel(sortedProcessors, content, settings, enableStats);
      } else {
        // 串行处理
        processedContent = await this.processSequential(sortedProcessors, content, settings, enableStats);
      }

      // 缓存结果
      if (enableCache) {
        const cacheKey = this.generateCacheKey(content, settings, processors);
        this.setCache(cacheKey, processedContent);
      }

      return processedContent;
    } catch (error) {
      console.error('Content processing failed:', error);
      return content; // 返回原始内容
    } finally {
      if (enableStats) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.debug(`Content processing completed in ${duration.toFixed(2)}ms`);
      }
    }
  }

  /**
   * 并行处理内容
   */
  private async processParallel(
    processors: ContentProcessor[],
    content: string,
    settings?: ReadingModeSettings,
    enableStats?: boolean
  ): Promise<string> {
    const processingPromises = processors.map(async (processor) => {
      if (!processor.canProcess(content)) {
        return { processor, result: content, success: true };
      }

      const startTime = performance.now();
      try {
        const result = await processor.process(content, settings);
        const endTime = performance.now();
        
        if (enableStats) {
          this.recordStats({
            processorName: processor.name,
            startTime,
            endTime,
            duration: endTime - startTime,
            contentLengthBefore: content.length,
            contentLengthAfter: result.length,
            success: true
          });
        }
        
        return { processor, result, success: true };
      } catch (error) {
        const endTime = performance.now();
        
        if (enableStats) {
          this.recordStats({
            processorName: processor.name,
            startTime,
            endTime,
            duration: endTime - startTime,
            contentLengthBefore: content.length,
            contentLengthAfter: content.length,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        
        console.warn(`Processor ${processor.name} failed:`, error);
        return { processor, result: content, success: false };
      }
    });

    const results = await Promise.all(processingPromises);
    
    // 合并处理结果，按优先级顺序
    let finalContent = content;
    for (const { processor, result, success } of results) {
      if (success) {
        finalContent = result;
      }
    }
    
    return finalContent;
  }

  /**
   * 串行处理内容
   */
  private async processSequential(
    processors: ContentProcessor[],
    content: string,
    settings?: ReadingModeSettings,
    enableStats?: boolean
  ): Promise<string> {
    let processedContent = content;
    
    for (const processor of processors) {
      if (!processor.canProcess(processedContent)) {
        continue;
      }

      const startTime = performance.now();
      try {
        const result = await processor.process(processedContent, settings);
        const endTime = performance.now();
        
        if (enableStats) {
          this.recordStats({
            processorName: processor.name,
            startTime,
            endTime,
            duration: endTime - startTime,
            contentLengthBefore: processedContent.length,
            contentLengthAfter: result.length,
            success: true
          });
        }
        
        processedContent = result;
      } catch (error) {
        const endTime = performance.now();
        
        if (enableStats) {
          this.recordStats({
            processorName: processor.name,
            startTime,
            endTime,
            duration: endTime - startTime,
            contentLengthBefore: processedContent.length,
            contentLengthAfter: processedContent.length,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        
        console.warn(`Processor ${processor.name} failed:`, error);
        // 继续处理下一个处理器
      }
    }
    
    return processedContent;
  }

  /**
   * 获取活跃的处理器
   */
  private getActiveProcessors(requestedProcessors: string[]): ContentProcessor[] {
    if (requestedProcessors.length === 0) {
      // 返回所有处理器
      return Array.from(this.processors.values());
    }
    
    const activeProcessors: ContentProcessor[] = [];
    for (const name of requestedProcessors) {
      const processor = this.processors.get(name);
      if (processor) {
        activeProcessors.push(processor);
      } else {
        console.warn(`Processor ${name} not found`);
      }
    }
    
    return activeProcessors;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(content: string, settings?: ReadingModeSettings, processors?: string[]): string {
    const contentHash = this.hashString(content);
    const settingsHash = settings ? this.hashString(JSON.stringify(settings)) : 'default';
    const processorsHash = processors ? this.hashString(processors.sort().join(',')) : 'all';
    
    return `${contentHash}-${settingsHash}-${processorsHash}`;
  }

  /**
   * 简单的字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, value: string): void {
    // 如果缓存已满，移除最旧的条目
    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
  }

  /**
   * 记录处理统计
   */
  private recordStats(stats: ProcessingStats): void {
    this.processingStats.push(stats);
    
    // 保持统计记录数量在合理范围内
    if (this.processingStats.length > 1000) {
      this.processingStats = this.processingStats.slice(-500);
    }
  }

  /**
   * 获取处理统计
   */
  public getStats(): ProcessingStats[] {
    return [...this.processingStats];
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * 设置缓存大小
   */
  public setCacheSize(size: number): void {
    this.cacheSize = Math.max(1, size);
    
    // 如果当前缓存大小超过新限制，移除多余的条目
    while (this.cache.size > this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * 启用或禁用处理器管理器
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 检查是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.processingStats = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * 获取处理器状态摘要
   */
  public getStatusSummary(): {
    totalProcessors: number;
    enabled: boolean;
    cacheStats: ReturnType<typeof this.getCacheStats>;
    recentStats: ProcessingStats[];
  } {
    return {
      totalProcessors: this.processors.size,
      enabled: this.enabled,
      cacheStats: this.getCacheStats(),
      recentStats: this.processingStats.slice(-10)
    };
  }
}

// 导出默认实例
export const contentProcessorManager = new ContentProcessorManager();
