/**
 * 性能测量模块
 * 用于测量重构前后的性能差异
 */

import { performanceMonitor, PerformanceRecord } from '../../utils/performance';
import { logger } from '../../utils/logManager';

// 性能指标类型
export interface PerformanceMetrics {
  // 页面加载指标
  navigationStart?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  domContentLoaded?: number;
  loadComplete?: number;
  
  // 内容脚本指标
  scriptInjectionTime?: number;
  readingModeActivationTime?: number;
  contentExtractionTime?: number;
  renderingTime?: number;
  
  // 动态加载指标
  moduleLoadTime?: Record<string, number>;
  initialLoadTime?: number;
  totalLoadTime?: number;
  lazyLoadDelay?: number;
  
  // 资源使用指标
  memoryUsage?: number;
  cpuUsage?: number;
  domSize?: number;
  
  // 自定义操作指标
  customOperations?: Record<string, number>;
}

// 性能报告类型
export interface PerformanceReport {
  url: string;
  timestamp: number;
  metrics: PerformanceMetrics;
  records: PerformanceRecord[];
  environment: {
    userAgent: string;
    screenSize: string;
    devicePixelRatio: number;
    connectionType?: string;
    isLowEndDevice?: boolean;
    isLowMemory?: boolean;
  };
  version: string; // 重构前后的版本标识
  description?: string; // 报告描述
}

/**
 * 性能测量类
 * 用于测量和记录各种性能指标
 */
class PerformanceMeasurement {
  private isEnabled = true;
  private reports: PerformanceReport[] = [];
  private currentReport: PerformanceReport | null = null;
  private lcpObserver: PerformanceObserver | null = null;
  private fcpObserver: PerformanceObserver | null = null;
  private moduleLoadTimers: Map<string, number> = new Map();
  
  constructor() {
    this.setupObservers();
  }
  
