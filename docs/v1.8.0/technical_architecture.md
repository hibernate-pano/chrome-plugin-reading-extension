# 阅读模式扩展 v1.8.0 技术架构

## 架构概览

阅读模式扩展 v1.8.0 采用模块化、流水线式的架构设计，将内容处理分为三个主要阶段：提取、转换和渲染。这种设计使得各个组件职责明确，便于维护和扩展。

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │    │             │
│  原始网页   │ -> │ 内容提取器  │ -> │ MD转换器   │ -> │ MD渲染器    │
│  (HTML)     │    │ (defuddle) │    │ (turndown) │    │(markdown-it)│
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                               │
                                                               v
                    ┌─────────────┐                    ┌─────────────┐
                    │             │                    │             │
                    │  用户界面   │ <- 样式/交互 ---- │  渲染结果   │
                    │  组件      │                    │  (HTML)     │
                    │             │                    │             │
                    └─────────────┘                    └─────────────┘
```

## 核心组件

### 1. 内容提取器 (Content Extractor)

**核心库**: defuddle

**职责**:

- 分析网页结构，识别主要内容区域
- 过滤广告、导航栏、侧边栏等无关内容
- 保留图片、表格、代码块等重要元素
- 提取元数据（标题、作者、日期等）

**输入**: 原始网页 DOM
**输出**: 清洁的 HTML 内容

**关键类**:

```typescript
class DefuddleExtractor {
  async extract(document: Document): Promise<ExtractedContent> {
    // 使用 defuddle 提取内容
    // 返回提取的内容和元数据
  }
}

interface ExtractedContent {
  html: string; // 提取的 HTML 内容
  title?: string; // 页面标题
  author?: string; // 作者信息
  date?: string; // 发布日期
  siteName?: string; // 网站名称
  url: string; // 原始 URL
  readingTime?: number; // 预估阅读时间（分钟）
}
```

### 2. Markdown 转换器 (Markdown Converter)

**核心库**: turndown

**职责**:

- 将提取的 HTML 转换为 Markdown
- 处理特殊元素（代码块、表格、图片等）
- 保留格式和结构
- 优化 Markdown 输出

**输入**: 清洁的 HTML 内容
**输出**: Markdown 文本

**关键类**:

````typescript
class TurndownConverter {
  constructor(options?: TurndownOptions) {
    // 初始化 turndown 服务
    // 配置自定义规则
  }

  convert(html: string): string {
    // 将 HTML 转换为 Markdown
    // 返回 Markdown 文本
  }

  private setupCustomRules(): void {
    // 设置自定义转换规则
    // 处理代码块、表格、图片等
  }
}

interface TurndownOptions {
  headingStyle?: "setext" | "atx";
  hr?: string;
  bulletListMarker?: "-" | "+" | "*";
  codeBlockStyle?: "indented" | "fenced";
  fence?: "```" | "~~~";
  emDelimiter?: "_" | "*";
  strongDelimiter?: "__" | "**";
  linkStyle?: "inlined" | "referenced";
  linkReferenceStyle?: "full" | "collapsed" | "shortcut";
}
````

### 3. Markdown 渲染器 (Markdown Renderer)

**核心库**: markdown-it

**职责**:

- 将 Markdown 渲染为 HTML
- 应用语法高亮、数学公式等增强功能
- 生成目录和锚点
- 处理任务列表、表格等特殊元素

**输入**: Markdown 文本
**输出**: 渲染后的 HTML

**关键类**:

```typescript
class MarkdownRenderer {
  constructor(options?: MarkdownRendererOptions) {
    // 初始化 markdown-it
    // 配置插件
  }

  render(markdown: string): string {
    // 渲染 Markdown 为 HTML
    // 返回渲染后的 HTML
  }

  private setupPlugins(): void {
    // 设置 markdown-it 插件
    // 配置语法高亮、目录生成等
  }
}

interface MarkdownRendererOptions {
  html?: boolean; // 允许 HTML 标签
  linkify?: boolean; // 自动转换 URL 为链接
  typographer?: boolean; // 启用排版功能
  highlight?: boolean; // 启用代码高亮
  toc?: boolean; // 启用目录生成
  theme?: "light" | "dark"; // 主题
}
```

