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
  
  // 新增：并发控制
  private loadingQueue: Array<() => Promise<void>> = [];
  private activeLoads = 0;
  private maxConcurrentLoads = 6; // 最大并发加载数
  
  // 缓存DOM查询结果
  private allImagesCache: HTMLImageElement[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 5000; // 缓存5秒

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
    
    // DOM 结构已变化，清除图片查询缓存
    this.clearImagesCache();

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
    const state = this.loadingStates.get(src);
    
    // 从Intersection Observer中移除
    if (this.intersectionObserver && state?.element) {
      this.intersectionObserver.unobserve(state.element);
    }
    
    this.loadingStates.delete(src);
    
    // DOM 结构已变化，清除图片查询缓存
    this.clearImagesCache();
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
   * 获取初始化状态
   */
  getInitializedStatus(): boolean {
    return this.isInitialized;
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
    this.loadingQueue = [];
    this.activeLoads = 0;
    
    // 清理 DOM 缓存
    this.clearImagesCache();
    
    // 清理图片缓存
    this.imageCache.clear();
    
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
   * 加载图片（带并发控制）
   */
  private async loadImage(loadingState: ImageLoadingState): Promise<void> {
    if (loadingState.status === 'loading' || loadingState.status === 'loaded') {
      return;
    }

    // 并发控制：如果超过最大并发数，加入队列
    if (this.activeLoads >= this.maxConcurrentLoads) {
      return new Promise<void>((resolve) => {
        this.loadingQueue.push(async () => {
          await this.loadImageInternal(loadingState);
          resolve();
        });
      });
    }

    await this.loadImageInternal(loadingState);
  }

  /**
   * 内部图片加载实现（优化版）
   */
  private async loadImageInternal(loadingState: ImageLoadingState): Promise<void> {
    if (loadingState.status === 'loading' || loadingState.status === 'loaded') {
      return;
    }

    this.activeLoads++;
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

      // 步骤1: 先显示模糊占位符（如果有）
      if (loadingState.element) {
        this.showBlurPlaceholder(loadingState.element);
      }

      // 步骤2: 创建图片加载器
      const img = new Image();

      // 设置跨域属性（如果需要）
      img.crossOrigin = 'anonymous';
      
      // 设置图片解码优化
      if ('decoding' in img) {
        img.decoding = 'async'; // 异步解码，不阻塞主线程
      }

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
        }, 15000);

        img.onload = async () => {
          clearTimeout(timeoutId);

          try {
            // 步骤3: 图片加载完成后，先解码再显示（避免卡顿）
            if ('decode' in img) {
              await img.decode();
            }

            // 更新状态
            loadingState.status = 'loaded';
            loadingState.loadTime = performance.now() - startTime;

            // 添加到缓存
            if (this.options.enableImageCache) {
              await this.cacheImage(loadingState.src, img.src);
            }

            // 步骤4: 更新DOM元素（带淡入动画）
            if (loadingState.element) {
              this.updateImageElementProgressive(loadingState.element, img);
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
    } finally {
      // 并发控制：加载完成，处理队列中的下一个
      this.activeLoads--;
      this.processLoadingQueue();
    }
  }

  /**
   * 处理加载队列
   */
  private processLoadingQueue(): void {
    if (this.loadingQueue.length > 0 && this.activeLoads < this.maxConcurrentLoads) {
      const nextLoad = this.loadingQueue.shift();
      if (nextLoad) {
        nextLoad();
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
    const startTime = performance.now();
    loadingState.status = 'loaded';
    loadingState.loadTime = performance.now() - startTime; // 修复：正确计算加载时间

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
      try {
        // 添加质量参数 - 增加异常处理
        const url = new URL(src, window.location.origin);
        url.searchParams.set('q', quality.toString());
        img.src = url.toString();
      } catch (error) {
        // URL构造失败时使用原始src
        console.warn('无法构造响应式URL，使用原始地址:', src, error);
        img.src = src;
      }
    } else {
      img.src = src;
    }

    if (maxWidth > 0) {
      img.style.maxWidth = `${maxWidth}px`;
    }
  }

  /**
   * 更新图片元素（渐进式，带淡入动画）
   */
  private updateImageElementProgressive(element: HTMLImageElement, loadedImg: HTMLImageElement): void {
    // 先隐藏元素，准备淡入
    element.style.opacity = '0';
    element.src = loadedImg.src;
    
    // 移除加载类，添加加载完成类
    element.classList.remove('loading', 'blur-placeholder');
    element.classList.add('loaded');

    // 使用 requestAnimationFrame 确保平滑动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 渐进式淡入
        element.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        element.style.opacity = '1';
        element.style.filter = 'none';
        
        // 动画完成后清理
        setTimeout(() => {
          element.style.transition = '';
        }, 400);
      });
    });

    // 隐藏加载指示器
    if (this.options.showLoadingIndicator) {
      this.hideLoadingIndicator(element);
    }
  }

  /**
   * 更新图片元素（向后兼容）
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
   * 显示模糊占位符（LQIP - Low Quality Image Placeholder）
   */
  private showBlurPlaceholder(element: HTMLImageElement): void {
    // 创建低质量占位符（模糊效果）
    element.classList.add('blur-placeholder');
    
    // 生成一个简单的渐变背景作为占位符
    const bgColor = this.generatePlaceholderColor(element);
    element.style.background = `linear-gradient(135deg, ${bgColor} 0%, ${this.adjustBrightness(bgColor, 20)} 100%)`;
    element.style.filter = 'blur(10px)';
    element.style.transform = 'scale(1.1)'; // 稍微放大以隐藏模糊边缘
  }

  /**
   * 生成占位符颜色（基于图片属性）
   */
  private generatePlaceholderColor(img: HTMLImageElement): string {
    // 尝试从 data-placeholder-color 属性获取
    const customColor = img.dataset.placeholderColor;
    if (customColor) {
      return customColor;
    }

    // 默认使用柔和的灰色渐变
    const colors = [
      '#f0f4f8', // 浅灰蓝
      '#e2e8f0', // 灰色
      '#f8fafc', // 几乎白色
      '#f1f5f9', // 浅灰
    ];
    
    // 基于 src 生成确定性的颜色索引
    const hash = img.src.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  /**
   * 调整颜色亮度
   */
  private adjustBrightness(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * 预加载附近图片（优化版 - 使用 requestIdleCallback）
   */
  private preloadNearbyImages(currentImg: HTMLImageElement): void {
    const allImages = this.getAllImagesWithCache();
    const currentIndex = allImages.indexOf(currentImg);

    if (currentIndex === -1) return;

    // 预加载后续图片
    const preloadCount = Math.min(this.options.maxPreloadCount, allImages.length - currentIndex - 1);
    
    for (let i = 1; i <= preloadCount; i++) {
      const nextImg = allImages[currentIndex + i] as HTMLImageElement;
      if (!nextImg) continue;

      const src = nextImg.src || nextImg.dataset.src;
      if (!src) continue;

      const loadingState = this.loadingStates.get(src);
      if (loadingState && loadingState.status === 'pending') {
        // 使用 requestIdleCallback 在浏览器空闲时预加载（优先级更低，不影响主任务）
        this.scheduleIdlePreload(loadingState, i * 100);
      }
    }
  }

  /**
   * 在浏览器空闲时调度预加载
   */
  private scheduleIdlePreload(loadingState: ImageLoadingState, delay: number = 0): void {
    const scheduleLoad = () => {
      // 检查浏览器是否支持 requestIdleCallback
      if ('requestIdleCallback' in window) {
        (window as Window & { 
          requestIdleCallback: (callback: () => void, options?: { timeout: number }) => void 
        }).requestIdleCallback(
          () => {
            // 只在图片仍处于待加载状态时才加载
            if (loadingState.status === 'pending') {
              this.loadImage(loadingState);
            }
          },
          { timeout: 2000 } // 最多等待2秒
        );
      } else {
        // 降级到 setTimeout
        setTimeout(() => {
          if (loadingState.status === 'pending') {
            this.loadImage(loadingState);
          }
        }, delay);
      }
    };

    // 如果有延迟，先等待
    if (delay > 0) {
      setTimeout(scheduleLoad, delay);
    } else {
      scheduleLoad();
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

    // 创建加载动画元素 - 修复XSS漏洞，使用安全的DOM操作
    const loader = document.createElement('div');
    loader.className = 'image-loader';
    
    // 创建旋转器
    const spinner = document.createElement('div');
    spinner.className = 'image-loader-spinner';
    
    // 创建文本元素
    const text = document.createElement('div');
    text.className = 'image-loader-text';
    text.textContent = '加载中...'; // 使用textContent避免XSS
    
    loader.appendChild(spinner);
    loader.appendChild(text);

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
      this.deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
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
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
      this.networkType = connection?.effectiveType || 'unknown';

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

  /**
   * 获取所有图片并缓存结果（优化DOM查询性能）
   */
  private getAllImagesWithCache(): HTMLImageElement[] {
    const now = performance.now();
    
    // 如果缓存还有效，直接返回缓存结果
    if (this.allImagesCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.allImagesCache;
    }
    
    // 重新查询并更新缓存
    this.allImagesCache = Array.from(document.querySelectorAll('img[data-src], img[src]'));
    this.cacheTimestamp = now;
    
    return this.allImagesCache;
  }

  /**
   * 清空图片缓存（在DOM结构发生变化时调用）
   */
  public clearImagesCache(): void {
    this.allImagesCache = null;
    this.cacheTimestamp = 0;
  }
}

// 导出默认实例
export const imageLoadingManager = new ImageLoadingManager();
