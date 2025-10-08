import { performanceMonitor } from '../../../utils/performance';

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  // 基础性能指标
  timestamp: number;
  pageLoadTime: number;
  extensionLoadTime: number;
  
  // 内存使用指标
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
    percentage: number;
  };
  
  // CPU使用指标
  cpuUsage: {
    current: number;
    average: number;
    peak: number;
  };
  
  // 操作性能指标
  operations: {
    contentExtraction: number;
    uiRendering: number;
    settingsChange: number;
    themeSwitch: number;
  };
  
  // 错误率指标
  errorRate: {
    total: number;
    critical: number;
    recoverable: number;
    percentage: number;
  };
  
  // 响应时间指标
  responseTime: {
    ui: number;
    extraction: number;
    storage: number;
    average: number;
  };
}

/**
 * 性能阈值配置
 */
export interface PerformanceThresholds {
  memory: {
    warning: number; // MB
    critical: number; // MB
  };
  cpu: {
    warning: number; // %
    critical: number; // %
  };
  responseTime: {
    warning: number; // ms
    critical: number; // ms
  };
  errorRate: {
    warning: number; // %
    critical: number; // %
  };
}

/**
 * 性能优化建议
 */
export interface PerformanceRecommendation {
  type: 'memory' | 'cpu' | 'response' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: string;
  impact: string;
}

/**
 * 性能监控管理器
 * 
 * 功能：
 * - 整合各种性能监控功能
 * - 提供统一的性能指标接口
 * - 自动性能优化建议
 * - 性能数据持久化
 * - 实时性能监控
 */
export class PerformanceManager {
  private static instance: PerformanceManager;
  private metrics: PerformanceMetrics[] = [];
  private thresholds: PerformanceThresholds;
  private monitoringInterval: number | null = null;
  private isMonitoring: boolean = false;
  private maxMetricsCount: number = 1000;
  
  // 性能监控回调
  private onMetricsUpdate: ((metrics: PerformanceMetrics) => void) | null = null;
  private onThresholdExceeded: ((threshold: string, value: number) => void) | null = null;
  private onRecommendation: ((recommendation: PerformanceRecommendation) => void) | null = null;

