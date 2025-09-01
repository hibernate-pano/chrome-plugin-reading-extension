/**
 * 缓存策略类型
 */
export enum CacheStrategy {
  LRU = 'lru',           // 最近最少使用
  LFU = 'lfu',           // 最少使用频率
  FIFO = 'fifo',         // 先进先出
  TTL = 'ttl',           // 基于时间
  ADAPTIVE = 'adaptive'  // 自适应策略
}

/**
 * 缓存项接口
 */
export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  size: number; // 大小 (bytes)
  compressed: boolean;
  metadata?: Record<string, any>;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  strategy: CacheStrategy;
  maxSize: number;        // 最大缓存大小 (MB)
  maxItems: number;       // 最大缓存项数
  ttl: number;           // 生存时间 (ms)
  compressionThreshold: number; // 压缩阈值 (bytes)
  enableCompression: boolean;
  enablePersistence: boolean;
  persistenceKey: string;
  cleanupInterval: number; // 清理间隔 (ms)
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  averageAccessTime: number;
  compressionRatio: number;
  evictionCount: number;
}

/**
 * 缓存策略管理器
 * 
 * 功能：
 * - 多级缓存策略
 * - LRU/LFU/FIFO/TTL/自适应策略
 * - 数据压缩
 * - 持久化存储
 * - 性能监控
 * - 智能清理
 */
export class CacheStrategyManager {
  private static instance: CacheStrategyManager;
  
  // 缓存存储
  private cache: Map<string, CacheItem> = new Map();
  private accessOrder: string[] = []; // 访问顺序
  private accessFrequency: Map<string, number> = new Map(); // 访问频率
  
  // 配置和状态
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  
  // 事件回调
  private onCacheHit: ((key: string) => void) | null = null;
  private onCacheMiss: ((key: string) => void) | null = null;
  private onCacheEviction: ((key: string, reason: string) => void) | null = null;
  private onCacheFull: (() => void) | null = null;

