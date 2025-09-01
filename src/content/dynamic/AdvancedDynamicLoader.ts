import { performanceMonitor } from '../../utils/performance';

/**
 * 模块加载优先级
 */
export enum LoadPriority {
  CRITICAL = 'critical',    // 关键模块，立即加载
  HIGH = 'high',           // 高优先级，优先加载
  NORMAL = 'normal',       // 普通优先级，空闲时加载
  LOW = 'low',             // 低优先级，最后加载
  BACKGROUND = 'background' // 后台加载，不影响用户体验
}

/**
 * 模块加载状态
 */
export enum LoadStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
  CACHED = 'cached'
}

/**
 * 模块信息接口
 */
export interface ModuleInfo {
  type: string;
  priority: LoadPriority;
  dependencies: string[];
  size: number; // 预估大小 (KB)
  loadTime: number; // 平均加载时间 (ms)
  usageCount: number; // 使用次数
  lastUsed: number; // 最后使用时间
  errorCount: number; // 错误次数
  retryCount: number; // 重试次数
}

/**
 * 加载策略配置
 */
export interface LoadStrategyConfig {
  enablePreloading: boolean;
  enableCaching: boolean;
  enableCompression: boolean;
  maxConcurrentLoads: number;
  retryAttempts: number;
  retryDelay: number;
  cacheExpiry: number; // 缓存过期时间 (ms)
  preloadThreshold: number; // 预加载阈值
  compressionThreshold: number; // 压缩阈值 (KB)
}

/**
 * 加载性能指标
 */
export interface LoadPerformanceMetrics {
  totalModules: number;
  loadedModules: number;
  cachedModules: number;
  failedModules: number;
  averageLoadTime: number;
  totalLoadTime: number;
  cacheHitRate: number;
  compressionRatio: number;
}

/**
 * 高级动态加载管理器
 * 
 * 功能：
 * - 智能预加载策略
 * - 多级缓存机制
 * - 性能监控和优化
 * - 依赖关系管理
 * - 错误处理和重试
 * - 压缩和优化
 */
export class AdvancedDynamicLoader {
  private static instance: AdvancedDynamicLoader;
  
  // 模块状态管理
  private moduleStates: Map<string, LoadStatus> = new Map();
  private moduleInfos: Map<string, ModuleInfo> = new Map();
  private moduleCache: Map<string, any> = new Map();
  private loadingQueue: Array<{ type: string; priority: LoadPriority; resolve: Function; reject: Function }> = [];
  
  // 配置和状态
  private config: LoadStrategyConfig;
  private isInitialized: boolean = false;
  private activeLoads: number = 0;
  private performanceMetrics: LoadPerformanceMetrics;
  
  // 事件回调
  private onModuleLoad: ((type: string, loadTime: number) => void) | null = null;
  private onModuleError: ((type: string, error: Error) => void) | null = null;
  private onCacheHit: ((type: string) => void) | null = null;
  private onPreloadComplete: ((types: string[]) => void) | null = null;

