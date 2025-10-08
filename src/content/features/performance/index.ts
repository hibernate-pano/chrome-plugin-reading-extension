/**
 * 性能监控系统入口文件
 * 
 * 导出所有性能监控相关的组件和工具
 */

// 核心性能监控组件
export { PerformanceManager, performanceManager } from './PerformanceManager';
export type { 
  PerformanceMetrics, 
  PerformanceThresholds, 
  PerformanceRecommendation 
} from './PerformanceManager';

// 内存管理组件
export { MemoryManager, memoryManager } from './MemoryManager';
export type { 
  MemoryInfo, 
  MemoryOptimizationStrategy 
} from './MemoryManager';

// Web Worker管理组件
export { WebWorkerManager, webWorkerManager } from './WebWorkerManager';
export type { 
  WorkerTask, 
  WorkerConfig, 
  WorkerStats 
} from './WebWorkerManager';

// 基础性能工具
export { performanceMonitor } from '../../../utils/performance';

/**
 * 性能监控系统管理器
 * 
 * 整合所有性能监控功能，提供统一的接口
 */
export class PerformanceSystem {
  private static instance: PerformanceSystem;
  private isInitialized: boolean = false;
  
  // 性能监控组件
  private performanceManager: typeof performanceManager;
  private memoryManager: typeof memoryManager;
  private webWorkerManager: typeof webWorkerManager;
  
  // 系统状态
  private systemStatus: 'stopped' | 'running' | 'error' = 'stopped';
  private lastError: string | null = null;

  constructor() {
    this.performanceManager = performanceManager;
    this.memoryManager = memoryManager;
    this.webWorkerManager = webWorkerManager;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): PerformanceSystem {
    if (!PerformanceSystem.instance) {
      PerformanceSystem.instance = new PerformanceSystem();
    }
    return PerformanceSystem.instance;
  }

  /**
   * 初始化性能监控系统
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[PerformanceSystem] 开始初始化性能监控系统...');
      
      // 初始化Web Worker管理器
      await this.webWorkerManager.initialize();
      
      // 启动性能监控
      this.performanceManager.startMonitoring();
      
      // 启动内存监控
      this.memoryManager.startMonitoring();
      
      // 设置事件监听
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.systemStatus = 'running';
      
      console.log('[PerformanceSystem] 性能监控系统初始化完成');
    } catch (error) {
      this.systemStatus = 'error';
      this.lastError = error instanceof Error ? error.message : '未知错误';
      console.error('[PerformanceSystem] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 性能指标更新
    this.performanceManager.setMetricsUpdateCallback((metrics) => {
      console.debug('[PerformanceSystem] 性能指标更新:', metrics);
    });

    // 性能阈值超出
    this.performanceManager.setThresholdExceededCallback((threshold, value) => {
      console.warn(`[PerformanceSystem] 性能阈值超出: ${threshold} = ${value}`);
      this.handlePerformanceIssue(threshold, value);
    });

    // 性能优化建议
    this.performanceManager.setRecommendationCallback((recommendation) => {
      console.info('[PerformanceSystem] 性能优化建议:', recommendation);
      this.handlePerformanceRecommendation(recommendation);
    });

    // 内存更新
    this.memoryManager.setMemoryUpdateCallback((memoryInfo) => {
      console.debug('[PerformanceSystem] 内存使用更新:', memoryInfo);
    });

    // 内存警告
    this.memoryManager.setMemoryWarningCallback((memoryInfo) => {
      console.warn('[PerformanceSystem] 内存使用警告:', memoryInfo);
      this.handleMemoryWarning(memoryInfo);
    });

    // 内存严重警告
    this.memoryManager.setMemoryCriticalCallback((memoryInfo) => {
      console.error('[PerformanceSystem] 内存使用严重警告:', memoryInfo);
      this.handleMemoryCritical(memoryInfo);
    });

    // 内存优化完成
    this.memoryManager.setOptimizationCompleteCallback((strategy, savings) => {
      console.info(`[PerformanceSystem] 内存优化完成: ${strategy}, 节省: ${savings}MB`);
    });

    // Web Worker任务完成
    this.webWorkerManager.setTaskCompleteCallback((task) => {
      console.debug('[PerformanceSystem] Worker任务完成:', task);
    });

    // Web Worker错误
    this.webWorkerManager.setWorkerErrorCallback((worker, error) => {
      console.error('[PerformanceSystem] Worker错误:', error);
    });
  }

  /**
   * 处理性能问题
   */
  private handlePerformanceIssue(threshold: string, value: number): void {
    switch (threshold) {
      case 'memory':
        // 触发内存优化
        this.memoryManager.optimizeMemory();
        break;
      case 'cpu':
        // 降低任务优先级
        this.webWorkerManager.setConfig({ maxWorkers: Math.max(1, this.webWorkerManager.getConfig().maxWorkers - 1) });
        break;
      case 'responseTime':
        // 清理缓存
        this.memoryManager.optimizeMemory(['清理缓存']);
        break;
      case 'errorRate':
        // 记录错误并尝试恢复
        console.error(`[PerformanceSystem] 错误率过高: ${value}%`);
        break;
    }
  }

