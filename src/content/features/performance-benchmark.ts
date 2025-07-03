/**
 * 性能基准测量框架
 * 用于评估重构前后的性能影响，特别是动态加载机制对性能的影响
 */

import { performanceMonitor, PerformanceRecord } from '../../utils/performance';

// 定义测量点
export enum BenchmarkPoint {
  // 脚本初始化阶段
  SCRIPT_INJECTION = 'script_injection',
  INITIAL_LOAD = 'initial_load',
  
  // 阅读模式激活阶段
  READER_MODE_ACTIVATION = 'reader_mode_activation',
  STYLES_LOAD = 'styles_load',
  
  // 内容处理阶段
  CONTENT_EXTRACTION = 'content_extraction',
  CONTENT_PROCESSING = 'content_processing',
  CODE_HIGHLIGHTING = 'code_highlighting',
  
  // 渲染阶段
  DOM_RENDERING = 'dom_rendering',
  STYLES_APPLICATION = 'styles_application',
  
  // 交互阶段
  FIRST_INTERACTION = 'first_interaction',
  READER_MODE_DEACTIVATION = 'reader_mode_deactivation'
}

// 定义模块类型
export enum ModuleType {
  CORE = 'core',
  READER_MODE = 'reader_mode',
  CONTENT_EXTRACTION = 'content_extraction',
  CODE_HIGHLIGHTING = 'code_highlighting',
  MARKDOWN = 'markdown',
  HIGHLIGHT = 'highlight'
}

// 定义性能报告接口
export interface PerformanceBenchmarkReport {
  timestamp: number;
  version: string;
  url: string;
  userAgent: string;
  deviceInfo: DeviceInfo;
  metrics: {
    initialLoadTime: number;
    totalLoadTime: number;
    moduleLoadTimes: Record<string, number>;
    contentExtractionTime: number;
    renderingTime: number;
    memoryUsage: number;
    domSize: number;
    lazyLoadDelay: number;
  };
  records: PerformanceRecord[];
}

// 设备信息接口
interface DeviceInfo {
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

/**
 * 性能基准测量类
 * 用于测量和记录重构前后的性能影响
 */
export class PerformanceBenchmark {
  private version: string = '1.7.0';
  private moduleLoadTimes: Map<string, number> = new Map();
  private benchmarkStartTime: number = 0;
  private memoryBaseline: number = 0;
  private lazyLoadDelays: number[] = [];
  private isEnabled: boolean = true;
  
  constructor() {
    this.initialize();
  }
  
  /**
   * 初始化性能监控
   */
  private initialize(): void {
    this.benchmarkStartTime = performance.now();
    this.captureMemoryBaseline();
    console.log('[性能基准] 初始化性能基准测量');
  }
  
  /**
   * 启用或禁用性能基准测量
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    performanceMonitor.setEnabled(enabled);
  }
  
  /**
   * 捕获内存基线
   */
  private captureMemoryBaseline(): void {
    const extendedPerf = performance as any;
    if (extendedPerf.memory) {
      this.memoryBaseline = extendedPerf.memory.usedJSHeapSize;
    }
  }
  
  /**
   * 获取当前内存使用情况
   */
  private getCurrentMemoryUsage(): number {
    const extendedPerf = performance as any;
    if (extendedPerf.memory) {
      return extendedPerf.memory.usedJSHeapSize - this.memoryBaseline;
    }
    return 0;
  }
  
