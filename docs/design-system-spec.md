# 🎨 Chrome 阅读插件设计系统规范

> 🎨 **设计版本**: v3.0 (Shadcn/UI)
> 📅 **更新时间**: 2024 年 12 月
> 🎯 **适用范围**: 全面迁移到 Tailwind CSS 4 + Shadcn/UI

**📚 [返回文档中心](./README.md)** | **📖 [开发指南](./DEVELOPMENT_GUIDE.md)** | **📋 [API参考](./API_REFERENCE.md)** | **🔄 [迁移指南](./MIGRATION_GUIDE.md)**

---

## 🚀 实施状态

### ✅ 新技术栈实现
- [x] **Tailwind CSS 4 配置** (`tailwind.config.js`)
- [x] **Shadcn/UI 组件库** (基于 Radix UI)
- [x] **现代化按钮组件** (使用 Shadcn/UI Button)
- [x] **卡片组件系统** (使用 Shadcn/UI Card)
- [x] **主题系统** (Tailwind 明暗主题)
- [x] **设计令牌迁移** (从 tokens.ts 到 @theme 指令)
- [x] **图标系统** (Lucide React)
- [x] **无障碍支持** (Radix UI 原生支持)

### 🚧 迁移进行中
- [ ] **Popup界面重构** - 迁移到 Shadcn/UI 组件
- [ ] **阅读模式界面** - 使用新的设计系统
- [ ] **自定义组件迁移** - 滑块、开关等组件
- [ ] **样式系统优化** - 移除旧的 CSS 变量系统
- [ ] **构建配置更新** - Vite + Tailwind CSS 4

### 📋 技术栈升级
- [x] **从 Material Design 3 到 Shadcn/UI**
- [x] **从自定义 CSS 到 Tailwind CSS 4**
- [x] **从 @headlessui/react 到 Radix UI**

---

## 🎨 设计理念

### 核心原则

基于 **Shadcn/UI** 设计系统，结合 Chrome 扩展的特殊需求：

- **🎯 简洁高效**: 专注阅读体验，减少视觉干扰
- **🌈 现代美观**: 优雅的视觉设计，支持明暗主题
- **♿ 无障碍**: 基于 Radix UI，完整的 a11y 支持
- **📱 响应式**: 适配不同屏幕尺寸和分辨率
- **⚡ 性能优先**: Tailwind CSS 优化，快速加载

### 设计语言特点

- **现代简约**: 干净的线条，充足的留白
- **一致性**: 统一的组件行为和视觉风格
- **可访问性**: 符合 WCAG 2.1 AA 标准
- **可定制性**: 灵活的主题配置系统

---

## 🌈 颜色系统

### 主题配置

使用 Tailwind CSS 4 的 @theme 指令定义颜色系统：

```css
@theme {
  --color-background: 0 0% 100%;
  --color-foreground: 222.2 84% 4.9%;
  --color-card: 0 0% 100%;
  --color-card-foreground: 222.2 84% 4.9%;
  --color-popover: 0 0% 100%;
  --color-popover-foreground: 222.2 84% 4.9%;
  --color-primary: 222.2 47.4% 11.2%;
  --color-primary-foreground: 210 40% 98%;
  --color-secondary: 210 40% 96%;
  --color-secondary-foreground: 222.2 84% 4.9%;
  --color-muted: 210 40% 96%;
  --color-muted-foreground: 215.4 16.3% 46.9%;
  --color-accent: 210 40% 96%;
  --color-accent-foreground: 222.2 84% 4.9%;
  --color-destructive: 0 84.2% 60.2%;
  --color-destructive-foreground: 210 40% 98%;
  --color-border: 214.3 31.8% 91.4%;
  --color-input: 214.3 31.8% 91.4%;
  --color-ring: 222.2 84% 4.9%;
}

.dark {
  --color-background: 222.2 84% 4.9%;
  --color-foreground: 210 40% 98%;
  --color-card: 222.2 84% 4.9%;
  --color-card-foreground: 210 40% 98%;
  --color-popover: 222.2 84% 4.9%;
  --color-popover-foreground: 210 40% 98%;
  --color-primary: 210 40% 98%;
  --color-primary-foreground: 222.2 47.4% 11.2%;
  --color-secondary: 217.2 32.6% 17.5%;
  --color-secondary-foreground: 210 40% 98%;
  --color-muted: 217.2 32.6% 17.5%;
  --color-muted-foreground: 215 20.2% 65.1%;
  --color-accent: 217.2 32.6% 17.5%;
  --color-accent-foreground: 210 40% 98%;
  --color-destructive: 0 62.8% 30.6%;
  --color-destructive-foreground: 210 40% 98%;
  --color-border: 217.2 32.6% 17.5%;
  --color-input: 217.2 32.6% 17.5%;
  --color-ring: 212.7 26.8% 83.9%;
}
```

