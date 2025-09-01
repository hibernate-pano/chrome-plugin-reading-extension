/**
 * 错误类型枚举
 */
export enum ErrorType {
  EXTRACTION = 'extraction',     // 内容提取错误
  RENDERING = 'rendering',       // UI渲染错误
  PERFORMANCE = 'performance',   // 性能相关错误
  SYSTEM = 'system',             // 系统错误
  NETWORK = 'network',           // 网络错误
  STORAGE = 'storage',           // 存储错误
  PERMISSION = 'permission',     // 权限错误
  VALIDATION = 'validation'      // 验证错误
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  LOW = 'low',           // 低：不影响主要功能
  MEDIUM = 'medium',     // 中：部分功能受影响
  HIGH = 'high',         // 高：主要功能受影响
  CRITICAL = 'critical'  // 严重：功能完全不可用
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  id: string;                    // 唯一标识符
  type: ErrorType;              // 错误类型
  severity: ErrorSeverity;      // 错误严重程度
  message: string;              // 用户友好的错误消息
  technicalMessage?: string;    // 技术性错误消息（用于调试）
  stack?: string;               // 错误堆栈
  context: Record<string, any>; // 错误上下文信息
  timestamp: number;            // 错误发生时间
  recoverable: boolean;         // 是否可恢复
  retryCount: number;           // 重试次数
  maxRetries: number;           // 最大重试次数
  source: string;               // 错误来源
  userId?: string;              // 用户标识（如果可用）
}

/**
 * 错误处理结果接口
 */
export interface ErrorHandlingResult {
  success: boolean;              // 处理是否成功
  recovered: boolean;            // 是否已恢复
  fallbackUsed: boolean;        // 是否使用了降级策略
  userMessage: string;          // 显示给用户的消息
  actionRequired: boolean;      // 是否需要用户操作
  suggestedActions: string[];   // 建议的用户操作
  retryAfter?: number;          // 建议的重试时间（毫秒）
}

/**
 * 错误恢复策略接口
 */
export interface RecoveryStrategy {
  name: string;                  // 策略名称
  description: string;           // 策略描述
  applicable: (error: ErrorInfo) => boolean; // 是否适用于该错误
  execute: (error: ErrorInfo) => Promise<ErrorHandlingResult>; // 执行恢复策略
  priority: number;              // 优先级（数字越小优先级越高）
}

/**
 * 用户反馈类型枚举
 */
export enum FeedbackType {
  INFO = 'info',         // 信息提示
  SUCCESS = 'success',   // 成功提示
  WARNING = 'warning',   // 警告提示
  ERROR = 'error',       // 错误提示
  LOADING = 'loading'    // 加载提示
}

/**
 * 用户反馈接口
 */
export interface UserFeedback {
  id: string;                    // 唯一标识符
  type: FeedbackType;            // 反馈类型
  title: string;                 // 标题
  message: string;               // 消息内容
  duration?: number;             // 显示持续时间（毫秒），0表示不自动消失
  actions?: FeedbackAction[];    // 可执行的操作
  dismissible: boolean;          // 是否可手动关闭
  timestamp: number;             // 创建时间
}

/**
 * 反馈操作接口
 */
export interface FeedbackAction {
  id: string;                    // 操作标识符
  label: string;                 // 操作标签
  type: 'button' | 'link';      // 操作类型
  primary: boolean;              // 是否为主要操作
  onClick: () => void | Promise<void>; // 点击处理函数
  disabled?: boolean;            // 是否禁用
}

/**
 * 错误边界状态接口
 */
export interface ErrorBoundaryState {
  hasError: boolean;             // 是否有错误
  error: ErrorInfo | null;       // 错误信息
  errorBoundaryId: string;       // 错误边界标识符
  fallbackUI: boolean;           // 是否显示降级UI
  recoveryAttempted: boolean;    // 是否已尝试恢复
}

/**
 * 错误报告接口
 */
export interface ErrorReport {
  error: ErrorInfo;              // 错误信息
  userAgent: string;             // 用户代理
  extensionVersion: string;      // 扩展版本
  chromeVersion: string;         // Chrome版本
  platform: string;              // 平台信息
  timestamp: number;             // 报告时间
  sessionId: string;             // 会话标识符
  tabId?: number;                // 标签页标识符
  url?: string;                  // 页面URL
  additionalData?: Record<string, any>; // 额外数据
}

/**
 * 错误统计接口
 */
export interface ErrorStats {
  totalErrors: number;           // 总错误数
  errorsByType: Record<ErrorType, number>; // 按类型统计的错误数
  errorsBySeverity: Record<ErrorSeverity, number>; // 按严重程度统计的错误数
  recoveryRate: number;          // 恢复率
  averageRecoveryTime: number;   // 平均恢复时间
  lastErrorTime: number;         // 最后一次错误时间
  sessionErrors: number;         // 当前会话错误数
}

/**
 * 错误处理配置接口
 */
export interface ErrorHandlingConfig {
  enableErrorReporting: boolean;     // 是否启用错误报告
  enableAutoRecovery: boolean;       // 是否启用自动恢复
  enableUserNotifications: boolean;  // 是否启用用户通知
  maxRetryAttempts: number;          // 最大重试次数
  retryDelay: number;                // 重试延迟（毫秒）
  errorLogRetention: number;         // 错误日志保留时间（毫秒）
  severityThreshold: ErrorSeverity;  // 严重程度阈值
  enablePerformanceMonitoring: boolean; // 是否启用性能监控
  enableCrashReporting: boolean;     // 是否启用崩溃报告
}
