# 阅读模式扩展 v1.8.0 实现方案

## 概述

基于 Obsidian Clipper 的实现思路，我们将对阅读模式扩展进行重构，采用以下三步流程：

1. **内容提取**：使用 defuddle 库从网页中提取有价值的内容
2. **Markdown 转换**：使用 turndown 将提取的 HTML 转换为 Markdown
3. **Markdown 渲染**：使用 Markdown 重新渲染页面，提供更一致、更干净的阅读体验

这种方法将简化代码结构，提高性能，并提供更一致的阅读体验。

## 技术栈

- **defuddle**：用于智能提取网页内容，去除广告、导航栏等干扰元素
- **turndown**：将 HTML 转换为 Markdown 格式
- **markdown-it**：将 Markdown 渲染为 HTML（可选配置各种插件增强功能）
- **highlight.js**：代码语法高亮（可通过 markdown-it 插件集成）

## 架构设计

### 1. 模块结构

```
src/
├── content/
│   ├── extractors/
│   │   ├── defuddleExtractor.ts     # 使用 defuddle 提取内容
│   │   └── index.ts                 # 导出所有提取器
│   ├── converters/
│   │   ├── turndownConverter.ts     # 使用 turndown 转换为 Markdown
│   │   └── index.ts                 # 导出所有转换器
│   ├── renderers/
│   │   ├── markdownRenderer.ts      # 使用 markdown-it 渲染 Markdown
│   │   └── index.ts                 # 导出所有渲染器
│   ├── components/                  # UI 组件
│   └── content.ts                   # 主入口文件
```

### 2. 数据流

```
原始网页 HTML → defuddle 提取 → 清洁 HTML → turndown 转换 → Markdown → markdown-it 渲染 → 最终 HTML
```

### 3. 主要组件

#### 3.1 内容提取器 (defuddleExtractor)

- 使用 defuddle 库分析网页结构
- 识别并提取主要内容区域
- 过滤广告、导航栏、侧边栏等无关内容
- 保留图片、表格、代码块等重要元素

#### 3.2 Markdown 转换器 (turndownConverter)

- 使用 turndown 将提取的 HTML 转换为 Markdown
- 自定义转换规则，处理特殊元素（如代码块、表格、图片等）
- 保留必要的元数据（如标题、作者、日期等）

#### 3.3 Markdown 渲染器 (markdownRenderer)

- 使用 markdown-it 将 Markdown 渲染为 HTML
- 配置插件支持代码高亮、数学公式、表格等
- 应用自定义样式，提供一致的阅读体验

## 实现步骤

### 1. 准备工作

1. 安装必要的依赖：

   ```bash
   npm install defuddle turndown markdown-it highlight.js
   ```

2. 安装增强插件：
   ```bash
   npm install markdown-it-anchor markdown-it-toc-done-right markdown-it-highlightjs markdown-it-task-lists
   ```

### 2. 实现内容提取器

```typescript
// src/content/extractors/defuddleExtractor.ts
import { defuddle } from "defuddle";

export async function extractContent(document: Document): Promise<HTMLElement> {
  // 使用 defuddle 提取主要内容
  const result = await defuddle(document);

  // 创建一个新的容器元素
  const container = document.createElement("div");
  container.className = "reading-mode-content";

  // 将提取的内容添加到容器中
  container.innerHTML = result.html;

  // 返回提取的内容容器
  return container;
}
```

### 3. 实现 Markdown 转换器

````typescript
// src/content/converters/turndownConverter.ts
import TurndownService from "turndown";