### 语义化颜色

| 颜色角色 | 用途 | 示例 |
|----------|------|------|
| **Primary** | 主要操作、品牌色 | 按钮、链接、重要元素 |
| **Secondary** | 次要操作 | 辅助按钮、标签 |
| **Muted** | 背景、禁用状态 | 卡片背景、禁用文本 |
| **Accent** | 强调、高亮 | 选中状态、通知 |
| **Destructive** | 危险操作 | 删除按钮、错误信息 |
| **Border** | 边框、分割线 | 组件边框、分隔符 |

---

## 📝 字体系统

### 字体配置

```css
@theme {
  --font-family-sans: ui-sans-serif, system-ui, sans-serif;
  --font-family-mono: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;

  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;
}
```

### 字体层级

| 层级 | 大小 | 行高 | 用途 |
|------|------|------|------|
| **4xl** | 2.25rem | 1.25 | 大标题 |
| **3xl** | 1.875rem | 1.25 | 页面标题 |
| **2xl** | 1.5rem | 1.375 | 章节标题 |
| **xl** | 1.25rem | 1.375 | 小标题 |
| **lg** | 1.125rem | 1.5 | 重要文本 |
| **base** | 1rem | 1.5 | 正文 |
| **sm** | 0.875rem | 1.5 | 辅助文本 |
| **xs** | 0.75rem | 1.5 | 标签、说明 |
- [ ] **完整的可访问性支持** (ARIA标签、键盘导航等)
- [ ] **组件文档和Storybook** (开发者文档)
- [ ] **设计系统测试套件** (视觉回归测试)
- [ ] **暗色主题优化** (更丰富的暗色变体)

---

## 📋 设计概述

### 🌟 整体设计理念

Chrome 阅读插件采用**统一的现代简约卡片式设计风格**，确保用户在 Popup 配置界面和阅读模式界面中获得一致的视觉体验。

#### 核心设计特征

- **🎴 卡片化布局**: 所有功能模块都采用卡片容器承载
- **🌬️ 毛玻璃效果**: 使用`backdrop-filter`营造现代感
- **🎨 渐变背景**: 柔和的渐变色彩增强视觉层次
- **✨ 微动画**: 流畅的过渡动画提升交互体验
- **🎯 极简设计**: 去除不必要装饰，专注内容呈现

### 🔄 设计统一性原则

| 界面组件         | 设计风格       | 应用场景                       |
| ---------------- | -------------- | ------------------------------ |
| **Popup 主界面** | 现代简约卡片式 | 扩展配置、预设选择、高级设置   |
| **阅读模式界面** | 现代简约卡片式 | 文章内容展示、工具栏、设置面板 |
| **浮动按钮**     | 圆形卡片设计   | 阅读模式切换入口               |
| **设置面板**     | 可折叠卡片     | 实时设置调整                   |

---

## 🎨 核心设计原则

### 1. 简约至上 (Minimalism First)

- **去除装饰**: 删除不必要的边框、阴影、图标
- **空间留白**: 充分利用留白营造呼吸感
- **内容优先**: 确保内容清晰可读，界面不抢夺注意力

