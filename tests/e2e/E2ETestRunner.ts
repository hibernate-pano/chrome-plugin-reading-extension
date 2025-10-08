/**
 * 端到端测试执行器
 * 执行自动化测试并收集性能数据
 */

import { testSampleManager, TestSample, TestResult, PerformanceBaseline } from './TestSampleManager';
import { enhancedProcessingManager } from '../../src/content/features/performance/EnhancedProcessingManager';
import { annotationManager } from '../../src/content/features/annotation/AnnotationManager';

export interface TestConfig {
  headless: boolean;
  timeout: number;
  retries: number;
  parallel: boolean;
  maxConcurrent: number;
  includePerformance: boolean;
  includeAnnotations: boolean;
}

export interface TestProgress {
  current: number;
  total: number;
  currentSample: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  results: TestResult[];
}

/**
 * 端到端测试执行器
 */
export class E2ETestRunner {
  private static instance: E2ETestRunner;
  private isRunning = false;
  private currentConfig: TestConfig;
  private progress: TestProgress;
  private onProgressCallback?: (progress: TestProgress) => void;
  private onCompleteCallback?: (results: TestResult[]) => void;

  private constructor() {
    this.currentConfig = {
      headless: false,
      timeout: 30000,
      retries: 2,
      parallel: false,
      maxConcurrent: 3,
      includePerformance: true,
      includeAnnotations: true
    };

    this.progress = {
      current: 0,
      total: 0,
      currentSample: '',
      status: 'completed',
      results: []
    };
  }

  public static getInstance(): E2ETestRunner {
    if (!E2ETestRunner.instance) {
      E2ETestRunner.instance = new E2ETestRunner();
    }
    return E2ETestRunner.instance;
  }

  /**
   * 设置测试配置
   */
  public setConfig(config: Partial<TestConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
  }

