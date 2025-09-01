// 无障碍功能类型定义

/**
 * 无障碍功能配置
 */
export interface AccessibilityConfig {
  /** 是否启用键盘导航 */
  keyboardNavigation: boolean;
  /** 是否启用屏幕阅读器支持 */
  screenReaderSupport: boolean;
  /** 是否启用高对比度模式 */
  highContrastMode: boolean;
  /** 是否启用焦点管理 */
  focusManagement: boolean;
  /** 是否启用ARIA标签 */
  ariaLabels: boolean;
  /** 是否启用减少动画 */
  reducedMotion: boolean;
  /** 是否启用高对比度 */
  highContrast: boolean;
  /** 字体大小缩放 */
  fontSizeScale: number;
  /** 行高缩放 */
  lineHeightScale: number;
}

/**
 * 焦点管理配置
 */
export interface FocusConfig {
  /** 焦点陷阱模式 */
  trapFocus: boolean;
  /** 焦点恢复模式 */
  restoreFocus: boolean;
  /** 焦点指示器样式 */
  focusIndicator: 'outline' | 'ring' | 'custom';
  /** 焦点指示器颜色 */
  focusIndicatorColor: string;
  /** 焦点指示器宽度 */
  focusIndicatorWidth: number;
}

/**
 * 键盘导航配置
 */
export interface KeyboardNavigationConfig {
  /** Tab键导航 */
  tabNavigation: boolean;
  /** 箭头键导航 */
  arrowKeyNavigation: boolean;
  /** 快捷键支持 */
  shortcuts: boolean;
  /** 跳过链接 */
  skipLinks: boolean;
  /** 焦点组 */
  focusGroups: boolean;
}

/**
 * 屏幕阅读器配置
 */
export interface ScreenReaderConfig {
  /** 实时区域更新 */
  liveRegions: boolean;
  /** 状态更新 */
  statusUpdates: boolean;
  /** 错误通知 */
  errorNotifications: boolean;
  /** 进度指示 */
  progressIndicators: boolean;
  /** 导航提示 */
  navigationHints: boolean;
}

/**
 * 高对比度模式配置
 */
export interface HighContrastConfig {
  /** 启用状态 */
  enabled: boolean;
  /** 对比度级别 */
  contrastLevel: 'normal' | 'high' | 'very-high';
  /** 自定义颜色 */
  customColors: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
    accent: string;
  };
  /** 边框增强 */
  enhancedBorders: boolean;
  /** 文本阴影 */
  textShadow: boolean;
}

/**
 * ARIA标签配置
 */
export interface ARIAConfig {
  /** 角色定义 */
  roles: boolean;
  /** 状态和属性 */
  statesAndProperties: boolean;
  /** 标签关联 */
  labelAssociation: boolean;
  /** 描述关联 */
  descriptionAssociation: boolean;
  /** 实时区域 */
  liveRegions: boolean;
}

/**
 * 无障碍功能状态
 */
export interface AccessibilityState {
  /** 当前焦点元素 */
  currentFocus: HTMLElement | null;
  /** 焦点历史 */
  focusHistory: HTMLElement[];
  /** 当前模式 */
  currentMode: 'normal' | 'high-contrast' | 'reduced-motion';
  /** 键盘导航状态 */
  keyboardNavigationActive: boolean;
  /** 屏幕阅读器状态 */
  screenReaderActive: boolean;
  /** 错误计数 */
  errorCount: number;
  /** 警告计数 */
  warningCount: number;
}

/**
 * 无障碍功能事件
 */
export interface AccessibilityEvent {
  /** 事件类型 */
  type: 'focus-change' | 'mode-change' | 'error' | 'warning' | 'info';
  /** 事件数据 */
  data: any;
  /** 时间戳 */
  timestamp: number;
  /** 元素引用 */
  element?: HTMLElement;
}

/**
 * 无障碍功能钩子返回值
 */
export interface UseAccessibilityReturn {
  /** 无障碍配置 */
  config: AccessibilityConfig;
  /** 无障碍状态 */
  state: AccessibilityState;
  /** 更新配置 */
  updateConfig: (updates: Partial<AccessibilityConfig>) => void;
  /** 切换模式 */
  toggleMode: (mode: keyof AccessibilityConfig) => void;
  /** 重置配置 */
  resetConfig: () => void;
  /** 获取焦点元素 */
  getCurrentFocus: () => HTMLElement | null;
  /** 设置焦点 */
  setFocus: (element: HTMLElement) => void;
  /** 下一个焦点 */
  nextFocus: () => void;
  /** 上一个焦点 */
  previousFocus: () => void;
}
