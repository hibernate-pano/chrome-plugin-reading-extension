# 阅读插件 v1.5.1 设计规范

## 概述

本文档定义了阅读插件 v1.5.1 版本的设计规范，包括排版、色彩、间距、组件和交互等方面。这些规范基于 Obsidian Clipper 的设计理念，旨在创建一个简洁、优雅、实用的阅读体验。

## 设计原则

### 1. 简洁为王

- 移除不必要的视觉元素和装饰
- 专注于内容本身，减少干扰
- 使用最少的视觉层次传达信息

### 2. 一致性

- 在整个界面中保持一致的设计语言
- 使用统一的色彩、排版和间距系统
- 确保交互模式在不同组件中保持一致

### 3. 微妙的反馈

- 使用轻量级的动画和过渡效果
- 提供清晰但不突兀的状态反馈
- 确保所有交互都有适当的视觉响应

### 4. 内容优先

- 设计决策应以提升内容可读性为目标
- 界面元素应服务于内容，而非喧宾夺主
- 优化排版和间距，提高阅读舒适度

### 5. 响应式设计

- 确保在不同设备和屏幕尺寸上提供良好体验
- 使用相对单位和弹性布局
- 针对移动设备优化交互模式

## 排版系统

### 字体

```css
/* 字体系统 */
:root {
  /* 系统字体栈 */
  --font-text: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  --font-heading: var(--font-text);
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  
  /* 组件字体映射 */
  --reading-font-family: var(--font-text);
  --reading-heading-font-family: var(--font-heading);
  --reading-code-font-family: var(--font-mono);
}
```

### 字体大小

```css
/* 字体大小系统 */
:root {
  /* 基础字体大小 - 使用 clamp 实现响应式 */
  --font-size-base: clamp(16px, 1rem + 0.2vw, 20px);
  
  /* 标题字体大小比例 */
  --font-size-h1: calc(var(--font-size-base) * 1.8);
  --font-size-h2: calc(var(--font-size-base) * 1.5);
  --font-size-h3: calc(var(--font-size-base) * 1.3);
  --font-size-h4: calc(var(--font-size-base) * 1.15);
  --font-size-h5: calc(var(--font-size-base) * 1);
  --font-size-h6: calc(var(--font-size-base) * 0.85);
  
  /* 其他文本元素 */
  --font-size-small: calc(var(--font-size-base) * 0.85);
  --font-size-code: calc(var(--font-size-base) * 0.9);
  --font-size-caption: calc(var(--font-size-base) * 0.8);
  
  /* 组件字体大小映射 */
  --reading-font-size: var(--font-size-base);
  --reading-code-font-size: var(--font-size-code);
}
```

### 行高与间距

```css
/* 行高与间距系统 */
:root {
  /* 行高 */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.8;
  
  /* 字间距 */
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.05em;
  
  /* 段落间距 */
  --paragraph-spacing-small: 1em;
  --paragraph-spacing-normal: 1.5em;
  --paragraph-spacing-large: 2em;
  
  /* 组件间距映射 */
  --reading-line-height: var(--line-height-relaxed);
  --reading-letter-spacing: var(--letter-spacing-normal);
  --reading-paragraph-spacing: var(--paragraph-spacing-normal);
  --reading-heading-line-height: var(--line-height-tight);
}
```

## 色彩系统

### 基础色彩

