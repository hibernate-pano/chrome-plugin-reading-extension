# 阅读插件设计规范

## 设计理念

阅读插件的核心设计理念是"简洁、好用、易用"，旨在提供无干扰的阅读体验，让用户能够专注于内容本身。设计应遵循以下原则：

- **简约至上**：移除一切非必要元素，保持界面清爽
- **功能优先**：确保每个功能都有明确的用途和价值
- **一致性**：保持视觉和交互的一致性
- **可访问性**：确保所有用户都能轻松使用

## 视觉设计规范

### 色彩系统

#### 主色调

- **品牌蓝**：`#3B82F6` (亮色模式)，`#60A5FA` (暗色模式)
- **辅助色**：`#10B981` (成功)，`#F59E0B` (警告)，`#EF4444` (错误)

#### 中性色

亮色模式：
- **背景**：`#FFFFFF` (主背景)，`#F9FAFB` (次要背景)
- **文本**：`#111827` (主要文本)，`#4B5563` (次要文本)，`#9CA3AF` (辅助文本)
- **边框**：`#E5E7EB` (主要边框)，`#F3F4F6` (次要边框)

暗色模式：
- **背景**：`#121212` (主背景)，`#1E1E1E` (次要背景)
- **文本**：`#E5E7EB` (主要文本)，`#9CA3AF` (次要文本)，`#6B7280` (辅助文本)
- **边框**：`#374151` (主要边框)，`#1F2937` (次要边框)

#### 阅读背景色

- **纯白**：`#FFFFFF` (亮色模式)，`#121212` (暗色模式)
- **暖色**：`#FFFAF0` (亮色模式)，`#1A1814` (暗色模式)
- **冷色**：`#F0F7FF` (亮色模式)，`#141A1F` (暗色模式)
- **复古**：`#F5F5DC` (亮色模式)，`#1A1A14` (暗色模式)
- **奶油**：`#FFFDD0` (亮色模式)，`#1A1A14` (暗色模式)

### 排版

#### 字体系统

