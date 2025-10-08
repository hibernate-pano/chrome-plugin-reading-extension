# 🔄 重新加载扩展完整指南

## ⚠️ 重要：必须完全重新加载扩展

CSP Worker 修复需要**完全重新加载**扩展才能生效。简单的"重新加载"按钮可能不够。

---

## 📋 操作步骤

### 步骤 1: 完全移除旧扩展

1. 在 Chrome 中打开新标签页
2. 地址栏输入：`chrome://extensions/`
3. 找到 **"AI Reading Extension"**
4. 点击右下角的 **"移除"** 按钮
5. 确认移除

### 步骤 2: 清除浏览器缓存（推荐）

1. 打开 Chrome 设置：`chrome://settings/clearBrowserData`
2. 时间范围选择：**"所有时间"**
3. 勾选：**"缓存的图片和文件"**
4. 点击 **"清除数据"**

### 步骤 3: 重新加载扩展

1. 回到 `chrome://extensions/`
2. 确保右上角 **"开发者模式"** 已打开
3. 点击左上角 **"加载已解压的扩展程序"** 按钮
4. 选择项目的 **`dist`** 目录
5. 点击 **"选择文件夹"**

### 步骤 4: 验证扩展已加载

✅ 确认扩展卡片上显示：

- 名称：AI Reading Extension
- 版本：1.8.0
- 状态：已启用

---

## 🧪 测试修复效果

### 方法 1: 使用测试页面（推荐）

1. 在浏览器新标签页中打开：

   ```
   chrome-extension://[扩展ID]/test-worker-fix.html
   ```

   > 💡 替换 `[扩展ID]` 为你的扩展 ID（在 chrome://extensions/ 页面可以看到）

2. 依次点击三个测试按钮
3. 查看测试结果，应该全部显示 ✅

### 方法 2: 在 GitHub 上测试

1. 打开 https://github.com
2. 按 `F12` 打开开发者工具
3. 切换到 **Console** 标签
4. 查找是否有以下错误：

   ```
   Refused to create a worker from 'blob:...'
   ```

5. **如果没有这个错误** → ✅ 修复成功！
6. **如果还有这个错误** → ❌ 继续下面的排查步骤

### 方法 3: 运行调试脚本

在 Console 中粘贴并运行以下代码：

```javascript
// 检查 Worker 文件
const workerPaths = [
  "workers/dataProcessing.worker.js",
  "workers/contentExtraction.worker.js",
  "workers/markdown.worker.js",
];

console.log("=== Worker 文件检查 ===");
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

// 测试 Worker 创建
setTimeout(() => {
  console.log("\n=== Worker 创建测试 ===");
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
      worker.terminate();
    };

    worker.onerror = (e) => {
      console.error("❌ Worker 错误:", e);
      worker.terminate();
    };
  } catch (error) {
    console.error("❌ 创建 Worker 失败:", error);
  }
}, 1000);
```

---

## 🔍 问题排查

### 如果仍然看到 blob URL 错误

#### 1. 检查是否加载了正确的扩展

```javascript
console.log("Extension ID:", chrome.runtime.id);
console.log("Extension URL:", chrome.runtime.getURL(""));
```

确保这是最新重新加载的扩展。

#### 2. 检查 Worker 文件是否存在

在扩展目录检查：

```bash
ls -la dist/workers/
```

应该只看到三个文件：

- `contentExtraction.worker.js`
- `dataProcessing.worker.js`
- `markdown.worker.js`

#### 3. 检查 manifest.json

确认 `dist/manifest.json` 包含：

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

#### 4. 完全关闭 Chrome 重试

1. 关闭所有 Chrome 窗口
2. 结束所有 Chrome 进程（任务管理器）
3. 重新打开 Chrome
4. 重新加载扩展

#### 5. 检查是否有多个扩展实例

在 `chrome://extensions/` 中确认：

- 只有一个 "AI Reading Extension"
- 没有其他同名或相似的扩展

---

## ✅ 成功标志

修复成功后，你应该看到：

1. ✅ Console 中没有 CSP Worker 错误
2. ✅ 扩展正常工作
3. ✅ 在 GitHub 等网站上不会有错误刷屏
4. ✅ 测试页面所有测试通过
5. ✅ Console 中看到：`[WebWorkerManager] 初始化完成`

---

## 🆘 仍然有问题？

### 收集诊断信息

在 Console 中运行：

```javascript
console.log("=== 诊断信息 ===");
console.log("Extension ID:", chrome.runtime.id);
console.log("Chrome Version:", navigator.userAgent);
console.log("Worker URLs:", [
  chrome.runtime.getURL("workers/dataProcessing.worker.js"),
  chrome.runtime.getURL("workers/contentExtraction.worker.js"),
  chrome.runtime.getURL("workers/markdown.worker.js"),
]);
```

### 临时禁用 Worker（紧急方案）

如果需要立即停止错误，编辑以下文件：

`src/content/features/performance/EnhancedProcessingManager.ts`

```typescript
async initialize() {
  if (this.isInitialized) return;

  try {
    // 临时注释掉
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

然后重新构建：

```bash
pnpm run build
```

---

## 📞 需要帮助

如果以上步骤都无法解决问题，请提供：

1. Chrome 版本号
2. 完整的错误截图
3. 调试脚本的输出结果
4. `dist/workers/` 目录的文件列表

---

**最后更新：** 2025 年 10 月 8 日
