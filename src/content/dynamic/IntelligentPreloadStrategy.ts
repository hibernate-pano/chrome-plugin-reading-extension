import { advancedDynamicLoader, LoadPriority } from './AdvancedDynamicLoader';

/**
 * 预加载触发器类型
 */
export enum PreloadTrigger {
  SCROLL = 'scroll',           // 滚动触发
  MOUSE_MOVEMENT = 'mouse',    // 鼠标移动触发
  TIME_BASED = 'time',         // 时间触发
  USER_INTERACTION = 'interaction', // 用户交互触发
  NETWORK_IDLE = 'network',    // 网络空闲触发
  VISIBILITY_CHANGE = 'visibility', // 可见性变化触发
  CUSTOM = 'custom'            // 自定义触发
}

/**
 * 预加载策略配置
 */
export interface PreloadStrategyConfig {
  enableScrollTrigger: boolean;
  enableMouseTrigger: boolean;
  enableTimeTrigger: boolean;
  enableInteractionTrigger: boolean;
  enableNetworkTrigger: boolean;
  enableVisibilityTrigger: boolean;
  
  scrollThreshold: number;     // 滚动阈值
  mouseThreshold: number;      // 鼠标移动阈值
  timeThreshold: number;       // 时间阈值 (ms)
  interactionThreshold: number; // 交互阈值
  networkIdleTime: number;     // 网络空闲时间 (ms)
  
  preloadDelay: number;        // 预加载延迟 (ms)
  maxPreloadModules: number;   // 最大预加载模块数
  preloadTimeout: number;      // 预加载超时 (ms)
}

/**
 * 预加载事件数据
 */
export interface PreloadEvent {
  trigger: PreloadTrigger;
  timestamp: number;
  data: any;
  modules: string[];
}

/**
 * 预加载统计信息
 */
export interface PreloadStats {
  totalEvents: number;
  successfulPreloads: number;
  failedPreloads: number;
  averagePreloadTime: number;
  triggerBreakdown: Record<PreloadTrigger, number>;
  moduleBreakdown: Record<string, number>;
}

/**
 * 智能预加载策略管理器
 * 
 * 功能：
 * - 多种预加载触发器
 * - 智能模块选择
 * - 性能优化
 * - 统计和分析
 * - 可配置策略
 */
export class IntelligentPreloadStrategy {
  private static instance: IntelligentPreloadStrategy;
  
  // 配置和状态
  private config: PreloadStrategyConfig;
  private isActive: boolean = false;
  private eventHistory: PreloadEvent[] = [];
  private stats: PreloadStats;
  
  // 事件监听器
  private scrollListener: (() => void) | null = null;
  private mouseListener: (() => void) | null = null;
  private timeListener: NodeJS.Timeout | null = null;
  private interactionListener: (() => void) | null = null;
  private networkListener: (() => void) | null = null;
  private visibilityListener: (() => void) | null = null;
  
  // 内部状态
  private lastScrollTime: number = 0;
  private lastMouseTime: number = 0;
  private lastInteractionTime: number = 0;
  private scrollDepth: number = 0;
  private mouseMovement: number = 0;
  private interactionCount: number = 0;
  private pageLoadTime: number = Date.now();

