# 阅读模式扩展 v1.8.0 实现指南

## 架构概述

阅读模式扩展 v1.8.0 采用了全新的三步处理流程架构：

1. **内容提取**：使用 defuddle 库从网页中提取有价值的内容
2. **Markdown 转换**：使用 turndown 将提取的 HTML 转换为 Markdown
3. **Markdown 渲染**：使用 markdown-it 将 Markdown 渲染为 HTML

这种架构带来以下优势：

- **一致性**：所有网页内容经过统一的处理流程，提供一致的阅读体验
- **可维护性**：各模块职责明确，便于维护和扩展
- **灵活性**：每个处理步骤都可以独立配置和优化

## 核心组件

### 1. 内容提取器 (DefuddleExtractor)

使用 defuddle 库分析网页结构，识别并提取主要内容区域，过滤广告、导航栏等无关内容。

```typescript
// 使用示例
import { defuddleExtractor } from "../content/extractors";

const extractedContent = await defuddleExtractor.extract(document);
```

### 2. Markdown 转换器 (TurndownConverter)

使用 turndown 库将提取的 HTML 转换为 Markdown 格式，保留内容结构和格式信息。

```typescript
// 使用示例
import { turndownConverter } from "../content/converters";

const markdown = turndownConverter.convertToMarkdown(htmlContent);
```

### 3. Markdown 渲染器 (MarkdownRenderer)

使用 markdown-it 库将 Markdown 渲染为 HTML，应用一致的样式和增强功能。

```typescript
// 使用示例
import { markdownRenderer } from "../content/renderers";

const html = markdownRenderer.renderMarkdown(markdown);
```

### 4. 内容处理管道 (ContentPipeline)

整合上述三个组件，提供完整的内容处理流程。

```typescript
// 使用示例
import { contentPipeline } from "../content/pipeline";

const result = await contentPipeline.process(document);
// result 包含 html, markdown, title, metadata 等信息
```

## 实现步骤

### 1. 安装依赖

```bash
pnpm add defuddle turndown markdown-it markdown-it-anchor markdown-it-toc-done-right markdown-it-highlightjs markdown-it-task-lists
```

### 2. 集成到现有代码

在 `content.ts` 中集成内容处理管道：

```typescript
import { contentPipeline } from "./pipeline";

// 在启用阅读模式时调用
async function enableReadingMode() {
  try {
    // 获取用户设置
    const settings = await getStorage(StorageKeys.SETTINGS);

    // 使用内容处理管道
    const result = await contentPipeline.process(document);

    // 创建阅读模式容器
    const container = document.createElement("div");
    container.id = "reading-mode-container";
    container.className = "reading-mode";
    container.innerHTML = result.html;

    // 清空页面内容并添加处理后的内容
    document.body.innerHTML = "";
    document.body.appendChild(container);

    // 更新页面标题
    document.title = result.title;

    // 应用阅读模式样式
    applyReadingModeStyles(settings);

    // 记录性能数据
    performanceMonitor.report();
  } catch (error) {
    console.error("启用阅读模式时发生错误:", error);
  }
}
```

### 3. 配置选项

每个组件都支持丰富的配置选项，可以根据需要进行调整：

```typescript
// 配置示例
const pipelineOptions = {
  extractorOptions: {
    defuddleOptions: {
      debug: false,
      url: window.location.href,
    },
  },
  converterOptions: {
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  },
  rendererOptions: {
    html: true,
    linkify: true,
    typographer: true,
    breaks: settings?.paragraphBreaks || false,
    plugins: {
      anchor: true,
      toc: settings?.showToc || true,
      highlightjs: true,
      taskLists: true,
    },
  },
};

const result = await contentPipeline.process(document, pipelineOptions);
```

## 扩展和自定义

### 添加自定义提取规则

可以为特定网站添加自定义提取规则：

```typescript
// 在 defuddleExtractor.ts 中添加
const specialSites = {
  "example.com": (doc: Document) => {
    // 移除特定元素
    const ads = doc.querySelectorAll(".ad-container");
    ads.forEach((ad) => ad.remove());

    // 标记主要内容
    const mainContent = doc.querySelector("#main-article");
    if (mainContent) {
      mainContent.setAttribute("data-defuddle-content", "true");
    }
  },
};
```

### 自定义 Markdown 转换规则

可以添加自定义的 Markdown 转换规则：

```typescript
// 在 turndownConverter.ts 中添加
turndownService.addRule("customElements", {
  filter: (node) => {
    return (
      node.nodeName === "DIV" && node.classList.contains("special-content")
    );
  },
  replacement: (content, node) => {
    return `:::special\n${content}\n:::`;
  },
});
```

### 添加 Markdown 渲染插件

可以添加自定义的 markdown-it 插件：

```typescript
// 在 markdownRenderer.ts 中添加
import markdownItCustomPlugin from "markdown-it-custom-plugin";

md.use(markdownItCustomPlugin, {
  // 插件选项
});
```

## 性能优化

### 使用 Web Worker

可以将内容处理过程移至 Web Worker 中，避免阻塞主线程：

```typescript
// 在 workerManager.ts 中
export function processContentInWorker(html, url) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/contentWorker.ts", import.meta.url)
    );

    worker.onmessage = (event) => {
      resolve(event.data);
      worker.terminate();
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };

    worker.postMessage({ html, url });
  });
}
```

### 缓存处理结果

对于相同的页面，可以缓存处理结果，避免重复处理：

```typescript
import { extractionCache } from "../utils/cache";

// 检查缓存
const cacheKey = `${url}_${document.documentElement.innerHTML.length}`;
const cachedResult = extractionCache.get(cacheKey);

if (cachedResult) {
  return cachedResult;
}

// 处理内容
const result = await contentPipeline.process(document);

// 存入缓存
extractionCache.set(cacheKey, result);

return result;
```

## 测试和调试

### 调试模式

可以启用调试模式，查看内容处理的详细信息：

```typescript
const result = await contentPipeline.process(document, {
  extractorOptions: {
    defuddleOptions: {
      debug: true,
    },
  },
});

// 在控制台查看 Markdown 内容
console.log(result.markdown);
```

### 性能监控

使用性能监控工具记录各处理步骤的耗时：

```typescript
import { performanceMonitor } from "../utils/performance";

// 在处理完成后查看性能报告
performanceMonitor.report();
```

## 常见问题解决

### 内容提取不准确

如果发现某些网站的内容提取不准确，可以：

1. 添加特定网站的处理规则
2. 调整 defuddle 的配置选项
3. 使用备选的内容提取方法

### Markdown 转换问题

如果 Markdown 转换结果不理想，可以：

1. 添加自定义转换规则
2. 预处理 HTML 内容，简化复杂结构
3. 对特定元素使用特殊处理

### 渲染样式问题

如果渲染后的样式不符合预期，可以：

1. 调整 markdown-it 的配置选项
2. 添加自定义 CSS 样式
3. 使用更多的 markdown-it 插件增强功能

## 结语

通过采用 defuddle 提取内容、turndown 转换为 Markdown、markdown-it 渲染的新架构，阅读模式扩展 v1.8.0 将为用户提供更加一致、干净的阅读体验。这种模块化的设计不仅简化了代码结构，提高了性能，还为未来的功能扩展奠定了坚实的基础。
