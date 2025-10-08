/**
 * 性能监控器
 * 监控和报告系统性能指标
 */

import { testSampleManager, TestResult } from './TestSampleManager';
import { enhancedProcessingManager } from '../../src/content/features/performance/EnhancedProcessingManager';

export interface PerformanceMetrics {
  timestamp: number;
  url: string;
  extractionTime: number;
  processingTime: number;
  renderingTime: number;
  totalTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  errorRate: number;
  success: boolean;
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  threshold: number;
  actual: number;
  timestamp: number;
}

export interface PerformanceReport {
  summary: {
    totalTests: number;
    successRate: number;
    averagePerformance: PerformanceMetrics;
    performanceTrend: 'improving' | 'stable' | 'degrading';
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
  detailedMetrics: PerformanceMetrics[];
  comparisonWithBaseline: {
    extractionTime: { baseline: number; actual: number; deviation: number };
    processingTime: { baseline: number; actual: number; deviation: number };
    totalTime: { baseline: number; actual: number; deviation: number };
    memoryUsage: { baseline: number; actual: number; deviation: number };
    cacheHitRate: { baseline: number; actual: number; deviation: number };
  };
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // 性能阈值
  private readonly thresholds = {
    extractionTime: { warning: 500, error: 1000 },
    processingTime: { warning: 300, error: 600 },
    totalTime: { warning: 1000, error: 2000 },
    memoryUsage: { warning: 50, error: 100 },
    cacheHitRate: { warning: 0.5, error: 0.3 },
    errorRate: { warning: 0.05, error: 0.1 }
  };

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 开始监控
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.warn('性能监控已在运行中');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    console.log('📊 性能监控已启动');
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('📊 性能监控已停止');
  }

