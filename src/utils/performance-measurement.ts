/**
 * 性能测量模块
 * 用于评估内容加载重构前后的性能差异
 */

// 设备信息接口
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connectionType?: string;
  connectionSpeed?: string;
  screenResolution: string;
  devicePixelRatio: number;
  colorDepth: number;
}

// 性能指标接口
export interface PerformanceMetrics {
  // 时间指标
  contentExtractionTime: number;  // 内容提取时间
  renderTime: number;             // 渲染时间
  totalProcessingTime: number;    // 总处理时间
  
  // 动态加载指标
  moduleLoadTime?: number;        // 模块加载时间
  initialLoadTime?: number;       // 初始加载时间
  totalLoadTime?: number;         // 总加载时间
  lazyLoadDelay?: number;         // 懒加载延迟
  
  // 资源指标
  memoryUsage?: number;           // 内存使用
  cpuUsage?: number;              // CPU使用
  
  // DOM指标
  domSize?: number;               // DOM节点数量
  domDepth?: number;              // DOM树深度
  
  // 用户体验指标
  firstPaint?: number;            // 首次绘制
  largestContentfulPaint?: number; // 最大内容绘制
  cumulativeLayoutShift?: number;  // 累积布局偏移
  firstInputDelay?: number;        // 首次输入延迟
  
  // 自定义指标
  customMetrics?: Record<string, number>;
}

// 性能报告接口
export interface PerformanceReport {
  timestamp: number;
  url: string;
  title: string;
  deviceInfo: DeviceInfo;
  metrics: PerformanceMetrics;
  version: string;
  notes?: string;
  tags?: string[];
}

// 性能比较接口
export interface PerformanceComparison {
  beforeReport: PerformanceReport;
  afterReport: PerformanceReport;
  differences: {
    [K in keyof PerformanceMetrics]?: {
      before: number;
      after: number;
      difference: number;
      percentChange: number;
    }
  };
  summary: {
    totalImprovement: number;
    significantChanges: Array<{
      metric: string;
      percentChange: number;
      isImprovement: boolean;
    }>;
  };
}

/**
 * 性能测量类
 */
export class PerformanceMeasurement {
  private records: Map<string, number> = new Map();
  private moduleLoadTimes: Map<string, number> = new Map();
  private reports: Map<string, PerformanceReport> = new Map();
  private version: string = '1.0.0';