```css
/* 基础色彩系统 */
:root {
  /* 中性色 */
  --color-white: #ffffff;
  --color-black: #000000;
  
  /* 灰度级别 */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  
  /* 品牌色 */
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  --color-primary-200: #bae6fd;
  --color-primary-300: #7dd3fc;
  --color-primary-400: #38bdf8;
  --color-primary-500: #0ea5e9;
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
  --color-primary-800: #075985;
  --color-primary-900: #0c4a6e;
  
  /* 功能色 */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### 语义色彩

```css
/* 语义色彩系统 */
:root {
  /* 文本颜色 */
  --color-text: var(--color-gray-900);
  --color-text-muted: var(--color-gray-600);
  --color-text-faint: var(--color-gray-400);
  
  /* 背景颜色 */
  --color-background: var(--color-white);
  --color-background-alt: var(--color-gray-50);
  --color-background-hover: var(--color-gray-100);
  
  /* 边框颜色 */
  --color-border: var(--color-gray-200);
  --color-border-hover: var(--color-gray-300);
  
  /* 强调色 */
  --color-accent: var(--color-primary-600);
  --color-accent-hover: var(--color-primary-700);
  
  /* 选择高亮 */
  --color-selection-bg: var(--color-primary-100);
  --color-selection-text: var(--color-text);
}
```

### 深色主题

```css
/* 深色主题 */
.dark-theme {
  /* 文本颜色 */
  --color-text: var(--color-gray-100);
  --color-text-muted: var(--color-gray-400);
  --color-text-faint: var(--color-gray-600);
  
  /* 背景颜色 */
  --color-background: var(--color-gray-900);
  --color-background-alt: var(--color-gray-800);
  --color-background-hover: var(--color-gray-700);
  
  /* 边框颜色 */
  --color-border: var(--color-gray-700);
  --color-border-hover: var(--color-gray-600);
  
  /* 强调色 */
  --color-accent: var(--color-primary-400);
  --color-accent-hover: var(--color-primary-300);
  
  /* 选择高亮 */
  --color-selection-bg: var(--color-primary-900);
  --color-selection-text: var(--color-primary-100);
}
```

### 组件色彩映射

```css
/* 组件色彩映射 */
:root {
  /* 阅读容器 */
  --reading-bg-color: var(--color-background);
  --reading-text-color: var(--color-text);
  --reading-muted-color: var(--color-text-muted);
  --reading-border-color: var(--color-border);
  --reading-accent-color: var(--color-accent);
  --reading-selection-bg: var(--color-selection-bg);
  --reading-selection-text: var(--color-selection-text);
  
  /* 代码块 */
  --code-bg: var(--color-background-alt);
  --code-text-color: var(--color-text);
  --code-border: var(--color-border);
  --code-language-color: var(--color-text-muted);
  --code-line-number-color: var(--color-text-faint);
  --code-scrollbar-thumb: var(--color-border);
  --code-scrollbar-track: transparent;
  
  /* 工具栏 */
  --toolbar-bg: var(--color-background);
  --toolbar-text-color: var(--color-text-muted);
  --toolbar-border: var(--color-border);
  --toolbar-button-hover-bg: var(--color-background-hover);
  --toolbar-button-hover-color: var(--color-text);
}
```

## 间距与布局

### 容器尺寸

```css
/* 容器尺寸系统 */
:root {
  /* 内容宽度 */
  --content-width-narrow: min(720px, 90vw);
  --content-width-default: min(960px, 90vw);
  --content-width-wide: min(1200px, 90vw);
  --content-max-width: 1800px;
  
  /* 组件宽度映射 */
  --reading-page-width: var(--content-width-default);
  --reading-max-width: var(--content-max-width);
}
```

### 间距比例

```css
/* 间距系统 */
:root {
  /* 基础间距单位 */
  --spacing-unit: 0.25rem;
  
  /* 间距比例 */
  --spacing-0: 0;
  --spacing-1: calc(var(--spacing-unit) * 1);  /* 0.25rem */
  --spacing-2: calc(var(--spacing-unit) * 2);  /* 0.5rem */
  --spacing-3: calc(var(--spacing-unit) * 3);  /* 0.75rem */
  --spacing-4: calc(var(--spacing-unit) * 4);  /* 1rem */
  --spacing-5: calc(var(--spacing-unit) * 5);  /* 1.25rem */
  --spacing-6: calc(var(--spacing-unit) * 6);  /* 1.5rem */
  --spacing-8: calc(var(--spacing-unit) * 8);  /* 2rem */
  --spacing-10: calc(var(--spacing-unit) * 10); /* 2.5rem */
  --spacing-12: calc(var(--spacing-unit) * 12); /* 3rem */
  --spacing-16: calc(var(--spacing-unit) * 16); /* 4rem */
  --spacing-20: calc(var(--spacing-unit) * 20); /* 5rem */
  --spacing-24: calc(var(--spacing-unit) * 24); /* 6rem */
  
  /* 响应式间距 */
  --spacing-content-y: max(var(--spacing-16), 4vh);
  --spacing-content-x: max(var(--spacing-8), 5vw);
}
```

### 边框与圆角

```css
/* 边框与圆角系统 */
:root {
  /* 边框宽度 */
  --border-width-thin: 1px;
  --border-width-normal: 2px;
  --border-width-thick: 3px;
  
  /* 圆角 */
  --border-radius-none: 0;
  --border-radius-sm: 0.125rem;
  --border-radius-md: 0.25rem;
  --border-radius-lg: 0.5rem;
  --border-radius-xl: 0.75rem;
  --border-radius-2xl: 1rem;
  --border-radius-full: 9999px;
  
  /* 组件边框映射 */
  --reading-border-width: var(--border-width-thin);
  --reading-border-radius: var(--border-radius-md);
  --code-border-radius: var(--border-radius-md);
  --image-border-radius: var(--border-radius-md);
  --toolbar-border-radius: var(--border-radius-full);
}
```

### 阴影

```css
/* 阴影系统 */
:root {
  /* 基础阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 8px 16px rgba(0, 0, 0, 0.1);
  
  /* 深色主题阴影 */
  .dark-theme {
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.4);
    --shadow-xl: 0 8px 16px rgba(0, 0, 0, 0.5);
  }
  
  /* 组件阴影映射 */
  --reading-content-shadow: var(--shadow-sm);
  --code-shadow: var(--shadow-sm);
  --image-shadow: var(--shadow-sm);
  --toolbar-shadow: var(--shadow-md);
}
```

## 组件规范

### 阅读容器

```css
/* 阅读容器 */
#reading-mode-container {
  width: var(--reading-page-width);
  max-width: var(--reading-max-width);
  margin: 0 auto;
  padding: var(--spacing-content-y) var(--spacing-content-x);
  background-color: var(--reading-bg-color);
  color: var(--reading-text-color);
  font-family: var(--reading-font-family);
  font-size: var(--reading-font-size);
  line-height: var(--reading-line-height);
  letter-spacing: var(--reading-letter-spacing);
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

