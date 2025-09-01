/**
 * 用户反馈系统入口文件
 * 提供Toast通知和进度指示器功能
 */

// 导出类型定义
export * from './types';

// 导出React组件
export { Toast, ToastContainer } from './Toast';
export { Progress, ProgressContainer } from './Progress';

// 导出管理器
export { ToastManager, toastManager } from './ToastManager';
export { ProgressManager, progressManager } from './ProgressManager';

// 导出统一系统
export { UserFeedbackSystem, feedback } from './UserFeedbackSystem';

// 导出便捷API
export {
  info,
  success,
  warning,
  error,
  loading,
  createLinearProgress,
  createCircularProgress,
  createStepsProgress,
  createIndeterminateProgress,
  showSuccess,
  showError,
  showProgress,
  showConfirm,
  showResult,
  closeAll,
  updateConfig,
  getConfig,
  getStats,
  resetStats
} from './UserFeedbackSystem';

// 默认导出
export default feedback;
