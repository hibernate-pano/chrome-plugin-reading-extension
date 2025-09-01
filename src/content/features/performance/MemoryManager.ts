/**
 * 内存使用信息接口
 */
export interface MemoryInfo {
  used: number;        // 已使用内存 (MB)
  total: number;       // 总分配内存 (MB)
  limit: number;       // 内存限制 (MB)
  percentage: number;  // 使用百分比
  available: number;   // 可用内存 (MB)
}

/**
 * 内存优化策略接口
 */
export interface MemoryOptimizationStrategy {
  name: string;
  description: string;
  action: () => Promise<boolean>;
  estimatedSavings: number; // MB
  risk: 'low' | 'medium' | 'high';
  enabled: boolean;
}

/**
 * 内存管理器
 * 
 * 功能：
 * - 实时监控内存使用情况
 * - 自动内存优化
 * - 内存泄漏检测
 * - 垃圾回收管理
 * - 内存使用报告
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryHistory: MemoryInfo[] = [];
  private optimizationStrategies: MemoryOptimizationStrategy[] = [];
  private monitoringInterval: number | null = null;
  private isMonitoring: boolean = false;
  private maxHistorySize: number = 1000;
  
  // 内存监控回调
  private onMemoryUpdate: ((memoryInfo: MemoryInfo) => void) | null = null;
  private onMemoryWarning: ((memoryInfo: MemoryInfo) => void) | null = null;
  private onMemoryCritical: ((memoryInfo: MemoryInfo) => void) | null = null;
  private onOptimizationComplete: ((strategy: string, savings: number) => void) | null = null;

  constructor() {
    this.initializeOptimizationStrategies();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * 初始化内存优化策略
   */
  private initializeOptimizationStrategies(): void {
    this.optimizationStrategies = [
      {
        name: '清理缓存',
        description: '清理扩展内部缓存数据',
        action: async () => this.clearCache(),
        estimatedSavings: 5,
        risk: 'low',
        enabled: true
      },
      {
        name: '清理DOM引用',
        description: '清理不再使用的DOM元素引用',
        action: async () => this.cleanupDOMReferences(),
        estimatedSavings: 3,
        risk: 'low',
        enabled: true
      },
      {
        name: '清理事件监听器',
        description: '清理未使用的事件监听器',
        action: async () => this.cleanupEventListeners(),
        estimatedSavings: 2,
        risk: 'medium',
        enabled: true
      },
      {
        name: '清理定时器',
        description: '清理未使用的定时器和间隔器',
        action: async () => this.cleanupTimers(),
        estimatedSavings: 1,
        risk: 'low',
        enabled: true
      },
      {
        name: '强制垃圾回收',
        description: '尝试触发垃圾回收（仅在支持时）',
        action: async () => this.forceGarbageCollection(),
        estimatedSavings: 10,
        risk: 'high',
        enabled: false // 默认禁用，因为可能影响性能
      }
    ];
  }

  /**
   * 开始内存监控
   */
  public startMonitoring(interval: number = 2000): void {
    if (this.isMonitoring) {
      console.warn('[MemoryManager] 内存监控已在运行中');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.checkMemoryUsage();
    }, interval);
    
    console.log('[MemoryManager] 内存监控已启动');
  }

  /**
   * 停止内存监控
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
    
    console.log('[MemoryManager] 内存监控已停止');
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    const memoryInfo = this.getMemoryInfo();
    this.memoryHistory.push(memoryInfo);
    
    // 限制历史记录数量
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }
    
    // 检查内存警告阈值
    if (memoryInfo.percentage > 90) {
      this.triggerMemoryCritical(memoryInfo);
    } else if (memoryInfo.percentage > 80) {
      this.triggerMemoryWarning(memoryInfo);
    }
    
    // 触发内存更新回调
    if (this.onMemoryUpdate) {
      this.onMemoryUpdate(memoryInfo);
    }
    
    // 自动优化（如果启用）
    if (memoryInfo.percentage > 70) {
      this.autoOptimize();
    }
  }

  /**
   * 获取当前内存使用信息
   */
  public getMemoryInfo(): MemoryInfo {
    const extendedPerf = performance as any;
    if (extendedPerf.memory) {
      const used = extendedPerf.memory.usedJSHeapSize / 1024 / 1024; // MB
      const total = extendedPerf.memory.totalJSHeapSize / 1024 / 1024; // MB
      const limit = extendedPerf.memory.jsHeapSizeLimit / 1024 / 1024; // MB
      const percentage = (used / limit) * 100;
      const available = limit - used;
      
      return { used, total, limit, percentage, available };
    }
    
    // 如果不支持内存API，返回默认值
    return { used: 0, total: 0, limit: 0, percentage: 0, available: 0 };
  }

  /**
   * 获取内存使用历史
   */
  public getMemoryHistory(duration: number = 300000): MemoryInfo[] { // 默认5分钟
    const cutoff = Date.now() - duration;
    return this.memoryHistory.filter(m => m.timestamp > cutoff);
  }

  /**
   * 获取内存使用统计
   */
  public getMemoryStats(): {
    current: MemoryInfo;
    average: MemoryInfo;
    peak: MemoryInfo;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (this.memoryHistory.length === 0) {
      const current = this.getMemoryInfo();
      return {
        current,
        average: current,
        peak: current,
        trend: 'stable'
      };
    }
    
    const current = this.memoryHistory[this.memoryHistory.length - 1];
    const recent = this.memoryHistory.slice(-10); // 最近10次
    
    const average: MemoryInfo = {
      used: recent.reduce((sum, m) => sum + m.used, 0) / recent.length,
      total: recent.reduce((sum, m) => sum + m.total, 0) / recent.length,
      limit: recent.reduce((sum, m) => sum + m.limit, 0) / recent.length,
      percentage: recent.reduce((sum, m) => sum + m.percentage, 0) / recent.length,
      available: recent.reduce((sum, m) => sum + m.available, 0) / recent.length
    };
    
    const peak = this.memoryHistory.reduce((max, m) => 
      m.used > max.used ? m : max
    );
    
    // 判断趋势
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const diff = last.used - first.used;
      
      if (diff > 1) trend = 'increasing';
      else if (diff < -1) trend = 'decreasing';
    }
    
    return { current, average, peak, trend };
  }

  /**
   * 触发内存警告
   */
  private triggerMemoryWarning(memoryInfo: MemoryInfo): void {
    console.warn('[MemoryManager] 内存使用警告:', memoryInfo);
    if (this.onMemoryWarning) {
      this.onMemoryWarning(memoryInfo);
    }
  }

  /**
   * 触发内存严重警告
   */
  private triggerMemoryCritical(memoryInfo: MemoryInfo): void {
    console.error('[MemoryManager] 内存使用严重警告:', memoryInfo);
    if (this.onMemoryCritical) {
      this.onMemoryCritical(memoryInfo);
    }
  }

  /**
   * 自动内存优化
   */
  private async autoOptimize(): Promise<void> {
    console.log('[MemoryManager] 开始自动内存优化');
    
    const enabledStrategies = this.optimizationStrategies.filter(s => s.enabled);
    let totalSavings = 0;
    
    for (const strategy of enabledStrategies) {
      try {
        const success = await strategy.action();
        if (success) {
          totalSavings += strategy.estimatedSavings;
          console.log(`[MemoryManager] 优化策略 "${strategy.name}" 执行成功`);
        }
      } catch (error) {
        console.warn(`[MemoryManager] 优化策略 "${strategy.name}" 执行失败:`, error);
      }
    }
    
    if (totalSavings > 0) {
      console.log(`[MemoryManager] 自动优化完成，预计节省内存: ${totalSavings}MB`);
      if (this.onOptimizationComplete) {
        this.onOptimizationComplete('auto', totalSavings);
      }
    }
  }

  /**
   * 手动执行内存优化
   */
  public async optimizeMemory(strategyNames?: string[]): Promise<{
    success: boolean;
    savings: number;
    details: Array<{ name: string; success: boolean; savings: number; error?: string }>;
  }> {
    const strategies = strategyNames 
      ? this.optimizationStrategies.filter(s => strategyNames.includes(s.name))
      : this.optimizationStrategies.filter(s => s.enabled);
    
    const results: Array<{ name: string; success: boolean; savings: number; error?: string }> = [];
    let totalSavings = 0;
    
    for (const strategy of strategies) {
      try {
        const success = await strategy.action();
        const savings = success ? strategy.estimatedSavings : 0;
        
        results.push({
          name: strategy.name,
          success,
          savings
        });
        
        if (success) {
          totalSavings += savings;
        }
      } catch (error) {
        results.push({
          name: strategy.name,
          success: false,
          savings: 0,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    return {
      success: results.some(r => r.success),
      savings: totalSavings,
      details: results
    };
  }

  /**
   * 清理缓存
   */
  private async clearCache(): Promise<boolean> {
    try {
      // 清理localStorage中的临时数据
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('reading-extension-temp-')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 清理sessionStorage
      sessionStorage.clear();
      
      // 清理内存中的缓存对象
      if (window.caches) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }
      
      return true;
    } catch (error) {
      console.warn('[MemoryManager] 清理缓存失败:', error);
      return false;
    }
  }

  /**
   * 清理DOM引用
   */
  private async cleanupDOMReferences(): Promise<boolean> {
    try {
      // 这里应该清理扩展内部维护的DOM引用
      // 由于Chrome扩展的限制，我们主要关注内部引用
      
      // 清理可能存在的全局DOM引用
      const globalObjects = ['tempElements', 'cachedElements', 'domReferences'];
      globalObjects.forEach(key => {
        if ((window as any)[key]) {
          delete (window as any)[key];
        }
      });
      
      return true;
    } catch (error) {
      console.warn('[MemoryManager] 清理DOM引用失败:', error);
      return false;
    }
  }

  /**
   * 清理事件监听器
   */
  private async cleanupEventListeners(): Promise<boolean> {
    try {
      // 清理可能存在的全局事件监听器引用
      const globalListeners = ['tempListeners', 'eventHandlers', 'listenerReferences'];
      globalListeners.forEach(key => {
        if ((window as any)[key]) {
          delete (window as any)[key];
        }
      });
      
      return true;
    } catch (error) {
      console.warn('[MemoryManager] 清理事件监听器失败:', error);
      return false;
    }
  }

  /**
   * 清理定时器
   */
  private async cleanupTimers(): Promise<boolean> {
    try {
      // 清理可能存在的全局定时器引用
      const globalTimers = ['tempTimers', 'intervalReferences', 'timeoutReferences'];
      globalTimers.forEach(key => {
        if ((window as any)[key]) {
          const timers = (window as any)[key];
          if (Array.isArray(timers)) {
            timers.forEach((timer: number) => {
              clearTimeout(timer);
              clearInterval(timer);
            });
          }
          delete (window as any)[key];
        }
      });
      
      return true;
    } catch (error) {
      console.warn('[MemoryManager] 清理定时器失败:', error);
      return false;
    }
  }

  /**
   * 强制垃圾回收
   */
  private async forceGarbageCollection(): Promise<boolean> {
    try {
      // 尝试触发垃圾回收（仅在支持时）
      if ('gc' in window) {
        (window as any).gc();
        return true;
      }
      
      // 如果不支持gc()，尝试通过创建大量对象来触发GC
      const tempObjects: any[] = [];
      for (let i = 0; i < 100000; i++) {
        tempObjects.push({ id: i, data: new Array(100).fill(i) });
      }
      
      // 立即清理引用
      tempObjects.length = 0;
      
      return true;
    } catch (error) {
      console.warn('[MemoryManager] 强制垃圾回收失败:', error);
      return false;
    }
  }

  /**
   * 设置优化策略启用状态
   */
  public setStrategyEnabled(strategyName: string, enabled: boolean): void {
    const strategy = this.optimizationStrategies.find(s => s.name === strategyName);
    if (strategy) {
      strategy.enabled = enabled;
    }
  }

  /**
   * 获取所有优化策略
   */
  public getOptimizationStrategies(): MemoryOptimizationStrategy[] {
    return this.optimizationStrategies.map(s => ({ ...s }));
  }

  /**
   * 设置内存监控回调
   */
  public onMemoryUpdate(callback: (memoryInfo: MemoryInfo) => void): void {
    this.onMemoryUpdate = callback;
  }

  /**
   * 设置内存警告回调
   */
  public onMemoryWarning(callback: (memoryInfo: MemoryInfo) => void): void {
    this.onMemoryWarning = callback;
  }

  /**
   * 设置内存严重警告回调
   */
  public onMemoryCritical(callback: (memoryInfo: MemoryInfo) => void): void {
    this.onMemoryCritical = callback;
  }

  /**
   * 设置优化完成回调
   */
  public onOptimizationComplete(callback: (strategy: string, savings: number) => void): void {
    this.onOptimizationComplete = callback;
  }

  /**
   * 生成内存使用报告
   */
  public generateReport(): string {
    const stats = this.getMemoryStats();
    const history = this.getMemoryHistory();
    
    let report = '内存使用报告\n';
    report += '==============\n\n';
    
    report += `当前状态:\n`;
    report += `- 已使用: ${stats.current.used.toFixed(2)}MB\n`;
    report += `- 总分配: ${stats.current.total.toFixed(2)}MB\n`;
    report += `- 内存限制: ${stats.current.limit.toFixed(2)}MB\n`;
    report += `- 使用率: ${stats.current.percentage.toFixed(1)}%\n`;
    report += `- 可用: ${stats.current.available.toFixed(2)}MB\n\n`;
    
    report += `统计信息:\n`;
    report += `- 平均使用: ${stats.average.used.toFixed(2)}MB\n`;
    report += `- 峰值使用: ${stats.peak.used.toFixed(2)}MB\n`;
    report += `- 使用趋势: ${stats.trend === 'increasing' ? '上升' : stats.trend === 'decreasing' ? '下降' : '稳定'}\n\n`;
    
    report += `历史记录: ${history.length} 条\n`;
    report += `监控状态: ${this.isMonitoring ? '运行中' : '已停止'}\n\n`;
    
    report += `优化策略:\n`;
    this.optimizationStrategies.forEach(strategy => {
      const status = strategy.enabled ? '启用' : '禁用';
      report += `- ${strategy.name}: ${status} (风险: ${strategy.risk})\n`;
    });
    
    return report;
  }

  /**
   * 清理内存管理器
   */
  public cleanup(): void {
    this.stopMonitoring();
    this.memoryHistory = [];
  }
}

// 导出单例实例
export const memoryManager = MemoryManager.getInstance();
