# cleanup 方法统一修复说明

## 问题描述

用户报告插件运行时出现错误：

```
Uncaught TypeError: Uf.cleanup is not a function
```

## 问题分析

### 错误原因

在 `unifiedContentScript.ts` 的 `cleanup()` 函数中，我们调用了多个管理器的 `cleanup()` 方法：

```typescript
function cleanup(): void {
  readingModeManager?.destroy();
  readingModeManager = null;
  enhancedProcessingManager.cleanup();
  annotationManager.cleanup();
  textSelectionToolbar?.destroy();
  textSelectionToolbar = null;
  loadingStateManager.cleanup();
  keyboardShortcutManager.cleanup(); // ❌ 这里出错了
  retryManager.cleanup();
  errorMessageManager.cleanup();
  errorMonitor.cleanup();
  isInitialized = false;
}
```

但是 `KeyboardShortcutManager` 类只有 `destroy()` 方法，没有 `cleanup()` 方法：

```typescript
// KeyboardShortcutManager.ts
export class KeyboardShortcutManager {
  // ...

  public destroy(): void {
    // 清理逻辑
  }

  // ❌ 缺少 cleanup() 方法
}
```

### 接口不一致问题

项目中的管理器类使用了两种不同的清理方法命名：

1. **使用 `cleanup()` 的类**：

   - `EnhancedProcessingManager`
   - `AnnotationManager`
   - `LoadingStateManager`
   - `RetryManager`
   - `ErrorMessageManager`
   - `ErrorMonitor`

2. **使用 `destroy()` 的类**：

   - `ReadingModeManager`
   - `TextSelectionToolbar`
   - `KeyboardShortcutManager` ❌
   - `ToastManager`

3. **同时提供两者的类**：
   - `LoadingStateManager`（有 `cleanup()` 和 `destroy()`）
   - `ErrorMessageManager`（有 `cleanup()` 和 `destroy()`）

## 解决方案

为了保持接口一致性，给 `KeyboardShortcutManager` 添加 `cleanup()` 方法，内部调用 `destroy()`：

```typescript
// src/content/components/KeyboardShortcutManager.ts

export class KeyboardShortcutManager {
  // ... 现有代码 ...

  /**
   * 清理资源
   */
  public destroy(): void {
    this.shortcuts.clear();
    this.detachEventListeners();

    if (this.helpDialog && this.helpDialog.parentNode) {
      this.helpDialog.parentNode.removeChild(this.helpDialog);
    }
    this.helpDialog = null;
  }

  /**
   * 清理资源（与 destroy 相同，为了保持接口一致性）
   */
  public cleanup(): void {
    this.destroy();
  }
}
```

## 技术说明

### 为什么不统一使用一种命名？

1. **历史原因**：不同的管理器在不同时期开发，使用了不同的命名约定
2. **接口兼容**：一些管理器可能被外部代码调用，改名会破坏兼容性
3. **最小改动**：添加别名方法是最安全的解决方案

### 添加别名方法的优势

1. ✅ **兼容性**：保留原有的 `destroy()` 方法，不破坏现有调用
2. ✅ **一致性**：提供 `cleanup()` 方法，统一清理接口
3. ✅ **最小改动**：只需添加一个简单的转发方法
4. ✅ **无性能影响**：方法调用开销可忽略

## 修复验证

### 1. 构建验证

```bash
pnpm run build
# ✅ 构建成功，无错误
```

### 2. 运行时验证

```bash
# 1. 重新加载扩展
# 2. 打开任意网页
# 3. 打开 popup 启用阅读模式
# 4. 刷新页面或关闭标签页
# ✅ 不应该看到 "Uf.cleanup is not a function" 错误
```

### 3. Console 验证

```javascript
// 在页面 Console 中测试
window.addEventListener("beforeunload", () => {
  console.log("页面卸载，清理资源");
});

// 刷新页面
// ✅ 应该正常清理，无错误
```

## 相关文件

1. ✅ `src/content/components/KeyboardShortcutManager.ts`

   - 添加 `cleanup()` 方法

2. ✅ `src/content/unifiedContentScript.ts`
   - 调用 `keyboardShortcutManager.cleanup()`

## 后续优化建议

### 1. 统一清理接口

考虑定义一个统一的清理接口：

```typescript
// types/manager.ts
export interface ICleanableManager {
  cleanup(): void;
}

export interface IDestroyableManager {
  destroy(): void;
}

// 推荐：管理器同时实现两个接口
export interface IManager extends ICleanableManager, IDestroyableManager {}
```

### 2. 批量修复其他管理器

如果有其他管理器也存在类似问题，可以批量添加别名方法：

```typescript
// 示例：ToastManager
export class ToastManager {
  public destroy(): void {
    // 清理逻辑
  }

  public cleanup(): void {
    this.destroy();
  }
}
```

### 3. 添加 TypeScript 类型检查

在 `cleanup()` 函数中添加类型约束：

```typescript
// unifiedContentScript.ts
function cleanup(): void {
  // 确保所有管理器都有 cleanup 方法
  const cleanupManagers: Array<{ cleanup(): void }> = [
    enhancedProcessingManager,
    annotationManager,
    loadingStateManager,
    keyboardShortcutManager,
    retryManager,
    errorMessageManager,
    errorMonitor,
  ];

  cleanupManagers.forEach((manager) => {
    try {
      manager.cleanup();
    } catch (error) {
      console.error("清理管理器失败:", error);
    }
  });

  // 单独处理有 destroy() 的管理器
  readingModeManager?.destroy();
  readingModeManager = null;
  textSelectionToolbar?.destroy();
  textSelectionToolbar = null;

  isInitialized = false;
}
```

## 总结

本次修复解决了 `KeyboardShortcutManager.cleanup is not a function` 错误：

1. ✅ 添加了 `cleanup()` 方法作为 `destroy()` 的别名
2. ✅ 保持了接口一致性
3. ✅ 不破坏现有代码
4. ✅ 最小改动原则

这是一个简单但重要的修复，确保了页面卸载时的资源清理能够正常进行。

## 日期

2025-01-09