  /**
   * 设置性能观察器
   */
  private setupObservers(): void {
    // 观察最大内容绘制
    try {
      this.lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (this.currentReport && lastEntry) {
          this.currentReport.metrics.largestContentfulPaint = lastEntry.startTime;
        }
      });
      this.lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP观察器不可用:', e);
    }
    
    // 观察首次内容绘制
    try {
      this.fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstEntry = entries[0];
        if (this.currentReport && firstEntry) {
          this.currentReport.metrics.firstContentfulPaint = firstEntry.startTime;
        }
      });
      this.fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {
      console.warn('FCP观察器不可用:', e);
    }
  }
  
  /**
   * 开始性能测量
   * @param version 版本标识，用于区分重构前后
   * @param description 报告描述
   */
  public startMeasurement(version: string = 'unknown', description?: string): void {
    if (!this.isEnabled) return;
    
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    this.currentReport = {
      url: window.location.href,
      timestamp: Date.now(),
      metrics: {
        navigationStart: navigationEntry ? navigationEntry.startTime : performance.timeOrigin,
        domContentLoaded: navigationEntry ? navigationEntry.domContentLoadedEventStart : undefined,
        loadComplete: navigationEntry ? navigationEntry.loadEventStart : undefined,
        moduleLoadTime: {},
        customOperations: {}
      },
      records: [],
      environment: {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        devicePixelRatio: window.devicePixelRatio,
        connectionType: (navigator as any).connection ? (navigator as any).connection.effectiveType : undefined,
        isLowEndDevice: (navigator as any).hardwareConcurrency ? (navigator as any).hardwareConcurrency <= 4 : undefined,
        isLowMemory: (navigator as any).deviceMemory ? (navigator as any).deviceMemory <= 4 : undefined
      },
      version,
      description
    };
    
    // 开始测量初始加载时间
    performanceMonitor.start('initial-load');
    
    // 开始测量内容脚本注入时间
    performanceMonitor.start('script-injection');
    
    // 测量DOM大小
    this.measureDOMSize();
  }
  
  /**
   * 记录内容脚本注入完成
   */
  public recordScriptInjection(): void {
    if (!this.isEnabled || !this.currentReport) return;
    
    const record = performanceMonitor.end('script-injection');
    if (record) {
      this.currentReport.metrics.scriptInjectionTime = record.duration;
    }
    
    // 记录初始加载时间
    const initialLoadRecord = performanceMonitor.end('initial-load');
    if (initialLoadRecord) {
      this.currentReport.metrics.initialLoadTime = initialLoadRecord.duration;
    }
  }
  
  /**
   * 开始测量阅读模式激活时间
   */
  public startReadingModeActivation(): void {
    if (!this.isEnabled) return;
    performanceMonitor.start('reading-mode-activation');
    
    // 开始测量总加载时间
    performanceMonitor.start('total-load');
  }
  
  /**
   * 记录阅读模式激活完成
   */
  public recordReadingModeActivation(): void {
    if (!this.isEnabled || !this.currentReport) return;
    
    const record = performanceMonitor.end('reading-mode-activation');
    if (record) {
      this.currentReport.metrics.readingModeActivationTime = record.duration;
    }
    
    // 记录总加载时间
    const totalLoadRecord = performanceMonitor.end('total-load');
    if (totalLoadRecord) {
      this.currentReport.metrics.totalLoadTime = totalLoadRecord.duration;
    }
    
    // 计算懒加载延迟
    if (this.currentReport.metrics.initialLoadTime !== undefined && 
        this.currentReport.metrics.totalLoadTime !== undefined) {
      this.currentReport.metrics.lazyLoadDelay = 
        this.currentReport.metrics.totalLoadTime - this.currentReport.metrics.initialLoadTime;
    }
  }
  
  /**
   * 开始测量内容提取时间
   */
  public startContentExtraction(): void {
    if (!this.isEnabled) return;
    performanceMonitor.start('content-extraction');
  }
  
  /**
   * 记录内容提取完成
   */
  public recordContentExtraction(): void {
    if (!this.isEnabled || !this.currentReport) return;
    
    const record = performanceMonitor.end('content-extraction');
    if (record) {
      this.currentReport.metrics.contentExtractionTime = record.duration;
    }
  }
  
  /**
   * 开始测量渲染时间
   */
  public startRendering(): void {
    if (!this.isEnabled) return;
    performanceMonitor.start('rendering');
  }
  
  /**
   * 记录渲染完成
   */
  public recordRendering(): void {
    if (!this.isEnabled || !this.currentReport) return;
    
    const record = performanceMonitor.end('rendering');
    if (record) {
      this.currentReport.metrics.renderingTime = record.duration;
    }
  }
  
  /**
   * 开始测量模块加载时间
   * @param moduleName 模块名称
   */
  public startModuleLoad(moduleName: string): void {
    if (!this.isEnabled) return;
    this.moduleLoadTimers.set(moduleName, performance.now());
    performanceMonitor.start(`module-load-${moduleName}`);
  }
  
  /**
   * 记录模块加载完成
   * @param moduleName 模块名称
   */
  public recordModuleLoad(moduleName: string): void {
    if (!this.isEnabled || !this.currentReport) return;
    
    const record = performanceMonitor.end(`module-load-${moduleName}`);
    if (record && this.currentReport.metrics.moduleLoadTime) {
      this.currentReport.metrics.moduleLoadTime[moduleName] = record.duration;
    }
  }
  
  /**
   * 记录自定义操作
   * @param name 操作名称
   * @param operation 要测量的操作
   */
  public async measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return operation();
    
    return performanceMonitor.measure(name, async () => {
      const result = await operation();
      
      // 记录到当前报告
      if (this.currentReport && this.currentReport.metrics.customOperations) {
        const record = performanceMonitor.getRecord(name);
        if (record) {
          this.currentReport.metrics.customOperations![name] = record.duration;
        }
      }
      
      return result;
    });
  }
  
  /**
   * 记录内存使用情况
   */
  public recordMemoryUsage(): void {
    if (!this.isEnabled || !this.currentReport) return;
    
    const performance = window.performance as any;
    if (performance && performance.memory) {
      this.currentReport.metrics.memoryUsage = performance.memory.usedJSHeapSize;
    }
  }
  
  /**
   * 测量DOM大小
   */
  private measureDOMSize(): void {
    if (!this.isEnabled || !this.currentReport) return;
    
    // 计算DOM元素数量
    const domSize = document.querySelectorAll('*').length;
    this.currentReport.metrics.domSize = domSize;
  }
  
  /**
   * 完成性能测量并生成报告
   */
  public finishMeasurement(): PerformanceReport | null {
    if (!this.isEnabled || !this.currentReport) return null;
    
    // 记录最终的内存使用
    this.recordMemoryUsage();
    
    // 收集所有性能记录
    this.currentReport.records = performanceMonitor.getRecords();
    
    // 保存报告
    const report = { ...this.currentReport };
    this.reports.push(report);
    
    // 记录到日志
    console.log('性能测量报告:', report);
    logger.logInfo('性能测量完成', { report });
    
    // 重置当前报告
    this.currentReport = null;
    performanceMonitor.clearRecords();
    
    return report;
  }
  
  /**
   * 获取所有性能报告
   */
  public getReports(): PerformanceReport[] {
    return this.reports;
  }
  
  /**
   * 清除所有性能报告
   */
  public clearReports(): void {
    this.reports = [];
  }
  
  /**
   * 启用或禁用性能测量
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    performanceMonitor.setEnabled(enabled);
  }
  
  /**
   * 生成性能比较报告
   * @param beforeReport 重构前的报告
   * @param afterReport 重构后的报告
   */
  public generateComparisonReport(beforeReport: PerformanceReport, afterReport: PerformanceReport): string {
    let report = '性能比较报告\n';
    report += '=================\n\n';
    
    report += `重构前版本: ${beforeReport.version}\n`;
    report += `重构后版本: ${afterReport.version}\n\n`;
    
    if (beforeReport.description || afterReport.description) {
      report += '描述:\n';
      if (beforeReport.description) report += `重构前: ${beforeReport.description}\n`;
      if (afterReport.description) report += `重构后: ${afterReport.description}\n`;
      report += '\n';
    }
    
    // 页面加载指标比较
    report += '页面加载指标:\n';
    report += this.compareMetric('首次内容绘制 (FCP)', beforeReport.metrics.firstContentfulPaint, afterReport.metrics.firstContentfulPaint, 'ms', true);
    report += this.compareMetric('最大内容绘制 (LCP)', beforeReport.metrics.largestContentfulPaint, afterReport.metrics.largestContentfulPaint, 'ms', true);
    report += this.compareMetric('DOM内容加载', beforeReport.metrics.domContentLoaded, afterReport.metrics.domContentLoaded, 'ms', true);
    report += this.compareMetric('页面加载完成', beforeReport.metrics.loadComplete, afterReport.metrics.loadComplete, 'ms', true);
    
    // 内容脚本指标比较
    report += '\n内容脚本指标:\n';
    report += this.compareMetric('脚本注入时间', beforeReport.metrics.scriptInjectionTime, afterReport.metrics.scriptInjectionTime, 'ms', true);
    report += this.compareMetric('阅读模式激活时间', beforeReport.metrics.readingModeActivationTime, afterReport.metrics.readingModeActivationTime, 'ms', true);
    report += this.compareMetric('内容提取时间', beforeReport.metrics.contentExtractionTime, afterReport.metrics.contentExtractionTime, 'ms', true);
    report += this.compareMetric('渲染时间', beforeReport.metrics.renderingTime, afterReport.metrics.renderingTime, 'ms', true);
    
    // 动态加载指标比较
    report += '\n动态加载指标:\n';
    report += this.compareMetric('初始加载时间', beforeReport.metrics.initialLoadTime, afterReport.metrics.initialLoadTime, 'ms', true);
    report += this.compareMetric('总加载时间', beforeReport.metrics.totalLoadTime, afterReport.metrics.totalLoadTime, 'ms', true);
    report += this.compareMetric('懒加载延迟', beforeReport.metrics.lazyLoadDelay, afterReport.metrics.lazyLoadDelay, 'ms', true);
    
    // 模块加载时间比较
    const allModules = new Set<string>();
    if (beforeReport.metrics.moduleLoadTime) {
      Object.keys(beforeReport.metrics.moduleLoadTime).forEach(key => allModules.add(key));
    }
    if (afterReport.metrics.moduleLoadTime) {
      Object.keys(afterReport.metrics.moduleLoadTime).forEach(key => allModules.add(key));
    }
    
    if (allModules.size > 0) {
      report += '\n模块加载时间:\n';
      allModules.forEach(module => {
        const beforeTime = beforeReport.metrics.moduleLoadTime?.[module];
        const afterTime = afterReport.metrics.moduleLoadTime?.[module];
        report += this.compareMetric(`模块 ${module}`, beforeTime, afterTime, 'ms', true);
      });
    }
    
    // 资源使用指标比较
    report += '\n资源使用指标:\n';
    report += this.compareMetric('内存使用', beforeReport.metrics.memoryUsage, afterReport.metrics.memoryUsage, 'bytes', true);
    report += this.compareMetric('DOM大小', beforeReport.metrics.domSize, afterReport.metrics.domSize, '元素', true);
    
    // 自定义操作指标比较
    if (beforeReport.metrics.customOperations || afterReport.metrics.customOperations) {
      report += '\n自定义操作指标:\n';
      
      const allOperations = new Set<string>();
      if (beforeReport.metrics.customOperations) {
        Object.keys(beforeReport.metrics.customOperations).forEach(key => allOperations.add(key));
      }
      if (afterReport.metrics.customOperations) {
        Object.keys(afterReport.metrics.customOperations).forEach(key => allOperations.add(key));
      }
      
      allOperations.forEach(operation => {
        const beforeValue = beforeReport.metrics.customOperations?.[operation];
        const afterValue = afterReport.metrics.customOperations?.[operation];
        report += this.compareMetric(operation, beforeValue, afterValue, 'ms', true);
      });
    }
    
    // 总结
    report += '\n总体性能改进:\n';
    const improvements = [];
    const regressions = [];
    
    // 检查关键指标
    const keyMetrics = [
      { name: '脚本注入时间', before: beforeReport.metrics.scriptInjectionTime, after: afterReport.metrics.scriptInjectionTime },
      { name: '阅读模式激活时间', before: beforeReport.metrics.readingModeActivationTime, after: afterReport.metrics.readingModeActivationTime },
      { name: '内容提取时间', before: beforeReport.metrics.contentExtractionTime, after: afterReport.metrics.contentExtractionTime },
      { name: '渲染时间', before: beforeReport.metrics.renderingTime, after: afterReport.metrics.renderingTime },
      { name: '初始加载时间', before: beforeReport.metrics.initialLoadTime, after: afterReport.metrics.initialLoadTime },
      { name: '总加载时间', before: beforeReport.metrics.totalLoadTime, after: afterReport.metrics.totalLoadTime },
      { name: '内存使用', before: beforeReport.metrics.memoryUsage, after: afterReport.metrics.memoryUsage }
    ];
    
    keyMetrics.forEach(metric => {
      if (metric.before !== undefined && metric.after !== undefined) {
        const diff = metric.before - metric.after;
        const percentChange = (diff / metric.before) * 100;
        
        if (diff > 0) {
          improvements.push(`${metric.name}: 改进了 ${percentChange.toFixed(2)}%`);
        } else if (diff < 0) {
          regressions.push(`${metric.name}: 退化了 ${Math.abs(percentChange).toFixed(2)}%`);
        }
      }
    });
    
    if (improvements.length > 0) {
      report += '改进:\n';
      improvements.forEach(item => report += `- ${item}\n`);
    }
    
    if (regressions.length > 0) {
      report += '退化:\n';
      regressions.forEach(item => report += `- ${item}\n`);
    }
    
    // 总体结论
    report += '\n总体结论:\n';
    const totalImprovements = improvements.length;
    const totalRegressions = regressions.length;
    
    if (totalImprovements > totalRegressions) {
      report += `重构后性能总体改进。${totalImprovements}项指标有所改进，${totalRegressions}项指标有所退化。\n`;
    } else if (totalRegressions > totalImprovements) {
      report += `重构后性能总体退化。${totalImprovements}项指标有所改进，${totalRegressions}项指标有所退化。\n`;
    } else {
      report += `重构前后性能变化不明显。${totalImprovements}项指标有所改进，${totalRegressions}项指标有所退化。\n`;
    }
    
    return report;
  }
  
  /**
   * 比较两个指标并格式化输出
   */
  private compareMetric(name: string, before?: number, after?: number, unit: string = '', lowerIsBetter: boolean = true): string {
    if (before === undefined || after === undefined) {
      return `${name}: 数据不完整\n`;
    }
    
    const diff = before - after;
    const percentChange = (diff / before) * 100;
    const isImprovement = lowerIsBetter ? diff > 0 : diff < 0;
    const changeSymbol = isImprovement ? '↓' : '↑';
    const changeDescription = isImprovement ? '改进' : '退化';
    
    return `${name}: ${before.toFixed(2)}${unit} → ${after.toFixed(2)}${unit} (${changeSymbol} ${Math.abs(diff).toFixed(2)}${unit}, ${changeDescription} ${Math.abs(percentChange).toFixed(2)}%)\n`;
  }
  
  /**
   * 导出性能报告为JSON文件
   * @param report 性能报告
   * @param filename 文件名
   */
  public exportReportToJSON(report: PerformanceReport, filename: string = 'performance-report.json'): void {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  /**
   * 导出比较报告为文本文件
   * @param comparisonReport 比较报告文本
   * @param filename 文件名
   */
  public exportComparisonToText(comparisonReport: string, filename: string = 'performance-comparison.txt'): void {
    const blob = new Blob([comparisonReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 导出单例实例
export const performanceMeasurement = new PerformanceMeasurement(); 