  /**
   * 处理性能优化建议
   */
  private handlePerformanceRecommendation(recommendation: any): void {
    switch (recommendation.type) {
      case 'memory':
        if (recommendation.severity === 'critical') {
          this.memoryManager.optimizeMemory();
        }
        break;
      case 'cpu':
        if (recommendation.severity === 'critical') {
          this.webWorkerManager.setConfig({ maxWorkers: 1 });
        }
        break;
      case 'response':
        // 清理缓存和优化DOM
        this.memoryManager.optimizeMemory(['清理缓存', '清理DOM引用']);
        break;
    }
  }

  /**
   * 处理内存警告
   */
  private handleMemoryWarning(_memoryInfo: any): void {
    // 执行低风险的内存优化
    this.memoryManager.optimizeMemory(['清理缓存', '清理定时器']);
  }

  /**
   * 处理内存严重警告
   */
  private handleMemoryCritical(memoryInfo: any): void {
    // 执行所有可用的内存优化策略
    this.memoryManager.optimizeMemory();
    
    // 如果内存使用仍然过高，尝试强制垃圾回收
    if (memoryInfo.percentage > 95) {
      this.memoryManager.setStrategyEnabled('强制垃圾回收', true);
      this.memoryManager.optimizeMemory(['强制垃圾回收']);
      this.memoryManager.setStrategyEnabled('强制垃圾回收', false);
    }
  }

  /**
   * 获取系统状态
   */
  public getSystemStatus(): {
    status: typeof this.systemStatus;
    isInitialized: boolean;
    lastError: string | null;
    components: {
      performanceManager: boolean;
      memoryManager: boolean;
      webWorkerManager: boolean;
    };
  } {
    return {
      status: this.systemStatus,
      isInitialized: this.isInitialized,
      lastError: this.lastError,
      components: {
        performanceManager: this.performanceManager !== null,
        memoryManager: this.memoryManager !== null,
        webWorkerManager: this.webWorkerManager !== null
      }
    };
  }

  /**
   * 获取综合性能报告
   */
  public generateComprehensiveReport(): string {
    let report = '性能监控系统综合报告\n';
    report += '========================\n\n';
    
    // 系统状态
    const status = this.getSystemStatus();
    report += `系统状态:\n`;
    report += `- 状态: ${status.status}\n`;
    report += `- 已初始化: ${status.isInitialized ? '是' : '否'}\n`;
    if (status.lastError) {
      report += `- 最后错误: ${status.lastError}\n`;
    }
    report += '\n';
    
    // 性能监控报告
    report += this.performanceManager.exportReport();
    report += '\n';
    
    // 内存使用报告
    report += this.memoryManager.generateReport();
    report += '\n';
    
    // Web Worker统计
    const workerStats = this.webWorkerManager.getStats();
    report += `Web Worker统计:\n`;
    report += `- 活跃Worker: ${workerStats.activeWorkers}\n`;
    report += `- 队列任务: ${workerStats.queuedTasks}\n`;
    report += `- 完成任务: ${workerStats.completedTasks}\n`;
    report += `- 失败任务: ${workerStats.failedTasks}\n`;
    report += `- 平均任务时间: ${workerStats.averageTaskTime.toFixed(2)}ms\n`;
    report += `- 总内存使用: ${workerStats.totalMemoryUsage}MB\n`;
    
    return report;
  }

