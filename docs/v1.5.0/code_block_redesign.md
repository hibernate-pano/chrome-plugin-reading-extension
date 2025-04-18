# 代码块重设计

## 概述

本文档详细说明了对阅读插件中代码块样式的重新设计，主要包括减少堆叠感、简化视觉元素、优化行号区域和改进响应式布局。这些改进旨在提供更加集成、简洁和专业的代码显示体验。

## 设计目标

1. **减少堆叠感**：重新设计代码块，使其更加一体化，减少多层堆叠的视觉问题
2. **简化视觉元素**：移除多余的视觉元素，使代码块更加清晰和专业
3. **优化行号区域**：简化行号区域的设计，减少视觉干扰
4. **改进响应式布局**：优化在不同设备上的显示效果

## 具体改进

### 代码块容器优化

#### 视觉设计改进

- 减小了边框圆角（从10px减少到8px），使其更加低调
- 减轻了阴影效果（从`0 4px 16px rgba(0, 0, 0, 0.1)`改为`0 2px 8px rgba(0, 0, 0, 0.05)`）
- 添加了细边框，增强了边界感但不过分突出
- 添加了平滑的悬停效果，轻微增强阴影
- 使用CSS变量定义边框颜色，确保主题一致性

```css
.enhanced-code-container {
  margin: 2em 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  border: 1px solid var(--code-border);
  transition: all 0.2s ease;
}

.enhanced-code-container:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
```

### 代码块头部优化

#### 标题栏简化

- 减小了内边距（从`0.75em 1.25em`减少到`0.6em 1em`）
- 减小了整体字体大小（添加了`font-size: 0.9em`）
- 优化了标题栏与代码区域的视觉平衡

```css
.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6em 1em;
  background-color: var(--code-header-bg);
  border-bottom: 1px solid var(--code-header-border);
  position: relative;
  font-size: 0.9em;
}
```

#### 语言标签优化

- 减小了字体大小（从`0.85em`减少到`0.75em`）
- 减小了内边距（从`0.25em 0.75em`减少到`0.2em 0.5em`）
- 减小了字母间距（从`0.5px`减少到`0.3px`）
- 添加了透明度和悬停效果，使其更加低调

```css
.code-language {
  font-size: 0.75em;
  font-weight: 600;
  color: var(--code-language-color);
  background-color: var(--code-language-bg);
  padding: 0.2em 0.5em;
  border-radius: 4px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  opacity: 0.85;
  transition: opacity 0.2s ease;
}

.code-header:hover .code-language {
  opacity: 1;
}
```

#### 复制按钮优化

- 减小了按钮大小和内边距
- 降低了默认状态的不透明度（从`0.7`减少到`0.6`）
- 减小了图标大小（添加了`width: 12px; height: 12px;`）
- 优化了悬停和复制成功状态的视觉反馈

```css
.code-copy-button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--code-button-color);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  font-size: 0.8em;
  opacity: 0.6;
}

.code-copy-button:hover {
  color: var(--code-button-hover-color);
  background-color: var(--code-button-hover-bg);
  opacity: 1;
}

.code-copy-button.copied {
  color: var(--code-button-success-color);
  background-color: var(--code-button-success-bg);
  opacity: 1;
}

.code-copy-button svg {
  margin-right: 0.25em;
  width: 12px;
  height: 12px;
}
```

### 代码内容区域优化

#### 代码显示改进

- 减小了内边距（从`1.5em`减少到`1.2em`）
- 优化了行高（从`1.6`减少到`1.5`）
- 减小了滚动条大小（从`8px`减少到`6px`）
- 添加了字母间距（`letter-spacing: 0.2px`），提高可读性

```css
.enhanced-code-container pre {
  margin: 0;
  padding: 1.2em;
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

.enhanced-code-container code {
  font-family: inherit;
  padding: 0;
  background: none;
  font-size: inherit;
  letter-spacing: 0.2px;
}
```

#### 滚动条优化

- 减小了滚动条大小
- 添加了圆角和透明度
- 添加了悬停效果