### 4. 阅读模式管理器 (Reading Mode Manager)

**职责**:

- 协调各个组件的工作
- 管理阅读模式的状态
- 处理用户交互
- 应用样式和设置

**关键类**:

```typescript
class ReadingModeManager {
  private extractor: DefuddleExtractor;
  private converter: TurndownConverter;
  private renderer: MarkdownRenderer;
  private isActive: boolean = false;
  private originalContent: string | null = null;

  constructor(options?: ReadingModeOptions) {
    // 初始化各个组件
  }

  async toggle(): Promise<boolean> {
    // 切换阅读模式
    if (this.isActive) {
      return this.disable();
    } else {
      return this.enable();
    }
  }

  private async enable(): Promise<boolean> {
    // 启用阅读模式
    // 1. 保存原始内容
    // 2. 提取内容
    // 3. 转换为 Markdown
    // 4. 渲染 Markdown
    // 5. 替换页面内容
    // 6. 应用样式
  }

  private disable(): boolean {
    // 禁用阅读模式
    // 恢复原始内容
  }

  updateSettings(settings: ReadingModeSettings): void {
    // 更新设置并重新应用
  }
}

interface ReadingModeOptions {
  settings?: ReadingModeSettings;
  autoEnable?: boolean;
}

interface ReadingModeSettings {
  theme: "light" | "dark";
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  pageWidth: number;
  // 其他设置...
}
```

## 数据流

### 启用阅读模式流程

1. 用户点击扩展图标或使用快捷键
2. 背景脚本发送消息到内容脚本
3. 内容脚本调用 `ReadingModeManager.toggle()`
4. 管理器保存原始页面内容
5. 管理器调用 `DefuddleExtractor.extract()` 提取内容
6. 管理器调用 `TurndownConverter.convert()` 转换为 Markdown
7. 管理器调用 `MarkdownRenderer.render()` 渲染 Markdown
8. 管理器创建阅读模式容器并替换页面内容
9. 管理器应用样式和设置
10. 管理器初始化工具栏和交互组件

### 设置更新流程

1. 用户在选项页面更改设置
2. 选项页面保存设置到存储
3. 选项页面发送消息到内容脚本
4. 内容脚本调用 `ReadingModeManager.updateSettings()`
5. 管理器更新设置并重新应用样式

## 存储结构

使用 Chrome 存储 API 保存用户设置和状态：

```typescript
interface StorageSchema {
  // 用户设置
  [StorageKeys.THEME]: "light" | "dark";
  [StorageKeys.FONT_SIZE]: number;
  [StorageKeys.FONT_FAMILY]: string;
  [StorageKeys.LINE_HEIGHT]: number;
  [StorageKeys.PAGE_WIDTH]: number;
  [StorageKeys.TEXT_ALIGN]: "left" | "center" | "right" | "justify";
  [StorageKeys.SHOW_IMAGES]: boolean;
  [StorageKeys.PARAGRAPH_SPACING]: number;

  // 缓存
  [StorageKeys.CACHE_PREFIX + url]: {
    html: string; // 提取的 HTML
    markdown: string; // 转换的 Markdown
    timestamp: number; // 缓存时间
  };

  // 阅读进度
  [StorageKeys.READING_PROGRESS_PREFIX + url]: {
    position: number; // 滚动位置
    timestamp: number; // 最后阅读时间
  };
}
```

## 性能优化策略

### 1. 懒加载

