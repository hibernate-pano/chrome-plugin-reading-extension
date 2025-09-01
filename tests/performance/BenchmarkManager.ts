import { 
  BenchmarkResult, 
  PerformanceTestResult, 
  TestScenario, 
  PerformanceMetrics,
  PerformanceTestConfig 
} from './types';
import { PerformanceTestSuite } from './PerformanceTestSuite';

/**
 * 基准测试管理器
 * 管理基准测试的执行、结果分析和报告生成
 */
export class BenchmarkManager {
  private testSuite: PerformanceTestSuite;
  private benchmarks: Map<string, BenchmarkResult> = new Map();
  private config: PerformanceTestConfig;

  constructor(config: PerformanceTestConfig = {}) {
    this.config = {
      verbose: false,
      enableMonitoring: true,
      timeout: 30000,
      retryCount: 3,
      thresholds: {
        extractionTime: 200,
        renderTime: 100,
        memoryUsage: 50,
        cpuUsage: 0.1,
        userInteractionTime: 100,
        minSuccessRate: 0.95
      },
      ...config
    };

    this.testSuite = new PerformanceTestSuite();
  }

  /**
   * 运行基准测试
   */
  public async runBenchmark(
    name: string, 
    scenarios: TestScenario[], 
    iterations: number = 5
  ): Promise<BenchmarkResult> {
    if (this.config.verbose) {
      console.log(`开始基准测试: ${name}`);
      console.log(`测试场景数量: ${scenarios.length}`);
      console.log(`迭代次数: ${iterations}`);
    }

    const results: PerformanceTestResult[] = [];
    const startTime = Date.now();

    try {
      // 运行多次测试
      for (let i = 0; i < iterations; i++) {
        if (this.config.verbose) {
          console.log(`执行迭代 ${i + 1}/${iterations}`);
        }

        const iterationResults = await this.runTestScenarios(scenarios);
        results.push(...iterationResults);

        // 检查超时
        if (Date.now() - startTime > this.config.timeout!) {
          throw new Error(`基准测试超时: ${this.config.timeout}ms`);
        }
      }

      // 分析结果
      const benchmarkResult = this.analyzeBenchmarkResults(name, results);
      
      // 保存基准测试结果
      this.benchmarks.set(name, benchmarkResult);

      if (this.config.verbose) {
        console.log(`基准测试完成: ${name}`);
        console.log(`通过率: ${(benchmarkResult.passRate * 100).toFixed(2)}%`);
        console.log(`是否通过: ${benchmarkResult.passed ? '是' : '否'}`);
      }

      return benchmarkResult;

    } catch (error) {
      if (this.config.verbose) {
        console.error(`基准测试失败: ${name}`, error);
      }

      // 创建失败的基准测试结果
      const failedResult: BenchmarkResult = {
        name,
        results: results,
        statistics: this.calculateStatistics(results),
        passRate: 0,
        passed: false
      };

      this.benchmarks.set(name, failedResult);
      return failedResult;
    }
  }

