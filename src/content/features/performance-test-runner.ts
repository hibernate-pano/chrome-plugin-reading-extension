/**
 * 性能测试运行器
 * 用于自动化执行最小注入性能测试和生成报告
 */

import { 
  MinimalInjectionBenchmark, 
  BEFORE_VERSION, 
  AFTER_VERSION,
  ModuleType,
  MinimalInjectionMetric
} from './minimal-injection-benchmark';
import { 
  measureBeforeRefactoring, 
  measureAfterRefactoring, 
  comparePerformance, 
  clearTestData 
} from './minimal-injection-test';
import { PerformanceReport } from '../../utils/performance';

/**
 * 性能测试运行器配置
 */
export interface PerformanceTestRunnerConfig {
  // 要测试的URL列表
  testUrls: string[];
  // 每个URL的样本数量
  samplesPerUrl: number;
  // 当前测试的版本 ('v1.6.0' 或 'v1.7.0')
  currentVersion?: string;
  // 是否自动保存报告
  autoSaveReport?: boolean;
  // 是否自动比较两个版本
  autoCompare?: boolean;
  // 是否清除之前的数据
  clearPreviousData?: boolean;
}

/**
 * 性能测试运行器
 * 用于自动化运行性能测试并收集结果
 */
export class PerformanceTestRunner {
  private benchmark: MinimalInjectionBenchmark;
  private config: PerformanceTestRunnerConfig;
  
  /**
   * 创建一个性能测试运行器实例
   * @param config 测试配置
   */
  constructor(config?: Partial<PerformanceTestRunnerConfig>) {
    this.benchmark = MinimalInjectionBenchmark.getInstance();
    
    // 默认配置
    this.config = {
      testUrls: [
        'https://medium.com/javascript-in-plain-english/20-javascript-shorthand-techniques-that-will-save-your-time-f1671aab405f',
        'https://www.smashingmagazine.com/2021/06/dynamic-header-intersection-observer/',
        'https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/',
        'https://web.dev/optimize-lcp/'
      ],
      samplesPerUrl: 3,
      currentVersion: undefined,
      autoSaveReport: true,
      autoCompare: true,
      clearPreviousData: false,
      ...config
    };
  }
  
  /**
   * 运行性能测试
   * @param progressCallback 进度回调函数
   * @returns 测试报告
   */
  async runTests(
    progressCallback?: (progress: number, status: string) => void
  ): Promise<PerformanceReport[]> {
    try {
      // 清除之前的数据（如果需要）
      if (this.config.clearPreviousData) {
        await this.benchmark.clearReports();
        console.log('已清除之前的测试数据');
      }
      
      const reports: PerformanceReport[] = [];
      const totalTests = this.config.testUrls.length * this.config.samplesPerUrl;
      let completedTests = 0;
      
      // 遍历每个URL
      for (const url of this.config.testUrls) {
        // 对每个URL运行多个样本
        for (let i = 0; i < this.config.samplesPerUrl; i++) {
          // 更新进度
          const progress = Math.round((completedTests / totalTests) * 100);
          const status = `测试 URL: ${url} (样本 ${i + 1}/${this.config.samplesPerUrl})`;
          
          if (progressCallback) {
            progressCallback(progress, status);
          }
          
          // 运行测试
          let report: PerformanceReport;
          
          if (this.config.currentVersion) {
            // 测试特定版本
            report = await this.benchmark.runTest(url, this.config.currentVersion);
          } else {
            // 测试并比较两个版本
            report = await this.benchmark.runTestAndCompare(url);
          }
          
          reports.push(report);
          
          // 保存报告（如果需要）
          if (this.config.autoSaveReport) {
            await this.benchmark.saveReport(report);
          }
          
          // 更新已完成的测试数量
          completedTests++;
          
          // 在测试之间暂停一下，避免过度消耗资源
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 最终进度更新
      if (progressCallback) {
        progressCallback(100, '测试完成');
      }
      
      return reports;
    } catch (error) {
      console.error('测试执行失败:', error);
      throw error;
    }
  }
  
  /**
   * 运行两个版本的测试并比较结果
   * @param progressCallback 进度回调函数
   * @returns 比较结果
   */
  async runComparisonTests(
    progressCallback?: (progress: number, status: string, version: string) => void
  ): Promise<{
    beforeReports: PerformanceReport[];
    afterReports: PerformanceReport[];
  }> {
    try {
      // 清除之前的数据（如果需要）
      if (this.config.clearPreviousData) {
        await this.benchmark.clearReports();
        console.log('已清除之前的测试数据');
      }
      
      // 运行重构前版本的测试
      const beforeCallback = progressCallback 
        ? (progress: number, status: string) => progressCallback(progress, status, 'v1.6.0')
        : undefined;
        
      const beforeReports = await this.runTestsForVersion('v1.6.0', beforeCallback);
      
      // 运行重构后版本的测试
      const afterCallback = progressCallback 
        ? (progress: number, status: string) => progressCallback(progress, status, 'v1.7.0')
        : undefined;
        
      const afterReports = await this.runTestsForVersion('v1.7.0', afterCallback);
      
      return { beforeReports, afterReports };
    } catch (error) {
      console.error('比较测试执行失败:', error);
      throw error;
    }
  }
  
  /**
   * 运行特定版本的测试
   * @param version 版本号
   * @param progressCallback 进度回调函数
   * @returns 测试报告
   */
  private async runTestsForVersion(
    version: string,
    progressCallback?: (progress: number, status: string) => void
  ): Promise<PerformanceReport[]> {
    const versionConfig: PerformanceTestRunnerConfig = {
      ...this.config,
      currentVersion: version,
      clearPreviousData: false // 避免清除之前版本的数据
    };
    
    const runner = new PerformanceTestRunner(versionConfig);
    return await runner.runTests(progressCallback);
  }
  
  /**
   * 获取所有已保存的测试报告
   * @returns 测试报告
   */
  async getSavedReports(): Promise<PerformanceReport[]> {
    return await this.benchmark.getReports();
  }
  
  /**
   * 清除所有测试报告
   */
  async clearReports(): Promise<void> {
    await this.benchmark.clearReports();
  }
}

/**
 * 创建默认测试运行器
 */
export function createTestRunner(config: Partial<PerformanceTestRunnerConfig> = {}): PerformanceTestRunner {
  return new PerformanceTestRunner(config);
}

/**
 * 导出默认实例
 */
export const performanceTestRunner = createTestRunner(); 