```typescript
// 动态导入 markdown-it 和插件
async function loadMarkdownRenderer() {
  const [MarkdownIt, anchor, toc, highlight] = await Promise.all([
    import(/* webpackChunkName: "markdown-it" */ "markdown-it"),
    import(/* webpackChunkName: "markdown-it-plugins" */ "markdown-it-anchor"),
    import(
      /* webpackChunkName: "markdown-it-plugins" */ "markdown-it-toc-done-right"
    ),
    import(
      /* webpackChunkName: "markdown-it-plugins" */ "markdown-it-highlightjs"
    ),
  ]);

  // 配置 markdown-it 和插件
  // ...

  return md;
}
```

### 2. Web Workers

```typescript
// 在 Web Worker 中处理 Markdown 转换
class MarkdownWorkerManager {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(new URL("./markdownWorker.ts", import.meta.url));
  }

  async convertToMarkdown(html: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const messageId = Date.now().toString();

      const handler = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          this.worker.removeEventListener("message", handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.markdown);
          }
        }
      };

      this.worker.addEventListener("message", handler);
      this.worker.postMessage({ id: messageId, action: "convert", html });
    });
  }
}

// markdownWorker.ts
import TurndownService from "turndown";

const turndownService = new TurndownService({
  // 配置...
});

// 设置自定义规则
// ...

self.addEventListener("message", (event) => {
  const { id, action, html } = event.data;

  if (action === "convert") {
    try {
      const markdown = turndownService.turndown(html);
      self.postMessage({ id, markdown });
    } catch (error) {
      self.postMessage({ id, error: error.message });
    }
  }
});
```

### 3. 缓存策略

```typescript
class ContentCache {
  private static readonly CACHE_PREFIX = "cache_";
  private static readonly MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7天

  static async get(url: string): Promise<CachedContent | null> {
    const key = this.CACHE_PREFIX + this.hashUrl(url);
    const data = await getStorage<CachedContent>(key);

    if (!data) return null;

    // 检查缓存是否过期
    if (Date.now() - data.timestamp > this.MAX_AGE) {
      await this.remove(url);
      return null;
    }

    return data;
  }

  static async set(url: string, content: CachedContent): Promise<void> {
    const key = this.CACHE_PREFIX + this.hashUrl(url);
    const data = { ...content, timestamp: Date.now() };
    await setStorage(key, data);
  }

  static async remove(url: string): Promise<void> {
    const key = this.CACHE_PREFIX + this.hashUrl(url);
    await removeStorage(key);
  }

  private static hashUrl(url: string): string {
    // 简单的 URL 哈希函数
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}

interface CachedContent {
  html: string; // 提取的 HTML
  markdown: string; // 转换的 Markdown
  timestamp: number; // 缓存时间
}
```

## 错误处理策略

```typescript
class ErrorHandler {
  static handleError(error: Error, context: string): void {
    console.error(`[阅读模式] ${context}:`, error);

    // 记录错误
    this.logError(error, context);

    // 显示用户友好的错误消息
    this.showErrorMessage(context);
  }

  private static logError(error: Error, context: string): void {
    // 记录错误到扩展的错误日志
    chrome.storage.local.get(["errorLog"], (result) => {
      const errorLog = result.errorLog || [];
      errorLog.push({
        timestamp: Date.now(),
        context,
        message: error.message,
        stack: error.stack,
        url: window.location.href,
      });

      // 保留最近的 50 条错误记录
      if (errorLog.length > 50) {
        errorLog.shift();
      }

      chrome.storage.local.set({ errorLog });
    });
  }

  private static showErrorMessage(context: string): void {
    // 显示用户友好的错误消息
    const container = document.createElement("div");
    container.className = "reading-mode-error";
    container.innerHTML = `
      <div class="reading-mode-error-content">
        <h3>阅读模式遇到问题</h3>
        <p>在${context}时发生错误。请尝试刷新页面或禁用阅读模式。</p>
        <button id="reading-mode-error-close">关闭</button>
        <button id="reading-mode-error-retry">重试</button>
        <button id="reading-mode-error-disable">禁用阅读模式</button>
      </div>
    `;

    document.body.appendChild(container);

    // 添加事件监听器
    document
      .getElementById("reading-mode-error-close")
      ?.addEventListener("click", () => {
        container.remove();
      });

    document
      .getElementById("reading-mode-error-retry")
      ?.addEventListener("click", () => {
        container.remove();
        window.location.reload();
      });

    document
      .getElementById("reading-mode-error-disable")
      ?.addEventListener("click", () => {
        container.remove();
        // 发送消息禁用阅读模式
        chrome.runtime.sendMessage({ action: "disableReadingMode" });
      });
  }
}
```

