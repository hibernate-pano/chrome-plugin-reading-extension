import { UserSettings } from '../../types';

/**
 * 图片加载选项
 */
export interface ImageLoadingOptions {
  // 懒加载相关
  enableLazyLoading?: boolean;
  lazyLoadingThreshold?: number;
  preloadDistance?: number;

  // 预加载相关
  enablePreloading?: boolean;
  maxPreloadCount?: number;
  preloadPriority?: 'low' | 'medium' | 'high';

  // 质量和性能相关
  enableResponsiveImages?: boolean;
  enableNetworkAdaptive?: boolean;
  enableDeviceAdaptive?: boolean;
  maxImageWidth?: number;
  defaultImageQuality?: number;

  // 用户体验相关
  showLoadingIndicator?: boolean;
  enableErrorRetry?: boolean;
  maxRetryCount?: number;

  // 缓存相关
  enableImageCache?: boolean;
  cacheMaxSize?: number;
  cacheMaxAge?: number;
}

/**
 * 图片加载状态
 */
export interface ImageLoadingState {
  src: string;
  status: 'pending' | 'loading' | 'loaded' | 'error' | 'cancelled';
  priority: number;
  retryCount: number;
  loadTime?: number;
  error?: Error;
  element?: HTMLImageElement;
}

/**
 * 智能图片加载管理器
 * 基于Intersection Observer实现高效的图片懒加载和预加载
 */
export class ImageLoadingManager {
  private options: Required<ImageLoadingOptions>;
  private loadingStates = new Map<string, ImageLoadingState>();
  private intersectionObserver: IntersectionObserver | null = null;
  private imageCache = new Map<string, { data: string; timestamp: number; size: number }>();
  private isInitialized = false;
  private networkType: string = 'unknown';
  private deviceMemory: number = 4; // 默认4GB

  constructor(options: Partial<ImageLoadingOptions> = {}) {
    // 默认配置
    const defaultOptions: Required<ImageLoadingOptions> = {
      enableLazyLoading: true,
      lazyLoadingThreshold: 1.0,
      preloadDistance: 2, // 预加载视口下方2屏的内容

      enablePreloading: true,
      maxPreloadCount: 5,
      preloadPriority: 'medium',

      enableResponsiveImages: true,
      enableNetworkAdaptive: true,
      enableDeviceAdaptive: true,
      maxImageWidth: 1200,
      defaultImageQuality: 85,

      showLoadingIndicator: true,
      enableErrorRetry: true,
      maxRetryCount: 3,

      enableImageCache: true,
      cacheMaxSize: 50 * 1024 * 1024, // 50MB
      cacheMaxAge: 24 * 60 * 60 * 1000, // 24小时
    };

    this.options = { ...defaultOptions, ...options };
    this.detectDeviceCapabilities();
  }

  /**
   * 初始化图片加载管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 检测网络状况
      await this.detectNetworkConditions();

      // 创建Intersection Observer
      this.createIntersectionObserver();

      // 清理过期缓存
      this.cleanupExpiredCache();

      this.isInitialized = true;
      console.log('✅ 智能图片加载管理器初始化完成');
    } catch (error) {
      console.error('❌ 图片加载管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 注册图片元素进行管理
   */
  registerImage(img: HTMLImageElement, priority: number = 1): void {
    if (!this.isInitialized) {
      console.warn('图片加载管理器未初始化，跳过图片注册');
      return;
    }

    const src = img.src || img.dataset.src;
    if (!src) {
      console.warn('图片缺少src属性，跳过注册');
      return;
    }

    // 检查图片是否已经加载完成
    if (img.complete && img.naturalWidth > 0) {
      // 图片已经加载完成，无需再次加载
      return;
    }

    // 初始化加载状态
    const loadingState: ImageLoadingState = {
      src,
      status: 'pending',
      priority,
      retryCount: 0,
      element: img
    };

    this.loadingStates.set(src, loadingState);

    // 添加加载指示器
    if (this.options.showLoadingIndicator) {
      this.showLoadingIndicator(img);
    }

    // 如果懒加载已启用，使用Intersection Observer
    if (this.options.enableLazyLoading && this.intersectionObserver) {
      this.intersectionObserver.observe(img);
    } else {
      // 立即加载（非懒加载模式）
      this.loadImage(loadingState);
    }
  }

  /**
   * 注销图片元素
   */
  unregisterImage(src: string): void {
    this.loadingStates.delete(src);

    // 从Intersection Observer中移除
    if (this.intersectionObserver) {
      const state = this.loadingStates.get(src);
      if (state?.element) {
        this.intersectionObserver.unobserve(state.element);
      }
    }
  }

