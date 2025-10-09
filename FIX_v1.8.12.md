# 🎯 修复无限循环问题 - v1.8.12

## 🐛 问题诊断

通过 v1.8.11 的详细日志，发现了根本问题：

### 症状
- `ENSURE_CONTENT_SCRIPT` 被疯狂重复调用（几十次）
- 第一次注入成功，后续都在缓存中跳过
- 但请求仍在不断发送

### 根本原因

**Popup 组件陷入了无限渲染循环！**

```javascript
// 问题代码
const initializePopup = useCallback(async () => {
  // ...
}, [getCurrentTab, ensureContentScript]); // ← 依赖项导致循环

useEffect(() => {
  initializePopup();
}, [initializePopup]); // ← 每次 initializePopup 改变都会重新执行
```

**循环机制：**
1. `useEffect` 依赖 `initializePopup`
2. `initializePopup` 依赖 `getCurrentTab` 和 `ensureContentScript`
3. 任何微小变化都会重新创建 `initializePopup`
4. 导致 `useEffect` 重新执行
5. 无限循环！

## ✅ 修复方案

### 1. 移除 useEffect 依赖项
```javascript
useEffect(() => {
  initializePopup();
}, []); // ← 空数组，只在组件挂载时执行一次
```

### 2. 移除不必要的 useCallback
```javascript
// 改为普通函数
const initializePopup = async () => {
  // 初始化逻辑
};
```

### 3. 增强页面刷新检测
```javascript
// 页面刷新时也清理缓存
if (changeInfo.status === 'loading') {
  console.log(`🔄 [Background] Tab ${tabId} 正在加载，清理缓存`);
  injectedTabs.delete(tabId);
}
```

## 📊 修复前后对比

### 修复前（v1.8.11）
```
ENSURE_CONTENT_SCRIPT × 30+ 次
后台日志充满重复消息
CPU 占用高
```

### 修复后（v1.8.12）
```
ENSURE_CONTENT_SCRIPT × 1 次
日志清晰简洁
性能正常
```

## 🧪 测试验证

1. **打开扩展 Popup**
   - 应该只看到一次 `ENSURE_CONTENT_SCRIPT`

2. **刷新页面后**
   - 重新打开 Popup
   - 也应该只有一次请求

3. **切换阅读模式**
   - 正常进入/退出
   - 无重复请求

## 📝 关键改动

### src/popup/PopupShadcn.tsx
- 移除 `useCallback` 包装
- `useEffect` 依赖项改为空数组
- 添加详细日志

### src/background/background.ts
- 页面加载时清理缓存
- URL 变化时清理缓存
- 增强日志输出

## 🎯 核心要点

1. **React Hooks 陷阱**
   - `useEffect` 依赖项要谨慎
   - 不是所有函数都需要 `useCallback`
   - 避免依赖链导致的循环

2. **缓存管理**
   - 页面刷新时要清理缓存
   - URL 变化时要清理缓存
   - 状态要与实际同步

3. **调试技巧**
   - 详细日志是关键
   - 观察重复模式
   - 追踪调用栈

## 📦 版本信息

- **版本号**: v1.8.12
- **发布时间**: 2024-10-09
- **主要修复**: Popup 无限循环问题
- **影响范围**: 所有用户

## ✨ 效果

- ✅ 不再有重复的 `ENSURE_CONTENT_SCRIPT` 请求
- ✅ 页面刷新后可以正常进入阅读模式
- ✅ 性能显著改善
- ✅ 日志清晰可读
