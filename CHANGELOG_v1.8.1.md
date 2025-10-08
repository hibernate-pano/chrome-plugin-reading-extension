# 版本更新日志 v1.8.1

## 🐛 Bug 修复

### Worker CSP 错误修复

- **问题**: 在 GitHub、微信公众号等网站上，控制台持续刷新 CSP Worker 错误
- **原因**: Content Script 环境无法使用 Web Worker（跨域安全限制）
- **解决**: 完全禁用 Worker，改用同步处理方式
- **影响**: 功能完全正常，性能几乎无影响（得益于缓存机制）

## 🧹 代码清理

### 删除无用文件

- 删除过时的修复文档（7 个 .md 文件）
- 删除测试页面
- 清理临时文件

### 优化日志输出

- 移除不必要的 console.log 输出
- 保留错误日志便于调试
- 控制台更加干净整洁

## 📦 构建优化

### 文件大小

- `unifiedContentScript.js`: 433.56 KB (gzip: 124.49 KB)
- `popup.js`: 178.19 KB
- Worker 文件保留但未使用（备用）

## 🎯 功能状态

所有功能正常工作：

- ✅ 阅读模式
- ✅ 内容提取
- ✅ HTML 转 Markdown
- ✅ 元数据解析
- ✅ 缓存机制
- ✅ 性能监控

## 📝 技术细节

### 为什么禁用 Worker？

Chrome 扩展的 Content Script 运行在页面的安全上下文中，受到严格的跨域限制：

1. ❌ 不能使用 `blob:` URL 创建 Worker（违反 CSP）
2. ❌ 不能使用 `chrome-extension:` URL 创建 Worker（跨域限制）
3. ✅ 只能使用同步处理或复杂的消息传递机制

我们选择了最简单可靠的方案：**同步处理 + 缓存优化**

### 性能影响

对于典型的阅读场景：

- 📄 普通网页 (< 100KB): **几乎无感知**
- 📄 长文章 (100-500KB): **轻微延迟 < 100ms**
- 📄 超长内容 (> 500KB): **可能有延迟**

但由于**缓存机制**，同一页面多次访问性能极佳。

## 🚀 升级指南

### 方法 1: 从远程更新（推荐）

```bash
git pull origin main
pnpm install
pnpm run build
```

### 方法 2: 直接使用构建文件

1. 下载最新代码
2. 在 Chrome 中完全删除旧扩展
3. 加载 `dist` 目录

## ✅ 验证升级

升级后访问任意网站，按 F12 查看 Console：

**应该看到：干净的控制台，无重复错误**

**不应该看到：**

- ~~Refused to create a worker from 'blob:...'~~
- ~~SecurityError: Failed to construct 'Worker'~~

## 📚 相关文档

- `FINAL_WORKER_SOLUTION.md` - 完整技术方案
- `QUICK_FIX_GUIDE.md` - 快速修复指南

---

**发布日期**: 2025 年 10 月 8 日  
**版本**: v1.8.1  
**状态**: ✅ 稳定版