  constructor() {
    this.thresholds = {
      memory: { warning: 30, critical: 50 },
      cpu: { warning: 70, critical: 90 },
      responseTime: { warning: 200, critical: 500 },
      errorRate: { warning: 5, critical: 15 }
    };
    
    this.loadStoredMetrics();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  /**
   * 开始性能监控
   */
  public startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) {
      console.warn('[PerformanceManager] 性能监控已在运行中');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.collectMetrics();
    }, interval);

    // 启动CPU测量
    performanceMonitor.startCPUMeasurement();
    
    console.log('[PerformanceManager] 性能监控已启动');
  }

  /**
   * 停止性能监控
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

    // 停止CPU测量
    performanceMonitor.stopCPUMeasurement();
    
    console.log('[PerformanceManager] 性能监控已停止');
  }

  /**
   * 收集性能指标
   */
  private collectMetrics(): void {
    const metrics = this.generateMetrics();
    this.metrics.push(metrics);
    
    // 限制指标数量
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics = this.metrics.slice(-this.maxMetricsCount);
    }
    
    // 检查阈值
    this.checkThresholds(metrics);
    
    // 生成优化建议
    const recommendations = this.generateRecommendations(metrics);
    recommendations.forEach(rec => {
      if (this.onRecommendation) {
        this.onRecommendation(rec);
      }
    });
    
    // 保存指标
    this.saveMetrics();
    
    // 触发回调
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(metrics);
    }
  }

  /**
   * 生成性能指标
   */
  private generateMetrics(): PerformanceMetrics {
    const timestamp = Date.now();
    const memory = this.getMemoryUsage();
    const cpu = this.getCPUUsage();
    const operations = this.getOperationMetrics();
    const errorRate = this.getErrorRate();
    const responseTime = this.getResponseTime();
    
    return {
      timestamp,
      pageLoadTime: this.getPageLoadTime(),
      extensionLoadTime: this.getExtensionLoadTime(),
      memoryUsage: memory,
      cpuUsage: cpu,
      operations,
      errorRate,
      responseTime
    };
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): PerformanceMetrics['memoryUsage'] {
    const extendedPerf = performance as any;
    if (extendedPerf.memory) {
      const used = extendedPerf.memory.usedJSHeapSize / 1024 / 1024; // MB
      const total = extendedPerf.memory.totalJSHeapSize / 1024 / 1024; // MB
      const limit = extendedPerf.memory.jsHeapSizeLimit / 1024 / 1024; // MB
      const percentage = (used / limit) * 100;
      
      return { used, total, limit, percentage };
    }
    
    return { used: 0, total: 0, limit: 0, percentage: 0 };
  }

  /**
   * 获取CPU使用情况
   */
  private getCPUUsage(): PerformanceMetrics['cpuUsage'] {
    const current = performanceMonitor.getAverageCPUUsage();
    const measurements = this.metrics
      .filter(m => m.timestamp > Date.now() - 60000) // 最近1分钟
      .map(m => m.cpuUsage.current);
    
    const average = measurements.length > 0 
      ? measurements.reduce((a, b) => a + b, 0) / measurements.length 
      : current;
    const peak = Math.max(current, ...measurements);
    
    return { current, average, peak };
  }

  /**
   * 获取操作性能指标
   */
  private getOperationMetrics(): PerformanceMetrics['operations'] {
    const records = performanceMonitor.getRecords();
    
    const getOperationTime = (name: string): number => {
      const record = records.find(r => r.name.includes(name));
      return record ? record.duration : 0;
    };
    
    return {
      contentExtraction: getOperationTime('content-extraction'),
      uiRendering: getOperationTime('ui-rendering'),
      settingsChange: getOperationTime('settings-change'),
      themeSwitch: getOperationTime('theme-switch')
    };
  }

  /**
   * 获取错误率
   */
  private getErrorRate(): PerformanceMetrics['errorRate'] {
    // 这里应该从错误处理系统获取实际错误数据
    // 暂时返回模拟数据
    const total = 0;
    const critical = 0;
    const recoverable = 0;
    const percentage = 0;
    
    return { total, critical, recoverable, percentage };
  }

  /**
   * 获取响应时间
   */
  private getResponseTime(): PerformanceMetrics['responseTime'] {
    const records = performanceMonitor.getRecords();
    
    const getAverageTime = (name: string): number => {
      const relevantRecords = records.filter(r => r.name.includes(name));
      if (relevantRecords.length === 0) return 0;
      
      const total = relevantRecords.reduce((sum, r) => sum + r.duration, 0);
      return total / relevantRecords.length;
    };
    
    const ui = getAverageTime('ui');
    const extraction = getAverageTime('extraction');
    const storage = getAverageTime('storage');
    const average = (ui + extraction + storage) / 3;
    
    return { ui, extraction, storage, average };
  }

  /**
   * 获取页面加载时间
   */
  private getPageLoadTime(): number {
    if (performance.timing) {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    }
    return 0;
  }

  /**
   * 获取扩展加载时间
   */
  private getExtensionLoadTime(): number {
    const record = performanceMonitor.getRecord('extension-load');
    return record ? record.duration : 0;
  }

  /**
   * 检查性能阈值
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    // 检查内存使用
    if (metrics.memoryUsage.percentage > this.thresholds.memory.critical) {
      this.triggerThresholdExceeded('memory', metrics.memoryUsage.percentage);
    } else if (metrics.memoryUsage.percentage > this.thresholds.memory.warning) {
      this.triggerThresholdExceeded('memory', metrics.memoryUsage.percentage);
    }
    
    // 检查CPU使用
    if (metrics.cpuUsage.current > this.thresholds.cpu.critical) {
      this.triggerThresholdExceeded('cpu', metrics.cpuUsage.current);
    } else if (metrics.cpuUsage.current > this.thresholds.cpu.warning) {
      this.triggerThresholdExceeded('cpu', metrics.cpuUsage.current);
    }
    
    // 检查响应时间
    if (metrics.responseTime.average > this.thresholds.responseTime.critical) {
      this.triggerThresholdExceeded('responseTime', metrics.responseTime.average);
    } else if (metrics.responseTime.average > this.thresholds.responseTime.warning) {
      this.triggerThresholdExceeded('responseTime', metrics.responseTime.average);
    }
    
    // 检查错误率
    if (metrics.errorRate.percentage > this.thresholds.errorRate.critical) {
      this.triggerThresholdExceeded('errorRate', metrics.errorRate.percentage);
    } else if (metrics.errorRate.percentage > this.thresholds.errorRate.warning) {
      this.triggerThresholdExceeded('errorRate', metrics.errorRate.percentage);
    }
  }

  /**
   * 触发阈值超出事件
   */
  private triggerThresholdExceeded(threshold: string, value: number): void {
    if (this.onThresholdExceeded) {
      this.onThresholdExceeded(threshold, value);
    }
  }

  /**
   * 生成性能优化建议
   */
  private generateRecommendations(metrics: PerformanceMetrics): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    
    // 内存优化建议
    if (metrics.memoryUsage.percentage > 80) {
      recommendations.push({
        type: 'memory',
        severity: 'critical',
        message: '内存使用率过高',
        action: '建议清理缓存或重启扩展',
        impact: '可能导致页面卡顿或崩溃'
      });
    } else if (metrics.memoryUsage.percentage > 60) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: '内存使用率较高',
        action: '建议关闭不必要的标签页',
        impact: '可能影响页面性能'
      });
    }
    
    // CPU优化建议
    if (metrics.cpuUsage.current > 90) {
      recommendations.push({
        type: 'cpu',
        severity: 'critical',
        message: 'CPU使用率过高',
        action: '建议关闭其他扩展或重启浏览器',
        impact: '可能导致系统卡顿'
      });
    } else if (metrics.cpuUsage.current > 70) {
      recommendations.push({
        type: 'cpu',
        severity: 'medium',
        message: 'CPU使用率较高',
        action: '建议减少同时打开的标签页',
        impact: '可能影响响应速度'
      });
    }
    
    // 响应时间优化建议
    if (metrics.responseTime.average > 500) {
      recommendations.push({
        type: 'response',
        severity: 'high',
        message: '响应时间过长',
        action: '建议检查网络连接或清理浏览器缓存',
        impact: '影响用户体验'
      });
    }
    
    return recommendations;
  }

  /**
   * 设置性能阈值
   */
  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    this.saveThresholds();
  }

  /**
   * 获取性能阈值
   */
  public getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * 获取最新性能指标
   */
  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * 获取历史性能指标
   */
  public getHistoricalMetrics(duration: number = 3600000): PerformanceMetrics[] {
    const cutoff = Date.now() - duration;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * 获取性能统计摘要
   */
  public getPerformanceSummary(): {
    averageMemory: number;
    averageCPU: number;
    averageResponseTime: number;
    totalErrors: number;
    uptime: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageMemory: 0,
        averageCPU: 0,
        averageResponseTime: 0,
        totalErrors: 0,
        uptime: 0
      };
    }
    
    const recentMetrics = this.getHistoricalMetrics(300000); // 最近5分钟
    
    const averageMemory = recentMetrics.reduce((sum, m) => sum + m.memoryUsage.percentage, 0) / recentMetrics.length;
    const averageCPU = recentMetrics.reduce((sum, m) => sum + m.cpuUsage.current, 0) / recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime.average, 0) / recentMetrics.length;
    const totalErrors = recentMetrics.reduce((sum, m) => sum + m.errorRate.total, 0);
    const uptime = this.metrics.length > 0 ? Date.now() - this.metrics[0].timestamp : 0;
    
    return {
      averageMemory,
      averageCPU,
      averageResponseTime,
      totalErrors,
      uptime
    };
  }

  /**
   * 设置指标更新回调
   */
  public setMetricsUpdateCallback(callback: (metrics: PerformanceMetrics) => void): void {
    this.onMetricsUpdate = callback;
  }

  /**
   * 设置阈值超出回调
   */
  public setThresholdExceededCallback(callback: (threshold: string, value: number) => void): void {
    this.onThresholdExceeded = callback;
  }

  /**
   * 设置优化建议回调
   */
  public setRecommendationCallback(callback: (recommendation: PerformanceRecommendation) => void): void {
    this.onRecommendation = callback;
  }

  /**
   * 保存性能指标到本地存储
   */
  private saveMetrics(): void {
    try {
      const data = {
        metrics: this.metrics.slice(-100), // 只保存最近100条
        timestamp: Date.now()
      };
      localStorage.setItem('reading-extension-performance-metrics', JSON.stringify(data));
    } catch (error) {
      console.warn('[PerformanceManager] 无法保存性能指标:', error);
    }
  }

  /**
   * 从本地存储加载性能指标
   */
  private loadStoredMetrics(): void {
    try {
      const stored = localStorage.getItem('reading-extension-performance-metrics');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.metrics && Array.isArray(data.metrics)) {
          this.metrics = data.metrics;
        }
      }
    } catch (error) {
      console.warn('[PerformanceManager] 无法加载性能指标:', error);
    }
  }

  /**
   * 保存阈值配置到本地存储
   */
  private saveThresholds(): void {
    try {
      localStorage.setItem('reading-extension-performance-thresholds', JSON.stringify(this.thresholds));
    } catch (error) {
      console.warn('[PerformanceManager] 无法保存阈值配置:', error);
    }
  }

  /**
   * 从本地存储加载阈值配置
   */
  private loadThresholds(): void {
    try {
      const stored = localStorage.getItem('reading-extension-performance-thresholds');
      if (stored) {
        const thresholds = JSON.parse(stored);
        this.thresholds = { ...this.thresholds, ...thresholds };
      }
    } catch (error) {
      console.warn('[PerformanceManager] 无法加载阈值配置:', error);
    }
  }

  /**
   * 清理性能数据
   */
  public cleanup(): void {
    this.stopMonitoring();
    this.metrics = [];
    this.clearStoredData();
  }

  /**
   * 清理存储的性能数据
   */
  private clearStoredData(): void {
    try {
      localStorage.removeItem('reading-extension-performance-metrics');
      localStorage.removeItem('reading-extension-performance-thresholds');
    } catch (error) {
      console.warn('[PerformanceManager] 无法清理存储数据:', error);
    }
  }

  /**
   * 导出性能报告
   */
  public exportReport(): string {
    const summary = this.getPerformanceSummary();
    const latest = this.getLatestMetrics();
    
    let report = '性能监控报告\n';
    report += '================\n\n';
    
    if (latest) {
      report += `当前状态 (${new Date(latest.timestamp).toLocaleString()}):\n`;
      report += `- 内存使用: ${latest.memoryUsage.percentage.toFixed(1)}%\n`;
      report += `- CPU使用: ${latest.cpuUsage.current.toFixed(1)}%\n`;
      report += `- 响应时间: ${latest.responseTime.average.toFixed(1)}ms\n`;
      report += `- 错误率: ${latest.errorRate.percentage.toFixed(1)}%\n\n`;
    }
    
    report += `性能统计 (最近5分钟):\n`;
    report += `- 平均内存使用: ${summary.averageMemory.toFixed(1)}%\n`;
    report += `- 平均CPU使用: ${summary.averageCPU.toFixed(1)}%\n`;
    report += `- 平均响应时间: ${summary.averageResponseTime.toFixed(1)}ms\n`;
    report += `- 总错误数: ${summary.totalErrors}\n`;
    report += `- 运行时间: ${Math.round(summary.uptime / 1000)}秒\n\n`;
    
    report += `历史记录: ${this.metrics.length} 条\n`;
    report += `监控状态: ${this.isMonitoring ? '运行中' : '已停止'}\n`;
    
    return report;
  }
}

// 导出单例实例
export const performanceManager = PerformanceManager.getInstance();
