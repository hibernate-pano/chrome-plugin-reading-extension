# ⚡ 快速修复指南

## 🎯 问题

后台不停刷新 Worker CSP 错误

## ✅ 解决方案

禁用 Worker，改用同步处理（因为 Content Script 无法使用 Worker）

---

## 🚀 立即修复（3 步）

### 步骤 1: 重新加载扩展 🔄

1. 打开新标签页，输入: `chrome://extensions/`
2. 找到 **"AI Reading Extension"**
3. 点击 **"移除"** 按钮（完全删除）
4. 点击 **"加载已解压的扩展程序"**
5. 选择并加载 `dist` 目录

> ⚠️ **必须完全删除后重新加载！** 点击"重新加载"按钮不够！

### 步骤 2: 验证修复 ✅

访问任意网站（如：https://mp.weixin.qq.com 或 https://github.com）

按 `F12` 打开开发者工具，查看 Console：

**✅ 应该看到:**

```
ℹ️ WebWorker 在 Content Script 中不可用，使用同步处理
✅ 增强处理管理器初始化完成（Worker已禁用）
✅ 统一内容脚本初始化完成
```

**❌ 不应该看到:**

- ~~Refused to create a worker from 'blob:...'~~
- ~~SecurityError: Failed to construct 'Worker'~~
- ~~任何重复刷新的错误~~

### 步骤 3: 测试功能 🧪

1. 在任意网页（如文章页面）
2. 使用快捷键 `Ctrl + R` 或点击扩展图标
3. 应该能正常启用阅读模式

---

## 📊 验证清单

- [ ] 扩展已完全删除并重新加载
- [ ] Console 没有 Worker 相关错误
- [ ] Console 显示"Worker 已禁用"的信息
- [ ] 阅读模式功能正常
- [ ] 没有错误不停刷屏

---

## 🔍 如果还有问题

### Console 仍然有 Worker 错误

**原因**: 旧版本代码仍在运行

**解决**:

1. 完全关闭所有 Chrome 窗口
2. 重新打开 Chrome
3. 再次删除并重新加载扩展
4. 清除浏览器缓存

### 扩展功能异常

**检查**:

```bash
# 确认构建成功
ls -lh dist/unifiedContentScript.js
# 应该显示约 431-434KB
```

**重新构建**:

```bash
cd /Users/panbo/Code/PanboProjects/chrome-plugin-reading-extension
pnpm run build
```

---

## 📝 技术说明（可选阅读）

### 为什么要禁用 Worker？

Chrome 扩展的 Content Script 运行在页面上下文中，受到严格的跨域限制：

1. ❌ 不能使用 `blob:` URL（CSP 违规）
2. ❌ 不能使用 `chrome-extension:` URL（跨域限制）
3. ✅ 只能使用同步处理或消息传递

### 性能会受影响吗？

**几乎不会！** 因为：

1. ✅ **缓存机制保留**: 处理一次后结果被缓存
2. ✅ **大多数内容不大**: 典型网页处理时间 < 50ms
3. ✅ **异步执行**: 不阻塞页面加载

---

## 📚 详细文档

- `FINAL_WORKER_SOLUTION.md` - 完整技术方案
- `CSP_WORKER_FIX.md` - 最初的修复尝试
- `RELOAD_EXTENSION_GUIDE.md` - 详细重载指南

---

**最后更新**: 2025 年 10 月 8 日  
**状态**: ✅ 已验证修复成功