  constructor() {
    this.config = {
      strategy: CacheStrategy.LRU,
      maxSize: 100, // 100MB
      maxItems: 1000,
      ttl: 300000, // 5分钟
      compressionThreshold: 1024, // 1KB
      enableCompression: true,
      enablePersistence: true,
      persistenceKey: 'chrome-extension-cache',
      cleanupInterval: 60000 // 1分钟
    };
    
    this.stats = {
      totalItems: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      compressionRatio: 1,
      evictionCount: 0
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CacheStrategyManager {
    if (!CacheStrategyManager.instance) {
      CacheStrategyManager.instance = new CacheStrategyManager();
    }
    return CacheStrategyManager.instance;
  }

  /**
   * 初始化缓存管理器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // 从持久化存储恢复缓存
    if (this.config.enablePersistence) {
      await this.loadFromPersistence();
    }
    
    // 启动清理定时器
    this.startCleanupTimer();
    
    this.isInitialized = true;
    console.log('缓存策略管理器已初始化');
  }

  /**
   * 设置缓存项
   */
  public set<T>(key: string, value: T, metadata?: Record<string, any>): boolean {
    try {
      const startTime = performance.now();
      
      // 检查缓存是否已满
      if (this.isCacheFull()) {
        this.evictItems();
      }
      
      // 计算大小
      const size = this.calculateSize(value);
      
      // 检查是否需要压缩
      let compressedValue = value;
      let compressed = false;
      
      if (this.config.enableCompression && size > this.config.compressionThreshold) {
        compressedValue = this.compress(value);
        compressed = true;
      }
      
      // 创建缓存项
      const item: CacheItem<T> = {
        key,
        value: compressedValue,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccess: Date.now(),
        size,
        compressed,
        metadata
      };
      
      // 如果键已存在，先移除旧项
      if (this.cache.has(key)) {
        this.remove(key);
      }
      
      // 添加到缓存
      this.cache.set(key, item);
      this.accessOrder.push(key);
      this.accessFrequency.set(key, 0);
      
      // 更新统计信息
      this.stats.totalItems++;
      this.stats.totalSize += size;
      
      // 更新访问时间统计
      const accessTime = performance.now() - startTime;
      this.updateAccessTimeStats(accessTime);
      
      return true;
      
    } catch (error) {
      console.error('设置缓存项失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存项
   */
  public get<T>(key: string): T | null {
    try {
      const startTime = performance.now();
      
      const item = this.cache.get(key);
      if (!item) {
        this.recordCacheMiss();
        return null;
      }
      
      // 检查TTL
      if (this.isExpired(item)) {
        this.remove(key);
        this.recordCacheMiss();
        return null;
      }
      
      // 更新访问信息
      this.updateAccessInfo(key);
      
      // 记录缓存命中
      this.recordCacheHit();
      
      // 更新访问时间统计
      const accessTime = performance.now() - startTime;
      this.updateAccessTimeStats(accessTime);
      
      // 解压缩（如果需要）
      if (item.compressed) {
        return this.decompress(item.value);
      }
      
      return item.value;
      
    } catch (error) {
      console.error('获取缓存项失败:', error);
      this.recordCacheMiss();
      return null;
    }
  }

  /**
   * 检查缓存项是否存在
   */
  public has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (this.isExpired(item)) {
      this.remove(key);
      return false;
    }
    
    return true;
  }

  /**
   * 移除缓存项
   */
  public remove(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // 从缓存中移除
    this.cache.delete(key);
    
    // 从访问顺序中移除
    const orderIndex = this.accessOrder.indexOf(key);
    if (orderIndex > -1) {
      this.accessOrder.splice(orderIndex, 1);
    }
    
    // 从访问频率中移除
    this.accessFrequency.delete(key);
    
    // 更新统计信息
    this.stats.totalItems--;
    this.stats.totalSize -= item.size;
    
    return true;
  }

  /**
   * 清空缓存
   */
  public clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.accessFrequency.clear();
    
    this.stats.totalItems = 0;
    this.stats.totalSize = 0;
    this.stats.hitCount = 0;
    this.stats.missCount = 0;
    this.stats.evictionCount = 0;
    
    // 清理持久化存储
    if (this.config.enablePersistence) {
      this.clearPersistence();
    }
  }

  /**
   * 获取缓存统计信息
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 设置配置
   */
  public setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果配置改变，可能需要清理缓存
    if (this.config.maxSize !== config.maxSize || this.config.maxItems !== config.maxItems) {
      this.evictItems();
    }
  }

  /**
   * 获取配置
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * 检查缓存是否已满
   */
  private isCacheFull(): boolean {
    return this.stats.totalItems >= this.config.maxItems || 
           this.stats.totalSize >= this.config.maxSize * 1024 * 1024;
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > this.config.ttl;
  }

  /**
   * 计算值的大小
   */
  private calculateSize(value: any): number {
    try {
      const serialized = JSON.stringify(value);
      return new Blob([serialized]).size;
    } catch {
      return 1024; // 默认1KB
    }
  }

  /**
   * 压缩值
   */
  private compress(value: any): any {
    try {
      // 简单的压缩策略：移除不必要的属性
      if (typeof value === 'object' && value !== null) {
        const compressed: any = {};
        for (const [key, val] of Object.entries(value)) {
          if (key.startsWith('_') || key === 'default') continue;
          compressed[key] = val;
        }
        return compressed;
      }
      return value;
    } catch {
      return value;
    }
  }

  /**
   * 解压缩值
   */
  private decompress(value: any): any {
    // 简单的解压缩策略：直接返回值
    return value;
  }

  /**
   * 更新访问信息
   */
  private updateAccessInfo(key: string): void {
    const item = this.cache.get(key);
    if (!item) return;
    
    // 更新访问次数和时间
    item.accessCount++;
    item.lastAccess = Date.now();
    
    // 更新访问频率
    const frequency = this.accessFrequency.get(key) || 0;
    this.accessFrequency.set(key, frequency + 1);
    
    // 根据策略更新访问顺序
    this.updateAccessOrder(key);
  }

  /**
   * 更新访问顺序
   */
  private updateAccessOrder(key: string): void {
    switch (this.config.strategy) {
      case CacheStrategy.LRU:
        // 最近最少使用：将访问的项移到末尾
        const lruIndex = this.accessOrder.indexOf(key);
        if (lruIndex > -1) {
          this.accessOrder.splice(lruIndex, 1);
        }
        this.accessOrder.push(key);
        break;
        
      case CacheStrategy.LFU:
        // 最少使用频率：根据访问频率排序
        this.sortByFrequency();
        break;
        
      case CacheStrategy.FIFO:
        // 先进先出：不改变顺序
        break;
        
      case CacheStrategy.TTL:
        // 基于时间：不改变顺序
        break;
        
      case CacheStrategy.ADAPTIVE:
        // 自适应：根据访问模式动态调整
        this.adaptiveUpdate(key);
        break;
    }
  }

  /**
   * 按频率排序
   */
  private sortByFrequency(): void {
    this.accessOrder.sort((a, b) => {
      const freqA = this.accessFrequency.get(a) || 0;
      const freqB = this.accessFrequency.get(b) || 0;
      return freqB - freqA; // 降序排列
    });
  }

  /**
   * 自适应更新
   */
  private adaptiveUpdate(key: string): void {
    const item = this.cache.get(key);
    if (!item) return;
    
    // 根据访问模式决定策略
    if (item.accessCount > 10) {
      // 高频访问：使用LRU策略
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    } else {
      // 低频访问：使用LFU策略
      this.sortByFrequency();
    }
  }

  /**
   * 驱逐缓存项
   */
  private evictItems(): void {
    const itemsToEvict: string[] = [];
    
    switch (this.config.strategy) {
      case CacheStrategy.LRU:
        // 移除最久未访问的项
        itemsToEvict.push(...this.accessOrder.slice(0, Math.floor(this.stats.totalItems * 0.2)));
        break;
        
      case CacheStrategy.LFU:
        // 移除访问频率最低的项
        this.sortByFrequency();
        itemsToEvict.push(...this.accessOrder.slice(-Math.floor(this.stats.totalItems * 0.2)));
        break;
        
      case CacheStrategy.FIFO:
        // 移除最早添加的项
        itemsToEvict.push(...this.accessOrder.slice(0, Math.floor(this.stats.totalItems * 0.2)));
        break;
        
      case CacheStrategy.TTL:
        // 移除过期的项
        for (const [key, item] of this.cache) {
          if (this.isExpired(item)) {
            itemsToEvict.push(key);
          }
        }
        break;
        
      case CacheStrategy.ADAPTIVE:
        // 自适应驱逐：根据策略动态选择
        this.adaptiveEviction(itemsToEvict);
        break;
    }
    
    // 执行驱逐
    for (const key of itemsToEvict) {
      this.remove(key);
      this.stats.evictionCount++;
      this.onCacheEviction?.(key, 'strategy-eviction');
    }
    
    // 如果仍然满，继续驱逐
    if (this.isCacheFull()) {
      this.evictItems();
    }
  }

  /**
   * 自适应驱逐
   */
  private adaptiveEviction(itemsToEvict: string[]): void {
    // 分析缓存使用模式
    const highUsage = this.accessOrder.slice(-Math.floor(this.stats.totalItems * 0.3));
    const lowUsage = this.accessOrder.slice(0, Math.floor(this.stats.totalItems * 0.3));
    
    // 优先保留高频使用的项
    itemsToEvict.push(...lowUsage);
  }

  /**
   * 记录缓存命中
   */
  private recordCacheHit(): void {
    this.stats.hitCount++;
    this.updateHitRate();
    this.onCacheHit?.(key);
  }

  /**
   * 记录缓存未命中
   */
  private recordCacheMiss(): void {
    this.stats.missCount++;
    this.updateHitRate();
    this.onCacheMiss?.(key);
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
  }

  /**
   * 更新访问时间统计
   */
  private updateAccessTimeStats(accessTime: number): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.averageAccessTime = total > 0 ? 
      (this.stats.averageAccessTime * (total - 1) + accessTime) / total : accessTime;
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 清理过期项
   */
  private cleanup(): void {
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache) {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.remove(key);
      this.stats.evictionCount++;
      this.onCacheEviction?.(key, 'ttl-expired');
    }
  }

  /**
   * 从持久化存储加载
   */
  private async loadFromPersistence(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.config.persistenceKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(data.cache || []);
        this.accessOrder = data.accessOrder || [];
        this.accessFrequency = new Map(data.accessFrequency || []);
        this.stats = data.stats || this.stats;
      }
    } catch (error) {
      console.warn('从持久化存储加载缓存失败:', error);
    }
  }

  /**
   * 保存到持久化存储
   */
  private async saveToPersistence(): Promise<void> {
    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        accessOrder: this.accessOrder,
        accessFrequency: Array.from(this.accessFrequency.entries()),
        stats: this.stats
      };
      
      localStorage.setItem(this.config.persistenceKey, JSON.stringify(data));
    } catch (error) {
      console.warn('保存缓存到持久化存储失败:', error);
    }
  }

  /**
   * 清理持久化存储
   */
  private clearPersistence(): void {
    try {
      localStorage.removeItem(this.config.persistenceKey);
    } catch (error) {
      console.warn('清理持久化存储失败:', error);
    }
  }

  /**
   * 设置事件回调
   */
  public onCacheHit(callback: (key: string) => void): void {
    this.onCacheHit = callback;
  }

  public onCacheMiss(callback: (key: string) => void): void {
    this.onCacheMiss = callback;
  }

  public onCacheEviction(callback: (key: string, reason: string) => void): void {
    this.onCacheEviction = callback;
  }

  public onCacheFull(callback: () => void): void {
    this.onCacheFull = callback;
  }

  /**
   * 生成缓存报告
   */
  public generateReport(): string {
    let report = '缓存策略管理器报告\n';
    report += '==================\n\n';
    
    report += `配置:\n`;
    report += `- 策略: ${this.config.strategy}\n`;
    report += `- 最大大小: ${this.config.maxSize}MB\n`;
    report += `- 最大项数: ${this.config.maxItems}\n`;
    report += `- TTL: ${this.config.ttl}ms\n`;
    report += `- 启用压缩: ${this.config.enableCompression}\n`;
    report += `- 启用持久化: ${this.config.enablePersistence}\n\n`;
    
    report += `统计信息:\n`;
    report += `- 总项数: ${this.stats.totalItems}\n`;
    report += `- 总大小: ${(this.stats.totalSize / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- 命中次数: ${this.stats.hitCount}\n`;
    report += `- 未命中次数: ${this.stats.missCount}\n`;
    report += `- 命中率: ${(this.stats.hitRate * 100).toFixed(1)}%\n`;
    report += `- 平均访问时间: ${this.stats.averageAccessTime.toFixed(2)}ms\n`;
    report += `- 驱逐次数: ${this.stats.evictionCount}\n`;
    
    return report;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.config.enablePersistence) {
      this.saveToPersistence();
    }
  }
}

// 导出单例实例
export const cacheStrategyManager = CacheStrategyManager.getInstance();
