/**
 * 错误监控和日志系统
 * 提供详细的错误跟踪、性能监控和错误分析
 */

import { ErrorType } from './RetryManager';
import { ErrorContext } from './ErrorMessageManager';

export interface ErrorEvent {
  id: string;
  timestamp: number;
  error: Error;
  context: ErrorContext;
  stackTrace: string;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  retryAttempts: number;
  resolutionTime?: number;
  resolved: boolean;
}

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  errorType?: ErrorType;
  retryCount: number;
  memoryUsage?: number;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByOperation: Record<string, number>;
  averageResolutionTime: number;
  errorTrend: Array<{ date: string; count: number }>;
  topErrors: Array<{ error: string; count: number }>;
}

/**
 * 错误监控系统
 */
export class ErrorMonitor {
  private static instance: ErrorMonitor;
  private errorEvents: ErrorEvent[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private isMonitoring = true;
  private maxEvents = 1000;
  private reportInterval = 300000; // 5分钟
  private reportTimer: number | null = null;

  private constructor() {
    this.startMonitoring();
    this.setupErrorReporting();
  }

  public static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    // 监听全局错误
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        operation: 'global-error',
        component: 'window',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        additionalInfo: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // 监听未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        operation: 'unhandled-promise-rejection',
        component: 'promise',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        additionalInfo: {
          reason: event.reason
        }
      });
    });

    // 监听内存使用情况
    if ('memory' in performance) {
      setInterval(() => {
        this.recordMemoryUsage();
      }, 30000); // 每30秒记录一次
    }

    console.log('🔍 错误监控系统已启动');
  }

  /**
   * 捕获错误
   */
  public captureError(error: Error, context: ErrorContext, retryAttempts: number = 0): string {
    if (!this.isMonitoring) return '';

    const errorId = this.generateErrorId();
    const severity = this.determineSeverity(error, context);
    const category = this.categorizeError(error, context);

    const errorEvent: ErrorEvent = {
      id: errorId,
      timestamp: Date.now(),
      error,
      context,
      stackTrace: error.stack || '',
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity,
      category,
      retryAttempts,
      resolved: false
    };

    this.errorEvents.push(errorEvent);

    // 限制事件数量
    if (this.errorEvents.length > this.maxEvents) {
      this.errorEvents = this.errorEvents.slice(-this.maxEvents);
    }

    console.log(`🚨 错误已捕获: ${errorId}`, {
      message: error.message,
      severity,
      category,
      retryAttempts
    });

    return errorId;
  }

  /**
   * 记录性能指标
   */
  public recordPerformance(metrics: PerformanceMetrics): void {
    if (!this.isMonitoring) return;

    this.performanceMetrics.push(metrics);

    // 限制指标数量
    if (this.performanceMetrics.length > this.maxEvents) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxEvents);
    }

    console.log(`📊 性能指标已记录: ${metrics.operation}`, {
      duration: metrics.duration,
      success: metrics.success,
      retryCount: metrics.retryCount
    });
  }

  /**
   * 标记错误为已解决
   */
  public resolveError(errorId: string, resolutionTime?: number): void {
    const errorEvent = this.errorEvents.find(e => e.id === errorId);
    if (errorEvent) {
      errorEvent.resolved = true;
      if (resolutionTime) {
        errorEvent.resolutionTime = resolutionTime;
      }
      console.log(`✅ 错误已解决: ${errorId}`);
    }
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(error: Error, _context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    const errorMessage = error.message.toLowerCase();

    // 关键错误
    if (errorMessage.includes('memory') || 
        errorMessage.includes('crash') ||
        errorMessage.includes('fatal')) {
      return 'critical';
    }

    // 高严重程度错误
    if (errorMessage.includes('permission') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('storage')) {
      return 'high';
    }

    // 中等严重程度错误
    if (errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('parse')) {
      return 'medium';
    }

    // 低严重程度错误
    return 'low';
  }

  /**
   * 分类错误
   */
  private categorizeError(error: Error, context: ErrorContext): string {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'network';
    }
    if (errorMessage.includes('storage') || errorMessage.includes('quota')) {
      return 'storage';
    }
    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      return 'permission';
    }
    if (errorMessage.includes('parse') || errorMessage.includes('invalid')) {
      return 'parsing';
    }
    if (errorMessage.includes('worker') || errorMessage.includes('script')) {
      return 'worker';
    }
    if (context.operation.includes('extract')) {
      return 'content-extraction';
    }
    if (context.operation.includes('save')) {
      return 'data-persistence';
    }

    return 'general';
  }

  /**
   * 记录内存使用情况
   */
  private recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordPerformance({
        operation: 'memory-usage',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        success: true,
        retryCount: 0,
        memoryUsage: memory.usedJSHeapSize
      });
    }
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 设置错误报告
   */
  private setupErrorReporting(): void {
    this.reportTimer = window.setInterval(() => {
      this.generateErrorReport();
    }, this.reportInterval);
  }

  /**
   * 生成错误报告
   */
  public generateErrorReport(): ErrorAnalytics {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    
    // 过滤最近24小时的错误
    const recentErrors = this.errorEvents.filter(e => e.timestamp > last24Hours);
    
    // 按类别统计
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const errorsByOperation: Record<string, number> = {};
    
    recentErrors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
      errorsByOperation[error.context.operation] = (errorsByOperation[error.context.operation] || 0) + 1;
    });

    // 计算平均解决时间
    const resolvedErrors = recentErrors.filter(e => e.resolved && e.resolutionTime);
    const averageResolutionTime = resolvedErrors.length > 0 
      ? resolvedErrors.reduce((sum, e) => sum + (e.resolutionTime || 0), 0) / resolvedErrors.length
      : 0;

    // 生成错误趋势
    const errorTrend = this.generateErrorTrend(recentErrors);

    // 获取最常见的错误
    const errorCounts: Record<string, number> = {};
    recentErrors.forEach(error => {
      const key = error.error.message;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    const topErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    const analytics: ErrorAnalytics = {
      totalErrors: recentErrors.length,
      errorsByCategory,
      errorsBySeverity,
      errorsByOperation,
      averageResolutionTime,
      errorTrend,
      topErrors
    };

    console.log('📊 错误分析报告', analytics);
    return analytics;
  }

  /**
   * 生成错误趋势
   */
  private generateErrorTrend(errors: ErrorEvent[]): Array<{ date: string; count: number }> {
    const trend: Record<string, number> = {};
    
    errors.forEach(error => {
      const date = new Date(error.timestamp).toISOString().split('T')[0];
      trend[date] = (trend[date] || 0) + 1;
    });

    return Object.entries(trend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): {
    total: number;
    unresolved: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    recentErrors: ErrorEvent[];
  } {
    const now = Date.now();
    const lastHour = now - (60 * 60 * 1000);
    const recentErrors = this.errorEvents.filter(e => e.timestamp > lastHour);

    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    this.errorEvents.forEach(error => {
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
    });

    return {
      total: this.errorEvents.length,
      unresolved: this.errorEvents.filter(e => !e.resolved).length,
      bySeverity,
      byCategory,
      recentErrors
    };
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): {
    total: number;
    averageDuration: number;
    successRate: number;
    byOperation: Record<string, { count: number; avgDuration: number; successRate: number }>;
  } {
    const byOperation: Record<string, { count: number; totalDuration: number; successCount: number }> = {};

    this.performanceMetrics.forEach(metric => {
      if (!byOperation[metric.operation]) {
        byOperation[metric.operation] = { count: 0, totalDuration: 0, successCount: 0 };
      }
      byOperation[metric.operation].count++;
      byOperation[metric.operation].totalDuration += metric.duration;
      if (metric.success) {
        byOperation[metric.operation].successCount++;
      }
    });

    const averageDuration = this.performanceMetrics.length > 0
      ? this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / this.performanceMetrics.length
      : 0;

    const successRate = this.performanceMetrics.length > 0
      ? this.performanceMetrics.filter(m => m.success).length / this.performanceMetrics.length
      : 0;

    const operationStats: Record<string, { count: number; avgDuration: number; successRate: number }> = {};
    Object.entries(byOperation).forEach(([operation, stats]) => {
      operationStats[operation] = {
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        successRate: stats.successCount / stats.count
      };
    });

    return {
      total: this.performanceMetrics.length,
      averageDuration,
      successRate,
      byOperation: operationStats
    };
  }

  /**
   * 导出错误数据
   */
  public exportErrorData(): string {
    const data = {
      errors: this.errorEvents,
      performance: this.performanceMetrics,
      analytics: this.generateErrorReport(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * 清理旧数据
   */
  public cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    this.errorEvents = this.errorEvents.filter(e => e.timestamp > cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.startTime > cutoff);
    
    console.log(`🧹 已清理 ${maxAge / (24 * 60 * 60 * 1000)} 天前的数据`);
  }

  /**
   * 启用/禁用监控
   */
  public setMonitoring(enabled: boolean): void {
    this.isMonitoring = enabled;
    console.log(`🔍 错误监控${enabled ? '已启用' : '已禁用'}`);
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    
    this.errorEvents = [];
    this.performanceMetrics = [];
    this.isMonitoring = false;
    
    console.log('🧹 错误监控系统已清理');
  }
}

// 导出单例实例
export const errorMonitor = ErrorMonitor.getInstance();