  constructor() {
    this.config = {
      enableScrollTrigger: true,
      enableMouseTrigger: true,
      enableTimeTrigger: true,
      enableInteractionTrigger: true,
      enableNetworkTrigger: true,
      enableVisibilityTrigger: true,
      
      scrollThreshold: 0.3,
      mouseThreshold: 100,
      timeThreshold: 5000,
      interactionThreshold: 3,
      networkIdleTime: 2000,
      
      preloadDelay: 1000,
      maxPreloadModules: 5,
      preloadTimeout: 10000
    };
    
    this.stats = {
      totalEvents: 0,
      successfulPreloads: 0,
      failedPreloads: 0,
      averagePreloadTime: 0,
      triggerBreakdown: {
        [PreloadTrigger.SCROLL]: 0,
        [PreloadTrigger.MOUSE_MOVEMENT]: 0,
        [PreloadTrigger.TIME_BASED]: 0,
        [PreloadTrigger.USER_INTERACTION]: 0,
        [PreloadTrigger.NETWORK_IDLE]: 0,
        [PreloadTrigger.VISIBILITY_CHANGE]: 0,
        [PreloadTrigger.CUSTOM]: 0
      },
      moduleBreakdown: {}
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): IntelligentPreloadStrategy {
    if (!IntelligentPreloadStrategy.instance) {
      IntelligentPreloadStrategy.instance = new IntelligentPreloadStrategy();
    }
    return IntelligentPreloadStrategy.instance;
  }

  /**
   * 启动预加载策略
   */
  public start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.setupEventListeners();
    this.startTimeBasedTrigger();
    
    console.log('智能预加载策略已启动');
  }

  /**
   * 停止预加载策略
   */
  public stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.removeEventListeners();
    this.stopTimeBasedTrigger();
    
    console.log('智能预加载策略已停止');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (this.config.enableScrollTrigger) {
      this.setupScrollTrigger();
    }
    
    if (this.config.enableMouseTrigger) {
      this.setupMouseTrigger();
    }
    
    if (this.config.enableInteractionTrigger) {
      this.setupInteractionTrigger();
    }
    
    if (this.config.enableNetworkTrigger) {
      this.setupNetworkTrigger();
    }
    
