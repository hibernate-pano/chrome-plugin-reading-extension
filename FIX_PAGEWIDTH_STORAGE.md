# 修复：阅读模式宽度设置自动保存

## 🐛 问题描述

用户在阅读模式悬浮面板中调整的"宽度"设置不会自动保存到 Chrome Storage，导致刷新页面或在其他页面进入阅读模式时，宽度设置会丢失。

## 🔍 根本原因

发现了**三个关键问题**：

### 1. **unifiedContentScript.ts 中硬编码了 pageWidth**

- **位置**: `src/content/unifiedContentScript.ts:152`
- **问题**: `pageWidth` 被硬编码为 `900`，没有从 storage 中读取
- **影响**: 即使设置已保存，加载时也会被覆盖为默认值

### 2. **Storage 监听器只监听 sync 存储**

- **位置**:
  - `src/content/unifiedContentScript.ts:380`
  - `src/content/contentShadcn.ts:225`
- **问题**: `setupStorageListeners` 只监听 `sync` 存储的变化，但设置实际保存在 `local` 存储中
- **影响**: 设置变化不会触发实时同步

### 3. **重复获取 FONT_SIZE**

- **位置**: `src/content/unifiedContentScript.ts:142`
- **问题**: Promise.all 中最后一个参数重复获取了 `FONT_SIZE` 而不是 `PAGE_WIDTH`
- **影响**: pageWidth 参数没有被正确获取

## ✅ 修复内容

### 修复 1: unifiedContentScript.ts - 从 Storage 读取 pageWidth

**修改前**:

```typescript
async function loadSettings(): Promise<UserSettings> {
  const [
    fontSize,
    lineHeight,
    paragraphSpacing,
    fontFamily,
    backgroundColor,
    theme,
  ] = await Promise.all([
    getStorage<number>(StorageKeys.FONT_SIZE),
    // ... 其他设置
    getStorage<number>(StorageKeys.FONT_SIZE), // ❌ 重复获取
  ]);

  return {
    // ...
    pageWidth: 900, // ❌ 硬编码
    // ...
  };
}
```

**修改后**:

```typescript
async function loadSettings(): Promise<UserSettings> {
  const [
    fontSize,
    lineHeight,
    paragraphSpacing,
    fontFamily,
    backgroundColor,
    theme,
    pageWidth,
  ] = await Promise.all([
    getStorage<number>(StorageKeys.FONT_SIZE),
    // ... 其他设置
    getStorage<number>(StorageKeys.PAGE_WIDTH), // ✅ 正确获取
  ]);

  return {
    // ...
    pageWidth: pageWidth || 900, // ✅ 从 storage 读取，带默认值
    // ...
  };
}
```

### 修复 2: 监听 local 存储的变化

**修改前**:

```typescript
function setupStorageListeners(): void {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== "sync") return; // ❌ 只监听 sync
    // ...
  });
}
```

**修改后**:

```typescript
function setupStorageListeners(): void {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    // ✅ 监听 local 和 sync 存储的变化
    if (namespace !== "local" && namespace !== "sync") return;

    if (settingsChanged) {
      console.log("📢 检测到设置变化:", changes); // ✅ 添加调试日志
      loadSettings().then((newSettings) => {
        console.log("🔄 已重新加载设置:", newSettings);
        currentSettings = newSettings;
        readingModeManager?.updateSettings(newSettings);
      });
    }
  });
}
```

### 修复 3: 添加 Storage 键映射

**已在之前的修复中完成**:

- ✅ `src/storage/storage.ts`: 添加了 `PAGE_WIDTH` 存储键
- ✅ `src/content/features/readingModeManager.ts`: 在 `saveSettingsToStorage` 中添加了 pageWidth 映射
- ✅ `src/content/services/readingModeService.ts`: 从 storage 加载 pageWidth

### 修复 4: 添加调试日志

为了方便排查问题，添加了详细的调试日志：

```typescript
private async saveSettingsToStorage(settings: Partial<UserSettings>): Promise<void> {
  console.log('💾 [ReadingModeManager] 开始保存设置到 Chrome storage:', settings);

  for (const [key, value] of Object.entries(settings)) {
    const storageKey = settingsKeyMap[key as keyof UserSettings];
    if (storageKey !== undefined && value !== undefined) {
      console.log(`💾 [ReadingModeManager] 保存 ${key} = ${value} 到存储键 ${storageKey}`);
      savePromises.push(setStorage(storageKey, value));
    }
  }

  console.log('✅ [ReadingModeManager] 设置已保存到 Chrome storage');
}
```

## 📋 涉及的文件

