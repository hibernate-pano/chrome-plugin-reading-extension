## 段间距功能设计方案

### 1. 功能概述

- 允许用户调整文章段落之间的间距
- 提供类似行间距的滑动条控制界面
- 实时预览效果

### 2. 技术实现步骤

#### 2.1 存储层

1. 在 `src/types/global.d.ts` 中扩展 `Settings` 接口:

```typescript
interface Settings {
  // ... existing settings ...
  paragraphSpacing: number; // 段间距值，默认为 1
}
```

2. 在 `src/constants/options.ts` 中添加默认值:

```typescript
export const DEFAULT_SETTINGS: Settings = {
  // ... existing defaults ...
  paragraphSpacing: 1,
};
```

#### 2.2 UI 层

1. 在 `src/popup/components/SettingsPanel.tsx` 中添加段间距控制组件:

- 复用现有的滑动条组件
- 添加段间距的标签和控制逻辑

#### 2.3 内容脚本

1. 在 `src/content/content.ts` 中:

- 监听设置变更
- 实现段间距样式的应用逻辑

2. 在 `src/content/content.css` 中:

- 添加段间距相关的 CSS 类
- 使用 CSS 变量控制段间距

### 3. 实现细节

#### 3.1 CSS 实现

```css
.reading-extension-paragraph {
  margin-bottom: calc(var(--paragraph-spacing, 1) * 1em);
}
```

#### 3.2 JavaScript 实现

```typescript
// 应用段间距
function applyParagraphSpacing(spacing: number) {
  document.documentElement.style.setProperty(
    "--paragraph-spacing",
    String(spacing)
  );
}
```

### 4. 测试计划

1. 单元测试

   - 测试设置的保存和读取
   - 测试默认值处理

2. 集成测试

   - 测试 UI 交互
   - 测试样式应用效果

3. 兼容性测试
   - 测试不同网站的段落识别
   - 测试样式覆盖情况

### 5. 注意事项

1. 性能考虑

   - 使用 CSS 变量实现实时更新，避免频繁的 DOM 操作
   - 确保样式更新不会导致页面重排

2. 兼容性考虑
   - 处理不同网站的段落结构
   - 确保样式不被覆盖