  /**
   * 获取设备信息
   */
  public getDeviceInfo(): DeviceInfo {
    const connection = (navigator as any).connection;
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      connectionType: connection ? connection.effectiveType : undefined,
      connectionSpeed: connection ? `${connection.downlink}Mbps` : undefined,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth
    };
  }

  /**
   * 开始测量
   * @param name 测量名称
   */
  public start(name: string): void {
    this.records.set(name, performance.now());
  }

  /**
   * 结束测量
   * @param name 测量名称
   * @returns 测量时间（毫秒）
   */
  public end(name: string): number {
    const startTime = this.records.get(name);
    if (startTime === undefined) {
      console.warn(`[性能测量] 未找到起始时间: ${name}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 移除起始时间记录
    this.records.delete(name);
    
    console.debug(`[性能测量] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * 开始测量模块加载
   * @param moduleName 模块名称
   */
  public startModuleLoad(moduleName: string): void {
    this.start(`module_load_${moduleName}`);
  }

  /**
   * 记录模块加载完成
   * @param moduleName 模块名称
   * @returns 加载时间（毫秒）
   */
  public recordModuleLoad(moduleName: string): number {
    const loadTime = this.end(`module_load_${moduleName}`);
    this.moduleLoadTimes.set(moduleName, loadTime);
    return loadTime;
  }

  /**
   * 测量DOM大小
   * @returns DOM指标对象
   */
  public measureDOMSize(): { domSize: number, domDepth: number } {
    // 计算DOM节点总数
    const domSize = document.querySelectorAll('*').length;
    
    // 计算DOM树最大深度
    let maxDepth = 0;
    
    function calculateDepth(element: Element, depth: number): void {
      if (depth > maxDepth) {
        maxDepth = depth;
      }
      
      for (let i = 0; i < element.children.length; i++) {
        calculateDepth(element.children[i], depth + 1);
      }
    }
    
    calculateDepth(document.documentElement, 0);
    
    return { domSize, domDepth: maxDepth };
  }

  /**
   * 生成性能报告
   * @param metrics 性能指标
   * @param notes 备注信息
   * @param tags 标签
   * @returns 性能报告
   */
  public generateReport(
    metrics: Partial<PerformanceMetrics>, 
    notes?: string,
    tags?: string[]
  ): PerformanceReport {
    // 获取DOM指标
    const domMetrics = this.measureDOMSize();
    
    // 合并指标
    const fullMetrics: PerformanceMetrics = {
      contentExtractionTime: metrics.contentExtractionTime || 0,
      renderTime: metrics.renderTime || 0,
      totalProcessingTime: metrics.totalProcessingTime || 0,
      moduleLoadTime: metrics.moduleLoadTime,
      initialLoadTime: metrics.initialLoadTime,
      totalLoadTime: metrics.totalLoadTime,
      lazyLoadDelay: metrics.lazyLoadDelay,
      memoryUsage: metrics.memoryUsage,
      cpuUsage: metrics.cpuUsage,
      domSize: metrics.domSize || domMetrics.domSize,
      domDepth: metrics.domDepth || domMetrics.domDepth,
      firstPaint: metrics.firstPaint,
      largestContentfulPaint: metrics.largestContentfulPaint,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift,
      firstInputDelay: metrics.firstInputDelay,
      customMetrics: metrics.customMetrics
    };
    
    // 创建报告
    const report: PerformanceReport = {
      timestamp: Date.now(),
      url: window.location.href,
      title: document.title,
      deviceInfo: this.getDeviceInfo(),
      metrics: fullMetrics,
      version: this.version,
      notes,
      tags
    };
    
    // 存储报告
    const reportId = `report_${report.timestamp}`;
    this.reports.set(reportId, report);
    
    return report;
  }

  /**
   * 比较两个性能报告
   * @param beforeReport 重构前报告
   * @param afterReport 重构后报告
   * @returns 性能比较结果
   */
  public compareReports(
    beforeReport: PerformanceReport, 
    afterReport: PerformanceReport
  ): PerformanceComparison {
    const differences: any = {};
    const significantChanges: Array<{
      metric: string;
      percentChange: number;
      isImprovement: boolean;
    }> = [];
    
    // 计算每个指标的差异
    for (const key in beforeReport.metrics) {
      const metricKey = key as keyof PerformanceMetrics;
      const beforeValue = beforeReport.metrics[metricKey];
      const afterValue = afterReport.metrics[metricKey];
      
      // 跳过未定义的指标
      if (beforeValue === undefined || afterValue === undefined) {
        continue;
      }
      
      // 计算数值指标的差异
      if (typeof beforeValue === 'number' && typeof afterValue === 'number') {
        const difference = afterValue - beforeValue;
        const percentChange = beforeValue !== 0 
          ? (difference / beforeValue) * 100 
          : 0;
        
        differences[metricKey] = {
          before: beforeValue,
          after: afterValue,
          difference,
          percentChange
        };
        
        // 记录显著变化（超过5%）
        if (Math.abs(percentChange) >= 5) {
          // 对于时间和资源指标，减少是改进；对于其他指标，增加可能是改进
          const isTimeOrResourceMetric = [
            'contentExtractionTime', 'renderTime', 'totalProcessingTime',
            'moduleLoadTime', 'initialLoadTime', 'totalLoadTime', 'lazyLoadDelay',
            'memoryUsage', 'cpuUsage', 'cumulativeLayoutShift', 'firstInputDelay'
          ].includes(metricKey);
          
          const isImprovement = isTimeOrResourceMetric 
            ? percentChange < 0 
            : percentChange > 0;
          
          significantChanges.push({
            metric: metricKey,
            percentChange,
            isImprovement
          });
        }
      }
    }
    
    // 计算总体改进
    const timeMetrics = ['contentExtractionTime', 'renderTime', 'totalProcessingTime', 'initialLoadTime', 'totalLoadTime'];
    let totalBefore = 0;
    let totalAfter = 0;
    
    timeMetrics.forEach(metric => {
      const diff = differences[metric];
      if (diff) {
        totalBefore += diff.before;
        totalAfter += diff.after;
      }
    });
    
    const totalImprovement = totalBefore !== 0 
      ? ((totalBefore - totalAfter) / totalBefore) * 100 
      : 0;
    
    // 按百分比变化排序
    significantChanges.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
    
    return {
      beforeReport,
      afterReport,
      differences,
      summary: {
        totalImprovement,
        significantChanges
      }
    };
  }

  /**
   * 将性能报告导出为JSON
   * @param report 性能报告
   * @returns JSON字符串
   */
  public exportReportToJSON(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * 将性能比较导出为文本
   * @param comparison 性能比较
   * @returns 格式化文本
   */
  public exportComparisonToText(comparison: PerformanceComparison): string {
    const { beforeReport, afterReport, differences, summary } = comparison;
    
    let text = '性能比较报告\n';
    text += '=================\n\n';
    
    text += `重构前URL: ${beforeReport.url}\n`;
    text += `重构后URL: ${afterReport.url}\n`;
    text += `比较时间: ${new Date().toLocaleString()}\n\n`;
    
    text += `总体性能改进: ${summary.totalImprovement.toFixed(2)}%\n\n`;
    
    text += '显著变化:\n';
    summary.significantChanges.forEach(change => {
      const changeDirection = change.isImprovement ? '改进' : '退化';
      text += `- ${change.metric}: ${Math.abs(change.percentChange).toFixed(2)}% ${changeDirection}\n`;
    });
    
    text += '\n详细指标比较:\n';
    for (const key in differences) {
      const diff = differences[key];
      text += `- ${key}:\n`;
      text += `  重构前: ${this.formatValue(key, diff.before)}\n`;
      text += `  重构后: ${this.formatValue(key, diff.after)}\n`;
      text += `  差异: ${this.formatDifference(key, diff.difference)}\n`;
      text += `  百分比变化: ${diff.percentChange.toFixed(2)}%\n\n`;
    }
    
    return text;
  }

  /**
   * 格式化指标值
   * @param key 指标名称
   * @param value 指标值
   * @returns 格式化的值
   */
  private formatValue(key: string, value: number): string {
    if (key.includes('Time') || key.includes('Delay') || key.includes('Paint')) {
      return `${value.toFixed(2)}ms`;
    } else if (key === 'memoryUsage') {
      return this.formatBytes(value);
    } else {
      return value.toString();
    }
  }

  /**
   * 格式化指标差异
   * @param key 指标名称
   * @param difference 差异值
   * @returns 格式化的差异
   */
  private formatDifference(key: string, difference: number): string {
    const sign = difference > 0 ? '+' : '';
    
    if (key.includes('Time') || key.includes('Delay') || key.includes('Paint')) {
      return `${sign}${difference.toFixed(2)}ms`;
    } else if (key === 'memoryUsage') {
      return `${sign}${this.formatBytes(difference)}`;
    } else {
      return `${sign}${difference}`;
    }
  }

  /**
   * 格式化字节数为可读格式
   * @param bytes 字节数
   * @returns 格式化的字符串
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 保存性能报告到本地存储
   * @param key 存储键
   * @param report 性能报告
   */
  public async saveReport(key: string, report: PerformanceReport): Promise<void> {
    try {
      const reportJson = this.exportReportToJSON(report);
      localStorage.setItem(`perf_report_${key}`, reportJson);
    } catch (error) {
      console.error('保存性能报告失败:', error);
    }
  }

  /**
   * 从本地存储加载性能报告
   * @param key 存储键
   * @returns 性能报告或undefined
   */
  public loadReport(key: string): PerformanceReport | undefined {
    try {
      const reportJson = localStorage.getItem(`perf_report_${key}`);
      if (reportJson) {
        return JSON.parse(reportJson) as PerformanceReport;
      }
      return undefined;
    } catch (error) {
      console.error('加载性能报告失败:', error);
      return undefined;
    }
  }

  /**
   * 获取所有已保存的报告键
   * @returns 报告键数组
   */
  public getSavedReportKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('perf_report_')) {
        keys.push(key.replace('perf_report_', ''));
      }
    }
    return keys;
  }
}

// 导出单例实例
export const performanceMeasurement = new PerformanceMeasurement(); 