  /**
   * 运行测试场景
   */
  private async runTestScenarios(scenarios: TestScenario[]): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];

    for (const scenario of scenarios) {
      try {
        const result = await this.testSuite.runTest(scenario);
        results.push(result);
      } catch (error) {
        if (this.config.verbose) {
          console.error(`测试场景失败: ${scenario.name}`, error);
        }
      }
    }

    return results;
  }

  /**
   * 分析基准测试结果
   */
  private analyzeBenchmarkResults(name: string, results: PerformanceTestResult[]): BenchmarkResult {
    // 过滤完成的测试
    const completedResults = results.filter(r => r.status === 'completed');
    
    if (completedResults.length === 0) {
      return {
        name,
        results,
        statistics: this.calculateStatistics(results),
        passRate: 0,
        passed: false
      };
    }

    // 计算统计信息
    const statistics = this.calculateStatistics(completedResults);
    
    // 计算通过率
    const passRate = this.calculatePassRate(completedResults);
    
    // 判断是否通过基准测试
    const passed = passRate >= (this.config.thresholds?.minSuccessRate || 0.95);

    return {
      name,
      results: completedResults,
      statistics,
      passRate,
      passed
    };
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(results: PerformanceTestResult[]): BenchmarkResult['statistics'] {
    if (results.length === 0) {
      return {
        mean: this.createEmptyMetrics(),
        median: this.createEmptyMetrics(),
        standardDeviation: this.createEmptyMetrics(),
        min: this.createEmptyMetrics(),
        max: this.createEmptyMetrics(),
        sampleCount: 0
      };
    }

    const metrics = results.map(r => r.metrics);
    
    return {
      mean: this.calculateMean(metrics),
      median: this.calculateMedian(metrics),
      standardDeviation: this.calculateStandardDeviation(metrics),
      min: this.calculateMin(metrics),
      max: this.calculateMax(metrics),
      sampleCount: results.length
    };
  }

  /**
   * 计算平均值
   */
  private calculateMean(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const sum = metrics.reduce((acc, metric) => ({
      extractionTime: acc.extractionTime + metric.extractionTime,
      renderTime: acc.renderTime + metric.renderTime,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      cpuUsage: acc.cpuUsage + metric.cpuUsage,
      userInteractionTime: acc.userInteractionTime + metric.userInteractionTime,
      errorRate: acc.errorRate + metric.errorRate,
      successRate: acc.successRate + metric.successRate
    }), this.createEmptyMetrics());

    const count = metrics.length;
    return {
      extractionTime: sum.extractionTime / count,
      renderTime: sum.renderTime / count,
      memoryUsage: sum.memoryUsage / count,
      cpuUsage: sum.cpuUsage / count,
      userInteractionTime: sum.userInteractionTime / count,
      errorRate: sum.errorRate / count,
      successRate: sum.successRate / count
    };
  }

  /**
   * 计算中位数
   */
  private calculateMedian(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const sorted = [...metrics].sort((a, b) => a.extractionTime - b.extractionTime);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return this.calculateMean([sorted[mid - 1], sorted[mid]]);
    } else {
      return sorted[mid];
    }
  }

  /**
   * 计算标准差
   */
  private calculateStandardDeviation(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const mean = this.calculateMean(metrics);
    
    const variance = metrics.reduce((acc, metric) => ({
      extractionTime: acc.extractionTime + Math.pow(metric.extractionTime - mean.extractionTime, 2),
      renderTime: acc.renderTime + Math.pow(metric.renderTime - mean.renderTime, 2),
      memoryUsage: acc.memoryUsage + Math.pow(metric.memoryUsage - mean.memoryUsage, 2),
      cpuUsage: acc.cpuUsage + Math.pow(metric.cpuUsage - mean.cpuUsage, 2),
      userInteractionTime: acc.userInteractionTime + Math.pow(metric.userInteractionTime - mean.userInteractionTime, 2),
      errorRate: acc.errorRate + Math.pow(metric.errorRate - mean.errorRate, 2),
      successRate: acc.successRate + Math.pow(metric.successRate - mean.successRate, 2)
    }), this.createEmptyMetrics());

    const count = metrics.length;
    return {
      extractionTime: Math.sqrt(variance.extractionTime / count),
      renderTime: Math.sqrt(variance.renderTime / count),
      memoryUsage: Math.sqrt(variance.memoryUsage / count),
      cpuUsage: Math.sqrt(variance.cpuUsage / count),
      userInteractionTime: Math.sqrt(variance.userInteractionTime / count),
      errorRate: Math.sqrt(variance.errorRate / count),
      successRate: Math.sqrt(variance.successRate / count)
    };
  }

  /**
   * 计算最小值
   */
  private calculateMin(metrics: PerformanceMetrics[]): PerformanceMetrics {
    return metrics.reduce((min, metric) => ({
      extractionTime: Math.min(min.extractionTime, metric.extractionTime),
      renderTime: Math.min(min.renderTime, metric.renderTime),
      memoryUsage: Math.min(min.memoryUsage, metric.memoryUsage),
      cpuUsage: Math.min(min.cpuUsage, metric.cpuUsage),
      userInteractionTime: Math.min(min.userInteractionTime, metric.userInteractionTime),
      errorRate: Math.min(min.errorRate, metric.errorRate),
      successRate: Math.min(min.successRate, metric.successRate)
    }));
  }

  /**
   * 计算最大值
   */
  private calculateMax(metrics: PerformanceMetrics[]): PerformanceMetrics {
    return metrics.reduce((max, metric) => ({
      extractionTime: Math.max(max.extractionTime, metric.extractionTime),
      renderTime: Math.max(max.renderTime, metric.renderTime),
      memoryUsage: Math.max(max.memoryUsage, metric.memoryUsage),
      cpuUsage: Math.max(max.cpuUsage, metric.cpuUsage),
      userInteractionTime: Math.max(max.userInteractionTime, metric.userInteractionTime),
      errorRate: Math.max(max.errorRate, metric.errorRate),
      successRate: Math.max(max.successRate, metric.successRate)
    }));
  }

  /**
   * 计算通过率
   */
  private calculatePassRate(results: PerformanceTestResult[]): number {
    if (results.length === 0) return 0;

    const thresholds = this.config.thresholds!;
    let passedCount = 0;

    for (const result of results) {
      const metrics = result.metrics;
      let passed = true;

      // 检查各项指标是否满足阈值
      if (thresholds.extractionTime && metrics.extractionTime > thresholds.extractionTime) {
        passed = false;
      }
      if (thresholds.renderTime && metrics.renderTime > thresholds.renderTime) {
        passed = false;
      }
      if (thresholds.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage) {
        passed = false;
      }
      if (thresholds.cpuUsage && metrics.cpuUsage > thresholds.cpuUsage) {
        passed = false;
      }
      if (thresholds.userInteractionTime && metrics.userInteractionTime > thresholds.userInteractionTime) {
        passed = false;
      }
      if (thresholds.minSuccessRate && metrics.successRate < thresholds.minSuccessRate) {
        passed = false;
      }

      if (passed) {
        passedCount++;
      }
    }

    return passedCount / results.length;
  }

  /**
   * 创建空的性能指标
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      extractionTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      userInteractionTime: 0,
      errorRate: 0,
      successRate: 0
    };
  }

  /**
   * 获取基准测试结果
   */
  public getBenchmark(name: string): BenchmarkResult | undefined {
    return this.benchmarks.get(name);
  }

  /**
   * 获取所有基准测试结果
   */
  public getAllBenchmarks(): BenchmarkResult[] {
    return Array.from(this.benchmarks.values());
  }

  /**
   * 清理基准测试结果
   */
  public clearBenchmarks(): void {
    this.benchmarks.clear();
  }

  /**
   * 导出基准测试结果
   */
  public exportBenchmarks(): string {
    return JSON.stringify(Array.from(this.benchmarks.values()), null, 2);
  }

  /**
   * 获取性能摘要
   */
  public getPerformanceSummary(): {
    totalBenchmarks: number;
    passedBenchmarks: number;
    failedBenchmarks: number;
    averagePassRate: number;
  } {
    const benchmarks = Array.from(this.benchmarks.values());
    const passedBenchmarks = benchmarks.filter(b => b.passed);
    const averagePassRate = benchmarks.length > 0
      ? benchmarks.reduce((sum, b) => sum + b.passRate, 0) / benchmarks.length
      : 0;

    return {
      totalBenchmarks: benchmarks.length,
      passedBenchmarks: passedBenchmarks.length,
      failedBenchmarks: benchmarks.length - passedBenchmarks.length,
      averagePassRate
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<PerformanceTestConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  public getConfig(): PerformanceTestConfig {
    return { ...this.config };
  }
}
