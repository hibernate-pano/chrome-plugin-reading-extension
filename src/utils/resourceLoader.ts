/**
 * 资源加载优化器
 * 用于延迟加载非关键资源，提高性能
 */

// 资源类型
export type ResourceType = 'script' | 'style' | 'image' | 'font';

// 资源加载优先级
export enum LoadPriority {
  CRITICAL = 0, // 关键资源，立即加载
  HIGH = 1,     // 高优先级，尽快加载
  MEDIUM = 2,   // 中等优先级，页面加载后加载
  LOW = 3,      // 低优先级，用户交互后加载
  LAZY = 4      // 懒加载，仅在需要时加载
}

// 资源接口
export interface Resource {
  id: string;
  type: ResourceType;
  url: string;
  priority: LoadPriority;
  loaded: boolean;
  loadPromise?: Promise<any>;
  dependencies?: string[];
}

// 资源加载器类
export class ResourceLoader {
  private resources: Map<string, Resource> = new Map();
  private loadQueue: string[] = [];
  private isProcessingQueue: boolean = false;
  private idleCallbackId: number | null = null;

  /**
   * 注册资源
   */
  public register(
    id: string,
    type: ResourceType,
    url: string,
    priority: LoadPriority = LoadPriority.MEDIUM,
    dependencies: string[] = []
  ): void {
    if (this.resources.has(id)) {
      console.warn(`资源已注册: ${id}`);
      return;
    }

    this.resources.set(id, {
      id,
      type,
      url,
      priority,
      loaded: false,
      dependencies
    });

    // 如果是关键资源，立即加载
    if (priority === LoadPriority.CRITICAL) {
      this.loadQueue.push(id);
      this.processQueue();
    } else {
      // 否则，添加到加载队列
      this.loadQueue.push(id);
      
      // 如果是高优先级资源，尽快加载
      if (priority === LoadPriority.HIGH) {
        this.processQueue();
      } else {
        // 否则，使用空闲时间加载
        this.scheduleIdleLoad();
      }
    }
  }

  /**
   * 加载资源
   */
  public async load(id: string): Promise<any> {
    const resource = this.resources.get(id);
    
    if (!resource) {
      throw new Error(`资源未注册: ${id}`);
    }
    
    // 如果已加载，直接返回
    if (resource.loaded && resource.loadPromise) {
      return resource.loadPromise;
    }
    
    // 如果正在加载，返回加载 Promise
    if (resource.loadPromise) {
      return resource.loadPromise;
    }
    
    // 加载依赖
    if (resource.dependencies && resource.dependencies.length > 0) {
      await Promise.all(resource.dependencies.map(depId => this.load(depId)));
    }
    
    // 加载资源
    resource.loadPromise = this.loadResource(resource);
    
    try {
      await resource.loadPromise;
      resource.loaded = true;
      return resource.loadPromise;
    } catch (error) {
      console.error(`加载资源失败: ${id}`, error);
      throw error;
    }
  }

  /**
   * 检查资源是否已加载
   */
  public isLoaded(id: string): boolean {
    const resource = this.resources.get(id);
    return resource ? resource.loaded : false;
  }

  /**
   * 预加载资源
   */
  public preload(id: string): void {
    const resource = this.resources.get(id);
    
    if (!resource || resource.loaded) {
      return;
    }
    
    // 提高优先级
    resource.priority = LoadPriority.HIGH;
    
    // 如果不在队列中，添加到队列
    if (!this.loadQueue.includes(id)) {
      this.loadQueue.push(id);
    }
    
    // 处理队列
    this.processQueue();
  }

  /**
   * 处理加载队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.loadQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // 按优先级排序
      this.loadQueue.sort((a, b) => {
        const resourceA = this.resources.get(a);
        const resourceB = this.resources.get(b);
        
        if (!resourceA || !resourceB) {
          return 0;
        }
        
        return resourceA.priority - resourceB.priority;
      });
      
      // 加载队列中的第一个资源
      const id = this.loadQueue.shift();
      
      if (id) {
        await this.load(id);
      }
    } finally {
      this.isProcessingQueue = false;
      
      // 如果队列中还有资源，继续处理
      if (this.loadQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * 安排空闲时间加载
   */
  private scheduleIdleLoad(): void {
    if (this.idleCallbackId !== null) {
      return;
    }
    
    // 使用 requestIdleCallback 在浏览器空闲时加载资源
    this.idleCallbackId = requestIdleCallback(() => {
      this.idleCallbackId = null;
      this.processQueue();
    }, { timeout: 2000 });
  }

  /**
   * 加载资源
   */
  private loadResource(resource: Resource): Promise<any> {
    switch (resource.type) {
      case 'script':
        return this.loadScript(resource.url);
      case 'style':
        return this.loadStyle(resource.url);
      case 'image':
        return this.loadImage(resource.url);
      case 'font':
        return this.loadFont(resource.url);
      default:
        return Promise.reject(new Error(`不支持的资源类型: ${resource.type}`));
    }
  }

  /**
   * 加载脚本
   */
  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`脚本加载失败: ${url}`));
      
      document.head.appendChild(script);
    });
  }

  /**
   * 加载样式
   */
  private loadStyle(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`样式加载失败: ${url}`));
      
      document.head.appendChild(link);
    });
  }

  /**
   * 加载图片
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
    });
  }

  /**
   * 加载字体
   */
  private loadFont(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fontFace = new FontFace('CustomFont', `url(${url})`);
      
      fontFace.load()
        .then(loadedFace => {
          (document.fonts as any).add(loadedFace);
          resolve();
        })
        .catch(error => reject(new Error(`字体加载失败: ${url}`)));
    });
  }
}

// 导出单例实例
export const resourceLoader = new ResourceLoader();
