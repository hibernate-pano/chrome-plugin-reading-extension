# Popup 开关修复测试指南

## 已完成的修复

### 1. Content Script 消息监听器修复

- **问题**：消息监听器在异步初始化后才注册，导致 popup 消息无法接收
- **修复**：立即注册消息监听器，在初始化前就能接收消息
- **文件**：`src/content/unifiedContentScript.ts`

### 2. Popup 开关事件处理修复

- **问题**：`toggleReadingMode` 函数参数不匹配，导致 Switch 无法正常工作
- **修复**：修改函数接收 `checked` 参数，立即更新 UI 状态
- **文件**：`src/popup/PopupShadcn.tsx`

### 3. 添加调试功能

- 详细的控制台日志
- 测试按钮（绕过 Switch 组件）
- 简化版 Switch 组件（SimpleSwitch）
- Switch 组件切换按钮

## 测试步骤

### 第一步：重新加载扩展

1. 打开 Chrome 浏览器
2. 进入 `chrome://extensions/`
3. 找到 "AI Reading Extension"
4. 点击刷新图标 🔄

### 第二步：打开调试工具

1. 右键点击扩展图标
2. 选择"检查弹出内容"（Inspect popup）
3. 这会打开 popup 的开发者工具

### 第三步：测试开关功能

#### 测试 A：使用 Radix UI Switch（默认）

1. 点击 Switch 开关
2. 观察控制台日志，应该看到：

   ```
   🖱️ Switch 外层 div 被点击
   🖱️ Switch onClick 触发
   🎯 Switch onCheckedChange 触发，checked = true
   ========================================
   🔄 toggleReadingMode 被调用
   参数 checked: true
   ✅ UI 状态已更新为: true
   📤 发送消息: ENABLE_READING_MODE
   ```

3. 检查开关是否能点击和切换

#### 测试 B：使用测试按钮

1. 点击"测试切换"按钮
2. 观察控制台日志：

   ```
   🔘 测试按钮被点击
   🔄 toggleReadingMode 被调用
   ```

3. 检查功能是否正常工作

#### 测试 C：使用简单 Switch

1. 点击"使用简单 Switch"按钮
2. 开关会切换为基于原生 HTML checkbox 的版本
3. 尝试点击新的开关
4. 观察控制台日志：
   ```
   SimpleSwitch clicked, current state: false
   SimpleSwitch change event: true
   🎯 SimpleSwitch onCheckedChange 触发，checked = true
   ```

### 第四步：检查 Content Script

1. 打开任意网页（例如：https://www.baidu.com）
2. 按 F12 打开该网页的开发者工具
3. 在控制台中查找：

   ```
   📡 注册消息监听器（立即执行）
   🚀 初始化统一阅读模式内容脚本
   ```

4. 从 popup 切换阅读模式
5. 在网页控制台中应该看到：
   ```
   📥 收到消息: {action: "ENABLE_READING_MODE", settings: {...}}
   🟢 处理启用阅读模式消息
   ```

## 预期结果

### 成功的标志

1. ✅ **Radix UI Switch 能点击**

   - 开关能正常响应点击
   - 状态立即更新
   - 控制台有完整的日志

2. ✅ **测试按钮能工作**

   - 点击按钮能切换状态
   - 功能正常执行

3. ✅ **消息能正常发送和接收**

   - Popup 发送消息成功
   - Content Script 接收并处理消息
   - 阅读模式能正常启用/禁用

4. ✅ **SimpleSwitch 能工作**
   - 作为备用方案正常运行

### 如果仍然失败

请提供以下信息：

1. **控制台日志**

   - Popup 的完整日志（右键扩展图标 → 检查弹出内容）
   - 网页的完整日志（F12 开发者工具）

2. **测试结果**

   - Radix UI Switch 是否能点击？
   - 测试按钮是否能工作？
   - SimpleSwitch 是否能工作？
   - 哪些日志出现了？哪些没有？

3. **环境信息**

   - Chrome 版本
   - 操作系统
   - 是否有其他扩展干扰

4. **错误信息**
   - 是否有任何错误提示？
   - 是否有网络请求失败？

## 诊断分析

### 场景 1：三个测试都不工作

**可能原因**：`toggleReadingMode` 函数本身有问题
**检查**：

- 查看函数是否被调用
- 查看是否有 JavaScript 错误
- 查看 `getCurrentTab` 是否返回了正确的标签页

### 场景 2：测试按钮和 SimpleSwitch 工作，但 Radix UI Switch 不工作

**可能原因**：Radix UI 组件问题
**解决**：使用 SimpleSwitch 作为临时解决方案

```typescript
// 在 PopupShadcn.tsx 中设置
const [useSimpleSwitch, setUseSimpleSwitch] = useState(true); // 改为 true
```

### 场景 3：消息发送失败

**可能原因**：Content Script 未加载
**检查**：

- 确认 manifest.json 中的 content_scripts 配置
- 确认 dist/unifiedContentScript.js 存在
- 尝试刷新网页后再测试

### 场景 4：消息发送成功但没有响应

**可能原因**：Content Script 处理失败
**检查**：

- 查看网页控制台的错误信息
- 确认 `ensureInitialized` 是否成功
- 确认 `readingModeManager` 是否正常创建

## 调试技巧

### 技巧 1：持久化 DevTools

popup 默认关闭时 DevTools 也会关闭，可以：

1. 右键扩展图标 → 检查弹出内容
2. 在 DevTools 中按 `Ctrl + Shift + P`（Mac：`Cmd + Shift + P`）
3. 输入 "Disable JavaScript"
4. 现在 popup 不会自动关闭

### 技巧 2：查看所有日志

```javascript
// 在 popup DevTools 控制台中运行
console.clear();
// 然后再次测试
```

### 技巧 3：手动测试消息

```javascript
// 在网页 DevTools 控制台中运行
chrome.runtime.sendMessage(
  {
    action: "GET_READING_MODE_STATE",
  },
  (response) => {
    console.log("状态:", response);
  }
);
```

## 下一步

如果以上所有测试都失败，我们需要：

1. 检查是否是 React 渲染问题
2. 检查是否是 Vite 构建问题
3. 考虑使用完全不同的实现方式

请按照此指南逐步测试，并将结果反馈给我。
