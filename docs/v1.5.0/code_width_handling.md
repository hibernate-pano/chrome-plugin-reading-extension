# 代码宽度处理优化

## 概述

本文档详细说明了对阅读插件中代码块宽度处理的优化，通过添加换行模式切换功能，使用户可以根据需要选择代码显示方式，提高代码阅读体验。

## 问题背景

在阅读长代码或宽代码时，用户面临两种需求：
1. **保持代码格式**：希望代码保持原有格式，即使需要水平滚动
2. **自动换行**：希望代码自动换行以适应容器宽度，避免水平滚动

之前的实现存在矛盾的设置：
- 一方面设置了 `overflow-x: auto` 允许水平滚动
- 另一方面设置了 `white-space: pre-wrap` 和 `word-break: break-word` 强制换行

这种矛盾的设置可能导致代码显示不一致，影响用户体验。

## 解决方案

### 功能设计

1. **默认使用水平滚动模式**：保持代码原有格式，允许水平滚动
2. **添加换行模式切换按钮**：允许用户根据需要切换到自动换行模式
3. **视觉反馈**：按钮状态变化提供明确的视觉反馈

### 技术实现

#### 1. 添加换行模式切换按钮

在代码块工具栏中添加一个切换按钮，允许用户在水平滚动模式和自动换行模式之间切换：

```javascript
// 添加切换按钮
const wrapButton = document.createElement('button');
wrapButton.className = 'code-wrap-button';
wrapButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>';
wrapButton.title = '切换换行模式';
```

#### 2. 实现模式切换逻辑

根据用户点击切换代码显示模式：

```javascript
wrapButton.addEventListener('click', () => {
  const codeContent = (content as HTMLElement);
  const isWrapped = codeContent.style.whiteSpace === 'pre-wrap';
  
  if (isWrapped) {
    // 切换到滚动模式
    codeContent.style.whiteSpace = 'pre';
    codeContent.style.wordBreak = 'normal';
    codeContent.style.overflowWrap = 'normal';
    wrapButton.title = '切换换行模式';
    wrapButton.classList.remove('active');
  } else {
    // 切换到换行模式
    codeContent.style.whiteSpace = 'pre-wrap';
    codeContent.style.wordBreak = 'break-word';
    codeContent.style.overflowWrap = 'break-word';
    wrapButton.title = '切换滚动模式';
    wrapButton.classList.add('active');
  }
});
```

#### 3. 样式设计

为换行模式切换按钮添加样式，与复制按钮保持一致的视觉风格：

```css
/* 换行模式切换按钮 */
.code-wrap-button {
  background-color: var(--code-button-bg);
  border: 1px solid var(--code-button-border);
  cursor: pointer;
  color: var(--code-button-color);
  padding: 0.4em;
  margin-right: 0.5em;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  box-shadow: var(--code-button-shadow);
}

/* 按钮悬停和激活状态 */
.code-wrap-button:hover {
  color: var(--code-button-hover-color);
  background-color: var(--code-button-hover-bg);
  border-color: var(--code-button-hover-border);
  box-shadow: var(--code-button-hover-shadow);
}

.code-wrap-button:active {
  transform: translateY(1px);
  box-shadow: var(--code-button-active-shadow);
}

.code-wrap-button.active {
  color: var(--code-button-active-color, var(--code-button-hover-color));
  background-color: var(--code-button-active-bg, var(--code-button-hover-bg));
  border-color: var(--code-button-active-border, var(--code-button-hover-border));
}
```

#### 4. 响应式设计

在移动设备上优化按钮样式：

```css
@media (max-width: 768px) {
  .code-wrap-button {
    padding: 0.3em;
    font-size: 0.8em;
    margin-right: 0.4em;
  }
}
```

## 用户体验改进

1. **灵活的代码显示**：用户可以根据需要选择代码显示方式
2. **保持代码格式**：默认保持代码原有格式，适合查看格式敏感的代码
3. **提高可读性**：在需要时可以切换到自动换行模式，避免水平滚动
4. **直观的视觉反馈**：按钮状态变化提供明确的视觉反馈

## 与旧版本的对比

### 旧版本

1. 代码显示方式固定，无法根据需要切换
2. 存在矛盾的样式设置，可能导致代码显示不一致
3. 用户无法控制代码是否自动换行

### 新版本

1. 默认使用水平滚动模式，保持代码原有格式
2. 提供换行模式切换按钮，允许用户根据需要切换显示方式
3. 按钮状态变化提供明确的视觉反馈
4. 在移动设备上优化按钮样式，提供更好的响应式体验

## 后续优化方向

1. **记住用户偏好**：记住用户对特定代码块的显示偏好
2. **全局设置**：添加全局设置，允许用户设置默认的代码显示方式
3. **键盘快捷键**：添加键盘快捷键支持，如按 Alt+W 切换换行模式
4. **更多格式选项**：提供更多代码格式选项，如缩进大小、制表符宽度等
