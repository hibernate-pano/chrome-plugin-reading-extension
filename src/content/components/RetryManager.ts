/**
 * 智能重试管理器
 * 提供指数退避、错误分类和智能重试策略
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  PERMISSION = 'PERMISSION',
  QUOTA = 'QUOTA',
  PARSING = 'PARSING',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 智能重试管理器
 */
export class RetryManager {
  private static instance: RetryManager;
  private retryConfigs = new Map<string, RetryConfig>();
  private activeRetries = new Map<string, Promise<any>>();

  private constructor() {
    this.initializeDefaultConfigs();
  }

  public static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  /**
   * 初始化默认重试配置
   */
  private initializeDefaultConfigs(): void {
    // 网络请求重试配置
    this.retryConfigs.set('network', {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => this.isRetryableNetworkError(error)
    });

    // 内容提取重试配置
    this.retryConfigs.set('content-extraction', {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 3000,
      backoffMultiplier: 1.5,
      jitter: true,
      retryCondition: (error) => this.isRetryableExtractionError(error)
    });

    // 存储操作重试配置
    this.retryConfigs.set('storage', {
      maxAttempts: 3,
      baseDelay: 200,
      maxDelay: 2000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => this.isRetryableStorageError(error)
    });

    // Web Worker 重试配置
    this.retryConfigs.set('webworker', {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => this.isRetryableWorkerError(error)
    });
  }

  /**
   * 执行带重试的操作
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    configKey: string = 'default',
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = this.getRetryConfig(configKey, customConfig);
    const operationId = this.generateOperationId();
    
    // 检查是否已有相同的操作在进行
    if (this.activeRetries.has(operationId)) {
      return await this.activeRetries.get(operationId);
    }

    const retryPromise = this.performRetry(operation, config, operationId);
    this.activeRetries.set(operationId, retryPromise);

    try {
      const result = await retryPromise;
      return result;
    } finally {
      this.activeRetries.delete(operationId);
    }
  }

  /**
   * 执行重试逻辑
   */
  private async performRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    operationId: string
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`🔄 重试操作 ${operationId} - 尝试 ${attempt}/${config.maxAttempts}`);
        
        const data = await operation();
        
        const totalTime = Date.now() - startTime;
        console.log(`✅ 重试操作 ${operationId} 成功 - 尝试 ${attempt} 次，耗时 ${totalTime}ms`);
        
        return {
          success: true,
          data,
          attempts: attempt,
          totalTime
        };

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ 重试操作 ${operationId} 失败 - 尝试 ${attempt}/${config.maxAttempts}:`, error);

        // 检查是否应该重试
        if (attempt === config.maxAttempts || !this.shouldRetry(error as Error, config)) {
          break;
        }

        // 计算延迟时间
        const delay = this.calculateDelay(attempt, config);
        console.log(`⏳ 重试操作 ${operationId} - 等待 ${delay}ms 后重试`);
        
        await this.sleep(delay);
      }
    }

    const totalTime = Date.now() - startTime;
    console.error(`💥 重试操作 ${operationId} 最终失败 - 尝试 ${config.maxAttempts} 次，耗时 ${totalTime}ms`);

    return {
      success: false,
      error: lastError!,
      attempts: config.maxAttempts,
      totalTime
    };
  }

  /**
   * 获取重试配置
   */
  private getRetryConfig(configKey: string, customConfig?: Partial<RetryConfig>): RetryConfig {
    const defaultConfig = this.retryConfigs.get(configKey) || this.retryConfigs.get('network')!;
    
    return {
      ...defaultConfig,
      ...customConfig
    };
  }

  /**
   * 计算延迟时间
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // 限制最大延迟
    delay = Math.min(delay, config.maxDelay);
    
    // 添加抖动
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: Error, config: RetryConfig): boolean {
    if (config.retryCondition) {
      return config.retryCondition(error);
    }
    return true;
  }

  /**
   * 判断是否为可重试的网络错误
   */
  private isRetryableNetworkError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // 网络相关错误
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection')) {
      return true;
    }
    
    // HTTP 状态码错误
    if (errorMessage.includes('500') || 
        errorMessage.includes('502') || 
        errorMessage.includes('503') || 
        errorMessage.includes('504')) {
      return true;
    }
    
    return false;
  }

  /**
   * 判断是否为可重试的内容提取错误
   */
  private isRetryableExtractionError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // DOM 相关错误
    if (errorMessage.includes('dom') || 
        errorMessage.includes('element') || 
        errorMessage.includes('selector')) {
      return true;
    }
    
    // 解析错误
    if (errorMessage.includes('parse') || 
        errorMessage.includes('invalid') || 
        errorMessage.includes('malformed')) {
      return true;
    }
    
    return false;
  }

  /**
   * 判断是否为可重试的存储错误
   */
  private isRetryableStorageError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // 存储相关错误
    if (errorMessage.includes('quota') || 
        errorMessage.includes('storage') || 
        errorMessage.includes('database') ||
        errorMessage.includes('indexeddb')) {
      return true;
    }
    
    // 权限错误
    if (errorMessage.includes('permission') || 
        errorMessage.includes('access')) {
      return true;
    }
    
    return false;
  }

  /**
   * 判断是否为可重试的 Worker 错误
   */
  private isRetryableWorkerError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Worker 相关错误
    if (errorMessage.includes('worker') || 
        errorMessage.includes('script') || 
        errorMessage.includes('message')) {
      return true;
    }
    
    // 内存相关错误
    if (errorMessage.includes('memory') || 
        errorMessage.includes('out of memory')) {
      return true;
    }
    
    return false;
  }

  /**
   * 分类错误类型
   */
  public classifyError(error: Error): ErrorType {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') || 
        errorMessage.includes('connection')) {
      return ErrorType.NETWORK;
    }
    
    if (errorMessage.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    
    if (errorMessage.includes('permission') || 
        errorMessage.includes('access')) {
      return ErrorType.PERMISSION;
    }
    
    if (errorMessage.includes('quota') || 
        errorMessage.includes('storage')) {
      return ErrorType.QUOTA;
    }
    
    if (errorMessage.includes('parse') || 
        errorMessage.includes('invalid') || 
        errorMessage.includes('malformed')) {
      return ErrorType.PARSING;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 设置自定义重试配置
   */
  public setRetryConfig(key: string, config: RetryConfig): void {
    this.retryConfigs.set(key, config);
    console.log(`⚙️ 设置重试配置: ${key}`, config);
  }

  /**
   * 获取重试统计
   */
  public getRetryStats(): { activeRetries: number; configs: string[] } {
    return {
      activeRetries: this.activeRetries.size,
      configs: Array.from(this.retryConfigs.keys())
    };
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.activeRetries.clear();
    console.log('🧹 重试管理器已清理');
  }
}

// 导出单例实例
export const retryManager = RetryManager.getInstance();
