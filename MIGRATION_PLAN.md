# UI 组件迁移计划

## 目标

统一使用 Shadcn/UI 组件系统，移除重复的自定义组件，保持功能完整性。

## 迁移策略

### 第一阶段：核心组件统一 ✅

- [x] Button - 已扩展 Shadcn/UI Button，添加 loading、icon 支持
- [x] Card - 已扩展 Shadcn/UI Card，添加变体和 padding 选项
- [ ] Dialog - 使用 Shadcn/UI Dialog，功能更完整
- [ ] Switch - 使用 Shadcn/UI Switch
- [ ] Slider - 使用 Shadcn/UI Slider

### 第二阶段：高级组件迁移

- [ ] Tabs - 使用 Shadcn/UI Tabs
- [ ] Tooltip - 使用 Shadcn/UI Tooltip
- [ ] DropdownMenu - 使用 Shadcn/UI DropdownMenu
- [ ] Select - 使用 Shadcn/UI Select

### 第三阶段：自定义组件保留

- [ ] Transition - 保留，用于动画效果
- [ ] Ripple - 保留，用于按钮效果
- [ ] Spinner - 保留，用于加载状态
- [ ] CodeBlock - 保留，用于代码显示
- [ ] Toast - 保留，用于通知系统

## 迁移步骤

### 1. 更新导入路径

```typescript
// 旧导入
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";

// 新导入
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
```

### 2. 更新组件属性

```typescript
// 旧用法
<Button variant="primary" size="md" loading={true} />

// 新用法 (保持兼容)
<Button variant="primary" size="md" loading={true} />
```

### 3. 移除旧组件

- 确认所有使用已迁移
- 删除旧组件文件
- 更新相关测试

## 兼容性保证

### 属性映射

- `variant="primary"` → `variant="primary"` (已添加)
- `variant="accent"` → `variant="accent"` (已添加)
- `variant="danger"` → `variant="destructive"` (需要映射)
- `size="xs"` → `size="xs"` (已添加)

### 功能保持

- Loading 状态支持
- Icon 支持
- 所有变体样式
- 响应式设计

## 测试计划

### 单元测试

- 组件渲染测试
- 属性传递测试
- 事件处理测试

### 集成测试

- 页面功能测试
- 样式一致性测试
- 性能影响测试

## 风险控制

### 回滚计划

- 保留旧组件备份
- 渐进式迁移
- 功能验证测试

### 性能监控

- 组件渲染性能
- 包大小影响
- 运行时性能
