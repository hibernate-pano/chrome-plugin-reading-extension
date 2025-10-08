# Popup 调试指南

## 问题：开关无法点击

### 调试步骤

1. **重新加载扩展**

   - 打开 Chrome 浏览器
   - 进入 `chrome://extensions/`
   - 找到 "AI Reading Extension"
   - 点击刷新图标 🔄

2. **打开开发者工具**

   - 右键点击扩展图标
   - 选择"检查弹出内容"（Inspect popup）
   - 这会打开 popup 的开发者工具

3. **查看控制台日志**
   当你点击开关时，应该看到以下日志：

   ```
   🖱️ Switch 外层 div 被点击
   事件目标: ...
   当前元素: ...
   🖱️ Switch onClick 触发
   事件: ...
   🎯 Switch onCheckedChange 触发，checked = true/false
   ========================================
   🔄 toggleReadingMode 被调用
   参数 checked: true/false
   当前 readingMode 状态: true/false
   ========================================
   ✅ UI 状态已更新为: true/false
   📤 发送消息: ENABLE_READING_MODE/DISABLE_READING_MODE
   📥 收到响应: ...
   ✅ 阅读模式切换成功
   ```

4. **测试备用按钮**

   - 如果 Switch 开关不工作
   - 尝试点击下方的"测试切换"按钮
   - 这个按钮使用相同的 `toggleReadingMode` 函数

5. **检查 Content Script**
   - 打开任意网页
   - 按 F12 打开开发者工具
   - 在控制台查看是否有来自 content script 的日志：
     ```
     📡 注册消息监听器（立即执行）
     🚀 初始化统一阅读模式内容脚本
     ```

### 常见问题

#### 问题 1：没有任何日志输出

**可能原因：** popup.js 没有正确加载
**解决方案：**

- 检查 `dist/` 目录是否有 `popup.js`
- 重新运行 `pnpm run build`
- 清除浏览器缓存后重新加载扩展

#### 问题 2：Switch 点击没有响应

**可能原因：** Radix UI Switch 组件问题
**解决方案：**

- 使用"测试切换"按钮来验证功能是否正常
- 检查是否有 CSS 覆盖导致 pointer-events 被禁用
- 检查控制台是否有 React 错误

#### 问题 3：消息发送失败

**可能原因：** Content script 未加载或通信失败
**解决方案：**

- 在网页的开发者工具中检查 content script 是否加载
- 查看是否有 "📥 收到消息" 的日志
- 确认 manifest.json 中的 content_scripts 配置正确

#### 问题 4：开关状态不同步

**可能原因：** 状态管理问题
**解决方案：**

- 检查 `GET_READING_MODE_STATE` 消息的响应
- 确认 `initializePopup` 函数正常执行
- 查看是否有状态初始化错误

### 已添加的调试功能

1. **详细的控制台日志**

   - 每个关键步骤都有日志输出
   - 使用 emoji 图标便于识别

2. **多层点击检测**

   - Switch 外层 div 点击
   - Switch onClick 事件
   - Switch onCheckedChange 事件

3. **备用测试按钮**

   - 绕过 Switch 组件直接调用功能
   - 用于验证核心功能是否正常

4. **显式的 disabled 属性**
   - `disabled={false}` 确保 Switch 不被禁用

### 下一步

如果以上步骤都无法解决问题，请提供：

1. 控制台的完整日志输出
2. 是否有任何错误信息
3. "测试切换"按钮是否能正常工作
4. Chrome 版本信息
