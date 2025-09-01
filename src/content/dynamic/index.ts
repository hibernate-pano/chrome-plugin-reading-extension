// 导出原有的动态加载功能
export * from './dynamicLoader';
export * from './preloadStrategy';

// 导出新的高级动态加载系统
export * from './AdvancedDynamicLoader';
export * from './IntelligentPreloadStrategy';
export * from './CacheStrategyManager';

// 导出类型和枚举
export type {
  ModuleInfo,
  LoadStrategyConfig,
  LoadPerformanceMetrics,
  PreloadStrategyConfig,
  PreloadEvent,
  PreloadStats,
  CacheItem,
  CacheConfig,
  CacheStats
} from './AdvancedDynamicLoader';

export {
  LoadPriority,
  LoadStatus,
  PreloadTrigger,
  CacheStrategy
} from './AdvancedDynamicLoader';

// 导出单例实例
export {
  advancedDynamicLoader,
  intelligentPreloadStrategy,
  cacheStrategyManager
} from './AdvancedDynamicLoader';

// 创建统一的动态加载管理器
import { advancedDynamicLoader } from './AdvancedDynamicLoader';
import { intelligentPreloadStrategy } from './IntelligentPreloadStrategy';
import { cacheStrategyManager } from './CacheStrategyManager';

/**
 * 统一动态加载管理器
 * 
 * 整合了所有动态加载功能：
 * - 高级动态加载器
 * - 智能预加载策略
 * - 缓存策略管理
 */
export class UnifiedDynamicLoader {
  private static instance: UnifiedDynamicLoader;
  
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  public static getInstance(): UnifiedDynamicLoader {
    if (!UnifiedDynamicLoader.instance) {
      UnifiedDynamicLoader.instance = new UnifiedDynamicLoader();
    }
    return UnifiedDynamicLoader.instance;
  }
  
  /**
   * 初始化所有动态加载组件
   */
  public async initialize(): Promise<void> {
    try {
      // 初始化缓存管理器
      await cacheStrategyManager.initialize();
      
      // 启动智能预加载策略
      intelligentPreloadStrategy.start();
      
      // 设置事件回调
      this.setupEventCallbacks();
      
      console.log('统一动态加载管理器已初始化');
    } catch (error) {
      console.error('初始化统一动态加载管理器失败:', error);
      throw error;
    }
  }
  
  /**
   * 设置事件回调
   */
  private setupEventCallbacks(): void {
    // 动态加载器事件
    advancedDynamicLoader.onModuleLoad((type, loadTime) => {
      console.debug(`模块加载完成: ${type}, 耗时: ${loadTime.toFixed(2)}ms`);
    });
    
    advancedDynamicLoader.onModuleError((type, error) => {
      console.warn(`模块加载失败: ${type}`, error);
    });
    
    advancedDynamicLoader.onCacheHit((type) => {
      console.debug(`模块缓存命中: ${type}`);
    });
    
    // 预加载策略事件
    intelligentPreloadStrategy.onCacheHit((key) => {
      console.debug(`预加载缓存命中: ${key}`);
    });
    
    // 缓存策略事件
    cacheStrategyManager.onCacheHit((key) => {
      console.debug(`缓存命中: ${key}`);
    });
    
    cacheStrategyManager.onCacheMiss((key) => {
      console.debug(`缓存未命中: ${key}`);
    });
    
    cacheStrategyManager.onCacheEviction((key, reason) => {
      console.debug(`缓存项被驱逐: ${key}, 原因: ${reason}`);
    });
  }
  
  /**
   * 加载模块（使用高级加载器）
   */
  public async loadModule(type: string, priority?: any): Promise<any> {
    return advancedDynamicLoader.loadModule(type, priority);
  }
  
  /**
   * 预加载模块
   */
  public async preloadModules(types: string[]): Promise<void> {
    return intelligentPreloadStrategy.manualPreload(types);
  }
  
  /**
   * 设置缓存项
   */
  public setCache<T>(key: string, value: T, metadata?: Record<string, any>): boolean {
    return cacheStrategyManager.set(key, value, metadata);
  }
  
  /**
   * 获取缓存项
   */
  public getCache<T>(key: string): T | null {
    return cacheStrategyManager.get<T>(key);
  }
  
  /**
   * 获取模块状态
   */
  public getModuleStatus(type: string): any {
    return advancedDynamicLoader.getModuleStatus(type);
  }
  
  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(): any {
    return advancedDynamicLoader.getPerformanceMetrics();
  }
  
  /**
   * 获取预加载统计
   */
  public getPreloadStats(): any {
    return intelligentPreloadStrategy.getStats();
  }
  
  /**
   * 获取缓存统计
   */
  public getCacheStats(): any {
    return cacheStrategyManager.getStats();
  }
  
  /**
   * 生成综合报告
   */
  public generateComprehensiveReport(): string {
    let report = '统一动态加载管理器综合报告\n';
    report += '============================\n\n';
    
    // 动态加载器报告
    report += advancedDynamicLoader.generateReport();
    report += '\n';
    
    // 预加载策略报告
    report += intelligentPreloadStrategy.generateReport();
    report += '\n';
    
    // 缓存策略报告
    report += cacheStrategyManager.generateReport();
    
    return report;
  }
  
  /**
   * 优化系统
   */
  public async optimize(): Promise<void> {
    try {
      // 清理过期缓存
      cacheStrategyManager.clear();
      
      // 重置统计信息
      advancedDynamicLoader.resetStats();
      intelligentPreloadStrategy.resetStats();
      cacheStrategyManager.resetStats();
      
      console.log('动态加载系统已优化');
    } catch (error) {
      console.error('优化动态加载系统失败:', error);
      throw error;
    }
  }
  
  /**
   * 停止所有服务
   */
  public stop(): void {
    intelligentPreloadStrategy.stop();
    cacheStrategyManager.cleanup();
    console.log('统一动态加载管理器已停止');
  }
}

// 导出统一管理器实例
export const unifiedDynamicLoader = UnifiedDynamicLoader.getInstance();

// 默认导出
export default unifiedDynamicLoader;