### 标题

```css
/* 标题 */
#reading-mode-container h1 {
  font-size: var(--font-size-h1);
  font-weight: 700;
  line-height: var(--reading-heading-line-height);
  letter-spacing: var(--letter-spacing-tight);
  margin-top: var(--spacing-16);
  margin-bottom: var(--spacing-6);
  color: var(--reading-text-color);
}

#reading-mode-container h2 {
  font-size: var(--font-size-h2);
  font-weight: 700;
  line-height: var(--reading-heading-line-height);
  letter-spacing: var(--letter-spacing-tight);
  margin-top: var(--spacing-12);
  margin-bottom: var(--spacing-4);
  color: var(--reading-text-color);
}

#reading-mode-container h3 {
  font-size: var(--font-size-h3);
  font-weight: 600;
  line-height: var(--reading-heading-line-height);
  margin-top: var(--spacing-10);
  margin-bottom: var(--spacing-4);
  color: var(--reading-text-color);
}

#reading-mode-container h4 {
  font-size: var(--font-size-h4);
  font-weight: 600;
  line-height: var(--reading-heading-line-height);
  margin-top: var(--spacing-8);
  margin-bottom: var(--spacing-4);
  color: var(--reading-text-color);
}
```

### 段落与列表

```css
/* 段落 */
#reading-mode-container p {
  margin: var(--reading-paragraph-spacing) 0;
  line-height: var(--reading-line-height);
  text-indent: var(--reading-first-line-indent, 0);
  color: var(--reading-text-color);
}

/* 列表 */
#reading-mode-container ul,
#reading-mode-container ol {
  margin: var(--spacing-4) 0 var(--spacing-4) var(--spacing-5);
  padding: 0;
}

#reading-mode-container li {
  margin: var(--spacing-2) 0;
  line-height: var(--reading-line-height);
}

#reading-mode-container ul > li {
  list-style-type: disc;
}

#reading-mode-container ol > li {
  list-style-type: decimal;
}
```

### 代码块

```css
/* 代码块 */
.code-block {
  margin: var(--spacing-6) 0;
  border-radius: var(--code-border-radius);
  overflow: hidden;
  background-color: var(--code-bg);
  border: var(--border-width-thin) solid var(--code-border);
  box-shadow: var(--code-shadow);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

/* 代码工具栏 */
.code-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--code-bg);
  border-bottom: var(--border-width-thin) solid var(--code-border);
  font-size: var(--font-size-small);
  color: var(--code-language-color);
}

/* 代码内容 */
.code-content {
  padding: var(--spacing-3) 0;
  font-family: var(--reading-code-font-family);
  font-size: var(--reading-code-font-size);
  line-height: 1.5;
  tab-size: 2;
  overflow-x: auto;
}

/* 行号 */
.line-numbers {
  padding: var(--spacing-3) 0;
  color: var(--code-line-number-color);
  opacity: 0.5;
  border-right: var(--border-width-thin) solid var(--code-border);
  user-select: none;
  font-size: 0.85em;
  transition: opacity 0.2s ease;
}
```

### 图片

```css
/* 图片 */
#reading-mode-container img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: var(--spacing-6) auto;
  border-radius: var(--image-border-radius);
  box-shadow: var(--image-shadow);
  transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

/* 图片加载状态 */
#reading-mode-container img.loading {
  opacity: 0;
  transform: translateY(var(--spacing-2));
}

#reading-mode-container img.loaded {
  opacity: 1;
  transform: translateY(0);
}

/* 图片悬停效果 */
#reading-mode-container img:hover {
  box-shadow: var(--shadow-md);
}
```

### 工具栏