### 2. 层次清晰 (Clear Hierarchy)

- **视觉权重**: 通过颜色、字体大小、间距建立信息层次
- **功能分组**: 相关功能以卡片形式组织
- **交互引导**: 明确的视觉线索指导用户操作

### 3. 一致性 (Consistency)

- **设计语言**: Popup 和阅读模式使用相同的设计元素
- **交互模式**: 统一的 hover、点击、展开动效
- **色彩系统**: 统一的颜色变量和主题切换

### 4. 可访问性 (Accessibility)

- **对比度**: 符合 WCAG 2.1 AA 标准
- **键盘导航**: 完整的键盘操作支持
- **屏幕阅读器**: 语义化的 HTML 结构

---

## 🃏 卡片设计系统

### 基础卡片样式

```css
/* 统一卡片基础样式 */
.card-base {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-normal) var(--ease-out);
}

/* Popup卡片样式 */
.popup-card {
  @extend .card-base;
  margin-bottom: var(--space-5);
  padding: var(--space-6);
}

/* 阅读模式卡片样式 */
.reading-card {
  @extend .card-base;
  margin: var(--space-4) 0;
  padding: var(--space-8);
  max-width: 800px;
}
```

### 卡片层级系统

```css
/* 一级卡片 - 主要功能区域 */
.card-primary {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-2xl);
}

/* 二级卡片 - 功能分组 */
.card-secondary {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-xl);
}

/* 三级卡片 - 设置项容器 */
.card-tertiary {
  background: rgba(248, 250, 252, 0.7);
  backdrop-filter: blur(4px);
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-lg);
}
```

### 特殊卡片样式

```css
/* 预设选择卡片 - 突出显示 */
.preset-card {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.08) 0%,
    rgba(168, 85, 247, 0.05) 100%
  );
  border: 1px solid rgba(99, 102, 241, 0.15);
  backdrop-filter: blur(8px);
}

/* 阅读内容卡片 - 专注阅读 */
.content-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

/* 工具栏卡片 - 悬浮工具 */
.toolbar-card {
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
}
```

---

## 🎨 颜色系统

### 统一调色板

```css
:root {
  /* 主色系 - 品牌色彩 */
  --primary-50: #f0f9ff;
  --primary-100: #e0f2fe;
  --primary-500: #0ea5e9; /* 主色 */
  --primary-600: #0284c7;
  --primary-900: #0c4a6e;

  /* 中性色系 - 界面基础 */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-500: #6b7280;
  --gray-700: #374151;
  --gray-900: #111827;

  /* 功能色系 - 状态表示 */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* 语义化颜色变量 */
  --surface-primary: rgba(255, 255, 255, 0.95);
  --surface-secondary: rgba(248, 250, 252, 0.8);
  --surface-elevated: rgba(255, 255, 255, 0.98);
  --border-subtle: rgba(0, 0, 0, 0.08);
  --border-default: rgba(0, 0, 0, 0.12);
  --text-primary: var(--gray-900);
  --text-secondary: var(--gray-700);
  --text-muted: var(--gray-500);
}

/* 深色主题适配 */
[data-theme="dark"] {
  --surface-primary: rgba(30, 41, 59, 0.95);
  --surface-secondary: rgba(15, 23, 42, 0.8);
  --surface-elevated: rgba(30, 41, 59, 0.98);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-default: rgba(255, 255, 255, 0.12);
  --text-primary: #f9fafb;
  --text-secondary: #e5e7eb;
  --text-muted: #9ca3af;
}
```

### 颜色应用场景

| 场景           | 浅色模式                            | 深色模式                            | 说明         |
| -------------- | ----------------------------------- | ----------------------------------- | ------------ |
| **Popup 背景** | `linear-gradient(#fafbfc, #f8fafc)` | `linear-gradient(#0f172a, #1e293b)` | 整体背景渐变 |
| **卡片背景**   | `rgba(255, 255, 255, 0.9)`          | `rgba(30, 41, 59, 0.9)`             | 主要卡片背景 |
| **阅读背景**   | `rgba(255, 255, 255, 0.98)`         | `rgba(15, 23, 42, 0.98)`            | 阅读区域背景 |
| **预设区域**   | 紫色渐变 + 毛玻璃                   | 紫色渐变（深色）+ 毛玻璃            | 突出预设功能 |