export function convertToMarkdown(html: string): string {
  // 创建 Turndown 实例
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    bulletListMarker: "-",
  });

  // 自定义规则：保留代码块语言标记
  turndownService.addRule("codeBlocks", {
    filter: (node) => {
      return (
        node.nodeName === "PRE" &&
        node.firstChild &&
        node.firstChild.nodeName === "CODE"
      );
    },
    replacement: (content, node) => {
      const code = node.firstChild as HTMLElement;
      const className = code.getAttribute("class") || "";
      const language = className.replace(/^language-/, "");
      return "\n```" + language + "\n" + code.textContent + "\n```\n";
    },
  });

  // 自定义规则：处理图片和图片说明
  turndownService.addRule("images", {
    filter: "figure",
    replacement: (content, node) => {
      const img = node.querySelector("img");
      const figcaption = node.querySelector("figcaption");

      if (!img) return content;

      const alt = img.getAttribute("alt") || "";
      const src = img.getAttribute("src") || "";
      const caption = figcaption ? figcaption.textContent : "";

      return `![${alt}](${src})${caption ? "\n*" + caption + "*" : ""}`;
    },
  });

  // 转换 HTML 为 Markdown
  return turndownService.turndown(html);
}
````

### 4. 实现 Markdown 渲染器

```typescript
// src/content/renderers/markdownRenderer.ts
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItToc from "markdown-it-toc-done-right";
import markdownItHighlightjs from "markdown-it-highlightjs";
import markdownItTaskLists from "markdown-it-task-lists";

export function renderMarkdown(markdown: string): string {
  // 创建 markdown-it 实例
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });

  // 配置插件
  md.use(markdownItAnchor, {
    permalink: true,
    permalinkSymbol: "#",
    permalinkBefore: true,
  })
    .use(markdownItToc, {
      listType: "ul",
      containerClass: "reading-mode-toc",
    })
    .use(markdownItHighlightjs)
    .use(markdownItTaskLists);

  // 渲染 Markdown 为 HTML
  return md.render(markdown);
}
```

### 5. 更新主入口文件

```typescript
// src/content/content.ts
import { StorageKeys, getStorage } from "../storage/storage";
import { extractContent } from "./extractors/defuddleExtractor";
import { convertToMarkdown } from "./converters/turndownConverter";
import { renderMarkdown } from "./renderers/markdownRenderer";
import { TextSelectionToolbar } from "./components/TextSelectionToolbar";

let originalContent: string | null = null;
let isReadingMode = false;
let textSelectionToolbar: TextSelectionToolbar | null = null;

async function fetchSettings() {
  // 获取用户设置
  // ...
}

async function toggleReadingMode() {
  const settings = await fetchSettings();

  if (!isReadingMode) {
    // 保存原始内容
    originalContent = document.body.innerHTML;

    try {
      // 1. 提取内容
      const extractedContent = await extractContent(document);

      // 2. 转换为 Markdown
      const markdown = convertToMarkdown(extractedContent.innerHTML);

      // 3. 渲染 Markdown
      const renderedHtml = renderMarkdown(markdown);

      // 4. 创建阅读模式容器
      const readingModeContainer = document.createElement("div");
      readingModeContainer.id = "reading-mode-container";
      readingModeContainer.className =
        settings.theme === "dark" ? "dark" : "light";
      readingModeContainer.innerHTML = renderedHtml;

      // 5. 应用样式设置
      applyStyles(readingModeContainer, settings);

      // 6. 替换页面内容
      document.body.innerHTML = "";
      document.body.appendChild(readingModeContainer);

      // 7. 初始化工具栏
      initToolbar(settings);

      isReadingMode = true;
    } catch (error) {
      console.error("启用阅读模式时出错:", error);
    }
  } else {
    // 恢复原始内容
    if (originalContent) {
      document.body.innerHTML = originalContent;
      originalContent = null;
    }

    // 清理工具栏
    if (textSelectionToolbar) {
      textSelectionToolbar.destroy();
      textSelectionToolbar = null;
    }

    isReadingMode = false;
  }
}

function applyStyles(container: HTMLElement, settings: any) {
  // 应用字体、颜色、间距等样式
  container.style.fontFamily = settings.fontFamily;
  container.style.fontSize = `${settings.fontSize}px`;
  container.style.lineHeight = settings.lineHeight.toString();
  container.style.maxWidth = `${settings.pageWidth}px`;
  container.style.margin = "0 auto";
  container.style.padding = "20px";
  container.style.backgroundColor = settings.backgroundColor;
  container.style.color = settings.theme === "dark" ? "#e0e0e0" : "#333";
}

function initToolbar(settings: any) {
  // 初始化文本选择工具栏
  textSelectionToolbar = new TextSelectionToolbar({
    theme: settings.theme,
    // 其他工具栏选项
  });
}

// 监听消息，切换阅读模式
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleReadingMode") {
    toggleReadingMode()
      .then(() => {
        sendResponse({ success: true, isReadingMode });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // 异步响应
  }
});

// 初始化
function init() {
  // 添加必要的样式
  const styles = document.createElement("style");
  styles.id = "reading-mode-styles";
  styles.textContent = `
    #reading-mode-container {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    #reading-mode-container.dark {
      background-color: #1a1a1a;
      color: #e0e0e0;
    }
    
    #reading-mode-container h1, 
    #reading-mode-container h2, 
    #reading-mode-container h3, 
    #reading-mode-container h4, 
    #reading-mode-container h5, 
    #reading-mode-container h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      line-height: 1.3;
    }
    
    #reading-mode-container p {
      margin-bottom: 1em;
    }
    
    #reading-mode-container img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1.5em auto;
    }
    
    #reading-mode-container pre {
      background-color: #f5f5f5;
      padding: 1em;
      border-radius: 4px;
      overflow-x: auto;
    }
    
    #reading-mode-container.dark pre {
      background-color: #282c34;
    }
    
    #reading-mode-container code {
      font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', monospace;
      font-size: 0.9em;
    }
    
    #reading-mode-container blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin-left: 0;
      color: #666;
    }
    
    #reading-mode-container.dark blockquote {
      border-left-color: #444;
      color: #bbb;
    }
    
    #reading-mode-container table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    
    #reading-mode-container th, 
    #reading-mode-container td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    
    #reading-mode-container.dark th, 
    #reading-mode-container.dark td {
      border-color: #444;
    }
    
    #reading-mode-container th {
      background-color: #f5f5f5;
      text-align: left;
    }
    
    #reading-mode-container.dark th {
      background-color: #333;
    }
    
    .reading-mode-toc {
      background-color: #f9f9f9;
      padding: 1em;
      border-radius: 4px;
      margin-bottom: 2em;
    }
    
    #reading-mode-container.dark .reading-mode-toc {
      background-color: #282c34;
    }
  `;
  document.head.appendChild(styles);
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", init);
```