    if (this.config.enableVisibilityTrigger) {
      this.setupVisibilityTrigger();
    }
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }
    
    if (this.mouseListener) {
      document.removeEventListener('mousemove', this.mouseListener);
      this.mouseListener = null;
    }
    
    if (this.interactionListener) {
      document.removeEventListener('click', this.interactionListener);
      this.interactionListener = null;
    }
    
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
  }

  /**
   * 设置滚动触发器
   */
  private setupScrollTrigger(): void {
    this.scrollListener = () => {
      const now = Date.now();
      if (now - this.lastScrollTime < 100) return; // 节流
      
      this.lastScrollTime = now;
      this.scrollDepth = this.calculateScrollDepth();
      
      if (this.scrollDepth > this.config.scrollThreshold) {
        this.triggerPreload(PreloadTrigger.SCROLL, { scrollDepth: this.scrollDepth });
      }
    };
    
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  /**
   * 设置鼠标移动触发器
   */
  private setupMouseTrigger(): void {
    this.mouseListener = () => {
      const now = Date.now();
      if (now - this.lastMouseTime < 200) return; // 节流
      
      this.lastMouseTime = now;
      this.mouseMovement++;
      
      if (this.mouseMovement > this.config.mouseThreshold) {
        this.triggerPreload(PreloadTrigger.MOUSE_MOVEMENT, { mouseMovement: this.mouseMovement });
        this.mouseMovement = 0; // 重置
      }
    };
    
    document.addEventListener('mousemove', this.mouseListener, { passive: true });
  }

  /**
   * 设置用户交互触发器
   */
  private setupInteractionTrigger(): void {
    this.interactionListener = () => {
      const now = Date.now();
      if (now - this.lastInteractionTime < 500) return; // 节流
      
      this.lastInteractionTime = now;
      this.interactionCount++;
      
      if (this.interactionCount > this.config.interactionThreshold) {
        this.triggerPreload(PreloadTrigger.USER_INTERACTION, { interactionCount: this.interactionCount });
      }
    };
    
    document.addEventListener('click', this.interactionListener, { passive: true });
  }

  /**
   * 设置网络空闲触发器
   */
  private setupNetworkTrigger(): void {
    // 使用 requestIdleCallback 或 setTimeout 模拟
    const checkNetworkIdle = () => {
      if (!this.isActive) return;
      
      const now = Date.now();
      const timeSinceLastActivity = now - Math.max(
        this.lastScrollTime,
        this.lastMouseTime,
        this.lastInteractionTime
      );
      
      if (timeSinceLastActivity > this.config.networkIdleTime) {
        this.triggerPreload(PreloadTrigger.NETWORK_IDLE, { idleTime: timeSinceLastActivity });
      }
      
      setTimeout(checkNetworkIdle, this.config.networkIdleTime);
    };
    
    checkNetworkIdle();
  }

  /**
   * 设置可见性变化触发器
   */
  private setupVisibilityTrigger(): void {
    this.visibilityListener = () => {
      if (document.visibilityState === 'visible') {
        this.triggerPreload(PreloadTrigger.VISIBILITY_CHANGE, { visibilityState: 'visible' });
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  /**
   * 启动基于时间的触发器
   */
  private startTimeBasedTrigger(): void {
    if (this.timeListener) return;
    
    this.timeListener = setInterval(() => {
      if (!this.isActive) return;
      
      const timeOnPage = Date.now() - this.pageLoadTime;
      if (timeOnPage > this.config.timeThreshold) {
        this.triggerPreload(PreloadTrigger.TIME_BASED, { timeOnPage });
      }
    }, this.config.timeThreshold);
  }

  /**
   * 停止基于时间的触发器
   */
  private stopTimeBasedTrigger(): void {
    if (this.timeListener) {
      clearInterval(this.timeListener);
      this.timeListener = null;
    }
  }

  /**
   * 计算滚动深度
   */
  private calculateScrollDepth(): number {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    if (scrollHeight <= clientHeight) return 0;
    
    return scrollTop / (scrollHeight - clientHeight);
  }

  /**
   * 触发预加载
   */
  private async triggerPreload(trigger: PreloadTrigger, data: any): Promise<void> {
    if (!this.isActive) return;
    
    // 选择要预加载的模块
    const modules = this.selectPreloadModules(trigger, data);
    if (modules.length === 0) return;
    
    // 记录事件
    const event: PreloadEvent = {
      trigger,
      timestamp: Date.now(),
      data,
      modules
    };
    
    this.recordEvent(event);
    
    // 延迟预加载以避免阻塞
    setTimeout(async () => {
      try {
        const startTime = performance.now();
        
        // 执行预加载
        await this.executePreload(modules);
        
        const preloadTime = performance.now() - startTime;
        this.recordSuccessfulPreload(trigger, modules, preloadTime);
        
      } catch (error) {
        this.recordFailedPreload(trigger, modules, error);
      }
    }, this.config.preloadDelay);
  }

  /**
   * 选择预加载模块
   */
  private selectPreloadModules(trigger: PreloadTrigger, data: any): string[] {
    const modules: string[] = [];
    
    switch (trigger) {
      case PreloadTrigger.SCROLL:
        if (data.scrollDepth > 0.5) {
          modules.push('reader-mode', 'content-extraction');
        }
        break;
        
      case PreloadTrigger.MOUSE_MOVEMENT:
        if (data.mouseMovement > 200) {
          modules.push('ui-components', 'animations');
        }
        break;
        
      case PreloadTrigger.TIME_BASED:
        if (data.timeOnPage > 10000) {
          modules.push('performance', 'utils');
        }
        break;
        
      case PreloadTrigger.USER_INTERACTION:
        if (data.interactionCount > 5) {
          modules.push('ui-components', 'animations', 'performance');
        }
        break;
        
      case PreloadTrigger.NETWORK_IDLE:
        modules.push('utils', 'animations');
        break;
        
      case PreloadTrigger.VISIBILITY_CHANGE:
        modules.push('content-extraction', 'ui-components');
        break;
    }
    
    // 限制预加载模块数量
    return modules.slice(0, this.config.maxPreloadModules);
  }

  /**
   * 执行预加载
   */
  private async executePreload(modules: string[]): Promise<void> {
    const preloadPromises = modules.map(module => 
      advancedDynamicLoader.loadModule(module, LoadPriority.BACKGROUND)
        .catch(error => {
          console.debug(`Preload failed for module: ${module}`, error);
          throw error;
        })
    );
    
    // 设置超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Preload timeout')), this.config.preloadTimeout);
    });
    
    await Promise.race([
      Promise.all(preloadPromises),
      timeoutPromise
    ]);
  }

  /**
   * 记录事件
   */
  private recordEvent(event: PreloadEvent): void {
    this.eventHistory.push(event);
    
    // 限制历史记录大小
    if (this.eventHistory.length > 100) {
      this.eventHistory.shift();
    }
    
    this.stats.totalEvents++;
    this.stats.triggerBreakdown[event.trigger]++;
  }

  /**
   * 记录成功预加载
   */
  private recordSuccessfulPreload(trigger: PreloadTrigger, modules: string[], time: number): void {
    this.stats.successfulPreloads++;
    
    // 更新平均预加载时间
    const totalTime = this.stats.averagePreloadTime * (this.stats.successfulPreloads - 1) + time;
    this.stats.averagePreloadTime = totalTime / this.stats.successfulPreloads;
    
    // 更新模块统计
    for (const module of modules) {
      this.stats.moduleBreakdown[module] = (this.stats.moduleBreakdown[module] || 0) + 1;
    }
  }

  /**
   * 记录失败预加载
   */
  private recordFailedPreload(trigger: PreloadTrigger, modules: string[], error: any): void {
    this.stats.failedPreloads++;
    console.debug(`Preload failed for trigger: ${trigger}`, error);
  }

  /**
   * 手动触发预加载
   */
  public async manualPreload(modules: string[]): Promise<void> {
    await this.triggerPreload(PreloadTrigger.CUSTOM, { manual: true, modules });
  }

  /**
   * 获取预加载统计信息
   */
  public getStats(): PreloadStats {
    return { ...this.stats };
  }

  /**
   * 获取事件历史
   */
  public getEventHistory(): PreloadEvent[] {
    return [...this.eventHistory];
  }

  /**
   * 设置配置
   */
  public setConfig(config: Partial<PreloadStrategyConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果配置改变，重新设置监听器
    if (this.isActive) {
      this.removeEventListeners();
      this.setupEventListeners();
    }
  }

  /**
   * 获取配置
   */
  public getConfig(): PreloadStrategyConfig {
    return { ...this.config };
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.stats = {
      totalEvents: 0,
      successfulPreloads: 0,
      failedPreloads: 0,
      averagePreloadTime: 0,
      triggerBreakdown: {
        [PreloadTrigger.SCROLL]: 0,
        [PreloadTrigger.MOUSE_MOVEMENT]: 0,
        [PreloadTrigger.TIME_BASED]: 0,
        [PreloadTrigger.USER_INTERACTION]: 0,
        [PreloadTrigger.NETWORK_IDLE]: 0,
        [PreloadTrigger.VISIBILITY_CHANGE]: 0,
        [PreloadTrigger.CUSTOM]: 0
      },
      moduleBreakdown: {}
    };
    
    this.eventHistory = [];
  }

  /**
   * 生成预加载报告
   */
  public generateReport(): string {
    let report = '智能预加载策略报告\n';
    report += '==================\n\n';
    
    report += `状态: ${this.isActive ? '活跃' : '停止'}\n`;
    report += `总事件数: ${this.stats.totalEvents}\n`;
    report += `成功预加载: ${this.stats.successfulPreloads}\n`;
    report += `失败预加载: ${this.stats.failedPreloads}\n`;
    report += `平均预加载时间: ${this.stats.averagePreloadTime.toFixed(2)}ms\n\n`;
    
    report += `触发器统计:\n`;
    for (const [trigger, count] of Object.entries(this.stats.triggerBreakdown)) {
      if (count > 0) {
        report += `- ${trigger}: ${count} 次\n`;
      }
    }
    
    report += `\n模块统计:\n`;
    for (const [module, count] of Object.entries(this.stats.moduleBreakdown)) {
      report += `- ${module}: ${count} 次\n`;
    }
    
    return report;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.stop();
    this.resetStats();
    this.eventHistory = [];
  }
}

// 导出单例实例
export const intelligentPreloadStrategy = IntelligentPreloadStrategy.getInstance();
