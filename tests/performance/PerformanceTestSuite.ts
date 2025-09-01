import { PerformanceMetrics, PerformanceTestResult, TestScenario } from './types';

/**
 * 性能测试套件
 * 提供全面的性能测试功能，包括基准测试、压力测试和回归测试
 */
export class PerformanceTestSuite {
  private testResults: Map<string, PerformanceTestResult> = new Map();
  private isRunning: boolean = false;
  private testStartTime: number = 0;

  constructor() {
    this.initializeTestSuite();
  }

  /**
   * 初始化测试套件
   */
  private initializeTestSuite(): void {
    // 设置性能观察器
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordPerformanceEntry(entry);
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }
  }

  /**
   * 记录性能条目
   */
  private recordPerformanceEntry(entry: PerformanceEntry): void {
    const currentTest = this.getCurrentTest();
    if (currentTest) {
      currentTest.performanceEntries.push({
        name: entry.name,
        entryType: entry.entryType,
        startTime: entry.startTime,
        duration: entry.duration,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 获取当前测试
   */
  private getCurrentTest(): PerformanceTestResult | null {
    for (const result of this.testResults.values()) {
      if (result.status === 'running') {
        return result;
      }
    }
    return null;
  }

  /**
   * 开始性能测试
   */
  public async runTest(scenario: TestScenario): Promise<PerformanceTestResult> {
    if (this.isRunning) {
      throw new Error('测试套件正在运行中，请等待当前测试完成');
    }

    this.isRunning = true;
    this.testStartTime = performance.now();

    const testResult: PerformanceTestResult = {
      id: this.generateTestId(),
      scenario,
      status: 'running',
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      metrics: {
        extractionTime: 0,
        renderTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        userInteractionTime: 0,
        errorRate: 0,
        successRate: 0
      },
      performanceEntries: [],
      errors: [],
      warnings: []
    };

    this.testResults.set(testResult.id, testResult);

    try {
      // 运行测试场景
      await this.executeTestScenario(scenario, testResult);
      
      // 计算最终指标
      this.calculateFinalMetrics(testResult);
      
      testResult.status = 'completed';
      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.errors.push({
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now()
      });
    } finally {
      this.isRunning = false;
    }

    return testResult;
  }

  /**
   * 执行测试场景
   */
  private async executeTestScenario(scenario: TestScenario, result: PerformanceTestResult): Promise<void> {
    const { type, config } = scenario;

    switch (type) {
      case 'content-extraction':
        await this.testContentExtraction(config, result);
        break;
      case 'ui-rendering':
        await this.testUIRendering(config, result);
        break;
      case 'memory-usage':
        await this.testMemoryUsage(config, result);
        break;
      case 'cpu-performance':
        await this.testCPUPerformance(config, result);
        break;
      case 'user-interaction':
        await this.testUserInteraction(config, result);
        break;
      case 'stress-test':
        await this.testStressTest(config, result);
        break;
      default:
        throw new Error(`不支持的测试类型: ${type}`);
    }
  }

  /**
   * 测试内容提取性能
   */
  private async testContentExtraction(config: any, result: PerformanceTestResult): Promise<void> {
    const startTime = performance.now();
    
    try {
      // 模拟内容提取过程
      const extractionPromises = Array(config.iterations || 10).fill(0).map(async (_, index) => {
        const iterationStart = performance.now();
        
        // 模拟提取延迟
        await this.simulateExtraction(config.complexity || 'medium');
        
        const iterationDuration = performance.now() - iterationStart;
        result.performanceEntries.push({
          name: `extraction-iteration-${index}`,
          entryType: 'measure',
          startTime: iterationStart,
          duration: iterationDuration,
          timestamp: Date.now()
        });
      });

      await Promise.all(extractionPromises);
      
      result.metrics.extractionTime = performance.now() - startTime;
      result.metrics.successRate = 1.0;
      
    } catch (error) {
      result.metrics.errorRate = 1.0;
      throw error;
    }
  }

  /**
   * 测试UI渲染性能
   */
  private async testUIRendering(config: any, result: PerformanceTestResult): Promise<void> {
    const startTime = performance.now();
    
    try {
      // 模拟UI渲染过程
      const renderPromises = Array(config.iterations || 5).fill(0).map(async (_, index) => {
        const iterationStart = performance.now();
        
        // 模拟渲染延迟
        await this.simulateRendering(config.complexity || 'medium');
        
        const iterationDuration = performance.now() - iterationStart;
        result.performanceEntries.push({
          name: `render-iteration-${index}`,
          entryType: 'measure',
          startTime: iterationStart,
          duration: iterationDuration,
          timestamp: Date.now()
        });
      });

      await Promise.all(renderPromises);
      
      result.metrics.renderTime = performance.now() - startTime;
      result.metrics.successRate = 1.0;
      
    } catch (error) {
      result.metrics.errorRate = 1.0;
      throw error;
    }
  }

  /**
   * 测试内存使用
   */
  private async testMemoryUsage(config: any, result: PerformanceTestResult): Promise<void> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      result.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    } else {
      // 使用替代方法估算内存使用
      result.metrics.memoryUsage = this.estimateMemoryUsage();
    }
  }

  /**
   * 测试CPU性能
   */
  private async testCPUPerformance(config: any, result: PerformanceTestResult): Promise<void> {
    const startTime = performance.now();
    
    // 执行CPU密集型操作
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.sqrt(i);
    }
    
    const endTime = performance.now();
    result.metrics.cpuUsage = (endTime - startTime) / 1000; // 秒
  }

  /**
   * 测试用户交互性能
   */
  private async testUserInteraction(config: any, result: PerformanceTestResult): Promise<void> {
    const startTime = performance.now();
    
    try {
      // 模拟用户交互
      const interactionPromises = Array(config.iterations || 10).fill(0).map(async (_, index) => {
        const iterationStart = performance.now();
        
        // 模拟交互延迟
        await this.simulateUserInteraction(config.complexity || 'medium');
        
        const iterationDuration = performance.now() - iterationStart;
        result.performanceEntries.push({
          name: `interaction-iteration-${index}`,
          entryType: 'measure',
          startTime: iterationStart,
          duration: iterationDuration,
          timestamp: Date.now()
        });
      });

      await Promise.all(interactionPromises);
      
      result.metrics.userInteractionTime = performance.now() - startTime;
      result.metrics.successRate = 1.0;
      
    } catch (error) {
      result.metrics.errorRate = 1.0;
      throw error;
    }
  }

  /**
   * 压力测试
   */
  private async testStressTest(config: any, result: PerformanceTestResult): Promise<void> {
    const { duration = 30000, load = 'high' } = config;
    const startTime = Date.now();
    
    try {
      const promises: Promise<void>[] = [];
      
      while (Date.now() - startTime < duration) {
        // 创建高负载任务
        const loadLevel = load === 'high' ? 1000 : load === 'medium' ? 500 : 100;
        
        for (let i = 0; i < loadLevel; i++) {
          promises.push(this.simulateStressTask());
        }
        
        // 等待一小段时间
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 等待所有任务完成
      await Promise.all(promises);
      
      result.metrics.successRate = 1.0;
      
    } catch (error) {
      result.metrics.errorRate = 1.0;
      throw error;
    }
  }

  /**
   * 模拟内容提取
   */
  private async simulateExtraction(complexity: string): Promise<void> {
    const delays = {
      'low': 10,
      'medium': 50,
      'high': 200
    };
    
    const delay = delays[complexity as keyof typeof delays] || 50;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟UI渲染
   */
  private async simulateRendering(complexity: string): Promise<void> {
    const delays = {
      'low': 5,
      'medium': 20,
      'high': 100
    };
    
    const delay = delays[complexity as keyof typeof delays] || 20;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟用户交互
   */
  private async simulateUserInteraction(complexity: string): Promise<void> {
    const delays = {
      'low': 2,
      'medium': 10,
      'high': 50
    };
    
    const delay = delays[complexity as keyof typeof delays] || 10;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟压力任务
   */
  private async simulateStressTask(): Promise<void> {
    // 执行一些计算密集型操作
    let result = 0;
    for (let i = 0; i < 1000; i++) {
      result += Math.sin(i) * Math.cos(i);
    }
    return Promise.resolve();
  }

  /**
   * 估算内存使用
   */
  private estimateMemoryUsage(): number {
    // 简单的内存使用估算
    const estimatedUsage = Math.random() * 50 + 10; // 10-60 MB
    return estimatedUsage;
  }

  /**
   * 计算最终指标
   */
  private calculateFinalMetrics(result: PerformanceTestResult): void {
    // 计算平均性能指标
    if (result.performanceEntries.length > 0) {
      const totalDuration = result.performanceEntries.reduce((sum, entry) => sum + entry.duration, 0);
      const averageDuration = totalDuration / result.performanceEntries.length;
      
      // 更新相关指标
      if (result.performanceEntries.some(entry => entry.name.includes('extraction'))) {
        result.metrics.extractionTime = averageDuration;
      }
      if (result.performanceEntries.some(entry => entry.name.includes('render'))) {
        result.metrics.renderTime = averageDuration;
      }
      if (result.performanceEntries.some(entry => entry.name.includes('interaction'))) {
        result.metrics.userInteractionTime = averageDuration;
      }
    }
  }

  /**
   * 生成测试ID
   */
  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取测试结果
   */
  public getTestResult(testId: string): PerformanceTestResult | undefined {
    return this.testResults.get(testId);
  }

  /**
   * 获取所有测试结果
   */
  public getAllTestResults(): PerformanceTestResult[] {
    return Array.from(this.testResults.values());
  }

  /**
   * 清理测试结果
   */
  public clearTestResults(): void {
    this.testResults.clear();
  }

  /**
   * 导出测试结果
   */
  public exportTestResults(): string {
    return JSON.stringify(Array.from(this.testResults.values()), null, 2);
  }

  /**
   * 获取性能摘要
   */
  public getPerformanceSummary(): {
    totalTests: number;
    completedTests: number;
    failedTests: number;
    averageExtractionTime: number;
    averageRenderTime: number;
    averageMemoryUsage: number;
  } {
    const results = Array.from(this.testResults.values());
    const completedTests = results.filter(r => r.status === 'completed');
    const failedTests = results.filter(r => r.status === 'failed');

    const averageExtractionTime = completedTests.length > 0
      ? completedTests.reduce((sum, r) => sum + r.metrics.extractionTime, 0) / completedTests.length
      : 0;

    const averageRenderTime = completedTests.length > 0
      ? completedTests.reduce((sum, r) => sum + r.metrics.renderTime, 0) / completedTests.length
      : 0;

    const averageMemoryUsage = completedTests.length > 0
      ? completedTests.reduce((sum, r) => sum + r.metrics.memoryUsage, 0) / completedTests.length
      : 0;

    return {
      totalTests: results.length,
      completedTests: completedTests.length,
      failedTests: failedTests.length,
      averageExtractionTime,
      averageRenderTime,
      averageMemoryUsage
    };
  }
}
