# 代码块美化设计

## 概述

本文档详细说明了对阅读插件中代码块的美化设计，通过优化工具栏、改进整体外观、优化语言标签和复制按钮的样式，以及改进代码内容区域的视觉效果，使代码块更加精致和专业。

## 设计目标

1. **提升视觉质量**：使代码块更加精致和专业，提高整体美观度
2. **增强用户体验**：通过细节优化，提供更好的用户体验
3. **保持一致性**：与现代开发平台（如GitHub、VSCode等）的设计语言保持一致
4. **优化响应式设计**：确保在各种设备上都能提供良好的视觉体验

## 具体改进

### 整体外观优化

#### 代码块容器

- 添加精致的阴影效果，增强立体感
- 优化边框和圆角，使其更加现代化
- 使用统一的背景色，提高视觉一致性

```css
.code-block {
  background-color: var(--code-bg);
  border-radius: 8px;
  box-shadow: var(--code-shadow);
  border: 1px solid var(--code-border);
}
```

#### 工具栏设计

- 添加底部边框，增强视觉层次感
- 优化内边距，使其更加舒适
- 保持与代码块容器的视觉一致性

```css
.code-toolbar {
  padding: 0.6em 1em;
  border-bottom: 1px solid var(--code-toolbar-border);
}
```

### 语言标签优化

- 优化语言标签的背景色和文字颜色，增强可读性
- 调整内边距和圆角，使其更加精致
- 添加垂直居中对齐，提高视觉平衡感

```css
.code-language {
  background-color: var(--code-language-bg);
  padding: 0.3em 0.6em;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
```

### 复制按钮优化

- 添加边框和阴影，增强按钮的立体感
- 优化悬停和点击状态，提供更好的交互反馈
- 添加间距，使图标和文本更加协调

```css
.code-copy-button {
  background-color: var(--code-button-bg);
  border: 1px solid var(--code-button-border);
  box-shadow: var(--code-button-shadow);
  padding: 0.4em 0.8em;
  gap: 0.4em;
}

.code-copy-button:hover {
  border-color: var(--code-button-hover-border);
  box-shadow: var(--code-button-hover-shadow);
}

.code-copy-button:active {
  transform: translateY(1px);
  box-shadow: var(--code-button-active-shadow);
}
```

### 代码内容区域优化

- 优化内边距，使代码显示更加舒适
- 调整行高，提高代码可读性
- 保持与工具栏的视觉一致性

```css
.code-content {
  padding: 1.2em 1.5em 1.5em;
  line-height: 1.6;
}
```

### 行号区域优化

- 使用独立的背景色，增强视觉区分
- 优化行号的颜色和不透明度，使其不干扰代码阅读
- 设置最小宽度，确保行号显示完整

```css
.line-numbers {
  padding: 1.2em 0 1.5em;
  background-color: var(--code-line-number-bg);
  border-right: 1px solid var(--code-line-number-border);
  min-width: 3em;
}
```

### 复制成功提示优化

- 添加边框和阴影，增强提示的立体感
- 优化内边距和圆角，使其更加精致
- 添加字体粗细，增强可读性

```css
.code-toast {
  padding: 0.6em 1.2em;
  border-radius: 6px;
  font-weight: 500;
  box-shadow: var(--code-toast-shadow);
  border: 1px solid var(--code-toast-border);
}
```

### 主题变量优化

- 添加更多细粒度的颜色变量，支持更精细的样式控制
- 为不同状态（如悬停、点击等）添加专门的变量
- 优化暗色和亮色主题的颜色方案

#### 暗色主题

```css
.dark-theme {
  --code-border: #30363d;
  --code-toolbar-border: #30363d;
  --code-button-border: #444c56;
  --code-button-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  --code-button-hover-border: #768390;
  --code-button-hover-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  --code-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 3px 8px rgba(0, 0, 0, 0.2);
  --code-line-number-bg: #161b22;
  /* 更多变量... */
}
```

#### 亮色主题

```css
.light-theme {
  --code-border: #d0d7de;
  --code-toolbar-border: #d8dee4;
  --code-button-border: #d0d7de;
  --code-button-shadow: 0 1px 2px rgba(31, 35, 40, 0.05);
  --code-button-hover-border: #afb8c1;
  --code-button-hover-shadow: 0 1px 3px rgba(31, 35, 40, 0.1);
  --code-shadow: 0 1px 2px rgba(31, 35, 40, 0.1), 0 1px 4px rgba(31, 35, 40, 0.1);
  --code-line-number-bg: #f6f8fa;
  /* 更多变量... */
}
```

### 响应式设计优化

- 优化移动设备上的圆角和内边距
- 调整工具栏和代码内容区域的布局，使其在小屏幕上更加协调
- 优化字体大小和行高，确保在移动设备上的可读性

```css
@media (max-width: 768px) {
  .code-block {
    border-radius: 6px;
  }
  
  .code-content {
    padding: 1em 1.2em 1.2em;
    border-radius: 0 0 6px 6px;
  }
  
  .code-toolbar {
    padding: 0.5em 0.8em;
    border-radius: 6px 6px 0 0;
  }
  
  /* 更多响应式调整... */
}
```

## 与旧版本的对比

### 旧版本

1. 代码块容器没有阴影，视觉上较为平面
2. 工具栏没有底部边框，与代码内容区域的分隔不够明显
3. 复制按钮没有边框和阴影，视觉上不够突出
4. 语言标签的样式较为简单，不够精致
5. 主题变量较少，不支持细粒度的样式控制

### 新版本

1. 代码块容器添加了精致的阴影和边框，增强立体感
2. 工具栏添加了底部边框，与代码内容区域的分隔更加明显
3. 复制按钮添加了边框和阴影，视觉上更加突出
4. 语言标签的样式更加精致，增加了背景色和圆角
5. 主题变量更加丰富，支持细粒度的样式控制

## 用户体验改进

1. **视觉层次更加清晰**：通过阴影、边框和背景色的对比，使代码块的视觉层次更加清晰
2. **交互反馈更加直观**：优化按钮的悬停和点击状态，提供更好的交互反馈
3. **视觉一致性更强**：统一代码块各部分的视觉风格，增强整体一致性
4. **响应式体验更好**：优化移动设备上的布局和样式，提供更好的响应式体验

## 后续优化方向

1. **代码高亮主题**：提供更多代码高亮主题选项，满足不同用户的需求
2. **自定义样式**：允许用户自定义代码块的样式，如字体、颜色、行高等
3. **代码折叠功能**：添加代码折叠功能，方便浏览长代码块
4. **代码搜索功能**：添加代码搜索功能，方便查找特定代码
5. **行高亮功能**：添加行高亮功能，方便查看特定代码行