  constructor() {
    this.config = {
      enablePreloading: true,
      enableCaching: true,
      enableCompression: true,
      maxConcurrentLoads: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheExpiry: 300000, // 5分钟
      preloadThreshold: 0.7,
      compressionThreshold: 50
    };
    
    this.performanceMetrics = {
      totalModules: 0,
      loadedModules: 0,
      cachedModules: 0,
      failedModules: 0,
      averageLoadTime: 0,
      totalLoadTime: 0,
      cacheHitRate: 0,
      compressionRatio: 1
    };
    
    this.initializeModuleRegistry();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AdvancedDynamicLoader {
    if (!AdvancedDynamicLoader.instance) {
      AdvancedDynamicLoader.instance = new AdvancedDynamicLoader();
    }
    return AdvancedDynamicLoader.instance;
  }

  /**
   * 初始化模块注册表
   */
  private initializeModuleRegistry(): void {
    // 注册核心模块
    this.registerModule({
      type: 'reader-mode',
      priority: LoadPriority.HIGH,
      dependencies: ['content-extraction', 'ui-components'],
      size: 150,
      loadTime: 200,
      usageCount: 0,
      lastUsed: 0,
      errorCount: 0,
      retryCount: 0
    });

    this.registerModule({
      type: 'content-extraction',
      priority: LoadPriority.HIGH,
      dependencies: ['utils'],
      size: 80,
      loadTime: 150,
      usageCount: 0,
      lastUsed: 0,
      errorCount: 0,
      retryCount: 0
    });

    this.registerModule({
      type: 'performance',
      priority: LoadPriority.NORMAL,
      dependencies: ['utils'],
      size: 60,
      loadTime: 100,
      usageCount: 0,
      lastUsed: 0,
      errorCount: 0,
      retryCount: 0
    });

    this.registerModule({
      type: 'ui-components',
      priority: LoadPriority.NORMAL,
      dependencies: ['animations'],
      size: 120,
      loadTime: 180,
      usageCount: 0,
      lastUsed: 0,
      errorCount: 0,
      retryCount: 0
    });

    this.registerModule({
      type: 'utils',
      priority: LoadPriority.LOW,
      dependencies: [],
      size: 40,
      loadTime: 80,
      usageCount: 0,
      lastUsed: 0,
      errorCount: 0,
      retryCount: 0
    });

    this.registerModule({
      type: 'animations',
      priority: LoadPriority.LOW,
      dependencies: [],
      size: 30,
      loadTime: 60,
      usageCount: 0,
      lastUsed: 0,
      errorCount: 0,
      retryCount: 0
    });

    this.performanceMetrics.totalModules = this.moduleInfos.size;
  }

  /**
   * 注册模块
   */
  private registerModule(info: ModuleInfo): void {
    this.moduleInfos.set(info.type, info);
    this.moduleStates.set(info.type, LoadStatus.IDLE);
  }

  /**
   * 加载模块
   */
  public async loadModule(type: string, priority: LoadPriority = LoadPriority.NORMAL): Promise<any> {
    // 检查缓存
    if (this.config.enableCaching && this.moduleCache.has(type)) {
      const cached = this.moduleCache.get(type);
      if (this.isCacheValid(cached)) {
        this.onCacheHit?.(type);
        this.updateModuleUsage(type);
        return cached.module;
      } else {
        this.moduleCache.delete(type);
      }
    }

    // 检查是否已加载
    if (this.moduleStates.get(type) === LoadStatus.LOADED) {
      this.updateModuleUsage(type);
      return this.getLoadedModule(type);
    }

    // 检查是否正在加载
    if (this.moduleStates.get(type) === LoadStatus.LOADING) {
      return this.waitForModuleLoad(type);
    }

    // 添加到加载队列
    return new Promise((resolve, reject) => {
      this.loadingQueue.push({ type, priority, resolve, reject });
      this.processLoadingQueue();
    });
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cached: any): boolean {
    return cached.timestamp > Date.now() - this.config.cacheExpiry;
  }

  /**
   * 等待模块加载完成
   */
  private async waitForModuleLoad(type: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const status = this.moduleStates.get(type);
        if (status === LoadStatus.LOADED) {
          resolve(this.getLoadedModule(type));
        } else if (status === LoadStatus.ERROR) {
          reject(new Error(`Module ${type} failed to load`));
        } else {
          setTimeout(checkStatus, 50);
        }
      };
      checkStatus();
    });
  }

  /**
   * 处理加载队列
   */
  private async processLoadingQueue(): Promise<void> {
    if (this.activeLoads >= this.config.maxConcurrentLoads || this.loadingQueue.length === 0) {
      return;
    }

    // 按优先级排序队列
    this.loadingQueue.sort((a, b) => {
      const priorityOrder = { [LoadPriority.CRITICAL]: 0, [LoadPriority.HIGH]: 1, [LoadPriority.NORMAL]: 2, [LoadPriority.LOW]: 3, [LoadPriority.BACKGROUND]: 4 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const nextLoad = this.loadingQueue.shift();
    if (!nextLoad) return;

    this.activeLoads++;
    this.moduleStates.set(nextLoad.type, LoadStatus.LOADING);

    try {
      const startTime = performance.now();
      const module = await this.performModuleLoad(nextLoad.type);
      const loadTime = performance.now() - startTime;

      // 更新模块状态
      this.moduleStates.set(nextLoad.type, LoadStatus.LOADED);
      this.updateModuleInfo(nextLoad.type, { loadTime, usageCount: 1, lastUsed: Date.now() });

      // 缓存模块
      if (this.config.enableCaching) {
        this.cacheModule(nextLoad.type, module);
      }

      // 更新性能指标
      this.updatePerformanceMetrics(loadTime, true);

      // 触发回调
      this.onModuleLoad?.(nextLoad.type, loadTime);
      nextLoad.resolve(module);

    } catch (error) {
      this.moduleStates.set(nextLoad.type, LoadStatus.ERROR);
      this.updateModuleInfo(nextLoad.type, { errorCount: 1 });
      this.updatePerformanceMetrics(0, false);

      // 触发错误回调
      this.onModuleError?.(nextLoad.type, error instanceof Error ? error : new Error(String(error)));
      nextLoad.reject(error);
    } finally {
      this.activeLoads--;
      this.processLoadingQueue(); // 处理下一个加载任务
    }
  }

  /**
   * 执行模块加载
   */
  private async performModuleLoad(type: string): Promise<any> {
    const moduleInfo = this.moduleInfos.get(type);
    if (!moduleInfo) {
      throw new Error(`Unknown module type: ${type}`);
    }

    // 加载依赖
    for (const dep of moduleInfo.dependencies) {
      await this.loadModule(dep, LoadPriority.HIGH);
    }

    // 实际加载模块
    switch (type) {
      case 'reader-mode':
        return await import('../../content/features/readingMode');
      case 'content-extraction':
        return await import('../../content/features/contentExtraction');
      case 'performance':
        return await import('../../utils/performance');
      case 'ui-components':
        return await import('../../content/ui');
      case 'utils':
        return await import('../../utils');
      case 'animations':
        return await import('../../content/ui/buttonAnimations');
      default:
        throw new Error(`Unknown module type: ${type}`);
    }
  }

  /**
   * 缓存模块
   */
  private cacheModule(type: string, module: any): void {
    if (this.config.enableCompression && this.shouldCompress(type)) {
      // 压缩模块数据
      const compressed = this.compressModule(module);
      this.moduleCache.set(type, {
        module: compressed,
        timestamp: Date.now(),
        compressed: true
      });
    } else {
      this.moduleCache.set(type, {
        module,
        timestamp: Date.now(),
        compressed: false
      });
    }
  }

  /**
   * 判断是否应该压缩
   */
  private shouldCompress(type: string): boolean {
    const info = this.moduleInfos.get(type);
    return info ? info.size > this.config.compressionThreshold : false;
  }

  /**
   * 压缩模块
   */
  private compressModule(module: any): any {
    // 简单的压缩策略：移除不必要的属性
    if (typeof module === 'object' && module !== null) {
      const compressed: any = {};
      for (const [key, value] of Object.entries(module)) {
        if (key.startsWith('_') || key === 'default') continue;
        compressed[key] = value;
      }
      return compressed;
    }
    return module;
  }

  /**
   * 获取已加载的模块
   */
  private getLoadedModule(type: string): any {
    // 这里应该返回实际加载的模块
    // 由于Chrome扩展的限制，我们返回一个占位符
    return { type, status: 'loaded' };
  }

  /**
   * 更新模块使用信息
   */
  private updateModuleUsage(type: string): void {
    const info = this.moduleInfos.get(type);
    if (info) {
      info.usageCount++;
      info.lastUsed = Date.now();
    }
  }

  /**
   * 更新模块信息
   */
  private updateModuleInfo(type: string, updates: Partial<ModuleInfo>): void {
    const info = this.moduleInfos.get(type);
    if (info) {
      Object.assign(info, updates);
    }
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(loadTime: number, success: boolean): void {
    if (success) {
      this.performanceMetrics.loadedModules++;
      this.performanceMetrics.totalLoadTime += loadTime;
      this.performanceMetrics.averageLoadTime = this.performanceMetrics.totalLoadTime / this.performanceMetrics.loadedModules;
    } else {
      this.performanceMetrics.failedModules++;
    }

    this.performanceMetrics.cacheHitRate = this.performanceMetrics.cachedModules / this.performanceMetrics.totalModules;
  }

  /**
   * 智能预加载
   */
  public async smartPreload(): Promise<void> {
    if (!this.config.enablePreloading) return;

    // 基于用户行为的预加载
    const userBehavior = this.analyzeUserBehavior();
    const preloadCandidates = this.selectPreloadCandidates(userBehavior);

    // 在空闲时间预加载
    if (this.isIdle()) {
      await this.preloadModules(preloadCandidates, LoadPriority.BACKGROUND);
    }
  }

  /**
   * 分析用户行为
   */
  private analyzeUserBehavior(): {
    scrollDepth: number;
    timeOnPage: number;
    interactionCount: number;
    mouseMovement: number;
  } {
    // 这里应该实现实际的用户行为分析
    // 暂时返回模拟数据
    return {
      scrollDepth: Math.random(),
      timeOnPage: Date.now() - performance.timing.navigationStart,
      interactionCount: Math.floor(Math.random() * 10),
      mouseMovement: Math.random()
    };
  }

  /**
   * 选择预加载候选
   */
  private selectPreloadCandidates(behavior: any): string[] {
    const candidates: string[] = [];

    // 基于滚动深度
    if (behavior.scrollDepth > this.config.preloadThreshold) {
      candidates.push('reader-mode', 'content-extraction');
    }

    // 基于页面停留时间
    if (behavior.timeOnPage > 10000) { // 10秒
      candidates.push('ui-components', 'animations');
    }

    // 基于交互次数
    if (behavior.interactionCount > 5) {
      candidates.push('performance', 'utils');
    }

    return candidates;
  }

  /**
   * 检查是否空闲
   */
  private isIdle(): boolean {
    return this.activeLoads === 0 && this.loadingQueue.length === 0;
  }

  /**
   * 预加载模块
   */
  private async preloadModules(types: string[], priority: LoadPriority): Promise<void> {
    const preloadPromises = types.map(type => 
      this.loadModule(type, priority).catch(() => {
        // 预加载失败不影响主流程
        console.debug(`Preload failed for module: ${type}`);
      })
    );

    await Promise.all(preloadPromises);
    this.onPreloadComplete?.(types);
  }

  /**
   * 获取模块状态
   */
  public getModuleStatus(type: string): LoadStatus {
    return this.moduleStates.get(type) || LoadStatus.IDLE;
  }

  /**
   * 获取模块信息
   */
  public getModuleInfo(type: string): ModuleInfo | undefined {
    return this.moduleInfos.get(type);
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(): LoadPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 设置配置
   */
  public setConfig(config: Partial<LoadStrategyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  public getConfig(): LoadStrategyConfig {
    return { ...this.config };
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    this.moduleCache.clear();
    this.performanceMetrics.cachedModules = 0;
  }

  /**
   * 设置事件回调
   */
  public onModuleLoad(callback: (type: string, loadTime: number) => void): void {
    this.onModuleLoad = callback;
  }

  public onModuleError(callback: (type: string, error: Error) => void): void {
    this.onModuleError = callback;
  }

  public onCacheHit(callback: (type: string) => void): void {
    this.onCacheHit = callback;
  }

  public onPreloadComplete(callback: (types: string[]) => void): void {
    this.onPreloadComplete = callback;
  }

  /**
   * 生成加载报告
   */
  public generateReport(): string {
    let report = '高级动态加载器报告\n';
    report += '====================\n\n';
    
    report += `性能指标:\n`;
    report += `- 总模块数: ${this.performanceMetrics.totalModules}\n`;
    report += `- 已加载模块: ${this.performanceMetrics.loadedModules}\n`;
    report += `- 缓存模块: ${this.performanceMetrics.cachedModules}\n`;
    report += `- 失败模块: ${this.performanceMetrics.failedModules}\n`;
    report += `- 平均加载时间: ${this.performanceMetrics.averageLoadTime.toFixed(2)}ms\n`;
    report += `- 缓存命中率: ${(this.performanceMetrics.cacheHitRate * 100).toFixed(1)}%\n`;
    report += `- 压缩比例: ${this.performanceMetrics.compressionRatio.toFixed(2)}\n\n`;
    
    report += `模块状态:\n`;
    for (const [type, status] of this.moduleStates) {
      const info = this.moduleInfos.get(type);
      report += `- ${type}: ${status}`;
      if (info) {
        report += ` (优先级: ${info.priority}, 大小: ${info.size}KB, 使用次数: ${info.usageCount})`;
      }
      report += '\n';
    }
    
    return report;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.clearCache();
    this.loadingQueue = [];
    this.activeLoads = 0;
    this.moduleStates.clear();
  }
}

// 导出单例实例
export const advancedDynamicLoader = AdvancedDynamicLoader.getInstance();
