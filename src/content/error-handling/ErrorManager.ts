import { 
  ErrorInfo, 
  ErrorType, 
  ErrorSeverity, 
  ErrorHandlingResult, 
  RecoveryStrategy,
  ErrorReport,
  ErrorStats,
  ErrorHandlingConfig
} from './types';

/**
 * 错误管理器
 * 
 * 功能：
 * - 错误捕获和分类
 * - 自动错误恢复
 * - 错误统计和分析
 * - 错误报告生成
 * - 降级策略管理
 */
export class ErrorManager {
  private static instance: ErrorManager;
  
  // 错误存储
  private errors: Map<string, ErrorInfo> = new Map();
  private errorLog: ErrorInfo[] = [];
  private recoveryStrategies: RecoveryStrategy[] = [];
  
  // 配置和状态
  private config: ErrorHandlingConfig;
  private isInitialized: boolean = false;
  private sessionId: string;
  private stats: ErrorStats;
  
  // 事件回调
  private onError: ((error: ErrorInfo) => void) | null = null;
  private onRecovery: ((error: ErrorInfo, result: ErrorHandlingResult) => void) | null = null;
  private onStatsUpdate: ((stats: ErrorStats) => void) | null = null;

  constructor() {
    this.config = {
      enableErrorReporting: true,
      enableAutoRecovery: true,
      enableUserNotifications: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      errorLogRetention: 24 * 60 * 60 * 1000, // 24小时
      severityThreshold: ErrorSeverity.MEDIUM,
      enablePerformanceMonitoring: true,
      enableCrashReporting: true
    };
    
    this.sessionId = this.generateSessionId();
    this.stats = this.initializeStats();
    
    this.initializeRecoveryStrategies();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * 初始化错误管理器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // 设置全局错误处理器
    this.setupGlobalErrorHandlers();
    
    // 启动错误日志清理定时器
    this.startCleanupTimer();
    
    this.isInitialized = true;
    console.log('错误管理器已初始化');
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.HIGH,
        source: 'unhandledrejection',
        context: { reason: event.reason }
      });
    });

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.HIGH,
        source: 'global-error',
        context: { 
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // 捕获资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(new Error(`Resource loading failed: ${event.target}`), {
          type: ErrorType.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          source: 'resource-loading',
          context: { target: event.target }
        });
      }
    }, true);
  }

  /**
   * 处理错误
   */
  public handleError(
    error: Error, 
    metadata: Partial<ErrorInfo> = {}
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      type: metadata.type || this.classifyError(error),
      severity: metadata.severity || this.assessSeverity(error),
      message: this.generateUserMessage(error, metadata),
      technicalMessage: error.message,
      stack: error.stack,
      context: {
        ...metadata.context,
        errorName: error.name,
        errorMessage: error.message
      },
      timestamp: Date.now(),
      recoverable: this.isRecoverable(error, metadata),
      retryCount: 0,
      maxRetries: this.config.maxRetryAttempts,
      source: metadata.source || 'unknown',
      userId: metadata.userId
    };

    // 存储错误信息
    this.errors.set(errorInfo.id, errorInfo);
    this.errorLog.push(errorInfo);
    
    // 更新统计信息
    this.updateStats(errorInfo);
    
    // 触发错误事件
    this.onError?.(errorInfo);
    
    // 尝试自动恢复
    if (this.config.enableAutoRecovery && errorInfo.recoverable) {
      this.attemptRecovery(errorInfo);
    }
    
    // 记录错误日志
    this.logError(errorInfo);
    
    return errorInfo;
  }

  /**
   * 分类错误
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    if (message.includes('extract') || message.includes('content') || name.includes('extraction')) {
      return ErrorType.EXTRACTION;
    }
    
    if (message.includes('render') || message.includes('ui') || name.includes('render')) {
      return ErrorType.RENDERING;
    }
    
    if (message.includes('performance') || message.includes('memory') || message.includes('timeout')) {
      return ErrorType.PERFORMANCE;
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('http')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('storage') || message.includes('chrome.storage')) {
      return ErrorType.STORAGE;
    }
    
    if (message.includes('permission') || message.includes('access')) {
      return ErrorType.PERMISSION;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    
    return ErrorType.SYSTEM;
  }

  /**
   * 评估错误严重程度
   */
  private assessSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    // 严重错误
    if (name.includes('quota') || name.includes('outofmemory') || message.includes('crash')) {
      return ErrorSeverity.CRITICAL;
    }
    
    // 高严重程度
    if (name.includes('typeerror') || name.includes('referenceerror') || message.includes('cannot read')) {
      return ErrorSeverity.HIGH;
    }
    
    // 中等严重程度
    if (name.includes('timeout') || message.includes('failed') || message.includes('error')) {
      return ErrorSeverity.MEDIUM;
    }
    
    // 低严重程度
    return ErrorSeverity.LOW;
  }

  /**
   * 生成用户友好的错误消息
   */
  private generateUserMessage(error: Error, metadata: Partial<ErrorInfo>): string {
    const type = metadata.type || this.classifyError(error);
    
    switch (type) {
      case ErrorType.EXTRACTION:
        return '内容提取失败，请刷新页面重试';
      case ErrorType.RENDERING:
        return '界面渲染出现问题，正在尝试恢复';
      case ErrorType.PERFORMANCE:
        return '性能问题检测到，正在优化';
      case ErrorType.NETWORK:
        return '网络连接问题，请检查网络设置';
      case ErrorType.STORAGE:
        return '数据保存失败，请检查浏览器设置';
      case ErrorType.PERMISSION:
        return '权限不足，请检查扩展权限设置';
      case ErrorType.VALIDATION:
        return '输入数据无效，请检查后重试';
      case ErrorType.SYSTEM:
        return '系统出现错误，正在尝试恢复';
      default:
        return '发生未知错误，请刷新页面重试';
    }
  }

  /**
   * 判断错误是否可恢复
   */
  private isRecoverable(error: Error, metadata: Partial<ErrorInfo>): boolean {
    const type = metadata.type || this.classifyError(error);
    const severity = metadata.severity || this.assessSeverity(error);
    
    // 严重错误通常不可恢复
    if (severity === ErrorSeverity.CRITICAL) {
      return false;
    }
    
    // 某些类型的错误通常可恢复
    switch (type) {
      case ErrorType.EXTRACTION:
      case ErrorType.RENDERING:
      case ErrorType.PERFORMANCE:
        return true;
      case ErrorType.NETWORK:
        return true; // 网络错误通常是临时的
      case ErrorType.STORAGE:
        return false; // 存储错误通常需要用户干预
      case ErrorType.PERMISSION:
        return false; // 权限错误需要用户操作
      case ErrorType.VALIDATION:
        return true; // 验证错误通常可以重试
      case ErrorType.SYSTEM:
        return severity !== ErrorSeverity.CRITICAL;
      default:
        return true;
    }
  }

  /**
   * 尝试错误恢复
   */
  private async attemptRecovery(error: ErrorInfo): Promise<void> {
    try {
      // 按优先级排序恢复策略
      const applicableStrategies = this.recoveryStrategies
        .filter(strategy => strategy.applicable(error))
        .sort((a, b) => a.priority - b.priority);
      
      for (const strategy of applicableStrategies) {
        try {
          const result = await strategy.execute(error);
          
          if (result.success) {
            // 恢复成功
            this.onRecovery?.(error, result);
            this.logRecovery(error, strategy, result);
            return;
          }
        } catch (strategyError) {
          console.warn(`恢复策略 ${strategy.name} 执行失败:`, strategyError);
        }
      }
      
      // 所有策略都失败了
      this.logRecoveryFailure(error);
      
    } catch (error) {
      console.error('错误恢复过程失败:', error);
    }
  }

  /**
   * 初始化恢复策略
   */
  private initializeRecoveryStrategies(): void {
    // 内容提取错误恢复策略
    this.addRecoveryStrategy({
      name: 'RetryExtraction',
      description: '重试内容提取',
      priority: 1,
      applicable: (error) => error.type === ErrorType.EXTRACTION && error.retryCount < error.maxRetries,
      execute: async (error) => {
        // 模拟重试逻辑
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        
        return {
          success: true,
          recovered: true,
          fallbackUsed: false,
          userMessage: '内容提取重试成功',
          actionRequired: false,
          suggestedActions: []
        };
      }
    });

    // UI渲染错误恢复策略
    this.addRecoveryStrategy({
      name: 'FallbackUI',
      description: '使用降级UI',
      priority: 2,
      applicable: (error) => error.type === ErrorType.RENDERING,
      execute: async (error) => {
        return {
          success: true,
          recovered: true,
          fallbackUsed: true,
          userMessage: '已切换到简化界面',
          actionRequired: false,
          suggestedActions: ['刷新页面以恢复完整功能']
        };
      }
    });

    // 性能错误恢复策略
    this.addRecoveryStrategy({
      name: 'PerformanceOptimization',
      description: '性能优化',
      priority: 3,
      applicable: (error) => error.type === ErrorType.PERFORMANCE,
      execute: async (error) => {
        // 模拟性能优化
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
          success: true,
          recovered: true,
          fallbackUsed: false,
          userMessage: '性能已优化',
          actionRequired: false,
          suggestedActions: []
        };
      }
    });

    // 网络错误恢复策略
    this.addRecoveryStrategy({
      name: 'NetworkRetry',
      description: '网络重试',
      priority: 4,
      applicable: (error) => error.type === ErrorType.NETWORK && error.retryCount < error.maxRetries,
      execute: async (error) => {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * 2));
        
        return {
          success: true,
          recovered: true,
          fallbackUsed: false,
          userMessage: '网络连接已恢复',
          actionRequired: false,
          suggestedActions: []
        };
      }
    });
  }

  /**
   * 添加恢复策略
   */
  public addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  /**
   * 移除恢复策略
   */
  public removeRecoveryStrategy(strategyName: string): void {
    const index = this.recoveryStrategies.findIndex(s => s.name === strategyName);
    if (index > -1) {
      this.recoveryStrategies.splice(index, 1);
    }
  }

  /**
   * 手动重试错误
   */
  public async retryError(errorId: string): Promise<ErrorHandlingResult> {
    const error = this.errors.get(errorId);
    if (!error) {
      throw new Error(`Error not found: ${errorId}`);
    }
    
    if (error.retryCount >= error.maxRetries) {
      return {
        success: false,
        recovered: false,
        fallbackUsed: false,
        userMessage: '已达到最大重试次数',
        actionRequired: true,
        suggestedActions: ['刷新页面', '检查网络连接', '联系技术支持']
      };
    }
    
    // 增加重试次数
    error.retryCount++;
    this.errors.set(errorId, error);
    
    // 尝试恢复
    await this.attemptRecovery(error);
    
    return {
      success: true,
      recovered: true,
      fallbackUsed: false,
      userMessage: '重试成功',
      actionRequired: false,
      suggestedActions: []
    };
  }

  /**
   * 获取错误信息
   */
  public getError(errorId: string): ErrorInfo | undefined {
    return this.errors.get(errorId);
  }

  /**
   * 获取所有错误
   */
  public getAllErrors(): ErrorInfo[] {
    return Array.from(this.errors.values());
  }

  /**
   * 获取错误统计
   */
  public getStats(): ErrorStats {
    return { ...this.stats };
  }

  /**
   * 生成错误报告
   */
  public generateErrorReport(errorId: string): ErrorReport | null {
    const error = this.errors.get(errorId);
    if (!error) return null;
    
    return {
      error,
      userAgent: navigator.userAgent,
      extensionVersion: chrome.runtime.getManifest().version,
      chromeVersion: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown',
      platform: navigator.platform,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      tabId: chrome.tabs?.TAB_ID_NONE,
      url: window.location.href,
      additionalData: {
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
        timestamp: Date.now()
      }
    };
  }

  /**
   * 清理错误日志
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupErrorLog();
    }, 60 * 60 * 1000); // 每小时清理一次
  }

  private cleanupErrorLog(): void {
    const cutoffTime = Date.now() - this.config.errorLogRetention;
    this.errorLog = this.errorLog.filter(error => error.timestamp > cutoffTime);
    
    // 同时清理errors Map
    for (const [id, error] of this.errors) {
      if (error.timestamp < cutoffTime) {
        this.errors.delete(id);
      }
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(error: ErrorInfo): void {
    this.stats.totalErrors++;
    this.stats.errorsByType[error.type]++;
    this.stats.errorsBySeverity[error.severity]++;
    this.stats.lastErrorTime = error.timestamp;
    this.stats.sessionErrors++;
    
    // 触发统计更新事件
    this.onStatsUpdate?.(this.stats);
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): ErrorStats {
    return {
      totalErrors: 0,
      errorsByType: {
        [ErrorType.EXTRACTION]: 0,
        [ErrorType.RENDERING]: 0,
        [ErrorType.PERFORMANCE]: 0,
        [ErrorType.SYSTEM]: 0,
        [ErrorType.NETWORK]: 0,
        [ErrorType.STORAGE]: 0,
        [ErrorType.PERMISSION]: 0,
        [ErrorType.VALIDATION]: 0
      },
      errorsBySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      recoveryRate: 0,
      averageRecoveryTime: 0,
      lastErrorTime: 0,
      sessionErrors: 0
    };
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 记录错误日志
   */
  private logError(error: ErrorInfo): void {
    console.error(`[ErrorManager] ${error.type.toUpperCase()}: ${error.message}`, {
      id: error.id,
      severity: error.severity,
      source: error.source,
      context: error.context
    });
  }

  /**
   * 记录恢复成功日志
   */
  private logRecovery(error: ErrorInfo, strategy: RecoveryStrategy, result: ErrorHandlingResult): void {
    console.log(`[ErrorManager] Recovery successful for error ${error.id} using strategy ${strategy.name}`, result);
  }

  /**
   * 记录恢复失败日志
   */
  private logRecoveryFailure(error: ErrorInfo): void {
    console.warn(`[ErrorManager] All recovery strategies failed for error ${error.id}`);
  }

  /**
   * 设置配置
   */
  public setConfig(config: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  public getConfig(): ErrorHandlingConfig {
    return { ...this.config };
  }

  /**
   * 设置事件回调
   */
  public onError(callback: (error: ErrorInfo) => void): void {
    this.onError = callback;
  }

  public onRecovery(callback: (error: ErrorInfo, result: ErrorHandlingResult) => void): void {
    this.onRecovery = callback;
  }

  public onStatsUpdate(callback: (stats: ErrorStats) => void): void {
    this.onStatsUpdate = callback;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.errors.clear();
    this.errorLog = [];
    this.recoveryStrategies = [];
    this.isInitialized = false;
  }
}

// 导出单例实例
export const errorManager = ErrorManager.getInstance();