---

## 📐 空间系统

### 统一间距变量

```css
:root {
  /* 基础间距单位 */
  --space-xs: 2px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* 圆角半径 */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* 阴影层级 */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
  --shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.15);
}
```

### 布局应用规范

```css
/* Popup界面布局 */
.popup-container {
  width: 380px;
  height: 580px;
  padding: 0;
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

.popup-content {
  padding: var(--space-6);
  gap: var(--space-5);
}

/* 阅读模式界面布局 */
.reading-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-8);
  gap: var(--space-6);
}

.reading-content {
  padding: var(--space-8) var(--space-10);
  line-height: 1.8;
  font-size: 18px;
}
```

---

## 🎭 交互动效

### 统一动画系统

```css
:root {
  /* 动画时长 */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;

  /* 缓动函数 */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 卡片交互动效

```css
/* 卡片悬停效果 */
.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
  border-color: var(--border-default);
}

/* 卡片点击效果 */
.card-interactive:active {
  transform: translateY(0);
  box-shadow: var(--shadow-md);
}

/* 卡片展开动画 */
.card-expandable {
  transition: all var(--duration-normal) var(--ease-out);
}

.card-expanded {
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-200);
}

/* 内容渐入动画 */
@keyframes cardContentFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-content-enter {
  animation: cardContentFadeIn var(--duration-normal) var(--ease-out);
}
```

### 页面切换动效

```css
/* 阅读模式进入动画 */
@keyframes readingModeEnter {
  from {
    opacity: 0;
    transform: scale(0.95);
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    transform: scale(1);
    backdrop-filter: blur(20px);
  }
}

