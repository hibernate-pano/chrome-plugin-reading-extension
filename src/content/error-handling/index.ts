// 导出类型和枚举
export * from './types';

// 导出核心管理器
export * from './ErrorManager';
export * from './UserFeedbackManager';

// 导出React组件
export * from './ErrorBoundary';

// 导出单例实例
export {
  errorManager,
  userFeedbackManager
} from './ErrorManager';

// 创建统一的错误处理系统
import { errorManager } from './ErrorManager';
import { userFeedbackManager } from './UserFeedbackManager';

/**
 * 统一错误处理系统
 * 
 * 整合了所有错误处理功能：
 * - 错误管理器
 * - 用户反馈管理器
 * - 错误边界组件
 */
export class UnifiedErrorHandlingSystem {
  private static instance: UnifiedErrorHandlingSystem;
  
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  public static getInstance(): UnifiedErrorHandlingSystem {
    if (!UnifiedErrorHandlingSystem.instance) {
      UnifiedErrorHandlingSystem.instance = new UnifiedErrorHandlingSystem();
    }
    return UnifiedErrorHandlingSystem.instance;
  }
  
  /**
   * 初始化错误处理系统
   */
  public async initialize(): Promise<void> {
    try {
      // 初始化错误管理器
      await errorManager.initialize();
      
      // 初始化用户反馈管理器
      await userFeedbackManager.initialize();
      
      // 设置事件回调
      this.setupEventCallbacks();
      
      console.log('统一错误处理系统已初始化');
    } catch (error) {
      console.error('初始化统一错误处理系统失败:', error);
      throw error;
    }
  }
  
  /**
   * 设置事件回调
   */
  private setupEventCallbacks(): void {
    // 错误管理器事件
    errorManager.onError((error) => {
      console.debug(`错误已记录: ${error.type} - ${error.message}`);
    });
    
    errorManager.onRecovery((error, result) => {
      console.debug(`错误恢复成功: ${error.id}`, result);
      
      // 显示恢复成功通知
      if (result.recovered) {
        userFeedbackManager.showSuccessNotification(
          '错误已恢复',
          result.userMessage,
          3000
        );
      }
    });
    
    errorManager.onStatsUpdate((stats) => {
      console.debug('错误统计已更新:', stats);
    });
    
    // 用户反馈管理器事件
    userFeedbackManager.onNotificationShow((notification) => {
      console.debug(`通知已显示: ${notification.type} - ${notification.title}`);
    });
    
    userFeedbackManager.onNotificationDismiss((notification) => {
      console.debug(`通知已关闭: ${notification.id}`);
    });
  }
  
  /**
   * 处理错误
   */
  public handleError(
    error: Error, 
    metadata: any = {}
  ): string {
    return errorManager.handleError(error, metadata).id;
  }
  
  /**
   * 显示错误通知
   */
  public showErrorNotification(errorId: string): string {
    const error = errorManager.getError(errorId);
    if (!error) {
      throw new Error(`Error not found: ${errorId}`);
    }
    
    return userFeedbackManager.showErrorNotification(error);
  }
  
  /**
   * 显示成功通知
   */
  public showSuccessNotification(title: string, message: string, duration?: number): string {
    return userFeedbackManager.showSuccessNotification(title, message, duration);
  }
  
  /**
   * 显示警告通知
   */
  public showWarningNotification(title: string, message: string, actions?: any[]): string {
    return userFeedbackManager.showWarningNotification(title, message, actions);
  }
  
  /**
   * 显示信息通知
   */
  public showInfoNotification(title: string, message: string, duration?: number): string {
    return userFeedbackManager.showInfoNotification(title, message, duration);
  }
  
  /**
   * 显示加载通知
   */
  public showLoadingNotification(title: string, message: string): string {
    return userFeedbackManager.showLoadingNotification(title, message);
  }
  
  /**
   * 重试错误
   */
  public async retryError(errorId: string): Promise<any> {
    return errorManager.retryError(errorId);
  }
  
  /**
   * 获取错误信息
   */
  public getError(errorId: string): any {
    return errorManager.getError(errorId);
  }
  