- **默认字体**：系统默认无衬线字体
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  ```

- **中文字体选项**：
  - 宋体：`font-family: "Songti SC", STSong, SimSun, serif;`
  - 黑体：`font-family: "Heiti SC", STHeiti, "Microsoft YaHei", sans-serif;`
  - 楷体：`font-family: "Kaiti SC", STKaiti, KaiTi, serif;`

- **代码字体**：
  ```css
  font-family: "Fira Code", "JetBrains Mono", "Consolas", "Monaco", monospace;
  ```

#### 字体大小

- **基础大小**：16px (1rem)
- **标题大小**：
  - H1: 2rem (32px)
  - H2: 1.5rem (24px)
  - H3: 1.25rem (20px)
  - H4: 1.125rem (18px)
- **小号文本**：0.875rem (14px)
- **代码文本**：0.9375rem (15px)

#### 行高与间距

- **正文行高**：1.6 - 1.8
- **标题行高**：1.2 - 1.4
- **段落间距**：1.2em - 1.5em
- **字间距**：0.01em - 0.05em (根据字体调整)

### 布局规范

#### 内容宽度

- **默认宽度**：1200px
- **最大宽度**：1800px
- **最小宽度**：320px
- **内边距**：
  - 桌面：24px - 32px
  - 平板：16px - 24px
  - 移动：12px - 16px

#### 响应式断点

- **移动端**：< 640px
- **平板**：640px - 1024px
- **桌面**：> 1024px
- **大屏**：> 1440px

#### 间距系统

使用4的倍数作为基础间距单位：
- **超小**：4px
- **小**：8px
- **中小**：12px
- **中**：16px
- **中大**：24px
- **大**：32px
- **超大**：48px

### 组件设计

#### 卡片

- **圆角**：8px - 12px
- **阴影**：
  ```css
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  ```
- **暗色模式阴影**：
  ```css
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  ```
- **边框**：1px solid 边框色
- **内边距**：16px - 24px

#### 按钮

- **主要按钮**：品牌蓝背景，白色文本
- **次要按钮**：透明背景，品牌蓝边框和文本
- **文本按钮**：无背景无边框，品牌蓝文本
- **圆角**：4px (小)，8px (中)，9999px (圆形)
- **尺寸**：
  - 小：24px高，12px内边距
  - 中：32px高，16px内边距
  - 大：40px高，20px内边距

#### 表单控件

- **输入框**：
  - 高度：32px - 40px
  - 内边距：8px 12px
  - 边框：1px solid 边框色
  - 圆角：4px - 8px
  - 聚焦状态：品牌蓝边框，轻微阴影

- **滑块**：
  - 轨道高度：4px - 6px
  - 滑块大小：16px - 20px
  - 品牌蓝填充色

- **开关**：
  - 宽度：36px - 44px
  - 高度：20px - 24px
  - 滑块大小：16px - 20px
  - 开启状态：品牌蓝背景

#### 代码块

- **容器**：
  - 背景：浅灰色 (亮色模式)，深灰色 (暗色模式)
  - 边框：1px solid 边框色
  - 圆角：8px
  - 内边距：16px

- **标题栏**：
  - 高度：40px
  - 背景：比容器略深
  - 语言标签：小号文本，轻微背景色区分
  - 复制按钮：图标按钮，悬停效果

- **代码区域**：
  - 字体：等宽代码字体
  - 行高：1.5 - 1.6
  - 行号：右对齐，浅色文本
  - 语法高亮：根据主题定制

#### 图片容器

- **容器**：
  - 边框：无或1px solid 边框色
  - 圆角：4px - 8px
  - 阴影：轻微阴影增加深度感

- **占位符**：
  - 背景：浅灰色渐变
  - 加载动画：简约的脉冲效果
  - 无文字标签

- **图片标题**：
  - 位置：图片下方
  - 字体：小号文本
  - 对齐：居中

## 交互设计规范

### 动效系统

- **过渡时长**：
  - 超快：100ms (微交互)
  - 快：200ms (按钮状态)
  - 中：300ms (面板展开)
  - 慢：500ms (页面转换)

- **缓动函数**：
  - 标准：`cubic-bezier(0.4, 0, 0.2, 1)`
  - 进入：`cubic-bezier(0, 0, 0.2, 1)`
  - 退出：`cubic-bezier(0.4, 0, 1, 1)`

- **动效类型**：
  - 不透明度：用于显示/隐藏
  - 缩放：用于强调
  - 位移：用于层级变化
  - 颜色：用于状态变化

### 状态反馈

- **悬停状态**：
  - 轻微背景色变化
  - 轻微缩放 (1.02 - 1.05)
  - 可能的阴影增强

- **激活状态**：
  - 轻微下沉效果 (缩放 0.98)
  - 背景色加深

- **加载状态**：
  - 简约的加载动画
  - 半透明遮罩
  - 可能的骨架屏

- **成功/错误状态**：
  - 简短的成功/错误提示
  - 使用对应的状态颜色
  - 2-3秒后自动消失

### 无障碍设计

- **颜色对比度**：
  - 文本：至少 4.5:1
  - 大文本：至少 3:1
  - UI组件：至少 3:1

- **焦点状态**：
  - 清晰可见的焦点指示器
  - 使用品牌蓝作为焦点色
  - 确保键盘可导航

- **文本大小**：
  - 最小可读文本：14px
  - 支持浏览器文本缩放
  - 避免使用固定像素大小

## 代码实现指南

### CSS 变量系统

```css
:root {
  /* 颜色 */
  --brand-primary: #3B82F6;
  --brand-primary-dark: #60A5FA;
  
  /* 背景色 */
  --bg-main: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --bg-main-dark: #121212;
  --bg-secondary-dark: #1E1E1E;
  
  /* 文本色 */
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-tertiary: #9CA3AF;
  --text-primary-dark: #E5E7EB;
  --text-secondary-dark: #9CA3AF;
  --text-tertiary-dark: #6B7280;
  
  /* 边框色 */
  --border-primary: #E5E7EB;
  --border-secondary: #F3F4F6;
  --border-primary-dark: #374151;
  --border-secondary-dark: #1F2937;
  
  /* 尺寸 */
  --content-width: 1200px;
  --content-max-width: 1800px;
  
  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md-sm: 12px;
  --space-md: 16px;
  --space-md-lg: 24px;
  --space-lg: 32px;
  --space-xl: 48px;
  
  /* 排版 */
  --font-size-base: 16px;
  --font-size-sm: 14px;
  --font-size-code: 15px;
  --font-size-h1: 32px;
  --font-size-h2: 24px;
  --font-size-h3: 20px;
  --font-size-h4: 18px;
  
  /* 行高 */
  --line-height-text: 1.7;
  --line-height-heading: 1.3;
  --line-height-code: 1.6;
  
  /* 动效 */
  --transition-fast: 200ms;
  --transition-medium: 300ms;
  --transition-slow: 500ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}

