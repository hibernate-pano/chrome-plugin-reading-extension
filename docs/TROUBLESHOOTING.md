# 🔧 故障排除指南

> 常见问题的诊断和解决方案

**📚 [返回文档中心](./README.md)** | **📖 [开发指南](./DEVELOPMENT_GUIDE.md)** | **⚡ [性能优化](./PERFORMANCE.md)**

---

## 📋 问题分类

- [🏗️ 构建问题](#️-构建问题)
- [🔌 扩展加载问题](#-扩展加载问题)
- [📄 内容脚本问题](#-内容脚本问题)
- [🎨 UI 界面问题](#-ui-界面问题)
- [💾 存储和状态问题](#-存储和状态问题)
- [⚡ 性能问题](#-性能问题)

---

## 🏗️ 构建问题

### 问题：构建失败，提示依赖错误

**症状**：
```bash
ERROR: Cannot resolve dependency "xxx"
```

**解决方案**：
```bash
# 1. 清理依赖缓存
rm -rf node_modules pnpm-lock.yaml

# 2. 重新安装依赖
pnpm install

# 3. 如果仍有问题，尝试强制重新安装
pnpm install --force
```

### 问题：TypeScript 类型错误

**症状**：
```bash
TS2307: Cannot find module 'xxx' or its corresponding type declarations
```

**解决方案**：
```bash
# 1. 检查类型定义文件
ls src/types/

# 2. 重新生成类型声明
pnpm run type-check

# 3. 如果是第三方库类型缺失
pnpm add -D @types/xxx
```

### 问题：Vite 构建配置错误

**症状**：
```bash
Error: Build failed with errors
```

**诊断步骤**：
```bash
# 1. 检查配置文件语法
node -c vite.config.ts
node -c vite.content.config.ts

# 2. 分模块构建定位问题
pnpm run build:content
pnpm run build:background
pnpm run build:popup

# 3. 查看详细错误信息
pnpm run build --debug
```

---

## 🔌 扩展加载问题

### 问题：扩展无法加载到 Chrome

**症状**：
- "清单文件缺失或不可读"
- "扩展包无效"

**解决方案**：
```bash
# 1. 确保构建完成
pnpm run build

# 2. 检查必要文件
ls dist/manifest.json
ls dist/src/background/background.js
ls dist/src/contentLoader/contentLoader.js

# 3. 验证 manifest.json 格式
cat dist/manifest.json | jq .  # 需要安装 jq
```

### 问题：扩展权限不足

**症状**：
- 内容脚本无法注入
- 无法访问某些网站

**解决方案**：
1. 检查 `public/manifest.json` 中的权限配置
2. 确保 `host_permissions` 包含目标网站
3. 重新加载扩展

### 问题：扩展图标不显示

**症状**：
- 工具栏中显示默认图标
- 图标模糊或缺失

**解决方案**：
```bash
# 1. 检查图标文件
ls public/icon*.png

# 2. 验证图标尺寸
file public/icon16.png  # 应该是 16x16
file public/icon48.png  # 应该是 48x48
file public/icon128.png # 应该是 128x128

# 3. 重新构建并刷新扩展
pnpm run build
```

---

## 📄 内容脚本问题

### 问题：内容脚本未注入

**症状**：
- 点击扩展图标无反应
- 页面没有任何变化

**诊断步骤**：
```javascript
// 1. 在页面控制台检查脚本是否加载
console.log(window.readingExtension);

// 2. 检查扩展是否有权限访问当前页面
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  console.log('当前页面URL:', tabs[0].url);
});
```

**解决方案**：
1. 检查网站是否在 `host_permissions` 中
2. 确保页面已完全加载
3. 尝试刷新页面

### 问题：阅读模式不工作

**症状**：
- 开关可以切换但页面无变化
- 内容提取失败

**诊断步骤**：
```javascript
// 在页面控制台执行
// 检查内容提取器是否工作
import('@mozilla/readability').then(({Readability}) => {
  const doc = document.cloneNode(true);
  const reader = new Readability(doc);
  const article = reader.parse();
  console.log('提取结果:', article);
});
```

**解决方案**：
1. 检查页面是否有足够的文本内容
2. 确保页面结构符合 Readability 要求
3. 查看控制台错误信息

### 问题：样式冲突

**症状**：
- 阅读模式样式异常
- 与网站原有样式冲突

**解决方案**：
```css
/* 在内容脚本样式中增加特异性 */
.reading-extension-container * {
  all: initial;
  font-family: inherit;
}

/* 使用 CSS 自定义属性避免冲突 */
:root {
  --reading-ext-primary: #1976d2;
}
```

---

## 🎨 UI 界面问题

### 问题：Popup 界面显示异常

**症状**：
- 界面布局错乱
- 样式缺失或异常

**解决方案**：
```bash
# 1. 重新构建 Popup
pnpm run build:popup

# 2. 检查 CSS 文件是否正确生成
ls dist/assets/*.css

# 3. 清除浏览器缓存
# 在 chrome://extensions/ 中点击扩展的刷新按钮
```

### 问题：主题切换不工作

**症状**：
- 点击主题按钮无反应
- 主题状态不同步

**诊断步骤**：
```javascript
// 在 Popup 控制台检查状态
console.log('当前主题:', useSettingsStore.getState().theme);

// 检查存储是否正常
chrome.storage.local.get(['theme'], (result) => {
  console.log('存储的主题:', result.theme);
});
```

### 问题：设置不保存

**症状**：
- 修改设置后刷新丢失
- 设置在不同页面间不同步

**解决方案**：
1. 检查 Chrome 存储权限
2. 验证 Zustand 中间件配置
3. 查看存储 API 调用是否成功

---

## 💾 存储和状态问题

### 问题：设置数据丢失

**症状**：
- 扩展重启后设置重置
- 数据无法持久化

**诊断步骤**：
```javascript
// 检查存储内容
chrome.storage.local.get(null, (items) => {
  console.log('所有存储数据:', items);
});

// 检查存储配额
chrome.storage.local.getBytesInUse(null, (bytes) => {
  console.log('已使用存储空间:', bytes, 'bytes');
});
```

**解决方案**：
1. 检查存储权限配置
2. 验证数据序列化/反序列化
3. 确保存储操作的错误处理

### 问题：状态同步异常

**症状**：
- Popup 和内容脚本状态不一致
- 设置变更不实时生效

**解决方案**：
```javascript
// 确保消息传递正常工作
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);
  sendResponse({success: true});
});
```

---

## ⚡ 性能问题

### 问题：扩展启动缓慢

**症状**：
- 点击图标后延迟显示
- 内容脚本加载时间长

**优化方案**：
```javascript
// 1. 检查代码分割是否生效
console.log('内容脚本大小:', document.querySelector('script[src*="contentLoader"]')?.src);

// 2. 使用性能监控
performance.mark('extension-start');
// ... 扩展逻辑
performance.mark('extension-ready');
performance.measure('extension-load-time', 'extension-start', 'extension-ready');
```

### 问题：内存占用过高

**症状**：
- 浏览器变慢
- 扩展进程内存持续增长

**诊断工具**：
1. Chrome 任务管理器 (`Shift + Esc`)
2. 开发者工具 Memory 面板
3. Performance 面板分析

**解决方案**：
1. 检查是否有内存泄漏
2. 及时清理事件监听器
3. 优化大对象的使用

---

## 🛠️ 调试工具

### Chrome 扩展调试

```bash
# 1. 扩展管理页面
chrome://extensions/

# 2. 服务工作者调试
点击 "检查视图 service worker"

# 3. 内容脚本调试
在目标页面按 F12，查看 Console 和 Sources
```

### 日志收集

```javascript
// 统一日志管理
const logger = {
  info: (msg, ...args) => console.log(`[Reading Extension] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[Reading Extension] ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`[Reading Extension] ${msg}`, ...args)
};
```

### 性能监控

```javascript
// 性能指标收集
const performanceMonitor = {
  startTimer: (name) => performance.mark(`${name}-start`),
  endTimer: (name) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    const measure = performance.getEntriesByName(name)[0];
    console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
  }
};
```

---

## 📞 获取更多帮助

如果以上解决方案都无法解决你的问题：

1. **查看项目 Issues**: 搜索是否有类似问题
2. **Chrome 扩展文档**: https://developer.chrome.com/docs/extensions/
3. **创建新 Issue**: 提供详细的错误信息和复现步骤

---

**记住**：大多数问题都可以通过仔细阅读错误信息和逐步排查来解决！🔍