  /**
   * 获取所有错误
   */
  public getAllErrors(): any[] {
    return errorManager.getAllErrors();
  }
  
  /**
   * 获取错误统计
   */
  public getErrorStats(): any {
    return errorManager.getStats();
  }
  
  /**
   * 生成错误报告
   */
  public generateErrorReport(errorId: string): any {
    return errorManager.generateErrorReport(errorId);
  }
  
  /**
   * 设置错误处理配置
   */
  public setErrorConfig(config: any): void {
    errorManager.setConfig(config);
  }
  
  /**
   * 获取错误处理配置
   */
  public getErrorConfig(): any {
    return errorManager.getConfig();
  }
  
  /**
   * 设置通知配置
   */
  public setNotificationConfig(config: any): void {
    userFeedbackManager.setConfig(config);
  }
  
  /**
   * 获取通知配置
   */
  public getNotificationConfig(): any {
    return userFeedbackManager.getConfig();
  }
  
  /**
   * 生成综合报告
   */
  public generateComprehensiveReport(): string {
    let report = '统一错误处理系统综合报告\n';
    report += '============================\n\n';
    
    // 错误统计报告
    const errorStats = errorManager.getStats();
    report += `错误统计:\n`;
    report += `- 总错误数: ${errorStats.totalErrors}\n`;
    report += `- 会话错误数: ${errorStats.sessionErrors}\n`;
    report += `- 最后错误时间: ${new Date(errorStats.lastErrorTime).toLocaleString()}\n\n`;
    
    report += `按类型统计:\n`;
    for (const [type, count] of Object.entries(errorStats.errorsByType)) {
      if (count > 0) {
        report += `- ${type}: ${count} 次\n`;
      }
    }
    
    report += `\n按严重程度统计:\n`;
    for (const [severity, count] of Object.entries(errorStats.errorsBySeverity)) {
      if (count > 0) {
        report += `- ${severity}: ${count} 次\n`;
      }
    }
    
    // 通知配置报告
    const notificationConfig = userFeedbackManager.getConfig();
    report += `\n通知配置:\n`;
    report += `- 位置: ${notificationConfig.position}\n`;
    report += `- 最大通知数: ${notificationConfig.maxNotifications}\n`;
    report += `- 默认持续时间: ${notificationConfig.defaultDuration}ms\n`;
    report += `- 启用声音: ${notificationConfig.enableSound}\n`;
    report += `- 启用振动: ${notificationConfig.enableVibration}\n`;
    report += `- 主题: ${notificationConfig.theme}\n`;
    
    // 错误处理配置报告
    const errorConfig = errorManager.getConfig();
    report += `\n错误处理配置:\n`;
    report += `- 启用错误报告: ${errorConfig.enableErrorReporting}\n`;
    report += `- 启用自动恢复: ${errorConfig.enableAutoRecovery}\n`;
    report += `- 启用用户通知: ${errorConfig.enableUserNotifications}\n`;
    report += `- 最大重试次数: ${errorConfig.maxRetryAttempts}\n`;
    report += `- 重试延迟: ${errorConfig.retryDelay}ms\n`;
    report += `- 错误日志保留时间: ${errorConfig.errorLogRetention}ms\n`;
    report += `- 严重程度阈值: ${errorConfig.severityThreshold}\n`;
    
    report += `\n报告生成时间: ${new Date().toLocaleString()}`;
    
    return report;
  }
  
  /**
   * 优化系统
   */
  public async optimize(): Promise<void> {
    try {
      // 清理过期错误日志
      // 这里可以添加更多的优化逻辑
      
      console.log('错误处理系统已优化');
    } catch (error) {
      console.error('优化错误处理系统失败:', error);
      throw error;
    }
  }
  
  /**
   * 停止所有服务
   */
  public stop(): void {
    errorManager.cleanup();
    userFeedbackManager.cleanup();
    console.log('统一错误处理系统已停止');
  }
}

// 导出统一系统实例
export const unifiedErrorHandlingSystem = UnifiedErrorHandlingSystem.getInstance();

// 默认导出
export default unifiedErrorHandlingSystem;
