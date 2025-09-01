/**
 * 用户反馈系统类型定义
 */

export enum FeedbackType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  LOADING = 'loading'
}

export enum NotificationPosition {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  TOP_CENTER = 'top-center',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  BOTTOM_CENTER = 'bottom-center',
  CENTER = 'center'
}

export enum ProgressType {
  LINEAR = 'linear',
  CIRCULAR = 'circular',
  STEPS = 'steps',
  INDETERMINATE = 'indeterminate'
}

export interface ToastOptions {
  id?: string;
  title?: string;
  message: string;
  type?: FeedbackType;
  duration?: number; // 0表示不自动关闭
  position?: NotificationPosition;
  showProgress?: boolean;
  dismissible?: boolean;
  actions?: ToastAction[];
  onClose?: () => void;
  onAction?: (action: ToastAction) => void;
}

export interface ToastAction {
  id: string;
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}

export interface ToastInstance {
  id: string;
  close: () => void;
  update: (options: Partial<ToastOptions>) => void;
}

export interface ProgressOptions {
  id?: string;
  type?: ProgressType;
  value?: number; // 0-100
  max?: number;
  min?: number;
  showValue?: boolean;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
  striped?: boolean;
}

export interface ProgressInstance {
  id: string;
  update: (value: number) => void;
  setLabel: (label: string) => void;
  complete: () => void;
  destroy: () => void;
}

export interface NotificationOptions {
  id?: string;
  title: string;
  message?: string;
  type?: FeedbackType;
  duration?: number;
  position?: NotificationPosition;
  showProgress?: boolean;
  dismissible?: boolean;
  actions?: ToastAction[];
  icon?: string;
  onClose?: () => void;
  onAction?: (action: ToastAction) => void;
}

export interface NotificationInstance {
  id: string;
  close: () => void;
  update: (options: Partial<NotificationOptions>) => void;
}

export interface FeedbackConfig {
  position: NotificationPosition;
  maxNotifications: number;
  defaultDuration: number;
  showProgress: boolean;
  dismissible: boolean;
  theme: 'light' | 'dark' | 'auto';
  enableSound: boolean;
  enableVibration: boolean;
  enableAnimations: boolean;
  zIndex: number;
}

export interface FeedbackStats {
  totalShown: number;
  totalClosed: number;
  totalActions: number;
  averageDisplayTime: number;
  typeDistribution: Record<FeedbackType, number>;
  positionDistribution: Record<NotificationPosition, number>;
}