## 性能优化

1. **懒加载**：

   - 延迟加载 markdown-it 和插件，仅在需要时加载
   - 使用 Web Workers 处理 Markdown 转换，避免阻塞主线程

2. **缓存**：

   - 缓存提取和转换结果，避免重复处理
   - 使用 IndexedDB 存储处理过的页面内容

3. **渐进式增强**：
   - 先显示基本内容，然后逐步应用样式和增强功能
   - 使用 requestAnimationFrame 分批处理 DOM 操作

## 用户体验改进

1. **自定义主题**：

   - 提供多种预设主题（浅色、深色、护眼等）
   - 允许用户自定义颜色、字体和间距

2. **阅读进度**：

   - 显示阅读进度条
   - 记住上次阅读位置

3. **辅助功能**：
   - 支持键盘导航
   - 提供文本朗读功能
   - 支持字体大小调整和行距调整

## 兼容性考虑

1. **浏览器兼容性**：

   - 支持主流浏览器（Chrome、Firefox、Edge、Safari）
   - 使用 polyfill 处理兼容性问题

2. **网站兼容性**：
   - 针对常见网站类型（新闻、博客、文档等）优化提取规则
   - 提供网站特定的处理规则

## 未来扩展

1. **离线阅读**：

   - 支持保存文章到本地
   - 提供阅读列表功能

2. **注释和高亮**：

   - 允许用户添加注释和高亮
   - 支持导出注释和高亮

3. **社交分享**：
   - 支持分享文章和注释
   - 集成社交媒体分享功能

## 结论

通过采用 defuddle 提取内容、turndown 转换为 Markdown、markdown-it 渲染的方法，我们可以大幅简化代码结构，提高性能，并提供更一致、更干净的阅读体验。这种方法也使扩展更容易维护和扩展，为未来的功能增强奠定了基础。