  /**
   * 执行性能诊断
   */
  public async runDiagnostics(): Promise<{
    success: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // 检查性能指标
      const latestMetrics = this.performanceManager.getLatestMetrics();
      if (latestMetrics) {
        if (latestMetrics.memoryUsage.percentage > 80) {
          issues.push(`内存使用率过高: ${latestMetrics.memoryUsage.percentage.toFixed(1)}%`);
          recommendations.push('建议执行内存优化');
        }
        
        if (latestMetrics.cpuUsage.current > 70) {
          issues.push(`CPU使用率过高: ${latestMetrics.cpuUsage.current.toFixed(1)}%`);
          recommendations.push('建议减少并发任务');
        }
        
        if (latestMetrics.responseTime.average > 500) {
          issues.push(`响应时间过长: ${latestMetrics.responseTime.average.toFixed(1)}ms`);
          recommendations.push('建议优化操作流程');
        }
      }
      
      // 检查内存状态
      const memoryStats = this.memoryManager.getMemoryStats();
      if (memoryStats.trend === 'increasing') {
        issues.push('内存使用呈上升趋势');
        recommendations.push('建议检查内存泄漏');
      }
      
      // 检查Web Worker状态
      const workerStats = this.webWorkerManager.getStats();
      if (workerStats.failedTasks > workerStats.completedTasks * 0.1) {
        issues.push(`Worker任务失败率过高: ${(workerStats.failedTasks / (workerStats.completedTasks + workerStats.failedTasks) * 100).toFixed(1)}%`);
        recommendations.push('建议检查Worker脚本和任务数据');
      }
      
      return {
        success: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      issues.push(`诊断过程出错: ${error instanceof Error ? error.message : '未知错误'}`);
      return {
        success: false,
        issues,
        recommendations: ['建议重启性能监控系统']
      };
    }
  }

  /**
   * 优化系统性能
   */
  public async optimizeSystem(): Promise<{
    success: boolean;
    optimizations: string[];
    totalSavings: number;
  }> {
    const optimizations: string[] = [];
    let totalSavings = 0;
    
    try {
      // 执行内存优化
      const memoryResult = await this.memoryManager.optimizeMemory();
      if (memoryResult.success) {
        optimizations.push(`内存优化: 节省约${memoryResult.savings}MB`);
        totalSavings += memoryResult.savings;
      }
      
      // 调整Web Worker配置
      const currentConfig = this.webWorkerManager.getConfig();
      if (currentConfig.maxWorkers > 2) {
        this.webWorkerManager.setConfig({ maxWorkers: 2 });
        optimizations.push('减少Worker数量以降低CPU使用');
      }
      
      // 清理性能数据
      this.performanceManager.clearRecords();
      optimizations.push('清理性能历史数据');
      
      return {
        success: true,
        optimizations,
        totalSavings
      };
    } catch (error) {
      console.error('[PerformanceSystem] 系统优化失败:', error);
      return {
        success: false,
        optimizations: [`优化失败: ${error instanceof Error ? error.message : '未知错误'}`],
        totalSavings: 0
      };
    }
  }

  /**
   * 停止性能监控系统
   */
  public stop(): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      // 停止性能监控
      this.performanceManager.stopMonitoring();
      
      // 停止内存监控
      this.memoryManager.stopMonitoring();
      
      // 清理Web Worker
      this.webWorkerManager.cleanup();
      
      this.isInitialized = false;
      this.systemStatus = 'stopped';
      
      console.log('[PerformanceSystem] 性能监控系统已停止');
    } catch (error) {
      console.error('[PerformanceSystem] 停止系统时出错:', error);
      this.systemStatus = 'error';
    }
  }

  /**
   * 重启性能监控系统
   */
  public async restart(): Promise<void> {
    this.stop();
    await this.initialize();
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    try {
      this.stop();
      
      // 清理各组件
      this.performanceManager.cleanup();
      this.memoryManager.cleanup();
      this.webWorkerManager.cleanup();
      
      console.log('[PerformanceSystem] 资源清理完成');
    } catch (error) {
      console.error('[PerformanceSystem] 资源清理失败:', error);
    }
  }
}

// 导出性能监控系统实例
export const performanceSystem = PerformanceSystem.getInstance();

/**
 * 便捷的性能监控函数
 */

/**
 * 开始性能监控
 */
export function startPerformanceMonitoring(): void {
  performanceSystem.initialize().catch(console.error);
}

/**
 * 停止性能监控
 */
export function stopPerformanceMonitoring(): void {
  performanceSystem.stop();
}

/**
 * 获取性能报告
 */
export function getPerformanceReport(): string {
  return performanceSystem.generateComprehensiveReport();
}

/**
 * 执行性能诊断
 */
export function diagnosePerformance(): Promise<{
  success: boolean;
  issues: string[];
  recommendations: string[];
}> {
  return performanceSystem.runDiagnostics();
}

/**
 * 优化系统性能
 */
export function optimizePerformance(): Promise<{
  success: boolean;
  optimizations: string[];
  totalSavings: number;
}> {
  return performanceSystem.optimizeSystem();
}
