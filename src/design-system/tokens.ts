/**
 * Material Design 3 设计令牌
 * 基于Chrome扩展最佳实践和Material Design 3规范
 */

// ===== 颜色系统 =====
export const colors = {
  // 主色调 - 基于Chrome的蓝色系
  primary: {
    10: '#001d36',
    20: '#003258',
    30: '#004a77',
    40: '#006397',
    50: '#007db8',
    60: '#2e98d3',
    70: '#58b2ea',
    80: '#7dcdff',
    90: '#c2e7ff',
    95: '#e1f4ff',
    99: '#fdfcff',
  },
  
  // 次要色调
  secondary: {
    10: '#0f1419',
    20: '#24292e',
    30: '#3a3f44',
    40: '#51565c',
    50: '#696e74',
    60: '#82878d',
    70: '#9ca1a7',
    80: '#b7bcc2',
    90: '#d3d8de',
    95: '#e1e6ec',
    99: '#fdfcff',
  },
  
  // 中性色
  neutral: {
    0: '#000000',
    10: '#1a1c1e',
    20: '#2f3133',
    25: '#3a3c3e',
    30: '#464749',
    35: '#525355',
    40: '#5e5f61',
    50: '#777779',
    60: '#919294',
    70: '#ababae',
    80: '#c7c6ca',
    90: '#e3e2e6',
    95: '#f1f0f4',
    98: '#faf9fd',
    99: '#fdfcff',
    100: '#ffffff',
  },
  
  // 中性变体色
  neutralVariant: {
    10: '#16191d',
    20: '#2b2e32',
    30: '#414448',
    40: '#585b5f',
    50: '#707377',
    60: '#8a8d91',
    70: '#a4a7ac',
    80: '#c0c2c7',
    90: '#dcdee3',
    95: '#eaecf1',
    99: '#fdfcff',
  },
  
  // 语义色
  error: {
    10: '#410e0b',
    20: '#601410',
    30: '#8c1d18',
    40: '#b3261e',
    50: '#dc362e',
    60: '#e46962',
    70: '#ec928e',
    80: '#f2b8b5',
    90: '#f9dedc',
    95: '#fceeee',
    99: '#fffbf9',
  },
  
  warning: {
    10: '#351b00',
    20: '#5d3100',
    30: '#8a4600',
    40: '#b85c00',
    50: '#e67300',
    60: '#ff8f00',
    70: '#ffab40',
    80: '#ffc570',
    90: '#ffe0b3',
    95: '#fff0d9',
    99: '#fffbf5',
  },
  
  success: {
    10: '#002204',
    20: '#003909',
    30: '#00530f',
    40: '#006e1c',
    50: '#008a2e',
    60: '#00a644',
    70: '#4cc85a',
    80: '#7ee070',
    90: '#a8f5a0',
    95: '#c4ffc0',
    99: '#f5fff2',
  },
} as const;