1. ✅ `src/content/unifiedContentScript.ts` - 修复 pageWidth 读取和 storage 监听
2. ✅ `src/content/contentShadcn.ts` - 修复 storage 监听
3. ✅ `src/content/features/readingModeManager.ts` - 添加保存逻辑和调试日志
4. ✅ `src/storage/storage.ts` - 添加 PAGE_WIDTH 键
5. ✅ `src/content/services/readingModeService.ts` - 从 storage 读取 pageWidth
6. ✅ `test-settings-storage.html` - 新增测试工具

## 🧪 测试步骤

### 1. 使用测试工具验证存储功能

1. 在 Chrome 中加载扩展的 `test-settings-storage.html` 文件
2. 点击"读取所有设置"查看当前设置
3. 点击"测试保存宽度 (950px)"验证保存功能
4. 查看 pageWidth 是否正确显示为 950

### 2. 在实际页面测试

1. **初始设置**:

   - 打开任意网页
   - 启用阅读模式
   - 打开左侧悬浮设置面板
   - 调整"宽度"滑块（例如设置为 1000px）

2. **刷新验证**:

   - 关闭阅读模式
   - 刷新页面
   - 重新启用阅读模式
   - ✅ 检查宽度是否保持为 1000px

3. **跨页面验证**:

   - 保持阅读模式设置
   - 打开另一个网页
   - 启用阅读模式
   - ✅ 检查宽度是否自动应用为 1000px

4. **查看控制台日志**:
   打开开发者工具控制台，调整宽度时应该看到：
   ```
   💾 [ReadingModeManager] 开始保存设置到 Chrome storage: {pageWidth: 1000}
   💾 [ReadingModeManager] 保存 pageWidth = 1000 到存储键 pageWidth
   ✅ [ReadingModeManager] 设置已保存到 Chrome storage
   ```

## 🎯 预期结果

修复后，阅读模式的宽度设置应该：

1. ✅ **立即保存**: 调整宽度滑块后立即保存到 Chrome Storage
2. ✅ **刷新保持**: 刷新页面后宽度设置保持不变
3. ✅ **跨页面共享**: 在其他页面的阅读模式中自动应用相同宽度
4. ✅ **实时同步**: 设置变化时实时同步到已打开的阅读模式页面
5. ✅ **默认值**: 如果没有保存的设置，使用默认值 900px

## 📊 完整的设置保存流程

```
用户调整宽度滑块
    ↓
ReadingSettingsPanel.handleChange('pageWidth', 1000)
    ↓
readingModeManager.updateSettings({ pageWidth: 1000 })
    ↓
1. 更新内存中的 settings
2. 调用 updateStyles() 更新 CSS 变量
3. 调用 applySettingsToContainer() 应用到容器
4. 调用 saveSettingsToStorage() 保存到 Chrome Storage
    ↓
chrome.storage.local.set({ pageWidth: 1000 })
    ↓
触发 storage.onChanged 事件
    ↓
所有页面的 setupStorageListeners 监听到变化
    ↓
重新加载设置并更新 UI
```

## 🔧 技术细节

### 存储位置

- **存储区域**: Chrome Storage Local (不是 sync)
- **存储键**: `pageWidth`
- **数据类型**: `number`
- **默认值**: `900`

### 相关常量

```typescript
// src/storage/storage.ts
export enum StorageKeys {
  PAGE_WIDTH = "pageWidth",
  // ...
}

// src/constants/defaultSettings.ts
export const DEFAULT_SETTINGS: UserSettings = {
  pageWidth: 900,
  // ...
};
```

## ⚠️ 注意事项

1. **存储区域一致性**: 确保所有 `getStorage` 和 `setStorage` 调用使用相同的存储区域（默认为 'local'）
2. **监听器范围**: storage 监听器必须同时监听 'local' 和 'sync' 存储
3. **类型安全**: pageWidth 的类型必须是 `number`
4. **默认值处理**: 使用 `pageWidth || 900` 确保在 storage 为空时有默认值

## 📝 调试技巧

如果设置仍然不保存，检查以下内容：

1. **查看控制台日志**:

   ```
   💾 [ReadingModeManager] 开始保存设置...
   ✅ [ReadingModeManager] 设置已保存...
   ```

2. **检查 Chrome Storage**:

   - 打开 Chrome DevTools
   - 进入 Application > Storage > Extension > Local Storage
   - 查看 `pageWidth` 键的值

3. **使用测试工具**:

   - 打开 `test-settings-storage.html`
   - 验证读取和保存功能

4. **检查错误日志**:
   ```javascript
   // 查找保存失败的错误
   console.error("保存设置到 Chrome storage 失败:", error);
   ```

## ✨ 最终状态

修复完成后，所有阅读模式的设置（包括宽度）都会：

- ✅ 自动保存到 Chrome Storage
- ✅ 刷新页面后保持不变
- ✅ 在所有页面间共享
- ✅ 实时同步更新

---

修复日期: 2025-01-09  
修复版本: 1.8.4+