/* Popup展开动画 */
@keyframes popupExpand {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

---

## 🧩 组件规范

### 按钮设计

```css
/* 统一按钮基础样式 */
.btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: var(--radius-lg);
  transition: all var(--duration-normal) var(--ease-out);
  cursor: pointer;
  border: none;
  outline: none;
  position: relative;
  overflow: hidden;
}

/* 主要按钮 - 用于重要操作 */
.btn-primary {
  background: linear-gradient(
    135deg,
    var(--primary-500) 0%,
    var(--primary-600) 100%
  );
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover {
  background: linear-gradient(
    135deg,
    var(--primary-600) 0%,
    var(--primary-700) 100%
  );
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* 次要按钮 - 用于常规操作 */
.btn-secondary {
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(8px);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--border-default);
  transform: translateY(-1px);
}

/* 预设按钮 - 特殊样式 */
.btn-preset {
  background: rgba(255, 255, 255, 0.9);
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  backdrop-filter: blur(6px);
  border-radius: var(--radius-xl);
  transition: all var(--duration-normal) var(--ease-out);
}

.btn-preset:hover {
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-preset.selected {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(168, 85, 247, 0.08) 100%
  );
  border-color: var(--primary-500);
  box-shadow: var(--shadow-lg);
}
```

### 输入控件设计

```css
/* 滑块控件 */
.slider-modern {
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
  height: 6px;
  background: linear-gradient(90deg, var(--gray-200) 0%, var(--gray-100) 100%);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.slider-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--primary-500) 0%,
    var(--primary-400) 100%
  );
  border-radius: var(--radius-full);
  transition: width var(--duration-normal) var(--ease-out);
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  background: white;
  border: 2px solid var(--primary-500);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  transition: all var(--duration-fast) var(--ease-out);
}

.slider-thumb:hover {
  transform: translate(-50%, -50%) scale(1.2);
  box-shadow: var(--shadow-lg);
}

/* 开关控件 */
.switch-modern {
  position: relative;
  width: 48px;
  height: 24px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  transition: all var(--duration-normal) var(--ease-out);
  cursor: pointer;
}

.switch-modern.checked {
  background: linear-gradient(
    135deg,
    var(--primary-500) 0%,
    var(--primary-400) 100%
  );
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-normal) var(--ease-out);
}

.switch-modern.checked .switch-thumb {
  transform: translateX(24px);
}
```

---

## 📱 响应式设计

### 断点系统

```css
:root {
  /* 响应式断点 */
  --breakpoint-sm: 480px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
}

/* Popup适配 */
@media (max-width: 400px) {
  .popup-container {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .popup-content {
    padding: var(--space-4);
  }
}

/* 阅读模式适配 */
@media (max-width: 768px) {
  .reading-container {
    padding: var(--space-4);
  }

  .reading-content {
    padding: var(--space-6);
    font-size: 16px;
  }

  .card-primary {
    border-radius: var(--radius-lg);
  }
}
```

### 可访问性增强

```css
/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .card-base {
    border: 2px solid var(--text-primary);
    background: var(--surface-primary);
  }

  .btn-primary {
    background: var(--text-primary);
    color: var(--surface-primary);
    border: 2px solid var(--text-primary);
  }
}

/* 焦点指示器 */
.focusable:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

---

## 🎯 实施指南

### 1. **Popup 界面实施**

```typescript
// PopupMD3.tsx 中的实施示例
const PopupCard: React.FC = () => {
  return (
    <div className="popup-container">
      {/* 头部卡片 */}
      <div className="card-primary popup-header">
        <h1>阅读助手</h1>
      </div>

      {/* 阅读模式控制卡片 */}
      <div className="card-secondary reading-mode-card">
        <div className="card-content">{/* 阅读模式开关 */}</div>
      </div>

      {/* 预设选择卡片 */}
      <div className="preset-card">
        <div className="presets-grid">{/* 预设按钮 */}</div>
      </div>

      {/* 高级设置卡片 */}
      <div className="card-secondary settings-card">{/* 可折叠设置项 */}</div>
    </div>
  );
};
```

### 2. **阅读模式界面实施**

```typescript
// ReadingMode.tsx 中的实施示例
const ReadingModeUI: React.FC = () => {
  return (
    <div className="reading-container">
      {/* 阅读内容卡片 */}
      <article className="content-card">
        <div className="reading-content">{/* 文章内容 */}</div>
      </article>

      {/* 浮动工具栏卡片 */}
      <div className="toolbar-card">
        <div className="toolbar-content">{/* 工具按钮 */}</div>
      </div>

      {/* 设置面板卡片 */}
      <div className="card-secondary settings-panel">{/* 实时设置调整 */}</div>
    </div>
  );
};
```

### 3. **主题切换实施**

```css
/* 主题切换动画 */
.theme-transition {
  transition: all var(--duration-slow) var(--ease-in-out);
}

/* 深色主题覆盖 */
[data-theme="dark"] .card-base {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .preset-card {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.12) 0%,
    rgba(168, 85, 247, 0.08) 100%
  );
  border-color: rgba(99, 102, 241, 0.25);
}
```

---

## 🎉 设计系统总结

这套**现代简约卡片式设计系统**为 Chrome 阅读插件提供了：

### ✅ **统一体验**

- Popup 和阅读模式界面风格一致
- 统一的颜色、间距、动效系统
- 一致的交互模式和视觉反馈

### ✅ **现代化设计**

- 毛玻璃效果增强现代感
- 渐变色彩提升视觉层次
- 流畅动画改善用户体验

### ✅ **可扩展性**

- 模块化的组件设计
- 灵活的主题切换机制
- 响应式的布局适配

### ✅ **可访问性**

- 完整的键盘导航支持
- 高对比度模式适配
- 减少动画选项支持

这个设计系统确保了整个 Chrome 阅读插件的视觉一致性和现代化用户体验！🚀

---

**文档版本**: v2.0  
**维护团队**: Chrome 阅读插件设计组  
**适用范围**: 全部 UI 界面