```css
.enhanced-code-container pre::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.enhanced-code-container pre::-webkit-scrollbar-track {
  background: var(--code-scrollbar-track);
  border-radius: 3px;
}

.enhanced-code-container pre::-webkit-scrollbar-thumb {
  background-color: var(--code-scrollbar-thumb);
  border-radius: 3px;
  opacity: 0.7;
}

.enhanced-code-container pre::-webkit-scrollbar-thumb:hover {
  opacity: 1;
}
```

### 行号区域优化

#### 行号显示改进

- 减小了行号区域宽度（从`3.5em`减少到`3.2em`）
- 降低了分隔线的不透明度（添加了`opacity: 0.3`）
- 减小了行号字体大小（从`0.85em`减少到`0.8em`）
- 降低了行号的默认不透明度（从`0.5`减少到`0.4`）
- 添加了平滑的过渡效果

```css
.enhanced-code-container pre.line-numbers {
  padding-left: 3.2em;
  counter-reset: line;
  position: relative;
}

.enhanced-code-container pre.line-numbers::before {
  content: "";
  position: absolute;
  top: 0;
  left: 2.2em;
  bottom: 0;
  width: 1px;
  background-color: var(--code-line-number-border);
  opacity: 0.3;
}

.enhanced-code-container pre.line-numbers .line::before {
  content: counter(line);
  counter-increment: line;
  position: absolute;
  left: -2.2em;
  width: 1.8em;
  text-align: right;
  color: var(--code-line-number-color);
  font-size: 0.8em;
  opacity: 0.4;
  user-select: none;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.enhanced-code-container pre.line-numbers .line:hover::before {
  opacity: 0.8;
  color: var(--code-line-number-hover-color);
}
```

### 内联代码优化

#### 内联代码样式改进

- 减小了字体大小（从`0.9em`减少到`0.85em`）
- 减小了内边距（从`0.2em 0.4em`减少到`0.15em 0.35em`）
- 添加了字母间距和过渡效果

```css
.enhanced-inline-code {
  font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  font-size: 0.85em;
  padding: 0.15em 0.35em;
  border-radius: 3px;
  background-color: var(--inline-code-bg);
  color: var(--inline-code-color);
  border: 1px solid var(--inline-code-border);
  white-space: nowrap;
  letter-spacing: 0.2px;
  transition: background-color 0.2s ease, color 0.2s ease;
}
```

### 主题变量优化

#### 新增变量

- 添加了代码块边框颜色变量（`--code-border`）
- 统一了边框颜色，确保视觉一致性

```css
.dark-theme {
  --code-border: #444c56;
  /* 其他变量... */
}

.light-theme {
  --code-border: #e1e4e8;
  /* 其他变量... */
}
```

### 响应式布局优化

#### 移动设备适配

- 为移动设备优化了代码块容器样式
- 减小了各元素的大小和间距
- 优化了行号区域在小屏幕上的显示

```css
@media (max-width: 768px) {
  .enhanced-code-container {
    margin: 1.5em 0;
    border-radius: 6px;
  }
  
  .enhanced-code-container pre {
    font-size: calc(var(--code-font-size) - 1px);
    padding: 1em;
  }
  
  .code-header {
    padding: 0.5em 0.8em;
    flex-wrap: wrap;
  }
  
  .code-language {
    font-size: 0.7em;
    padding: 0.15em 0.4em;
  }
  
  .code-copy-button {
    font-size: 0.75em;
  }
  
  /* 其他响应式调整... */
}
```

## 效果对比

### 优化前

- 代码块有明显的堆叠感，阴影过重
- 视觉元素较多，显得复杂
- 行号区域较宽，分隔线较明显
- 各元素尺寸较大，占用更多空间

### 优化后

- 代码块更加一体化，减少了堆叠感
- 视觉元素更加简洁，专注于代码内容
- 行号区域更加低调，减少了视觉干扰
- 各元素尺寸更加合理，整体更加紧凑

## 后续优化方向

1. **代码折叠功能**：添加代码折叠功能，方便浏览长代码块
2. **行高亮功能**：改进行高亮功能，支持多行高亮和链接锚点
3. **主题定制**：支持更多代码高亮主题，允许用户自定义
4. **性能优化**：进一步优化代码高亮的性能，特别是对大型代码块
5. **无障碍优化**：改进代码块的无障碍支持，如键盘导航和屏幕阅读器支持
