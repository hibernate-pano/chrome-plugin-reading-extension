/**
 * 端到端测试主入口
 * 整合所有测试组件，提供统一的测试接口
 */

import { testSampleManager, TestSample } from './TestSampleManager';
import { e2eTestRunner, TestConfig, TestProgress } from './E2ETestRunner';
import { performanceMonitor, PerformanceReport } from './PerformanceMonitor';
import { testReportGenerator, TestReport } from './TestReportGenerator';

export interface E2ETestSuite {
  runAllTests: (config?: Partial<TestConfig>, sampleIds?: string[]) => Promise<TestReport>;
  runCategoryTests: (category: TestSample['category'], config?: Partial<TestConfig>) => Promise<TestReport>;
  runComplexityTests: (complexity: TestSample['complexity'], config?: Partial<TestConfig>) => Promise<TestReport>;
  runSingleTest: (sampleId: string, config?: Partial<TestConfig>) => Promise<TestReport>;
  getProgress: () => TestProgress;
  stop: () => void;
  generateReport: () => TestReport;
  exportReport: (format: 'markdown' | 'json' | 'html') => string;
  getSamples: () => TestSample[];
  getPerformanceStats: () => PerformanceReport;
  clearData: () => void;
}

/**
 * 端到端测试套件
 */
class E2ETestSuiteImpl implements E2ETestSuite {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化测试套件
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 初始化端到端测试套件');
      
      // 启动性能监控
      performanceMonitor.startMonitoring(30000); // 每30秒收集一次指标
      
      // 设置测试进度回调
      e2eTestRunner.onProgress((progress) => {
        console.log(`📊 测试进度: ${progress.current}/${progress.total} - ${progress.currentSample}`);
      });

      // 设置测试完成回调
      e2eTestRunner.onComplete((results) => {
        console.log(`✅ 测试完成，共 ${results.length} 个结果`);
        
        // 记录性能指标
        results.forEach(result => {
          performanceMonitor.recordTestResult(result);
        });
      });

      this.isInitialized = true;
      console.log('✅ 端到端测试套件初始化完成');

    } catch (error) {
      console.error('❌ 端到端测试套件初始化失败:', error);
      throw error;
    }
  }

  /**
   * 运行所有测试
   */
  public async runAllTests(config?: Partial<TestConfig>, sampleIds?: string[]): Promise<TestReport> {
    await this.ensureInitialized();
    
    console.log('🎯 开始运行所有端到端测试');
    
    // 设置默认配置
    const defaultConfig: TestConfig = {
      headless: false,
      timeout: 30000,
      retries: 2,
      parallel: false,
      maxConcurrent: 3,
      includePerformance: true,
      includeAnnotations: true
    };

    const finalConfig = { ...defaultConfig, ...config };
    e2eTestRunner.setConfig(finalConfig);

    // 运行测试
    const results = await e2eTestRunner.runAllTests(sampleIds);
    
    // 生成报告
    const report = testReportGenerator.generateReport();
    
    console.log(`📋 测试报告生成完成 - 成功率: ${(report.summary.successRate * 100).toFixed(1)}%`);
    
    return report;
  }

  /**
   * 运行指定类别的测试
   */
  public async runCategoryTests(category: TestSample['category'], config?: Partial<TestConfig>): Promise<TestReport> {
    await this.ensureInitialized();
    
    const samples = testSampleManager.getSamplesByCategory(category);
    const sampleIds = samples.map(s => s.id);
    
    console.log(`🎯 开始运行 ${category} 类别测试，共 ${samples.length} 个样本`);
    
    return this.runAllTests(config, sampleIds);
  }

  /**
   * 运行指定复杂度的测试
   */
  public async runComplexityTests(complexity: TestSample['complexity'], config?: Partial<TestConfig>): Promise<TestReport> {
    await this.ensureInitialized();
    
    const samples = testSampleManager.getSamplesByComplexity(complexity);
    const sampleIds = samples.map(s => s.id);
    
    console.log(`🎯 开始运行 ${complexity} 复杂度测试，共 ${samples.length} 个样本`);
    
    return this.runAllTests(config, sampleIds);
  }

  /**
   * 运行单个测试
   */
  public async runSingleTest(sampleId: string, config?: Partial<TestConfig>): Promise<TestReport> {
    await this.ensureInitialized();
    
    console.log(`🎯 开始运行单个测试: ${sampleId}`);
    
    return this.runAllTests(config, [sampleId]);
  }

  /**
   * 获取测试进度
   */
  public getProgress(): TestProgress {
    return e2eTestRunner.getProgress();
  }

  /**
   * 停止测试
   */
  public stop(): void {
    e2eTestRunner.stop();
    console.log('⏹️ 测试已停止');
  }

  /**
   * 生成测试报告
   */
  public generateReport(): TestReport {
    return testReportGenerator.generateReport();
  }

  /**
   * 导出测试报告
   */
  public exportReport(format: 'markdown' | 'json' | 'html'): string {
    const report = this.generateReport();
    
    switch (format) {
      case 'markdown':
        return testReportGenerator.exportToMarkdown(report);
      case 'json':
        return testReportGenerator.exportToJson(report);
      case 'html':
        return testReportGenerator.exportToHtml(report);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 获取测试样本
   */
  public getSamples(): TestSample[] {
    return testSampleManager.getSamples();
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): PerformanceReport {
    return performanceMonitor.generateReport();
  }

  /**
   * 清理数据
   */
  public clearData(): void {
    testSampleManager.clearResults();
    performanceMonitor.clearData();
    console.log('🧹 测试数据已清理');
  }

  /**
   * 确保已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// 创建并导出测试套件实例
export const e2eTestSuite = new E2ETestSuiteImpl();

// 导出所有组件
export * from './TestSampleManager';
export * from './E2ETestRunner';
export * from './PerformanceMonitor';
export * from './TestReportGenerator';

// 导出便捷方法
export const runQuickTest = async (): Promise<TestReport> => {
  console.log('🚀 运行快速测试（简单页面）');
  return e2eTestSuite.runComplexityTests('simple', {
    timeout: 15000,
    retries: 1,
    parallel: true,
    maxConcurrent: 2
  });
};

export const runFullTest = async (): Promise<TestReport> => {
  console.log('🚀 运行完整测试（所有页面）');
  return e2eTestSuite.runAllTests({
    timeout: 30000,
    retries: 2,
    parallel: true,
    maxConcurrent: 3
  });
};

export const runPerformanceTest = async (): Promise<TestReport> => {
  console.log('🚀 运行性能测试（复杂页面）');
  return e2eTestSuite.runComplexityTests('complex', {
    timeout: 60000,
    retries: 3,
    parallel: false,
    includePerformance: true,
    includeAnnotations: true
  });
};

// 在全局对象上暴露测试套件（用于调试）
if (typeof window !== 'undefined') {
  (window as any).e2eTestSuite = e2eTestSuite;
  (window as any).runQuickTest = runQuickTest;
  (window as any).runFullTest = runFullTest;
  (window as any).runPerformanceTest = runPerformanceTest;
  
  console.log('🔧 端到端测试套件已暴露到全局对象，可通过以下方式使用:');
  console.log('  - window.e2eTestSuite.runAllTests()');
  console.log('  - window.runQuickTest()');
  console.log('  - window.runFullTest()');
  console.log('  - window.runPerformanceTest()');
}
