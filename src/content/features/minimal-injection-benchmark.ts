/**
 * 最小注入性能基准测试
 * 专门用于测量content.ts重构为contentLoader.ts的性能影响
 */

import { PerformanceMonitor } from '../../utils/performance';
import { StorageManager } from '../../storage/storage-manager';

// 定义测量的版本标识
export const BEFORE_VERSION = 'v1.6.0'; // 重构前版本
export const AFTER_VERSION = 'v1.7.0';  // 重构后版本

export enum ModuleType {
  CORE = 'core',
  READER_MODE = 'reader-mode',
  THEME_MANAGER = 'theme-manager',
  ANNOTATION = 'annotation',
  SETTINGS = 'settings',
  EXTRACTION = 'extraction'
}

// 定义性能指标键
export enum MinimalInjectionMetric {
  INITIAL_SCRIPT_SIZE = 'initialScriptSize',
  TOTAL_SCRIPT_SIZE = 'totalScriptSize',
  TIME_TO_BUTTON = 'timeToButton',
  INITIAL_INJECTION_TIME = 'initialInjectionTime',
  ACTIVATION_TIME = 'activationTime',
  LAZY_LOAD_DELAY = 'lazyLoadDelay',
  INITIAL_MEMORY_USAGE = 'initialMemoryUsage',
  FULL_MEMORY_USAGE = 'fullMemoryUsage',
  DOM_MUTATIONS = 'domMutations',
  INITIAL_CPU_USAGE = 'initialCpuUsage',
  ACTIVATION_CPU_USAGE = 'activationCpuUsage'
}

interface PerformanceMetrics {
  // 脚本大小相关
  initialScriptSize: number;  // 初始注入脚本大小 (KB)
  totalScriptSize: number;    // 所有脚本总大小 (KB)
  
  // 时间相关
  initialInjectionTime: number;  // 初始注入时间 (ms)
  buttonRenderTime: number;      // 浮动按钮渲染时间 (ms)
  activationTime: number;        // 激活阅读模式时间 (ms)
  
  // 模块加载相关
  moduleLoadTimes: Record<ModuleType, number>;  // 各模块加载时间 (ms)
  
  // 资源使用相关
  initialMemoryUsage: number;    // 初始内存使用 (MB)
  fullMemoryUsage: number;       // 完全激活后内存使用 (MB)
  cpuUsage: number;              // CPU使用率 (%)
  
  // DOM影响
  domMutationsCount: number;     // DOM变更次数
  
  // 页面信息
  url: string;                   // 测试页面URL
  pageComplexity: number;        // 页面复杂度评分 (1-10)
}

interface PerformanceReport {
  version: string;               // 版本号
  timestamp: number;             // 测试时间戳
  metrics: PerformanceMetrics;   // 性能指标
  userAgent: string;             // 浏览器信息
  notes?: string;                // 备注
}

// 定义性能比较报告
export interface InjectionPerformanceReport {
  timestamp: number;
  url: string;
  metrics: {
    initialScriptSize: number;          // 初始注入脚本大小 (KB)
    fullScriptSize: number;             // 完整脚本大小 (KB)
    timeToButton: number;               // 浮动按钮显示时间 (ms)
    initialLoadTime: number;            // 初始加载时间 (ms)
    activationTime: number;             // 阅读模式激活时间 (ms)
    lazyLoadDelay: number;              // 懒加载延迟 (ms)
    memoryUsageInitial: number;         // 初始内存使用 (KB)
    memoryUsageAfterActivation: number; // 激活后内存使用 (KB)
    domMutations: number;               // DOM变更数量
    cpuUsageInitial: number;            // 初始CPU使用率 (%)
    cpuUsageActivation: number;         // 激活时CPU使用率 (%)
  };
  version: string;
}

// 定义指标键类型，确保类型安全
type MetricKey = keyof InjectionPerformanceReport['metrics'];

// DOM变更观察器
class DomMutationCounter {
  private observer: MutationObserver | null = null;
  private count: number = 0;

