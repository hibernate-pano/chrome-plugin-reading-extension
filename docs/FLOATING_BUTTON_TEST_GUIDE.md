# 浮动按钮功能测试指南

## 🔍 测试步骤

### 1. 重新加载扩展
1. 打开 Chrome：`chrome://extensions/`
2. 找到 "AI Reading Extension"
3. 点击 **刷新图标** ⟳
4. 确保扩展状态为"已启用"

### 2. 测试阅读模式
1. 打开任意网页（推荐：新闻文章、博客等）
2. 点击扩展图标（工具栏中）
3. 在 Popup 中点击"启用阅读模式"
4. 页面应该切换到阅读模式

### 3. 检查浮动按钮
**预期结果：**
- 右下角应该出现一个圆形浮动按钮
- 按钮上显示 ⚙️ 图标
- 悬停时应该显示"设置"文字
- 右上角有绿色的状态指示点

**如果按钮没有出现：**
1. 打开开发者工具（F12）
2. 切换到 Console 标签
3. 查找以下日志：
   ```
   🎨 [FloatingUI] 开始挂载浮动UI...
   🎨 [FloatingUI] 容器已添加到页面
   🎨 [FloatingUI] React组件渲染成功
   🔘 [FloatingButton] 组件挂载
   ```

### 4. 测试按钮点击
1. 点击浮动按钮
2. 应该弹出设置面板

**预期结果：**
- 设置面板出现在左侧
- 面板有两个 Tab：
  - "阅读设置"
  - "布局位置"
- 面板可以通过拖拽标题栏移动

### 5. 测试位置调整
1. 在设置面板中切换到"布局位置" Tab
2. 看到可视化屏幕图示
3. 点击任意位置图标（↘️ ↙️ ↗️ ↖️ ➡️ ⬅️）
4. 浮动按钮应该移动到对应位置

### 6. 测试首次使用引导
1. 清除浏览器存储：
   - 打开开发者工具（F12）
   - Console 中执行：
     ```javascript
     localStorage.removeItem('reading-extension-welcomed');
     ```
2. 刷新页面
3. 重新启用阅读模式
4. 应该看到欢迎引导弹窗

## 🐛 常见问题排查

### 问题 1：浮动按钮完全不显示

**检查清单：**
1. 确认阅读模式已启用
   ```javascript
   // 在 Console 中执行
   console.log('Reading Mode Active:', document.getElementById('reading-extension-floating-ui'));
   ```

2. 检查容器是否创建
   ```javascript
   // 应该返回 div 元素
   document.getElementById('reading-extension-floating-ui')
   ```

3. 检查 CSS 是否加载
   ```javascript
   // 查找是否有 Tailwind CSS 样式
   Array.from(document.styleSheets).some(sheet => {
     try {
       return Array.from(sheet.cssRules).some(rule =>
         rule.cssText.includes('fixed') || rule.cssText.includes('bottom-right')
       );
     } catch(e) { return false; }
   });
   ```

4. 查看 Console 错误
   - 是否有 React 渲染错误？
   - 是否有 CSS 加载错误？
   - 是否有 TypeScript 类型错误？

### 问题 2：按钮显示但样式不对

**可能原因：**
- Tailwind CSS 没有正确加载
- CSS 被页面样式覆盖

**解决方法：**
1. 检查 contentShadcn.js 的大小
   ```bash
   # 应该在 300KB 左右
   ls -lh dist/contentShadcn.js
   ```

2. 检查是否导入了 contentTailwind.css
   ```javascript
   // 在源码中查找
   grep "contentTailwind" src/content/contentShadcn.ts
   ```

### 问题 3：按钮点击没有反应

**检查清单：**
1. 查看 Console 日志
   ```javascript
   // 点击时应该看到
   🔘 [FloatingButton] 按钮被点击
   ```

2. 检查事件绑定
   ```javascript
   // 在 Console 中执行
   const btn = document.querySelector('[role="button"]');
   console.log('Button found:', btn);
   console.log('Click handlers:', btn?.onclick);
   ```

3. 检查 pointer-events
   ```javascript
   const container = document.getElementById('reading-extension-floating-ui');
   console.log('Pointer events:', window.getComputedStyle(container).pointerEvents);
   // 应该显示 "none"，但子元素应该是 "auto"
   ```

### 问题 4：设置面板不显示

**可能原因：**
- React 状态没有更新
- CSS z-index 被覆盖

**调试命令：**
```javascript
// 检查面板容器
const panel = document.querySelector('[role="dialog"]');
console.log('Panel found:', panel);
console.log('Panel visibility:', window.getComputedStyle(panel).display);
```

### 问题 5：位置调整不生效

**检查：**
```javascript
// 查看保存的位置
console.log('Saved position:', localStorage.getItem('reading-button-position'));

// 手动设置位置
localStorage.setItem('reading-button-position', JSON.stringify('top-left'));
// 刷新页面测试
```

## 📊 调试日志说明

### 正常启动日志序列
```
✅ Shadcn/UI 内容脚本初始化完成
🔄 切换阅读模式
🎨 [FloatingUI] 开始挂载浮动UI...
🎨 [FloatingUI] 容器已添加到页面
🎨 [FloatingUI] 创建React根节点...
🎨 [FloatingUI] 渲染React组件...
✅ [FloatingUI] React组件渲染成功
🔘 [FloatingButton] 组件挂载
🔘 [FloatingButton] 可见性变化: true
```

### 错误日志示例
```
❌ [FloatingUI] 挂载失败: Error: ...
❌ [FloatingUI] 创建失败: Error: ...
❌ 阅读模式管理器未初始化
```

## 🔧 强制重置

如果遇到无法解决的问题：

```javascript
// 1. 清除所有存储
localStorage.clear();

// 2. 移除浮动UI容器
document.getElementById('reading-extension-floating-ui')?.remove();

// 3. 重新加载页面
location.reload();
```

## 📝 问题反馈

如果问题仍然存在，请提供：
1. Console 完整日志
2. Chrome 版本
3. 扩展版本（1.8.0）
4. 操作系统
5. 重现步骤

## ✅ 成功标志

浮动按钮功能正常工作的标志：
- ✅ 按钮在阅读模式中显示
- ✅ 悬停显示提示
- ✅ 点击打开设置面板
- ✅ 可以调整按钮位置
- ✅ 设置实时生效
- ✅ 首次使用显示引导
- ✅ 位置偏好自动保存

现在重新加载扩展，按照测试步骤验证功能！🚀