  /**
   * 获取设备信息
   */
  private getDeviceInfo(): DeviceInfo {
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
   * 标记性能测量点的开始
   */
  public markStart(point: BenchmarkPoint): void {
    if (!this.isEnabled) return;
    performanceMonitor.start(point);
  }
  
  /**
   * 标记性能测量点的结束
   */
  public markEnd(point: BenchmarkPoint): PerformanceRecord | undefined {
    if (!this.isEnabled) return undefined;
    return performanceMonitor.end(point);
  }
  
  /**
   * 记录模块加载时间
   */
  public recordModuleLoad(moduleType: ModuleType, loadTime: number): void {
    if (!this.isEnabled) return;
    this.moduleLoadTimes.set(moduleType, loadTime);
    console.log(`[性能基准] 模块加载: ${moduleType} - ${loadTime.toFixed(2)}ms`);
  }
  
  /**
   * 开始测量模块加载
   */
  public startModuleLoad(moduleType: ModuleType): void {
    if (!this.isEnabled) return;
    performanceMonitor.start(`module_${moduleType}`);
  }
  
  /**
   * 结束测量模块加载
   */
  public endModuleLoad(moduleType: ModuleType): void {
    if (!this.isEnabled) return;
    const record = performanceMonitor.end(`module_${moduleType}`);
    if (record) {
      this.moduleLoadTimes.set(moduleType, record.duration);
      console.log(`[性能基准] 模块加载完成: ${moduleType} - ${record.duration.toFixed(2)}ms`);
    }
  }
  
  /**
   * 记录懒加载延迟
   */
  public recordLazyLoadDelay(delay: number): void {
    if (!this.isEnabled) return;
    this.lazyLoadDelays.push(delay);
    console.log(`[性能基准] 懒加载延迟: ${delay.toFixed(2)}ms`);
  }
  
  /**
   * 测量异步操作性能
   */
  public async measure<T>(point: BenchmarkPoint, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return fn();
    return performanceMonitor.measure(point, fn);
  }
  
  /**
   * 测量同步操作性能
   */
  public measureSync<T>(point: BenchmarkPoint, fn: () => T): T {
    if (!this.isEnabled) return fn();
    return performanceMonitor.measureSync(point, fn);
  }
  
  /**
   * 测量DOM大小
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
   * 生成性能基准报告
   */
  public generateReport(): PerformanceBenchmarkReport {
    const records = performanceMonitor.getRecords();
    const { domSize } = this.measureDOMSize();
    
    // 计算关键指标
    const initialLoadRecord = records.find(r => r.name === BenchmarkPoint.INITIAL_LOAD);
    const contentExtractionRecord = records.find(r => r.name === BenchmarkPoint.CONTENT_EXTRACTION);
    const renderingRecord = records.find(r => r.name === BenchmarkPoint.DOM_RENDERING);
    
    // 计算总加载时间
    const totalLoadTime = performance.now() - this.benchmarkStartTime;
    
    // 计算平均懒加载延迟
    const avgLazyLoadDelay = this.lazyLoadDelays.length > 0 
      ? this.lazyLoadDelays.reduce((sum, delay) => sum + delay, 0) / this.lazyLoadDelays.length
      : 0;
    
    // 将模块加载时间转换为普通对象
    const moduleLoadTimes: Record<string, number> = {};
    this.moduleLoadTimes.forEach((time, module) => {
      moduleLoadTimes[module] = time;
    });
    
    return {
      timestamp: Date.now(),
      version: this.version,
      url: window.location.href,
      userAgent: navigator.userAgent,
      deviceInfo: this.getDeviceInfo(),
      metrics: {
        initialLoadTime: initialLoadRecord?.duration || 0,
        totalLoadTime,
        moduleLoadTimes,
        contentExtractionTime: contentExtractionRecord?.duration || 0,
        renderingTime: renderingRecord?.duration || 0,
        memoryUsage: this.getCurrentMemoryUsage(),
        domSize,
        lazyLoadDelay: avgLazyLoadDelay
      },
      records
    };
  }
  
  /**
   * 导出报告到控制台
   */
  public logReport(): void {
    const report = this.generateReport();
    console.group('性能基准报告');
    console.log('版本:', report.version);
    console.log('URL:', report.url);
    console.log('时间戳:', new Date(report.timestamp).toISOString());
    
    console.group('关键指标');
    console.log('初始加载时间:', report.metrics.initialLoadTime.toFixed(2) + 'ms');
    console.log('总加载时间:', report.metrics.totalLoadTime.toFixed(2) + 'ms');
    console.log('内容提取时间:', report.metrics.contentExtractionTime.toFixed(2) + 'ms');
    console.log('渲染时间:', report.metrics.renderingTime.toFixed(2) + 'ms');
    console.log('内存使用:', this.formatBytes(report.metrics.memoryUsage));
    console.log('DOM大小:', report.metrics.domSize + '节点');
    console.log('懒加载延迟:', report.metrics.lazyLoadDelay.toFixed(2) + 'ms');
    console.groupEnd();
    
    console.group('模块加载时间');
    Object.entries(report.metrics.moduleLoadTimes).forEach(([module, time]) => {
      console.log(module + ':', time.toFixed(2) + 'ms');
    });
    console.groupEnd();
    
    console.group('详细记录');
    report.records.forEach(record => {
      console.log(record.name + ':', record.duration.toFixed(2) + 'ms');
    });
    console.groupEnd();
    
    console.groupEnd();
  }
  
  /**
   * 保存报告到存储
   */
  public async saveReport(): Promise<void> {
    const report = this.generateReport();
    try {
      // 使用IndexedDB或localStorage存储报告
      localStorage.setItem(`performance_report_${Date.now()}`, JSON.stringify(report));
      console.log('[性能基准] 报告已保存');
    } catch (error) {
      console.error('[性能基准] 保存报告失败:', error);
    }
  }
  
  /**
   * 比较两个版本的性能差异
   */
  public static compareReports(before: PerformanceBenchmarkReport, after: PerformanceBenchmarkReport): Record<string, any> {
    const comparison: Record<string, any> = {
      beforeVersion: before.version,
      afterVersion: after.version,
      url: after.url,
      timestamp: Date.now(),
      metrics: {}
    };
    
    // 比较关键指标
    const metrics = comparison.metrics;
    
    // 计算差异和百分比变化
    const calculateDiff = (afterValue: number, beforeValue: number) => {
      const diff = afterValue - beforeValue;
      const percentChange = beforeValue !== 0 
        ? (diff / beforeValue) * 100 
        : 0;
      
      return {
        before: beforeValue,
        after: afterValue,
        diff,
        percentChange: percentChange
      };
    };
    
    // 比较所有指标
    metrics.initialLoadTime = calculateDiff(
      after.metrics.initialLoadTime, 
      before.metrics.initialLoadTime
    );
    
    metrics.totalLoadTime = calculateDiff(
      after.metrics.totalLoadTime, 
      before.metrics.totalLoadTime
    );
    
    metrics.contentExtractionTime = calculateDiff(
      after.metrics.contentExtractionTime, 
      before.metrics.contentExtractionTime
    );
    
    metrics.renderingTime = calculateDiff(
      after.metrics.renderingTime, 
      before.metrics.renderingTime
    );
    
    metrics.memoryUsage = calculateDiff(
      after.metrics.memoryUsage, 
      before.metrics.memoryUsage
    );
    
    metrics.domSize = calculateDiff(
      after.metrics.domSize, 
      before.metrics.domSize
    );
    
    metrics.lazyLoadDelay = calculateDiff(
      after.metrics.lazyLoadDelay, 
      before.metrics.lazyLoadDelay
    );
    
    // 比较模块加载时间
    metrics.moduleLoadTimes = {};
    const allModules = new Set([
      ...Object.keys(before.metrics.moduleLoadTimes),
      ...Object.keys(after.metrics.moduleLoadTimes)
    ]);
    
    allModules.forEach(module => {
      const beforeTime = before.metrics.moduleLoadTimes[module] || 0;
      const afterTime = after.metrics.moduleLoadTimes[module] || 0;
      
      metrics.moduleLoadTimes[module] = calculateDiff(afterTime, beforeTime);
    });
    
    return comparison;
  }
  
  /**
   * 格式化字节数为可读格式
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 导出单例实例
export const performanceBenchmark = new PerformanceBenchmark(); 