// ===== 字体系统 =====
export const typography = {
  // 字体族
  fontFamily: {
    brand: ['Google Sans', 'Roboto', 'system-ui', 'sans-serif'],
    plain: ['Roboto', 'system-ui', 'sans-serif'],
    code: ['Roboto Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
  },
  
  // 字体大小和行高
  scale: {
    // Display
    displayLarge: { size: '57px', lineHeight: '64px', weight: 400 },
    displayMedium: { size: '45px', lineHeight: '52px', weight: 400 },
    displaySmall: { size: '36px', lineHeight: '44px', weight: 400 },
    
    // Headline
    headlineLarge: { size: '32px', lineHeight: '40px', weight: 400 },
    headlineMedium: { size: '28px', lineHeight: '36px', weight: 400 },
    headlineSmall: { size: '24px', lineHeight: '32px', weight: 400 },
    
    // Title
    titleLarge: { size: '22px', lineHeight: '28px', weight: 400 },
    titleMedium: { size: '16px', lineHeight: '24px', weight: 500 },
    titleSmall: { size: '14px', lineHeight: '20px', weight: 500 },
    
    // Label
    labelLarge: { size: '14px', lineHeight: '20px', weight: 500 },
    labelMedium: { size: '12px', lineHeight: '16px', weight: 500 },
    labelSmall: { size: '11px', lineHeight: '16px', weight: 500 },
    
    // Body
    bodyLarge: { size: '16px', lineHeight: '24px', weight: 400 },
    bodyMedium: { size: '14px', lineHeight: '20px', weight: 400 },
    bodySmall: { size: '12px', lineHeight: '16px', weight: 400 },
  },
} as const;

// ===== 间距系统 =====
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const;

// ===== 圆角系统 =====
export const borderRadius = {
  none: '0px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '28px',
  full: '9999px',
} as const;

// ===== 阴影系统 =====
export const elevation = {
  0: 'none',
  1: '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
  2: '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
  3: '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
  4: '0px 2px 3px 0px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
  5: '0px 4px 4px 0px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
} as const;

// ===== 动画系统 =====
export const motion = {
  // 持续时间
  duration: {
    short1: '50ms',
    short2: '100ms',
    short3: '150ms',
    short4: '200ms',
    medium1: '250ms',
    medium2: '300ms',
    medium3: '350ms',
    medium4: '400ms',
    long1: '450ms',
    long2: '500ms',
    long3: '550ms',
    long4: '600ms',
  },
  
  // 缓动函数
  easing: {
    linear: 'cubic-bezier(0, 0, 1, 1)',
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    standardAccelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    standardDecelerate: 'cubic-bezier(0, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  },
} as const;

// ===== 组件特定令牌 =====
export const components = {
  // 按钮
  button: {
    height: {
      small: '32px',
      medium: '40px',
      large: '48px',
    },
    padding: {
      small: '0 16px',
      medium: '0 24px',
      large: '0 32px',
    },
    borderRadius: borderRadius.xl,
  },
  
  // 卡片
  card: {
    borderRadius: borderRadius.md,
    padding: {
      small: spacing[3],
      medium: spacing[4],
      large: spacing[6],
    },
  },
  
  // 输入框
  input: {
    height: '48px',
    borderRadius: borderRadius.sm,
    padding: '0 16px',
  },
} as const;

// ===== 主题令牌 =====
export const lightTheme = {
  surface: colors.neutral[99],
  surfaceDim: colors.neutral[95],
  surfaceBright: colors.neutral[99],
  surfaceContainerLowest: colors.neutral[100],
  surfaceContainerLow: colors.neutral[98],
  surfaceContainer: colors.neutral[95],
  surfaceContainerHigh: colors.neutral[90],
  surfaceContainerHighest: colors.neutral[80],
  
  onSurface: colors.neutral[10],
  onSurfaceVariant: colors.neutralVariant[30],
  
  primary: colors.primary[40],
  onPrimary: colors.primary[99],
  primaryContainer: colors.primary[90],
  onPrimaryContainer: colors.primary[10],
  
  secondary: colors.secondary[40],
  onSecondary: colors.secondary[99],
  secondaryContainer: colors.secondary[90],
  onSecondaryContainer: colors.secondary[10],
  
  error: colors.error[40],
  onError: colors.error[99],
  errorContainer: colors.error[90],
  onErrorContainer: colors.error[10],
  
  outline: colors.neutralVariant[50],
  outlineVariant: colors.neutralVariant[80],
} as const;

export const darkTheme = {
  surface: colors.neutral[10],
  surfaceDim: colors.neutral[10],
  surfaceBright: colors.neutral[25],
  surfaceContainerLowest: colors.neutral[0],
  surfaceContainerLow: colors.neutral[20],
  surfaceContainer: colors.neutral[25],
  surfaceContainerHigh: colors.neutral[30],
  surfaceContainerHighest: colors.neutral[35],
  
  onSurface: colors.neutral[90],
  onSurfaceVariant: colors.neutralVariant[80],
  
  primary: colors.primary[80],
  onPrimary: colors.primary[20],
  primaryContainer: colors.primary[30],
  onPrimaryContainer: colors.primary[90],
  
  secondary: colors.secondary[80],
  onSecondary: colors.secondary[20],
  secondaryContainer: colors.secondary[30],
  onSecondaryContainer: colors.secondary[90],
  
  error: colors.error[80],
  onError: colors.error[20],
  errorContainer: colors.error[30],
  onErrorContainer: colors.error[90],
  
  outline: colors.neutralVariant[60],
  outlineVariant: colors.neutralVariant[30],
} as const;
