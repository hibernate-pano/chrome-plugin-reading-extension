# 🔧 Chrome 扩展连接错误调试指南

## 🚨 常见连接错误及解决方案

### 1. **内容脚本未加载错误**

**错误现象**:

- Popup 显示 "无法连接到页面"
- 控制台显示 "Could not establish connection"
- 消息发送失败

**解决方案**:

```bash
# 1. 重新构建扩展
pnpm run build

# 2. 在 Chrome 扩展管理页面重新加载扩展
# 访问 chrome://extensions/
# 找到 "AI Reading Extension" 点击 "重新加载"

# 3. 刷新目标网页
# 按 F5 或 Ctrl+R 刷新页面
```

### 2. **权限不足错误**

**错误现象**:

- 无法获取标签页信息
- 消息发送被拒绝

**检查清单**:

- ✅ 确认 manifest.json 包含必要权限: `["storage", "activeTab", "tabs", "scripting"]`
- ✅ 确认扩展已启用
- ✅ 确认目标网页允许内容脚本运行

### 3. **消息类型不匹配错误**

**错误现象**:

- 消息发送成功但无响应
- 内容脚本收到未知消息类型

**修复方案**:

```javascript
// 确保消息类型一致
const MESSAGE_TYPES = {
  GET_READING_MODE_STATE: "GET_READING_MODE_STATE",
  ENABLE_READING_MODE: "ENABLE_READING_MODE",
  DISABLE_READING_MODE: "DISABLE_READING_MODE",
  TOGGLE_READING_MODE: "TOGGLE_READING_MODE",
  APPLY_PRESET: "APPLY_PRESET",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
};
```

## 🧪 连接测试步骤

### 第一步：基础连接测试

1. 打开 `test-connection.html` 页面
2. 点击 "重新检查扩展状态"
3. **预期结果**: 显示 "✅ 扩展正常"

### 第二步：消息通信测试

1. 点击 "测试消息通信"
2. **预期结果**: 显示 "✅ 消息通信正常"
3. **如果失败**: 检查控制台错误信息

### 第三步：功能测试

1. 点击 "测试阅读模式切换"
2. 点击 "启用阅读模式"
3. **预期结果**: 页面样式发生变化

## 🔍 详细调试步骤

### 检查扩展状态

```javascript
// 在浏览器控制台执行
chrome.runtime.getManifest();
// 应该返回扩展信息

chrome.tabs.query({ active: true, currentWindow: true });
// 应该返回当前标签页信息
```

### 检查内容脚本加载

```javascript
// 在目标页面控制台执行
console.log("内容脚本已加载");
// 如果看到此消息，说明内容脚本正常运行
```

### 手动测试消息通信

```javascript
// 在目标页面控制台执行
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("收到消息:", message);
  sendResponse({ success: true, message: "测试响应" });
});
```

## 🐛 故障排除清单

### 如果扩展无法加载

- [ ] 检查 manifest.json 语法是否正确
- [ ] 确认所有引用的文件都存在
- [ ] 检查 Chrome 扩展管理页面是否有错误信息

### 如果内容脚本无法注入

- [ ] 确认 manifest.json 中的 matches 配置正确
- [ ] 检查目标网页是否在允许的域名列表中
- [ ] 尝试刷新页面重新加载内容脚本

### 如果消息通信失败

- [ ] 确认发送方和接收方都使用相同的消息格式
- [ ] 检查消息监听器是否正确设置
- [ ] 确认异步响应处理正确

### 如果权限被拒绝

- [ ] 检查 manifest.json 中的权限配置
- [ ] 确认扩展已获得必要权限
- [ ] 尝试重新安装扩展

## 📊 调试日志说明

### 成功日志示例

```
✅ 扩展已安装: AI Reading Extension v1.8.0
✅ 获取到当前标签页: https://example.com
📤 发送测试消息...
📥 收到响应: {"success":true,"readingMode":false}
✅ 消息通信正常
```

### 错误日志示例

```
❌ 扩展检查失败: Extension context invalidated
❌ 获取标签页失败: Cannot access a chrome:// URL
❌ 消息通信失败: Could not establish connection
```

## 🛠️ 快速修复命令

```bash
# 清理并重新构建
rm -rf dist/
pnpm run build

# 检查构建结果
ls -la dist/

# 验证 manifest.json
cat dist/manifest.json | jq .
```

## 📞 获取帮助

如果按照以上步骤仍然无法解决问题：

1. **收集错误信息**:

   - 截图显示错误状态
   - 复制控制台错误日志
   - 记录操作步骤

2. **检查环境**:

   - Chrome 版本
   - 操作系统版本
   - 扩展版本

3. **提供详细信息**:
   - 错误发生的具体页面
   - 错误发生的时间点
   - 之前是否正常工作

---

**注意**: 大多数连接错误都可以通过重新加载扩展和刷新页面来解决。如果问题持续存在，可能是配置或权限问题。