## 兼容性策略

### 1. 浏览器兼容性

```typescript
// 检测浏览器功能并提供 polyfill
function checkBrowserCompatibility(): boolean {
  const requirements = [
    { feature: "Promise", available: typeof Promise !== "undefined" },
    { feature: "fetch", available: typeof fetch !== "undefined" },
    {
      feature: "IntersectionObserver",
      available: typeof IntersectionObserver !== "undefined",
    },
    {
      feature: "localStorage",
      available: (() => {
        try {
          localStorage.setItem("test", "test");
          localStorage.removeItem("test");
          return true;
        } catch (e) {
          return false;
        }
      })(),
    },
  ];

  const missingFeatures = requirements
    .filter((req) => !req.available)
    .map((req) => req.feature);

  if (missingFeatures.length > 0) {
    console.warn(
      `[阅读模式] 浏览器缺少以下功能: ${missingFeatures.join(", ")}`
    );
    return false;
  }

  return true;
}

// 加载 polyfill
async function loadPolyfills(): Promise<void> {
  if (typeof IntersectionObserver === "undefined") {
    await import(/* webpackChunkName: "polyfills" */ "intersection-observer");
  }

  if (typeof fetch === "undefined") {
    await import(/* webpackChunkName: "polyfills" */ "whatwg-fetch");
  }
}
```

### 2. 网站兼容性

```typescript
class WebsiteCompatibility {
  private static readonly SITE_RULES: Record<string, SiteRule> = {
    "medium.com": {
      selectors: {
        content: "article",
        title: "h1",
        author: '[data-testid="authorName"]',
        date: "time",
      },
      excludeSelectors: [".metabar", ".js-stickyFooter", ".js-postShareWidget"],
      customExtractors: [
        // 自定义提取函数
      ],
    },
    "github.com": {
      selectors: {
        content: ".markdown-body",
        title: ".gh-header-title",
        author: ".author",
        date: "relative-time",
      },
      excludeSelectors: [
        ".file-navigation",
        ".repository-content > .position-relative > .border-bottom",
      ],
      customExtractors: [
        // 自定义提取函数
      ],
    },
    // 其他网站规则...
  };

  static getSiteRule(url: string): SiteRule | null {
    const hostname = new URL(url).hostname;

    // 检查完全匹配
    if (this.SITE_RULES[hostname]) {
      return this.SITE_RULES[hostname];
    }

    // 检查部分匹配
    for (const site in this.SITE_RULES) {
      if (hostname.includes(site) || site.includes(hostname)) {
        return this.SITE_RULES[site];
      }
    }

    return null;
  }
}

interface SiteRule {
  selectors: {
    content: string;
    title?: string;
    author?: string;
    date?: string;
  };
  excludeSelectors?: string[];
  customExtractors?: Array<(document: Document) => ExtractedContent | null>;
}
```

## 总结

阅读模式扩展 v1.8.0 的技术架构采用模块化、流水线式的设计，将内容处理分为提取、转换和渲染三个主要阶段。通过使用 defuddle、turndown 和 markdown-it 等专业库，结合 Web Workers、懒加载和缓存等优化策略，可以提供高性能、高质量的阅读体验。同时，通过错误处理和兼容性策略，确保扩展在各种环境下都能稳定运行。