/* 暗色模式变量 */
@media (prefers-color-scheme: dark) {
  :root {
    /* 暗色模式覆盖变量 */
  }
}

/* 或使用类选择器切换主题 */
.dark-theme {
  /* 暗色主题变量 */
}
```

### 组件实现示例

#### 代码块组件

```css
.enhanced-code-container {
  margin: 2em 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  font-family: var(--font-family-code);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75em 1em;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.code-language {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  background-color: var(--bg-main);
  padding: 0.25em 0.5em;
  border-radius: 4px;
}

.code-copy-button {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0.25em 0.5em;
  border-radius: 4px;
  transition: all var(--transition-fast) var(--ease-standard);
}

.code-copy-button:hover {
  color: var(--text-secondary);
  background-color: var(--bg-main);
}

.enhanced-code-container pre {
  margin: 0;
  padding: 1em;
  overflow-x: auto;
  font-size: var(--font-size-code);
  line-height: var(--line-height-code);
  background-color: var(--bg-secondary);
}

/* 暗色主题 */
.dark-theme .enhanced-code-container {
  background-color: var(--bg-secondary-dark);
  border-color: var(--border-primary-dark);
}

.dark-theme .code-header {
  background-color: var(--bg-secondary-dark);
  border-color: var(--border-primary-dark);
}

.dark-theme .code-language {
  background-color: var(--bg-main-dark);
  color: var(--text-secondary-dark);
}

.dark-theme .code-copy-button {
  color: var(--text-tertiary-dark);
}

.dark-theme .code-copy-button:hover {
  color: var(--text-secondary-dark);
  background-color: var(--bg-main-dark);
}
```

#### 图片容器组件

```css
.enhanced-image-container {
  margin: 2em 0;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.enhanced-image {
  display: block;
  max-width: 100%;
  height: auto;
  opacity: 0;
  transition: opacity var(--transition-medium) var(--ease-standard);
}

.enhanced-image.loaded {
  opacity: 1;
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(110deg, var(--bg-secondary) 30%, var(--border-secondary) 50%, var(--bg-secondary) 70%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.image-caption {
  text-align: center;
  padding: 0.5em 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

/* 暗色主题 */
.dark-theme .image-placeholder {
  background: linear-gradient(110deg, var(--bg-secondary-dark) 30%, var(--border-secondary-dark) 50%, var(--bg-secondary-dark) 70%);
}

.dark-theme .image-caption {
  color: var(--text-secondary-dark);
}
```

## 最佳实践

### 设计原则

1. **减少视觉噪音**
   - 避免不必要的装饰元素
   - 使用留白创造呼吸空间
   - 保持界面整洁有序

2. **渐进式披露**
   - 只在需要时显示高级选项
   - 使用折叠面板隐藏不常用功能
   - 采用分步引导而非一次性展示所有内容

3. **直观反馈**
   - 所有交互都应有明确反馈
   - 使用微妙的动画指示状态变化
   - 错误信息应明确指出问题和解决方法

### 性能考量

1. **减少重排和重绘**
   - 使用CSS变量进行主题切换
   - 批量DOM更新
   - 使用transform和opacity进行动画

2. **资源优化**
   - 延迟加载非关键资源
   - 优化图片大小和格式
   - 使用代码分割减小初始加载体积

3. **响应式设计**
   - 使用相对单位(rem, em, %)
   - 实现流式布局
   - 针对不同设备优化交互方式

## 总结

本设计规范旨在提供一个一致的视觉语言和交互模式，确保阅读插件在保持简洁的同时提供优质的用户体验。设计团队和开发团队应密切合作，确保设计意图能够准确地转化为代码实现。

随着产品的发展，本规范也将不断更新和完善，以适应新的需求和技术变化。
