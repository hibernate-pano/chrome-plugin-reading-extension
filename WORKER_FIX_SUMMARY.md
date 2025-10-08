# Worker CSP 修复总结

## 📋 问题

在 GitHub 等网站上，浏览器控制台不断刷新错误：

```
Refused to create a worker from 'blob:https://github.com/...' because it violates
the following Content Security Policy directive: "worker-src ..."
```

## 🔧 根本原因

原代码使用 `blob:` URL 创建 Web Worker，违反了许多网站的 Content Security Policy (CSP)。

**旧方式（有问题）：**

```typescript
const blob = new Blob([workerScript], { type: "application/javascript" });
const url = URL.createObjectURL(blob); // blob: URL
const worker = new Worker(url); // ❌ CSP 违规
```

## ✅ 解决方案

使用 Chrome 扩展的 `chrome.runtime.getURL()` 加载独立的 Worker 文件。

**新方式（修复后）：**

```typescript
const workerUrl = chrome.runtime.getURL("workers/dataProcessing.worker.js");
const worker = new Worker(workerUrl); // ✅ 不受 CSP 限制
```

## 📝 修改内容

### 1. 创建独立 Worker 文件

新增三个 Worker 文件：

- `src/content/workers/dataProcessing.worker.ts`
- `src/content/workers/contentExtraction.worker.ts`
- `src/content/workers/markdown.worker.ts`

### 2. 修改 WebWorkerManager

**文件：** `src/content/features/performance/WebWorkerManager.ts`

- 将 `workerScripts` 改为 `workerUrls`
- 删除所有内联的 Worker 脚本代码
- 修改 `createWorker()` 方法使用 `chrome.runtime.getURL()`

### 3. 添加 Worker 构建配置

**新文件：** `vite.worker.config.ts`

单独配置 Worker 文件的构建：

```typescript
build: {
  outDir: 'dist/workers',
  lib: {
    entry: {
      'dataProcessing.worker': '...',
      'contentExtraction.worker': '...',
      'markdown.worker': '...'
    },
    formats: ['es']
  }
}
```

### 4. 更新构建脚本

**文件：** `package.json`

```json
{
  "scripts": {
    "build": "vite build && vite build --config vite.content.config.ts && vite build --config vite.worker.config.ts && cp -r public/* dist/ && rm -rf dist/workers/assets ..."
  }
}
```

### 5. 更新 manifest.json

**文件：** `public/manifest.json`

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

## 🎯 构建结果

成功构建后，`dist/workers/` 目录包含：

```
dist/workers/
├── contentExtraction.worker.js  (1.4 KB)
├── dataProcessing.worker.js     (1.2 KB)
└── markdown.worker.js           (2.9 KB)
```

## 🚀 如何应用修复

### 方式 1: 使用现有构建

如果你的代码是最新的：

```bash
# 1. 重新构建
pnpm run build

# 2. 完全重新加载扩展
# 见 RELOAD_EXTENSION_GUIDE.md
```

### 方式 2: 从零开始

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
pnpm install

# 3. 构建
pnpm run build

# 4. 加载扩展
# 在 chrome://extensions/ 中加载 dist 目录
```

## 🧪 验证修复

### 快速测试

1. 打开 `chrome-extension://[扩展ID]/test-worker-fix.html`
2. 运行所有测试
3. 确认全部通过 ✅

### 实际使用测试

1. 访问 https://github.com
2. 打开开发者工具 (F12)
3. 查看 Console
4. **不应该看到** blob URL 相关的 CSP 错误

## 📊 影响范围

### 修改的文件

```
src/content/features/performance/WebWorkerManager.ts  (重构)
src/content/workers/dataProcessing.worker.ts         (新增)
src/content/workers/contentExtraction.worker.ts      (新增)
src/content/workers/markdown.worker.ts               (新增)
vite.worker.config.ts                                (新增)
package.json                                         (更新)
public/manifest.json                                 (更新)
```

### 受影响的功能

- ✅ 内容提取（仍正常工作）
- ✅ Markdown 转换（仍正常工作）
- ✅ 数据处理（仍正常工作）
- ✅ 性能监控（仍正常工作）

所有功能保持不变，只是实现方式更符合 CSP 要求。

## 🎉 预期效果

修复成功后：

1. ✅ 在任何网站上都不会再看到 CSP Worker 错误
2. ✅ 扩展功能完全正常
3. ✅ Console 保持干净
4. ✅ 符合 Web 安全最佳实践

## 📚 相关文档

- `CSP_WORKER_FIX.md` - 技术细节和实现说明
- `RELOAD_EXTENSION_GUIDE.md` - 重新加载扩展的完整步骤
- `DEBUG_WORKER.md` - 调试和排查指南
- `test-worker-fix.html` - 自动化测试页面

## 🔗 技术参考

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [chrome.runtime.getURL()](https://developer.chrome.com/docs/extensions/reference/runtime/#method-getURL)

---

**修复日期：** 2025 年 10 月 8 日  
**修复版本：** v1.8.0+
