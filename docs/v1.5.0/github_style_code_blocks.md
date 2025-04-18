# GitHub 风格代码块设计

## 概述

本文档详细说明了对阅读插件中代码块的设计优化，使其更加符合 GitHub 的设计风格，提供更加专业和一致的用户体验。

## 设计目标

1. **提升视觉一致性**：使代码块的设计风格与 GitHub 保持一致，提供熟悉的用户体验
2. **优化工具栏和行号**：改进工具栏和行号区域的设计，使其更加符合 GitHub 的设计语言
3. **提高可读性**：优化字体、间距和颜色，提高代码的可读性
4. **简化视觉元素**：移除多余的视觉元素，使设计更加简洁和专注

## 具体改进

### 整体外观优化

#### 代码块容器

- 使用 GitHub 的字体系列：`ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`
- 调整边框和圆角，使其更加符合 GitHub 的设计风格
- 移除多余的阴影效果，使设计更加简洁

```css
.code-block {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  border-radius: 6px;
  border: 1px solid var(--code-border);
}
```

#### 工具栏设计

- 使用 GitHub 风格的工具栏设计，包括背景色和边框
- 字体大小与代码内容保持一致，提供更加协调的视觉效果
- 简化工具栏的视觉元素，使其更加简洁

```css
.code-toolbar {
  padding: 8px 16px;
  background-color: var(--code-toolbar-bg);
  border-bottom: 1px solid var(--code-toolbar-border);
  font-size: var(--code-font-size, 14px);
}
```

### 语言标签优化

- 简化语言标签的设计，移除背景色和边框
- 字体大小与代码内容保持一致，提供更加协调的视觉效果
- 优化对齐方式，使其更加符合 GitHub 的设计语言

```css
.code-language {
  font-size: inherit;
  font-weight: 600;
  color: var(--code-language-color);
}
```

### 按钮优化

- 使用 GitHub 风格的按钮设计，包括透明背景和简洁的悬停效果
- 字体大小与代码内容保持一致，提供更加协调的视觉效果
- 简化按钮的视觉元素，移除边框和阴影

```css
.code-copy-button {
  background-color: transparent;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: inherit;
}

.code-copy-button:hover {
  color: var(--code-button-hover-color);
  background-color: var(--code-button-hover-bg);
}
```

### 代码内容区域优化

- 优化代码内容区域的内边距和行高
- 使用 GitHub 风格的字体大小和颜色
- 调整代码的缩进和对齐方式

```css
.code-content {
  padding: 12px 0;
  line-height: 1.45;
}

.code-block code {
  padding: 0 16px;
  letter-spacing: 0;
}
```

### 行号区域优化

- 使用 GitHub 风格的行号设计，包括背景色和边框
- 优化行号的字体大小、颜色和对齐方式
- 调整行号的内边距和间距

```css
.line-numbers {
  padding: 12px 0;
  min-width: 50px;
  text-align: right;
  background-color: var(--code-line-number-bg);
  border-right: 1px solid var(--code-line-number-border);
}

.line-number {
  padding: 0 16px 0 12px;
  font-size: 12px;
  opacity: 0.4;
  line-height: 20px;
}
```

### 复制成功提示优化

- 使用 GitHub 风格的提示设计，将提示放置在右上角
- 优化提示的字体大小、颜色和内边距
- 简化提示的视觉元素，使其更加简洁

```css
.code-toast {
  position: absolute;
  top: 0;
  right: 0;
  transform: translateY(-100%) scale(0.8);
  padding: 6px 12px;
  font-size: 12px;
  margin-top: -8px;
  margin-right: 8px;
}
```

### 内联代码样式优化

- 使用 GitHub 风格的内联代码设计，移除边框
- 优化内联代码的字体大小、颜色和内边距
- 简化内联代码的视觉元素，使其更加简洁

```css
.enhanced-inline-code {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 85%;
  padding: 0.2em 0.4em;
  border: none;
}
```

### 主题变量优化

- 使用 GitHub 的颜色方案，包括暗色和亮色主题
- 优化主题变量的命名和组织方式
- 简化主题变量的数量，移除多余的变量

#### 暗色主题

```css
.dark-theme {
  --code-border: #30363d;
  --code-toolbar-border: #21262d;
  --code-toolbar-bg: #161b22;
  --code-language-color: #8b949e;
  --code-button-color: #8b949e;
  --code-button-hover-color: #c9d1d9;
  --code-button-hover-bg: #30363d;
  --code-button-active-color: #58a6ff;
  --code-button-active-bg: rgba(56, 139, 253, 0.1);
  --code-bg: #0d1117;
  --code-text-color: #c9d1d9;
  --code-line-number-color: #6e7681;
  --code-line-number-bg: #0d1117;
  /* 更多变量... */
}
```

#### 亮色主题

```css
.light-theme {
  --code-border: #d0d7de;
  --code-toolbar-border: #d8dee4;
  --code-toolbar-bg: #f6f8fa;
  --code-language-color: #57606a;
  --code-button-color: #57606a;
  --code-button-hover-color: #24292f;
  --code-button-hover-bg: #eaeef2;
  --code-button-active-color: #0969da;
  --code-button-active-bg: rgba(9, 105, 218, 0.1);
  --code-bg: #f6f8fa;
  --code-text-color: #24292f;
  --code-line-number-color: #8c959f;
  --code-line-number-bg: #f6f8fa;
  /* 更多变量... */
}
```

### 响应式设计优化

- 优化移动设备上的代码块设计，包括内边距和字体大小
- 调整工具栏和按钮在移动设备上的布局和大小
- 简化移动设备上的视觉元素，使设计更加简洁

```css
@media (max-width: 768px) {
  .code-content {
    padding: 12px 8px;
    font-size: calc(var(--code-font-size) - 1px);
  }

  .code-toolbar {
    padding: 8px 12px;
  }

  .code-language {
    font-size: 12px;
  }

  .code-block code {
    padding: 0 8px;
  }
}
```

## 与旧版本的对比

### 旧版本

1. 使用自定义字体系列，与 GitHub 的设计风格不一致
2. 工具栏和按钮的设计较为复杂，包含多余的视觉元素
3. 行号区域的设计与 GitHub 的设计风格不一致
4. 使用自定义的颜色方案，与 GitHub 的设计语言不一致

### 新版本

1. 使用 GitHub 的字体系列，提供更加一致的用户体验
2. 工具栏和按钮的设计更加简洁，符合 GitHub 的设计语言
3. 行号区域的设计与 GitHub 的设计风格保持一致
4. 使用 GitHub 的颜色方案，提供更加一致的视觉体验

## 用户体验改进

1. **视觉一致性**：代码块的设计风格与 GitHub 保持一致，提供熟悉的用户体验
2. **提高可读性**：优化字体、间距和颜色，提高代码的可读性
3. **简化视觉元素**：移除多余的视觉元素，使设计更加简洁和专注
4. **响应式体验**：优化移动设备上的代码块设计，提供更好的响应式体验

## 后续优化方向

1. **代码折叠功能**：添加代码折叠功能，方便浏览长代码块
2. **行高亮功能**：添加行高亮功能，方便查看特定代码行
3. **代码搜索功能**：添加代码搜索功能，方便查找特定代码
4. **代码注释功能**：添加代码注释功能，方便用户添加笔记和评论
5. **代码对比功能**：添加代码对比功能，方便查看代码变更