  /**
   * 更新设置
   */
  updateSettings(newSettings: Partial<UserSettings>): void {
    // 根据用户设置调整图片加载选项
    if (newSettings.fontSize !== undefined) {
      // 根据字体大小调整图片质量（更大的字体可能意味着更大的屏幕）
      if (newSettings.fontSize > 20) {
        this.options.maxImageWidth = Math.min(this.options.maxImageWidth + 200, 2400);
      }
    }

    // 根据主题调整加载策略
    if (newSettings.theme === 'dark') {
      this.options.preloadPriority = 'low'; // 深色模式下降低预加载优先级
    }

    // 更新图片加载相关设置
    if (newSettings.enableImageLazyLoading !== undefined) {
      this.options.enableLazyLoading = newSettings.enableImageLazyLoading;
    }

    if (newSettings.enableImagePreloading !== undefined) {
      this.options.enablePreloading = newSettings.enableImagePreloading;
    }

    if (newSettings.imageQuality !== undefined) {
      this.options.defaultImageQuality = newSettings.imageQuality;
    }

    if (newSettings.imageCacheSize !== undefined) {
      this.options.cacheMaxSize = newSettings.imageCacheSize * 1024 * 1024; // 转换为字节
    }
  }

  /**
   * 获取加载统计信息
   */
  getLoadingStats(): {
    total: number;
    loaded: number;
    loading: number;
    error: number;
    cacheHitRate: number;
  } {
    const states = Array.from(this.loadingStates.values());
    const total = states.length;
    const loaded = states.filter(s => s.status === 'loaded').length;
    const loading = states.filter(s => s.status === 'loading').length;
    const error = states.filter(s => s.status === 'error').length;

    // 计算缓存命中率
    const cacheHits = states.filter(s => s.loadTime && s.loadTime < 100).length; // 假设<100ms的为缓存命中
    const cacheHitRate = total > 0 ? cacheHits / total : 0;

    return { total, loaded, loading, error, cacheHitRate };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 断开Intersection Observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // 清空状态
    this.loadingStates.clear();
    this.isInitialized = false;
  }