  start(): void {
    this.count = 0;
    this.observer = new MutationObserver(() => {
      this.count++;
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  stop(): number {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    return this.count;
  }
}

/**
 * 最小注入性能测试类
 */
export class MinimalInjectionBenchmark {
  private static instance: MinimalInjectionBenchmark;
  private performanceMonitor: PerformanceMonitor;
  private storageManager: StorageManager;
  private mutationCounter: DomMutationCounter;
  private initialMemoryUsage: number = 0;
  private activationMemoryUsage: number = 0;
  private reports: InjectionPerformanceReport[] = [];
  private isEnabled: boolean = true;
  private startTime: number = 0;
  private mutationObserver: MutationObserver | null = null;
  private domMutationsCount = 0;
  
  private metrics: Partial<PerformanceMetrics> = {
    moduleLoadTimes: {} as Record<ModuleType, number>,
    domMutationsCount: 0
  };
  
  private timers: Record<string, number> = {};
  private readonly STORAGE_KEY = 'minimal_injection_benchmark_reports';
  
  private constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.storageManager = StorageManager.getInstance();
    this.mutationCounter = new DomMutationCounter();
    this.setupMutationObserver();
    this.metrics.url = window.location.href;
    this.metrics.pageComplexity = this.calculatePageComplexity();
  }

  public static getInstance(): MinimalInjectionBenchmark {
    if (!MinimalInjectionBenchmark.instance) {
      MinimalInjectionBenchmark.instance = new MinimalInjectionBenchmark();
    }
    return MinimalInjectionBenchmark.instance;
  }
  
  /**
   * 启用或禁用性能测试
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
  
  /**
   * 捕获初始内存使用
   */
  private captureInitialMemory(): void {
    const extendedPerf = performance as any;
    if (extendedPerf.memory) {
      this.initialMemoryUsage = extendedPerf.memory.usedJSHeapSize;
    }
  }
  
  /**
   * 捕获激活后内存使用
   */
  private captureActivationMemory(): void {
    const extendedPerf = performance as any;
    if (extendedPerf.memory) {
      this.activationMemoryUsage = extendedPerf.memory.usedJSHeapSize;
    }
  }
  
  /**
   * 开始测量初始注入
   */
  public startInitialInjection(): void {
    if (!this.isEnabled) return;
    
    console.log('[最小注入性能测试] 开始测量初始注入');
    this.startTime = performance.now();
    this.performanceMonitor.startMeasuring('initialInjection');
    this.mutationCounter.start();
    this.captureInitialMemory();
    
    // 开始测量CPU使用率
    this.performanceMonitor.startCPUMeasurement();
  }
  
  /**
   * 结束测量初始注入
   */
  public endInitialInjection(): void {
    if (!this.isEnabled) return;
    
    console.log('[最小注入性能测试] 结束测量初始注入');
    const duration = this.performanceMonitor.endMeasuring('initialInjection');
    if (duration) {
      this.metrics.initialInjectionTime = duration;
    }
    
    // 记录脚本大小
    this.measureScriptSize();
  }
  
  /**
   * 记录浮动按钮显示时间
   */
  public recordButtonRendered(): void {
    if (!this.isEnabled) return;
    
    const buttonTime = performance.now() - this.startTime;
    this.performanceMonitor.record(MinimalInjectionMetric.TIME_TO_BUTTON, buttonTime);
    this.metrics.buttonRenderTime = buttonTime;
    
    console.log('[最小注入性能测试] 浮动按钮已渲染:', buttonTime.toFixed(2) + 'ms');
  }
  
  /**
   * 开始测量阅读模式激活
   */
  public startActivation(): void {
    if (!this.isEnabled) return;
    
    console.log('[最小注入性能测试] 开始测量阅读模式激活');
    this.performanceMonitor.startMeasuring('activation');
    this.timers.activation = performance.now();
    
    // 记录CPU使用情况
    this.performanceMonitor.startCPUMeasurement();
  }
  
  /**
   * 结束测量阅读模式激活
   */
  public endActivation(): void {
    if (!this.isEnabled) return;
    
    console.log('[最小注入性能测试] 结束测量阅读模式激活');
    const duration = this.performanceMonitor.endMeasuring('activation');
    if (duration) {
      this.metrics.activationTime = duration;
    }
    
    // 记录DOM变更数量
    this.metrics.domMutationsCount = this.mutationCounter.stop();
    
    // 记录内存使用情况
    this.captureActivationMemory();
    this.metrics.initialMemoryUsage = this.initialMemoryUsage / (1024 * 1024); // 转换为MB
    this.metrics.fullMemoryUsage = this.activationMemoryUsage / (1024 * 1024); // 转换为MB
    
    // 记录CPU使用率
    this.metrics.cpuUsage = this.performanceMonitor.getAverageCPUUsage();
    
    // 估算总脚本大小
    this.estimateScriptSize().then(size => {
      this.metrics.totalScriptSize = size;
    });
  }
  
  /**
   * 记录模块加载完成
   */
  public recordModuleLoaded(moduleType: ModuleType): void {
    if (!this.isEnabled) return;
    
    const loadTime = performance.now() - (this.timers.activation || 0);
    console.log(`[最小注入性能测试] 模块加载完成: ${moduleType}, 耗时: ${loadTime.toFixed(2)}ms`);
    
    if (this.metrics.moduleLoadTimes) {
      this.metrics.moduleLoadTimes[moduleType] = loadTime;
    }
  }
  
  /**
   * 测量脚本大小
   */
  private async measureScriptSize(): Promise<void> {
    try {
      const size = await this.estimateScriptSize();
      this.metrics.initialScriptSize = size;
      console.log(`[最小注入性能测试] 初始脚本大小: ${size.toFixed(2)}KB`);
    } catch (error) {
      console.error('[最小注入性能测试] 测量脚本大小失败:', error);
    }
  }
  
  /**
   * 估算脚本大小
   */
  private async estimateScriptSize(): Promise<number> {
    try {
      // 获取所有注入的脚本元素
      const scripts = Array.from(document.querySelectorAll('script'))
        .filter(script => script.src.includes('chrome-extension') || !script.src);
      
      let totalSize = 0;
      
      // 计算内联脚本大小
      for (const script of scripts) {
        if (!script.src) {
          totalSize += (script.textContent || '').length;
        } else {
          // 对于外部脚本，尝试获取其大小
          try {
            const response = await fetch(script.src);
            const text = await response.text();
            totalSize += text.length;
          } catch (error) {
            console.warn(`[最小注入性能测试] 无法获取脚本大小: ${script.src}`);
          }
        }
      }
      
      // 转换为KB
      return totalSize / 1024;
    } catch (error) {
      console.error('[最小注入性能测试] 估算脚本大小失败:', error);
      return 0;
    }
  }
  
  /**
   * 生成性能报告
   */
  public generateReport(version: string = AFTER_VERSION): InjectionPerformanceReport {
    const report: InjectionPerformanceReport = {
      timestamp: Date.now(),
      url: window.location.href,
      metrics: {
        initialScriptSize: this.metrics.initialScriptSize || 0,
        fullScriptSize: this.metrics.totalScriptSize || 0,
        timeToButton: this.metrics.buttonRenderTime || 0,
        initialLoadTime: this.metrics.initialInjectionTime || 0,
        activationTime: this.metrics.activationTime || 0,
        lazyLoadDelay: 0, // 由具体模块加载时间决定
        memoryUsageInitial: this.metrics.initialMemoryUsage || 0,
        memoryUsageAfterActivation: this.metrics.fullMemoryUsage || 0,
        domMutations: this.metrics.domMutationsCount || 0,
        cpuUsageInitial: 0, // 由CPU测量决定
        cpuUsageActivation: this.metrics.cpuUsage || 0
      },
      version
    };
    
    return report;
  }
  
  /**
   * 获取所有报告
   */
  public async getAllReports(): Promise<InjectionPerformanceReport[]> {
    try {
      const reportsStr = await this.storageManager.get(this.STORAGE_KEY) || '[]';
      return JSON.parse(reportsStr);
    } catch (error) {
      console.error('[最小注入性能测试] 获取报告失败:', error);
      return [];
    }
  }
  
  /**
   * 保存性能报告
   */
  public async saveReport(version: string = AFTER_VERSION, notes?: string): Promise<void> {
    // 确保所有指标都已收集
    this.metrics.domMutationsCount = this.domMutationsCount;
    
    const report: PerformanceReport = {
      version,
      timestamp: Date.now(),
      metrics: this.metrics as PerformanceMetrics,
      userAgent: navigator.userAgent,
      notes
    };

    try {
      // 获取现有报告
      const existingReportsStr = await this.storageManager.get(this.STORAGE_KEY) || '[]';
      const existingReports: PerformanceReport[] = JSON.parse(existingReportsStr);
      
      // 添加新报告
      existingReports.push(report);
      
      // 保存更新后的报告列表
      await this.storageManager.set(this.STORAGE_KEY, JSON.stringify(existingReports));
      
      console.log(`[最小注入性能测试] 性能报告已保存 (${version})`, report);
    } catch (error) {
      console.error('[最小注入性能测试] 保存性能报告失败:', error);
    }
  }
  
  /**
   * 比较两个版本的性能
   */
  public static async compareVersions(beforeVersion: string = BEFORE_VERSION, afterVersion: string = AFTER_VERSION): Promise<any> {
    const instance = MinimalInjectionBenchmark.getInstance();
    const allReports = await instance.getAllReports();
    
    const beforeReports = allReports.filter(r => r.version === beforeVersion);
    const afterReports = allReports.filter(r => r.version === afterVersion);
    
    if (beforeReports.length === 0) {
      console.warn(`[最小注入性能测试] 没有找到版本 ${beforeVersion} 的性能报告`);
      return null;
    }
    
    if (afterReports.length === 0) {
      console.warn(`[最小注入性能测试] 没有找到版本 ${afterVersion} 的性能报告`);
      return null;
    }
    
    console.log(`[最小注入性能测试] 比较版本: ${beforeVersion} (${beforeReports.length}份报告) vs ${afterVersion} (${afterReports.length}份报告)`);
    
    // 计算平均指标
    const beforeAvg = MinimalInjectionBenchmark.calculateAverageMetrics(beforeReports);
    const afterAvg = MinimalInjectionBenchmark.calculateAverageMetrics(afterReports);
    
    // 计算改进情况
    const improvements = MinimalInjectionBenchmark.calculateImprovements(beforeAvg, afterAvg);
    
    return {
      beforeVersion,
      afterVersion,
      beforeSampleSize: beforeReports.length,
      afterSampleSize: afterReports.length,
      beforeAverage: beforeAvg,
      afterAverage: afterAvg,
      improvements
    };
  }
  
  /**
   * 计算平均性能指标
   */
  private static calculateAverageMetrics(reports: InjectionPerformanceReport[]): Record<MetricKey, number> {
    if (reports.length === 0) {
      return {} as Record<MetricKey, number>;
    }
    
    const result = {} as Record<MetricKey, number>;
    const metricKeys = Object.keys(reports[0].metrics) as MetricKey[];
    
    for (const key of metricKeys) {
      let sum = 0;
      let count = 0;
      
      for (const report of reports) {
        const value = report.metrics[key];
        if (typeof value === 'number' && !isNaN(value)) {
          sum += value;
          count++;
        }
      }
      
      result[key] = count > 0 ? sum / count : 0;
    }
    
    return result;
  }
  
  /**
   * 计算性能改进情况
   */
  private static calculateImprovements(before: Record<MetricKey, number>, after: Record<MetricKey, number>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const key of Object.keys(before) as MetricKey[]) {
      const beforeVal = before[key];
      const afterVal = after[key];
      
      if (typeof beforeVal === 'number' && typeof afterVal === 'number') {
        const absoluteChange = afterVal - beforeVal;
        const percentChange = beforeVal !== 0 ? (absoluteChange / beforeVal) * 100 : 0;
        
        // 判断是否为改进
        // 对于大多数指标，较小的值表示更好的性能
        const lowerIsBetter = [
          'initialScriptSize', 'fullScriptSize', 'timeToButton', 
          'initialLoadTime', 'activationTime', 'lazyLoadDelay',
          'memoryUsageInitial', 'memoryUsageAfterActivation', 
          'domMutations', 'cpuUsageInitial', 'cpuUsageActivation'
        ].includes(key);
        
        const isImprovement = lowerIsBetter ? percentChange < 0 : percentChange > 0;
        
        result[key] = {
          before: beforeVal.toFixed(2),
          after: afterVal.toFixed(2),
          absoluteChange: absoluteChange.toFixed(2),
          percentChange: percentChange.toFixed(2) + '%',
          improved: isImprovement
        };
      }
    }
    
    return result;
  }
  
  /**
   * 导出比较结果
   */
  public static async exportComparisonResults(): Promise<any> {
    const comparison = await MinimalInjectionBenchmark.compareVersions();
    
    if (!comparison) {
      console.warn('[最小注入性能测试] 无法导出比较结果，缺少必要的性能报告');
      return null;
    }
    
    console.log('[最小注入性能测试] 性能比较结果:');
    console.table(comparison.improvements);
    
    return comparison;
  }
  
  /**
   * 清除所有性能报告
   */
  public static async clearAllReports(): Promise<void> {
    const instance = MinimalInjectionBenchmark.getInstance();
    await instance.storageManager.remove(instance.STORAGE_KEY);
    console.log('[最小注入性能测试] 所有性能报告已清除');
  }
  
  /**
   * 设置DOM变更观察器
   */
  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') return;
    
    this.mutationObserver = new MutationObserver((mutations) => {
      this.domMutationsCount += mutations.length;
    });
    
    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  }
  
  /**
   * 计算页面复杂度评分 (1-10)
   */
  private calculatePageComplexity(): number {
    // 基于DOM节点数量、图片数量、脚本数量等因素计算页面复杂度
    const nodeCount = document.querySelectorAll('*').length;
    const imageCount = document.querySelectorAll('img').length;
    const scriptCount = document.querySelectorAll('script').length;
    const iframeCount = document.querySelectorAll('iframe').length;
    
    // 简单加权计算
    const complexity = (
      (nodeCount * 0.0001) + 
      (imageCount * 0.01) + 
      (scriptCount * 0.05) + 
      (iframeCount * 0.2)
    );
    
    // 限制在1-10范围内
    return Math.max(1, Math.min(10, Math.round(complexity)));
  }
}

// 导出单例实例
export const minimalInjectionBenchmark = MinimalInjectionBenchmark.getInstance(); 