  /**
   * 收集性能指标
   */
  private collectMetrics(): void {
    try {
      const stats = enhancedProcessingManager.getPerformanceStats();
      const memoryInfo = (performance as any).memory;
      
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        url: window.location.href,
        extractionTime: stats.combinedStats.averageProcessingTime,
        processingTime: stats.combinedStats.averageProcessingTime,
        renderingTime: 0, // 需要从实际渲染中获取
        totalTime: stats.combinedStats.averageProcessingTime,
        memoryUsage: memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0,
        cacheHitRate: stats.combinedStats.cacheHitRate,
        errorRate: 0, // 需要从错误统计中获取
        success: true
      };

      this.metrics.push(metrics);
      
      // 限制指标数量，保留最近1000条
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      // 检查性能阈值
      this.checkThresholds(metrics);

    } catch (error) {
      console.error('收集性能指标失败:', error);
    }
  }

  /**
   * 检查性能阈值
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const checks = [
      {
        name: '内容提取时间',
        value: metrics.extractionTime,
        threshold: this.thresholds.extractionTime,
        type: 'extractionTime' as const
      },
      {
        name: '处理时间',
        value: metrics.processingTime,
        threshold: this.thresholds.processingTime,
        type: 'processingTime' as const
      },
      {
        name: '总时间',
        value: metrics.totalTime,
        threshold: this.thresholds.totalTime,
        type: 'totalTime' as const
      },
      {
        name: '内存使用',
        value: metrics.memoryUsage,
        threshold: this.thresholds.memoryUsage,
        type: 'memoryUsage' as const
      },
      {
        name: '缓存命中率',
        value: metrics.cacheHitRate,
        threshold: this.thresholds.cacheHitRate,
        type: 'cacheHitRate' as const
      }
    ];

    checks.forEach(check => {
      if (check.value > check.threshold.error) {
        this.addAlert('error', `${check.name}严重超标: ${check.value} > ${check.threshold.error}`, check.threshold.error, check.value);
      } else if (check.value > check.threshold.warning) {
        this.addAlert('warning', `${check.name}超标: ${check.value} > ${check.threshold.warning}`, check.threshold.warning, check.value);
      }
    });
  }

  /**
   * 添加性能警报
   */
  private addAlert(type: PerformanceAlert['type'], message: string, threshold: number, actual: number): void {
    const alert: PerformanceAlert = {
      type,
      message,
      threshold,
      actual,
      timestamp: Date.now()
    };

    this.alerts.push(alert);
    
    // 限制警报数量，保留最近100条
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.warn(`🚨 性能警报 [${type.toUpperCase()}]: ${message}`);
  }

  /**
   * 记录测试结果
   */
  public recordTestResult(result: TestResult): void {
    const metrics: PerformanceMetrics = {
      timestamp: result.timestamp,
      url: result.sampleId,
      extractionTime: result.performance.extractionTime,
      processingTime: result.performance.processingTime,
      renderingTime: result.performance.renderingTime,
      totalTime: result.performance.totalTime,
      memoryUsage: result.performance.memoryUsage,
      cacheHitRate: result.performance.cacheHitRate,
      errorRate: result.performance.errorRate,
      success: result.success
    };

    this.metrics.push(metrics);
    this.checkThresholds(metrics);
  }

  /**
   * 生成性能报告
   */
  public generateReport(): PerformanceReport {
    const recentMetrics = this.metrics.slice(-100); // 最近100条指标
    const successfulMetrics = recentMetrics.filter(m => m.success);
    
    if (successfulMetrics.length === 0) {
      return this.getEmptyReport();
    }

    // 计算平均性能
    const averagePerformance: PerformanceMetrics = {
      timestamp: Date.now(),
      url: 'average',
      extractionTime: successfulMetrics.reduce((sum, m) => sum + m.extractionTime, 0) / successfulMetrics.length,
      processingTime: successfulMetrics.reduce((sum, m) => sum + m.processingTime, 0) / successfulMetrics.length,
      renderingTime: successfulMetrics.reduce((sum, m) => sum + m.renderingTime, 0) / successfulMetrics.length,
      totalTime: successfulMetrics.reduce((sum, m) => sum + m.totalTime, 0) / successfulMetrics.length,
      memoryUsage: successfulMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / successfulMetrics.length,
      cacheHitRate: successfulMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / successfulMetrics.length,
      errorRate: recentMetrics.reduce((sum, m) => sum + (m.success ? 0 : 1), 0) / recentMetrics.length,
      success: true
    };

    // 分析性能趋势
    const performanceTrend = this.analyzePerformanceTrend();

    // 与基准对比
    const comparisonWithBaseline = this.compareWithBaseline(averagePerformance);

    // 生成建议
    const recommendations = this.generateRecommendations(averagePerformance, comparisonWithBaseline);

    return {
      summary: {
        totalTests: recentMetrics.length,
        successRate: successfulMetrics.length / recentMetrics.length,
        averagePerformance,
        performanceTrend
      },
      alerts: this.alerts.slice(-20), // 最近20条警报
      recommendations,
      detailedMetrics: recentMetrics,
      comparisonWithBaseline
    };
  }

  /**
   * 分析性能趋势
   */
  private analyzePerformanceTrend(): 'improving' | 'stable' | 'degrading' {
    const recentMetrics = this.metrics.slice(-20);
    if (recentMetrics.length < 10) {
      return 'stable';
    }

    const firstHalf = recentMetrics.slice(0, Math.floor(recentMetrics.length / 2));
    const secondHalf = recentMetrics.slice(Math.floor(recentMetrics.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.totalTime, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.totalTime, 0) / secondHalf.length;

    const change = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

    if (change > 0.1) return 'degrading';
    if (change < -0.1) return 'improving';
    return 'stable';
  }

  /**
   * 与基准对比
   */
  private compareWithBaseline(actual: PerformanceMetrics) {
    const baseline = testSampleManager.getBaseline('medium');
    
    return {
      extractionTime: {
        baseline: baseline.extractionTime,
        actual: actual.extractionTime,
        deviation: (actual.extractionTime - baseline.extractionTime) / baseline.extractionTime
      },
      processingTime: {
        baseline: baseline.processingTime,
        actual: actual.processingTime,
        deviation: (actual.processingTime - baseline.processingTime) / baseline.processingTime
      },
      totalTime: {
        baseline: baseline.totalTime,
        actual: actual.totalTime,
        deviation: (actual.totalTime - baseline.totalTime) / baseline.totalTime
      },
      memoryUsage: {
        baseline: baseline.memoryUsage,
        actual: actual.memoryUsage,
        deviation: (actual.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage
      },
      cacheHitRate: {
        baseline: baseline.cacheHitRate,
        actual: actual.cacheHitRate,
        deviation: (actual.cacheHitRate - baseline.cacheHitRate) / baseline.cacheHitRate
      }
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(performance: PerformanceMetrics, comparison: any): string[] {
    const recommendations: string[] = [];

    if (comparison.extractionTime.deviation > 0.5) {
      recommendations.push('内容提取时间过长，建议优化提取算法或增加缓存策略');
    }

    if (comparison.processingTime.deviation > 0.5) {
      recommendations.push('处理时间过长，建议优化WebWorker任务分配或增加并行处理');
    }

    if (comparison.memoryUsage.deviation > 0.5) {
      recommendations.push('内存使用过多，建议优化内存管理或减少缓存大小');
    }

    if (comparison.cacheHitRate.deviation < -0.3) {
      recommendations.push('缓存命中率过低，建议调整缓存策略或增加缓存大小');
    }

    if (performance.errorRate > 0.05) {
      recommendations.push('错误率较高，建议检查错误处理机制和重试策略');
    }

    if (recommendations.length === 0) {
      recommendations.push('性能表现良好，继续保持当前配置');
    }

    return recommendations;
  }

  /**
   * 获取空报告
   */
  private getEmptyReport(): PerformanceReport {
    return {
      summary: {
        totalTests: 0,
        successRate: 0,
        averagePerformance: {
          timestamp: Date.now(),
          url: '',
          extractionTime: 0,
          processingTime: 0,
          renderingTime: 0,
          totalTime: 0,
          memoryUsage: 0,
          cacheHitRate: 0,
          errorRate: 0,
          success: false
        },
        performanceTrend: 'stable'
      },
      alerts: [],
      recommendations: ['暂无性能数据'],
      detailedMetrics: [],
      comparisonWithBaseline: {
        extractionTime: { baseline: 0, actual: 0, deviation: 0 },
        processingTime: { baseline: 0, actual: 0, deviation: 0 },
        totalTime: { baseline: 0, actual: 0, deviation: 0 },
        memoryUsage: { baseline: 0, actual: 0, deviation: 0 },
        cacheHitRate: { baseline: 0, actual: 0, deviation: 0 }
      }
    };
  }

  /**
   * 获取当前指标
   */
  public getCurrentMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * 获取警报
   */
  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * 清理数据
   */
  public clearData(): void {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * 设置阈值
   */
  public setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds.extractionTime = { ...this.thresholds.extractionTime, ...thresholds.extractionTime };
    this.thresholds.processingTime = { ...this.thresholds.processingTime, ...thresholds.processingTime };
    this.thresholds.totalTime = { ...this.thresholds.totalTime, ...thresholds.totalTime };
    this.thresholds.memoryUsage = { ...this.thresholds.memoryUsage, ...thresholds.memoryUsage };
    this.thresholds.cacheHitRate = { ...this.thresholds.cacheHitRate, ...thresholds.cacheHitRate };
    this.thresholds.errorRate = { ...this.thresholds.errorRate, ...thresholds.errorRate };
  }

  /**
   * 导出数据
   */
  public exportData(): string {
    const data = {
      metrics: this.metrics,
      alerts: this.alerts,
      thresholds: this.thresholds,
      exportTime: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();
