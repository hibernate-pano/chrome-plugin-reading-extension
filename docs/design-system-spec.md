# 现代简约卡片式设计系统规范

## 设计原则

### 核心理念
- **简约至上**: 去除不必要的装饰，专注于功能和内容
- **层次清晰**: 通过间距、颜色、字体大小建立清晰的信息层次
- **一致性**: 统一的设计语言和交互模式
- **可访问性**: 符合WCAG 2.1 AA标准的对比度和交互设计

## 颜色系统

### 主色调 (Primary Colors)
```css
/* 浅色模式 */
--primary-50: #f0f9ff;
--primary-100: #e0f2fe;
--primary-200: #bae6fd;
--primary-300: #7dd3fc;
--primary-400: #38bdf8;
--primary-500: #0ea5e9;  /* 主色 */
--primary-600: #0284c7;
--primary-700: #0369a1;
--primary-800: #075985;
--primary-900: #0c4a6e;

/* 深色模式 */
--primary-dark-50: #0c4a6e;
--primary-dark-100: #075985;
--primary-dark-200: #0369a1;
--primary-dark-300: #0284c7;
--primary-dark-400: #0ea5e9;
--primary-dark-500: #38bdf8;  /* 主色 */
--primary-dark-600: #7dd3fc;
--primary-dark-700: #bae6fd;
--primary-dark-800: #e0f2fe;
--primary-dark-900: #f0f9ff;
```

### 中性色 (Neutral Colors)
```css
/* 浅色模式 */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;

/* 深色模式 */
--gray-dark-50: #111827;
--gray-dark-100: #1f2937;
--gray-dark-200: #374151;
--gray-dark-300: #4b5563;
--gray-dark-400: #6b7280;
--gray-dark-500: #9ca3af;
--gray-dark-600: #d1d5db;
--gray-dark-700: #e5e7eb;
--gray-dark-800: #f3f4f6;
--gray-dark-900: #f9fafb;
```

### 语义色 (Semantic Colors)
```css
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

## 卡片设计规范

### 基础卡片样式
```css
.card {
  background: var(--card-background);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease-in-out;
}

/* 浅色模式 */
:root {
  --card-background: #ffffff;
  --card-border: rgba(0, 0, 0, 0.08);
}

/* 深色模式 */
[data-theme="dark"] {
  --card-background: #1f2937;
  --card-border: rgba(255, 255, 255, 0.1);
}
```

### 卡片变体
```css
/* 默认卡片 */
.card-default {
  background: var(--card-background);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 悬浮卡片 */
.card-elevated {
  background: var(--card-background);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
}

/* 交互卡片 */
.card-interactive {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.card-interactive:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

## 间距系统

### 基础间距单位
```css
:root {
  --space-1: 4px;   /* 0.25rem */
  --space-2: 8px;   /* 0.5rem */
  --space-3: 12px;  /* 0.75rem */
  --space-4: 16px;  /* 1rem */
  --space-5: 20px;  /* 1.25rem */
  --space-6: 24px;  /* 1.5rem */
  --space-8: 32px;  /* 2rem */
  --space-10: 40px; /* 2.5rem */
  --space-12: 48px; /* 3rem */
}
```

### 卡片内边距
```css
.card-padding-sm { padding: var(--space-3); }
.card-padding-md { padding: var(--space-4); }
.card-padding-lg { padding: var(--space-6); }
```

### 卡片间距
```css
.card-gap-sm { gap: var(--space-2); }
.card-gap-md { gap: var(--space-3); }
.card-gap-lg { gap: var(--space-4); }
```

## 字体系统

### 字体族
```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "SF Mono", Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace;
}
```

### 字体大小和行高
```css
:root {
  /* 标题 */
  --text-xs: 12px;     /* line-height: 16px */
  --text-sm: 14px;     /* line-height: 20px */
  --text-base: 16px;   /* line-height: 24px */
  --text-lg: 18px;     /* line-height: 28px */
  --text-xl: 20px;     /* line-height: 28px */
  --text-2xl: 24px;    /* line-height: 32px */
  
  /* 行高 */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

## 组件规范

### 按钮设计
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: none;
  outline: none;
}

.btn-sm {
  height: 32px;
  padding: 0 12px;
  font-size: var(--text-sm);
  gap: var(--space-1);
}

.btn-md {
  height: 40px;
  padding: 0 16px;
  font-size: var(--text-base);
  gap: var(--space-2);
}

.btn-lg {
  height: 48px;
  padding: 0 24px;
  font-size: var(--text-lg);
  gap: var(--space-2);
}
```

### 滑块设计
```css
.slider {
  position: relative;
  width: 100%;
  height: 20px;
  cursor: pointer;
}

.slider-track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 4px;
  background: var(--gray-200);
  border-radius: 2px;
}

.slider-fill {
  height: 100%;
  background: var(--primary-500);
  border-radius: 2px;
  transition: width 0.2s ease;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: var(--primary-500);
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.slider-thumb:hover {
  transform: translate(-50%, -50%) scale(1.2);
}
```

## 动画规范

### 过渡时间
```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}
```

### 缓动函数
```css
:root {
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 常用动画
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

这个设计系统规范确保了整个popup界面的视觉一致性和现代化体验。
