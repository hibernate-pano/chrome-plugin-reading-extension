/**
 * 缓存管理器
 * 用于缓存提取结果，减少重复处理
 */

// 缓存项接口
export interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
}

// 缓存管理器类
export class CacheManager<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  /**
   * 构造函数
   * @param maxSize 缓存最大项数
   * @param defaultTTL 默认缓存时间（毫秒）
   */
  constructor(maxSize: number = 100, defaultTTL: number = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * 设置缓存项
   */
  public set(key: string, value: T, ttl: number = this.defaultTTL): void {
    // 如果缓存已满，移除最旧的项
    if (this.cache.size >= this.maxSize) {
      this.removeOldest();
    }

    const now = Date.now();
    const expiresAt = now + ttl;

    this.cache.set(key, {
      value,
      timestamp: now,
      expiresAt
    });
  }

  /**
   * 获取缓存项
   */
  public get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 检查缓存项是否存在
   */
  public has(key: string): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存项
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有缓存键
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 移除最旧的缓存项
   */
  private removeOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    // 查找最旧的项
    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestKey = key;
        oldestTimestamp = item.timestamp;
      }
    }

    // 移除最旧的项
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清理过期项
   */
  public cleanExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取或设置缓存项
   * 如果缓存中不存在或已过期，则调用 factory 函数获取值并缓存
   */
  public async getOrSet(key: string, factory: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
    // 尝试从缓存获取
    const cachedValue = this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // 调用 factory 函数获取值
    const value = await factory();

    // 缓存结果
    this.set(key, value, ttl);

    return value;
  }

  /**
   * 同步版本的获取或设置缓存项
   */
  public getOrSetSync(key: string, factory: () => T, ttl: number = this.defaultTTL): T {
    // 尝试从缓存获取
    const cachedValue = this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // 调用 factory 函数获取值
    const value = factory();

    // 缓存结果
    this.set(key, value, ttl);

    return value;
  }
}

// 创建内容提取缓存实例
export const extractionCache = new CacheManager<any>(50, 5 * 60 * 1000); // 5分钟缓存

// 创建表格处理缓存实例
export const tableCache = new CacheManager<any>(30, 10 * 60 * 1000); // 10分钟缓存

// 创建代码块处理缓存实例
export const codeCache = new CacheManager<any>(30, 10 * 60 * 1000); // 10分钟缓存

// 创建列表处理缓存实例
export const listCache = new CacheManager<any>(30, 10 * 60 * 1000); // 10分钟缓存
