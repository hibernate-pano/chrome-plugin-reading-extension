# Worker CSP 问题调试指南

## 步骤 1: 完全重新加载扩展

1. 打开 `chrome://extensions/`
2. 找到 "AI Reading Extension"
3. **点击"移除"按钮** (完全删除扩展)
4. 点击"加载已解压的扩展程序"
5. 选择 `dist` 目录

> ⚠️ **重要**: 仅仅点击"重新加载"可能不够，建议完全移除后重新加载

## 步骤 2: 验证 Worker 文件

在浏览器控制台中运行以下代码：

```javascript
// 检查 Worker 文件是否可访问
const workerPaths = [
  "workers/dataProcessing.worker.js",
  "workers/contentExtraction.worker.js",
  "workers/markdown.worker.js",
];

workerPaths.forEach((path) => {
  const url = chrome.runtime.getURL(path);
  console.log(`检查: ${path}`);
  console.log(`URL: ${url}`);

  fetch(url)
    .then((response) => {
      if (response.ok) {
        console.log(`✅ ${path} - 可访问`);
      } else {
        console.error(`❌ ${path} - HTTP ${response.status}`);
      }
    })
    .catch((error) => {
      console.error(`❌ ${path} - 加载失败:`, error);
    });
});
```

## 步骤 3: 测试 Worker 创建

```javascript
// 测试创建 Worker
try {
  const workerUrl = chrome.runtime.getURL("workers/dataProcessing.worker.js");
  console.log("Worker URL:", workerUrl);

  const worker = new Worker(workerUrl);
  console.log("✅ Worker 创建成功!", worker);

  worker.postMessage({
    id: "test-1",
    type: "process-data",
    data: { test: "data" },
  });

  worker.onmessage = (e) => {
    console.log("✅ Worker 响应:", e.data);
  };

  worker.onerror = (e) => {
    console.error("❌ Worker 错误:", e);
  };
} catch (error) {
  console.error("❌ 创建 Worker 失败:", error);
}
```

## 步骤 4: 检查 Manifest

打开 `dist/manifest.json`，确认包含：

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

## 步骤 5: 检查控制台错误

1. 打开任意网页（如 GitHub）
2. 按 F12 打开开发者工具
3. 查看 Console 标签
4. 筛选是否还有 CSP 或 Worker 相关错误

## 常见问题

### 如果还看到 blob URL 错误

这意味着旧版本的代码仍在运行：

1. 清除浏览器缓存：

   - Chrome 设置 → 隐私和安全 → 清除浏览数据
   - 选择"缓存的图片和文件"
   - 时间范围选择"所有时间"

2. 完全关闭 Chrome 后重新打开

3. 检查是否有多个版本的扩展在运行

### 如果 Worker 文件 404

检查 `dist/workers/` 目录确实存在这些文件：

```
dist/workers/
├── dataProcessing.worker.js
├── contentExtraction.worker.js
└── markdown.worker.js
```

如果文件不存在，重新运行构建：

```bash
pnpm run build
```

### 如果权限错误

确保 manifest.json 中的 `web_accessible_resources` 配置正确。

## 验证成功的标志

如果修复成功，你应该看到：

1. ✅ Console 中没有 CSP Worker 错误
2. ✅ Console 中看到 `[WebWorkerManager] 初始化完成`
3. ✅ 在 GitHub 等网站上没有错误刷屏

## 如果问题持续

请提供以下信息：

1. Chrome 版本
2. 完整的错误消息（截图）
3. 以上调试脚本的输出结果
4. `dist/workers/` 目录的文件列表

## 紧急回退方案

如果需要临时禁用 Worker 功能：

编辑 `src/content/features/performance/EnhancedProcessingManager.ts`：

```typescript
async initialize() {
  if (this.isInitialized) return;

  try {
    // 临时注释掉 WebWorker 初始化
    // await webWorkerManager.initialize();

    await cacheStrategyManager.initialize();
    this.setupCacheEventListeners();
    this.isInitialized = true;
    console.log('✅ 增强处理管理器初始化完成（Worker已禁用）');
  } catch (error) {
    console.error('❌ 增强处理管理器初始化失败:', error);
    throw error;
  }
}
```

然后重新构建并加载扩展。
