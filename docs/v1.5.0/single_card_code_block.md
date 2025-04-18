# 单卡片代码块设计

## 概述

本文档详细说明了对阅读插件中代码块样式的重新设计，主要是将原来的双卡片堆叠设计改为单一卡片设计，完全消除堆叠感，使代码块更加简洁、一体化和专业。

## 设计目标

1. **消除堆叠感**：将原来的双卡片堆叠设计改为单一卡片设计
2. **简化视觉元素**：移除多余的视觉层次，使代码块更加简洁
3. **统一设计语言**：确保代码块的各个部分（头部、内容区域、行号）视觉上一致
4. **优化颜色方案**：使用更加协调的颜色方案，提高可读性

## 具体改进

### 单一卡片设计

#### 容器统一

- 将整个代码块设计为单一卡片，而不是头部和内容区域分别使用不同的卡片
- 使用统一的背景色，消除内外层的视觉差异
- 减小边框圆角（从8px减少到6px），使其更加低调
- 减轻阴影效果，使其更加融入页面

```css
.enhanced-code-container {
  margin: 2em 0;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  position: relative;
  font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  border: 1px solid var(--code-border);
  transition: all 0.2s ease;
  background-color: var(--code-bg);
}
```

#### 头部与内容区域统一

- 使头部和内容区域使用相同的背景色，消除视觉分隔
- 将头部边框颜色与容器边框颜色统一，减少视觉层次
- 简化语言标签，移除背景色，使其更加融入整体设计

```css
.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6em 1em;
  background-color: var(--code-bg);
  border-bottom: 1px solid var(--code-border);
  position: relative;
  font-size: 0.9em;
}

.code-language {
  font-size: 0.75em;
  font-weight: 600;
  color: var(--code-language-color);
  background-color: transparent;
  padding: 0.2em 0;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  opacity: 0.75;
  transition: opacity 0.2s ease;
}
```

#### 内容区域优化

- 调整内容区域的内边距，使其与头部更加协调
- 优化代码字体和行高，提高可读性
- 简化滚动条样式，使其更加低调

```css
.enhanced-code-container pre {
  margin: 0;
  padding: 1em 1em 1.2em;
  overflow-x: auto;
  font-size: var(--code-font-size);
  line-height: 1.5;
  background-color: var(--code-bg);
  color: var(--code-text-color);
  tab-size: 2;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--code-scrollbar-thumb) var(--code-scrollbar-track);
}
```

### 颜色方案优化

#### 暗色主题优化

- 使用更加协调的暗色主题颜色方案
- 优化代码背景色，使其更加舒适
- 调整文本和边框颜色，提高对比度和可读性

```css
.dark-theme {
  --code-border: #30363d;
  --code-language-color: #8b949e;
  --code-caption-color: #adbac7;
  --code-button-color: #8b949e;
  --code-button-hover-color: #adbac7;
  --code-button-hover-bg: #30363d;
  --code-button-success-color: #7ee787;
  --code-button-success-bg: #2da44e33;
  --code-bg: #0d1117;
  --code-text-color: #c9d1d9;
  --code-scrollbar-thumb: #30363d;
  --code-scrollbar-track: #0d1117;
  --code-line-number-color: #6e7681;
  --code-line-number-hover-color: #c9d1d9;
  --code-line-number-border: #30363d;
}
```

#### 亮色主题优化

- 使用更加协调的亮色主题颜色方案
- 优化代码背景色，使其更加舒适
- 调整文本和边框颜色，提高对比度和可读性

```css
.light-theme {
  --code-border: #d0d7de;
  --code-language-color: #57606a;
  --code-caption-color: #57606a;
  --code-button-color: #57606a;
  --code-button-hover-color: #24292f;
  --code-button-hover-bg: #f3f4f6;
  --code-button-success-color: #1a7f37;
  --code-button-success-bg: #dafbe1;
  --code-bg: #f6f8fa;
  --code-text-color: #24292f;
  --code-scrollbar-thumb: #d0d7de;
  --code-scrollbar-track: #f6f8fa;
  --code-line-number-color: #8c959f;
  --code-line-number-hover-color: #24292f;
  --code-line-number-border: #d0d7de;
}
```

### 内联代码统一

- 使内联代码与代码块使用相同的颜色变量，确保视觉一致性
- 简化内联代码样式，使其更加低调

```css
.enhanced-inline-code {
  font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  font-size: 0.85em;
  padding: 0.15em 0.35em;
  border-radius: 3px;
  background-color: var(--code-bg);
  color: var(--code-text-color);
  border: 1px solid var(--code-border);
  white-space: nowrap;
  letter-spacing: 0.2px;
  transition: background-color 0.2s ease, color 0.2s ease;
}
```

### 响应式布局优化

- 为移动设备优化代码块样式
- 减小各元素的大小和间距
- 确保在小屏幕上也有良好的显示效果

```css
@media (max-width: 768px) {
  .enhanced-code-container {
    margin: 1.5em 0;
    border-radius: 4px;
  }

  .enhanced-code-container pre {
    font-size: calc(var(--code-font-size) - 1px);
    padding: 0.8em 0.8em 1em;
  }

  .code-language {
    font-size: 0.7em;
    padding: 0.15em 0;
  }
  
  /* 其他响应式调整... */
}
```

## 效果对比

### 优化前

- 代码块呈现为两个卡片的堆叠效果
- 头部和内容区域使用不同的背景色，视觉上分离
- 多余的视觉层次导致界面复杂
- 语言标签使用背景色，视觉上突出

### 优化后

- 代码块呈现为单一卡片，完全消除堆叠感
- 头部和内容区域使用相同的背景色，视觉上统一
- 简化的视觉层次使界面更加简洁
- 语言标签移除背景色，视觉上更加低调

## 后续优化方向

1. **主题定制**：支持更多代码高亮主题，允许用户自定义
2. **性能优化**：进一步优化代码高亮的性能，特别是对大型代码块
3. **无障碍优化**：改进代码块的无障碍支持，如键盘导航和屏幕阅读器支持
4. **代码折叠功能**：添加代码折叠功能，方便浏览长代码块
5. **行高亮功能**：改进行高亮功能，支持多行高亮和链接锚点