  /**
   * 设置进度回调
   */
  public onProgress(callback: (progress: TestProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * 设置完成回调
   */
  public onComplete(callback: (results: TestResult[]) => void): void {
    this.onCompleteCallback = callback;
  }

  /**
   * 运行所有测试
   */
  public async runAllTests(sampleIds?: string[]): Promise<TestResult[]> {
    if (this.isRunning) {
      throw new Error('测试正在运行中');
    }

    this.isRunning = true;
    this.progress.status = 'running';
    this.progress.results = [];

    try {
      const samples = sampleIds 
        ? testSampleManager.getSamples().filter(s => sampleIds.includes(s.id))
        : testSampleManager.getSamples();

      this.progress.total = samples.length;
      this.progress.current = 0;

      console.log(`🚀 开始运行端到端测试，共 ${samples.length} 个样本`);

      if (this.currentConfig.parallel) {
        await this.runParallelTests(samples);
      } else {
        await this.runSequentialTests(samples);
      }

      this.progress.status = 'completed';
      console.log(`✅ 端到端测试完成，共 ${this.progress.results.length} 个结果`);

      this.onCompleteCallback?.(this.progress.results);
      return this.progress.results;

    } catch (error) {
      this.progress.status = 'failed';
      console.error('❌ 端到端测试失败:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 顺序运行测试
   */
  private async runSequentialTests(samples: TestSample[]): Promise<void> {
    for (const sample of samples) {
      this.progress.currentSample = sample.name;
      this.updateProgress();

      try {
        const result = await this.runSingleTest(sample);
        this.progress.results.push(result);
        testSampleManager.recordResult(result);
        
        console.log(`✅ 测试完成: ${sample.name} (${result.success ? '成功' : '失败'})`);
      } catch (error) {
        console.error(`❌ 测试失败: ${sample.name}`, error);
        
        const failedResult: TestResult = {
          sampleId: sample.id,
          timestamp: Date.now(),
          success: false,
          performance: this.getDefaultPerformance(),
          errors: [error instanceof Error ? error.message : String(error)],
          extractedData: {
            contentLength: 0,
            imageCount: 0,
            codeBlockCount: 0,
            tableCount: 0,
            listCount: 0
          }
        };
        
        this.progress.results.push(failedResult);
        testSampleManager.recordResult(failedResult);
      }

      this.progress.current++;
      this.updateProgress();
    }
  }

  /**
   * 并行运行测试
   */
  private async runParallelTests(samples: TestSample[]): Promise<void> {
    const chunks = this.chunkArray(samples, this.currentConfig.maxConcurrent);
    
    for (const chunk of chunks) {
      const promises = chunk.map(sample => this.runSingleTestWithRetry(sample));
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        const sample = chunk[index];
        this.progress.currentSample = sample.name;
        
        if (result.status === 'fulfilled') {
          this.progress.results.push(result.value);
          testSampleManager.recordResult(result.value);
          console.log(`✅ 测试完成: ${sample.name} (${result.value.success ? '成功' : '失败'})`);
        } else {
          console.error(`❌ 测试失败: ${sample.name}`, result.reason);
          
          const failedResult: TestResult = {
            sampleId: sample.id,
            timestamp: Date.now(),
            success: false,
            performance: this.getDefaultPerformance(),
            errors: [result.reason instanceof Error ? result.reason.message : String(result.reason)],
            extractedData: {
              contentLength: 0,
              imageCount: 0,
              codeBlockCount: 0,
              tableBlockCount: 0,
              listCount: 0
            }
          };
          
          this.progress.results.push(failedResult);
          testSampleManager.recordResult(failedResult);
        }
        
        this.progress.current++;
        this.updateProgress();
      });
    }
  }

  /**
   * 运行单个测试（带重试）
   */
  private async runSingleTestWithRetry(sample: TestSample): Promise<TestResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.currentConfig.retries; attempt++) {
      try {
        return await this.runSingleTest(sample);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.currentConfig.retries) {
          console.warn(`⚠️ 测试重试 ${attempt + 1}/${this.currentConfig.retries}: ${sample.name}`);
          await this.delay(1000 * (attempt + 1)); // 递增延迟
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 运行单个测试
   */
  private async runSingleTest(sample: TestSample): Promise<TestResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    let extractedData = {
      contentLength: 0,
      imageCount: 0,
      codeBlockCount: 0,
      tableCount: 0,
      listCount: 0
    };

    try {
      // 模拟页面加载
      await this.simulatePageLoad(sample.url);

      // 测试内容提取
      const extractionStart = performance.now();
      const html = document.documentElement.outerHTML;
      
      const [extractionResult, metadataResult] = await Promise.all([
        enhancedProcessingManager.processContentExtraction(html, {
          useCache: false, // 测试时不使用缓存
          cacheTTL: 0
        }),
        enhancedProcessingManager.processMetadataParsing(html, {
          useCache: false,
          cacheTTL: 0
        })
      ]);

      const extractionTime = performance.now() - extractionStart;

      // 测试Markdown转换
      const processingStart = performance.now();
      const markdownResult = await enhancedProcessingManager.processHtmlToMarkdown(html, {
        useCache: false,
        cacheTTL: 0
      });
      const processingTime = performance.now() - processingStart;

      // 测试代码高亮（如果有代码块）
      const renderingStart = performance.now();
      if (sample.expectedElements.codeBlocks) {
        await enhancedProcessingManager.processCodeHighlighting(
          'console.log("Hello World");',
          'javascript',
          { useCache: false, cacheTTL: 0 }
        );
      }
      const renderingTime = performance.now() - renderingStart;

      // 收集提取的数据
      extractedData = {
        contentLength: extractionResult.data.length,
        imageCount: (html.match(/<img[^>]*>/gi) || []).length,
        codeBlockCount: (html.match(/<pre[^>]*><code[^>]*>/gi) || []).length,
        tableCount: (html.match(/<table[^>]*>/gi) || []).length,
        listCount: (html.match(/<(ul|ol)[^>]*>/gi) || []).length
      };

      // 测试注释功能（如果启用）
      if (this.currentConfig.includeAnnotations) {
        try {
          const annotationId = annotationManager.createHighlight('测试文本', '#ffeb3b', '测试注释');
          if (annotationId) {
            annotationManager.deleteAnnotation(annotationId);
          }
        } catch (error) {
          errors.push(`注释功能测试失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 获取性能统计
      const performanceStats = enhancedProcessingManager.getPerformanceStats();
      const totalTime = performance.now() - startTime;

      const performance: PerformanceBaseline = {
        extractionTime,
        processingTime,
        renderingTime,
        totalTime,
        memoryUsage: performanceStats.workerStats.totalMemoryUsage,
        cacheHitRate: performanceStats.cacheStats.hitRate,
        errorRate: errors.length > 0 ? 1 : 0
      };

      return {
        sampleId: sample.id,
        timestamp: Date.now(),
        success: true,
        performance,
        errors,
        extractedData: {
          title: metadataResult.data.title,
          ...extractedData
        }
      };

    } catch (error) {
      const totalTime = performance.now() - startTime;
      
      return {
        sampleId: sample.id,
        timestamp: Date.now(),
        success: false,
        performance: {
          extractionTime: 0,
          processingTime: 0,
          renderingTime: 0,
          totalTime,
          memoryUsage: 0,
          cacheHitRate: 0,
          errorRate: 1
        },
        errors: [error instanceof Error ? error.message : String(error)],
        extractedData
      };
    }
  }

  /**
   * 模拟页面加载
   */
  private async simulatePageLoad(url: string): Promise<void> {
    // 在实际环境中，这里会导航到真实URL
    // 在测试环境中，我们模拟加载过程
    console.log(`📄 模拟加载页面: ${url}`);
    await this.delay(100); // 模拟加载时间
  }

  /**
   * 获取默认性能数据
   */
  private getDefaultPerformance(): PerformanceBaseline {
    return {
      extractionTime: 0,
      processingTime: 0,
      renderingTime: 0,
      totalTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      errorRate: 1
    };
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    this.onProgressCallback?.(this.progress);
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 停止测试
   */
  public stop(): void {
    if (this.isRunning) {
      this.progress.status = 'paused';
      this.isRunning = false;
      console.log('⏸️ 测试已暂停');
    }
  }

  /**
   * 获取当前进度
   */
  public getProgress(): TestProgress {
    return { ...this.progress };
  }

  /**
   * 获取测试状态
   */
  public isTestRunning(): boolean {
    return this.isRunning;
  }
}

// 导出单例实例
export const e2eTestRunner = E2ETestRunner.getInstance();