```css
/* 工具栏 */
#reading-mode-toolbar {
  position: fixed;
  bottom: var(--spacing-8);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--toolbar-bg);
  border: var(--border-width-thin) solid var(--toolbar-border);
  border-radius: var(--toolbar-border-radius);
  box-shadow: var(--toolbar-shadow);
  opacity: 0.7;
  transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  z-index: 50;
}

#reading-mode-toolbar:hover {
  opacity: 1;
  box-shadow: var(--shadow-lg);
}

/* 工具栏按钮 */
.toolbar-button {
  background: transparent;
  border: none;
  color: var(--toolbar-text-color);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.toolbar-button:hover {
  background-color: var(--toolbar-button-hover-bg);
  color: var(--toolbar-button-hover-color);
}
```

## 交互规范

### 过渡与动画

```css
/* 过渡与动画 */
:root {
  /* 过渡时间 */
  --transition-fast: 0.1s;
  --transition-normal: 0.2s;
  --transition-slow: 0.3s;
  
  /* 过渡曲线 */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  
  /* 组件过渡映射 */
  --reading-transition: all var(--transition-normal) var(--ease-out);
  --button-transition: all var(--transition-fast) var(--ease-out);
  --hover-transition: all var(--transition-fast) var(--ease-out);
}
```

### 状态反馈

```css
/* 状态反馈 */
/* 按钮状态 */
.button {
  transition: var(--button-transition);
}

.button:hover {
  background-color: var(--color-background-hover);
}

.button:active {
  transform: translateY(1px);
}

/* 链接状态 */
a {
  color: var(--reading-accent-color);
  text-decoration: none;
  transition: var(--hover-transition);
}

a:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}

/* 选择状态 */
::selection {
  background-color: var(--reading-selection-bg);
  color: var(--reading-selection-text);
}
```

### 响应式行为

```css
/* 响应式行为 */
/* 移动设备 */
@media (max-width: 768px) {
  :root {
    /* 调整间距 */
    --spacing-content-y: var(--spacing-8);
    --spacing-content-x: var(--spacing-4);
    
    /* 调整字体大小 */
    --font-size-base: clamp(16px, 1rem, 18px);
    
    /* 调整容器宽度 */
    --reading-page-width: 100%;
  }
  
  /* 调整工具栏位置 */
  #reading-mode-toolbar {
    bottom: var(--spacing-4);
    padding: var(--spacing-1) var(--spacing-2);
  }
  
  /* 调整代码块样式 */
  .code-block {
    margin: var(--spacing-4) 0;
    border-radius: var(--border-radius-sm);
  }
  
  /* 隐藏行号 */
  .line-numbers {
    display: none;
  }
  
  /* 调整图片边距 */
  #reading-mode-container img {
    margin: var(--spacing-4) auto;
  }
}

/* 平板设备 */
@media (min-width: 769px) and (max-width: 1024px) {
  :root {
    /* 调整容器宽度 */
    --reading-page-width: min(720px, 90vw);
  }
}

/* 大屏设备 */
@media (min-width: 1025px) {
  :root {
    /* 保持默认设置 */
  }
}
```

## 无障碍设计

### 对比度

- 确保文本与背景的对比度符合 WCAG AA 标准（正常文本 4.5:1，大文本 3:1）
- 使用对比度检查工具验证所有颜色组合
- 在深色模式下特别注意对比度

### 键盘导航

- 确保所有交互元素可通过键盘访问
- 提供清晰的焦点状态指示
- 实现逻辑的 Tab 顺序

### 屏幕阅读器支持

- 为图片提供适当的替代文本
- 使用语义化 HTML 结构
- 确保动态内容变化可被屏幕阅读器感知

## 实施指南

### CSS 变量实施

1. 在项目根目录创建 `variables.css` 文件，定义所有基础变量
2. 在组件样式文件中引用这些变量，避免硬编码值
3. 确保所有颜色、字体、间距等都使用变量

### 组件实施

1. 遵循设计规范中定义的样式和结构
2. 使用 CSS 类名前缀确保样式隔离
3. 实现响应式行为，确保在不同设备上正常显示

### 主题切换实施

1. 使用 CSS 变量实现主题切换，避免重复样式
2. 确保所有组件在主题切换时平滑过渡
3. 测试深色/浅色主题下的视觉一致性

## 结论

本设计规范提供了阅读插件 v1.5.1 版本的详细设计指南，包括排版、色彩、间距、组件和交互等方面。通过遵循这些规范，我们将创建一个简洁、优雅、实用的阅读体验，为用户提供更好的内容消费环境。

设计规范基于 Obsidian Clipper 的设计理念，强调简洁、一致性、微妙的反馈、内容优先和响应式设计。通过系统化的变量定义和组件规范，我们将确保整个界面在视觉和交互上保持一致，提供优质的用户体验。