  /**
   * 创建Intersection Observer
   */
  private createIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) {
      console.warn('浏览器不支持IntersectionObserver，使用立即加载模式');
      return;
    }

    const options: {
      root: Element | null;
      rootMargin: string;
      threshold: number | number[];
    } = {
      root: null, // 视口
      rootMargin: `${this.options.preloadDistance * 100}% 0px`, // 预加载距离
      threshold: this.options.lazyLoadingThreshold
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.src || img.dataset.src;

          if (src) {
            const loadingState = this.loadingStates.get(src);
            if (loadingState && loadingState.status === 'pending') {
              this.loadImage(loadingState);

              // 预加载附近的其他图片
              if (this.options.enablePreloading) {
                this.preloadNearbyImages(img);
              }
            }
          }

          // 观察完成后取消观察
          this.intersectionObserver?.unobserve(img);
        }
      });
    }, options);
  }

  /**
   * 加载图片
   */
  private async loadImage(loadingState: ImageLoadingState): Promise<void> {
    if (loadingState.status === 'loading' || loadingState.status === 'loaded') {
      return;
    }

    loadingState.status = 'loading';
    const startTime = performance.now();

    try {
      // 检查缓存
      if (this.options.enableImageCache) {
        const cached = this.imageCache.get(loadingState.src);
        if (cached && this.isCacheValid(cached)) {
          await this.loadImageFromCache(loadingState, cached.data);
          return;
        }
      }

      // 如果元素已经有src且正在加载，等待其加载完成
      if (loadingState.element && loadingState.element.src === loadingState.src) {
        await this.waitForImageLoad(loadingState.element);
        loadingState.status = 'loaded';
        loadingState.loadTime = performance.now() - startTime;
        
        if (loadingState.element) {
          this.updateImageElement(loadingState.element, loadingState.element);
        }
        return;
      }

      // 创建图片加载器
      const img = new Image();

      // 设置跨域属性（如果需要）
      img.crossOrigin = 'anonymous';

      // 设置加载选项
      if (this.options.enableResponsiveImages) {
        this.setResponsiveAttributes(img, loadingState.src);
      } else {
        img.src = loadingState.src;
      }

      // 监听加载事件
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('图片加载超时'));
        }, 15000); // 增加超时时间到15秒

        img.onload = async () => {
          clearTimeout(timeoutId);

          try {
            // 更新状态
            loadingState.status = 'loaded';
            loadingState.loadTime = performance.now() - startTime;

            // 添加到缓存
            if (this.options.enableImageCache) {
              await this.cacheImage(loadingState.src, img.src);
            }

            // 更新DOM元素
            if (loadingState.element) {
              this.updateImageElement(loadingState.element, img);
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error('图片加载失败'));
        };

        // 如果图片已经在缓存中，可能会立即触发onload
        if (img.complete && img.naturalWidth > 0) {
          clearTimeout(timeoutId);
          resolve();
        }
      });

    } catch (error) {
      loadingState.status = 'error';
      loadingState.error = error as Error;

      console.warn(`图片加载失败: ${loadingState.src}`, error);

      // 重试机制
      if (this.options.enableErrorRetry && loadingState.retryCount < this.options.maxRetryCount) {
        loadingState.retryCount++;
        console.log(`重试加载图片 (${loadingState.retryCount}/${this.options.maxRetryCount}): ${loadingState.src}`);
        setTimeout(() => this.loadImage(loadingState), 1000 * loadingState.retryCount);
      } else {
        // 显示错误状态
        this.showImageError(loadingState);
      }
    }
  }

  /**
   * 等待图片加载完成
   */
  private waitForImageLoad(img: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('等待图片加载超时'));
      }, 15000);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('图片加载失败'));
      };
    });
  }

  /**
   * 从缓存加载图片
   */
  private async loadImageFromCache(loadingState: ImageLoadingState, cachedData: string): Promise<void> {
    loadingState.status = 'loaded';
    loadingState.loadTime = performance.now() - performance.now(); // 模拟极快的加载时间

    if (loadingState.element) {
      loadingState.element.src = cachedData;
      loadingState.element.classList.add('loaded-from-cache');
    }
  }

  /**
   * 设置响应式属性
   */
  private setResponsiveAttributes(img: HTMLImageElement, src: string): void {
    // 根据网络状况和设备性能调整图片质量
    const quality = this.calculateImageQuality();
    const maxWidth = this.calculateMaxWidth();

    if (quality < 100) {
      // 添加质量参数
      const url = new URL(src, window.location.origin);
      url.searchParams.set('q', quality.toString());
      img.src = url.toString();
    }

    if (maxWidth > 0) {
      img.style.maxWidth = `${maxWidth}px`;
    }
  }

  /**
   * 更新图片元素
   */
  private updateImageElement(element: HTMLImageElement, loadedImg: HTMLImageElement): void {
    element.src = loadedImg.src;
    element.classList.remove('loading');
    element.classList.add('loaded');

    // 显示加载指示器
    if (this.options.showLoadingIndicator) {
      this.hideLoadingIndicator(element);
    }
  }

  /**
   * 预加载附近图片
   */
  private preloadNearbyImages(currentImg: HTMLImageElement): void {
    const allImages = Array.from(document.querySelectorAll('img[data-src], img[src]'));
    const currentIndex = allImages.indexOf(currentImg);

    if (currentIndex === -1) return;

    // 预加载后续图片
    const preloadCount = Math.min(this.options.maxPreloadCount, allImages.length - currentIndex - 1);
    for (let i = 1; i <= preloadCount; i++) {
      const nextImg = allImages[currentIndex + i] as HTMLImageElement;
      if (nextImg) {
        const src = nextImg.src || nextImg.dataset.src;
        if (src) {
          const loadingState = this.loadingStates.get(src);
          if (loadingState && loadingState.status === 'pending') {
            // 降低优先级预加载
            setTimeout(() => this.loadImage(loadingState), i * 200);
          }
        }
      }
    }
  }

  /**
   * 显示图片错误状态
   */
  private showImageError(loadingState: ImageLoadingState): void {
    if (loadingState.element) {
      loadingState.element.classList.add('image-error');
      loadingState.element.alt = '图片加载失败';

      // 可以在这里添加错误占位符
      // loadingState.element.src = 'data:image/svg+xml;base64,...';
    }
  }

  /**
   * 显示加载指示器
   */
  private showLoadingIndicator(element: HTMLImageElement): void {
    element.classList.add('loading');

    // 创建加载动画元素
    const loader = document.createElement('div');
    loader.className = 'image-loader';
    loader.innerHTML = `
      <div class="image-loader-spinner"></div>
      <div class="image-loader-text">加载中...</div>
    `;

    element.parentNode?.appendChild(loader);
  }

  /**
   * 隐藏加载指示器
   */
  private hideLoadingIndicator(element: HTMLImageElement): void {
    const loader = element.parentNode?.querySelector('.image-loader');
    if (loader) {
      loader.remove();
    }
  }

  /**
   * 缓存图片
   */
  private async cacheImage(src: string, data: string): Promise<void> {
    if (!this.options.enableImageCache) return;

    const size = new Blob([data]).size;

    // 检查缓存大小限制
    if (this.getCacheSize() + size > this.options.cacheMaxSize) {
      this.evictCacheEntries(size);
    }

    this.imageCache.set(src, {
      data,
      timestamp: Date.now(),
      size
    });
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cached: { timestamp: number; size: number }): boolean {
    const age = Date.now() - cached.timestamp;
    return age < this.options.cacheMaxAge;
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [src, cached] of this.imageCache.entries()) {
      if (now - cached.timestamp > this.options.cacheMaxAge) {
        this.imageCache.delete(src);
      }
    }
  }

  /**
   * 获取缓存大小
   */
  private getCacheSize(): number {
    let totalSize = 0;
    for (const cached of this.imageCache.values()) {
      totalSize += cached.size;
    }
    return totalSize;
  }

  /**
   * 清理缓存条目以腾出空间
   */
  private evictCacheEntries(requiredSize: number): void {
    // 按时间排序，删除最旧的条目
    const entries = Array.from(this.imageCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedSize = 0;
    for (const [src, cached] of entries) {
      this.imageCache.delete(src);
      freedSize += cached.size;

      if (freedSize >= requiredSize) {
        break;
      }
    }
  }

  /**
   * 检测设备性能
   */
  private detectDeviceCapabilities(): void {
    // 检测设备内存
    if ('deviceMemory' in navigator) {
      this.deviceMemory = (navigator as any).deviceMemory || 4;
    }

    // 根据设备内存调整默认选项
    if (this.deviceMemory < 2) {
      // 低内存设备，降低预加载和缓存设置
      this.options.maxPreloadCount = 2;
      this.options.cacheMaxSize = 10 * 1024 * 1024; // 10MB
      this.options.preloadPriority = 'low';
    } else if (this.deviceMemory > 8) {
      // 高内存设备，提高设置
      this.options.maxPreloadCount = 10;
      this.options.cacheMaxSize = 100 * 1024 * 1024; // 100MB
      this.options.preloadPriority = 'high';
    }
  }

  /**
   * 检测网络状况
   */
  private async detectNetworkConditions(): Promise<void> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.networkType = connection.effectiveType || 'unknown';

      // 根据网络状况调整加载策略
      switch (this.networkType) {
        case 'slow-2g':
        case '2g':
          this.options.maxPreloadCount = 1;
          this.options.defaultImageQuality = 60;
          this.options.preloadPriority = 'low';
          break;
        case '3g':
          this.options.maxPreloadCount = 3;
          this.options.defaultImageQuality = 75;
          break;
        case '4g':
        default:
          // 保持默认设置
          break;
      }
    }
  }

  /**
   * 计算图片质量
   */
  private calculateImageQuality(): number {
    if (!this.options.enableNetworkAdaptive && !this.options.enableDeviceAdaptive) {
      return this.options.defaultImageQuality;
    }

    let quality = this.options.defaultImageQuality;

    // 根据网络状况调整质量
    if (this.options.enableNetworkAdaptive) {
      switch (this.networkType) {
        case 'slow-2g':
        case '2g':
          quality = Math.max(50, quality - 20);
          break;
        case '3g':
          quality = Math.max(60, quality - 10);
          break;
        case '4g':
        default:
          // 保持默认质量
          break;
      }
    }

    // 根据设备性能调整质量
    if (this.options.enableDeviceAdaptive) {
      if (this.deviceMemory < 2) {
        quality = Math.max(50, quality - 15);
      } else if (this.deviceMemory > 8) {
        quality = Math.min(100, quality + 10);
      }
    }

    return Math.max(30, Math.min(100, quality));
  }

  /**
   * 计算最大宽度
   */
  private calculateMaxWidth(): number {
    if (!this.options.enableDeviceAdaptive) {
      return this.options.maxImageWidth;
    }

    let maxWidth = this.options.maxImageWidth;

    // 根据设备性能调整最大宽度
    if (this.deviceMemory < 2) {
      maxWidth = Math.min(maxWidth, 800);
    } else if (this.deviceMemory > 8) {
      maxWidth = Math.min(maxWidth, 2400);
    }

    return maxWidth;
  }
}

// 导出默认实例
export const imageLoadingManager = new ImageLoadingManager();
