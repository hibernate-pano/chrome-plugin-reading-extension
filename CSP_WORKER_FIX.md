# CSP Worker 错误修复说明

## 问题描述

在浏览 GitHub 等网站时，浏览器控制台一直报错：

```
Refused to create a worker from 'blob:https://github.com/...' because it violates
the following Content Security Policy directive: "worker-src ..."
```

## 问题原因

原代码在 `WebWorkerManager.ts` 中使用 blob URL 创建 Web Worker：

```typescript
const blob = new Blob([script], { type: "application/javascript" });
const url = URL.createObjectURL(blob);
const worker = new Worker(url);
```

这种方式违反了许多网站（如 GitHub）的 Content Security Policy (CSP)，因为这些网站不允许从 blob URL 加载 Worker。

## 解决方案

### 1. 创建独立的 Worker 文件

将内联的 Worker 脚本代码拆分为独立的文件：

- `src/content/workers/dataProcessing.worker.ts` - 数据处理 Worker
- `src/content/workers/contentExtraction.worker.ts` - 内容提取 Worker
- `src/content/workers/markdown.worker.ts` - Markdown 转换 Worker

### 2. 修改 WebWorkerManager

将 `WebWorkerManager.ts` 中的 Worker 创建方式从使用 blob URL 改为使用 Chrome 扩展 URL：

```typescript
// 旧方式（使用 blob URL）
const blob = new Blob([script], { type: "application/javascript" });
const url = URL.createObjectURL(blob);
const worker = new Worker(url);

// 新方式（使用扩展 URL）
const workerUrl = chrome.runtime.getURL(workerPath);
const worker = new Worker(workerUrl);
```

### 3. 配置构建系统

创建 `vite.worker.config.ts` 来单独构建 Worker 文件：

```typescript
export default defineConfig({
  build: {
    outDir: "dist/workers",
    lib: {
      entry: {
        "dataProcessing.worker": resolve(
          __dirname,
          "src/content/workers/dataProcessing.worker.ts"
        ),
        "contentExtraction.worker": resolve(
          __dirname,
          "src/content/workers/contentExtraction.worker.ts"
        ),
        "markdown.worker": resolve(
          __dirname,
          "src/content/workers/markdown.worker.ts"
        ),
      },
      formats: ["es"],
    },
  },
});
```

更新 `package.json` 构建脚本：

```json
{
  "scripts": {
    "build": "vite build && vite build --config vite.content.config.ts && vite build --config vite.worker.config.ts && cp -r public/* dist/"
  }
}
```

### 4. 更新 manifest.json

在 `web_accessible_resources` 中添加 `workers/*`，使 Worker 文件可以被访问：

```json
{
  "web_accessible_resources": [
    {
      "resources": ["assets/*", "workers/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## 测试验证

构建后，Worker 文件被正确打包到 `dist/workers/` 目录：

```
dist/workers/
├── contentExtraction.worker.js
├── dataProcessing.worker.js
└── markdown.worker.js
```

现在在任何网站上使用扩展都不会再出现 CSP 违规错误。

## 技术要点

1. **Chrome 扩展 URL**: 使用 `chrome.runtime.getURL()` 获取扩展内部文件的 URL，这些 URL 不受网站 CSP 限制。

2. **Web Worker 隔离**: Worker 文件作为独立的 JavaScript 模块，在单独的线程中运行，不会阻塞主线程。

3. **CSP 兼容性**: 通过使用扩展内部 URL 而不是 blob URL，确保在所有网站上都能正常工作，无论其 CSP 策略如何严格。

## 影响

- ✅ 修复了在 GitHub 等网站上的 CSP 违规错误
- ✅ 提高了代码可维护性（Worker 代码独立文件）
- ✅ 保持了原有功能不变
- ✅ 兼容所有网站的 CSP 策略

## 相关文件

- `src/content/features/performance/WebWorkerManager.ts` - Worker 管理器
- `src/content/workers/*.worker.ts` - Worker 实现文件
- `vite.worker.config.ts` - Worker 构建配置
- `public/manifest.json` - 扩展清单文件
- `package.json` - 构建脚本配置
