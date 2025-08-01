# Chrome 阅读扩展安装指南

## 问题修复说明

本次修复解决了以下问题：

- **内容脚本加载失败**：修复了 manifest.json 中的文件路径配置
- **消息通信失败**：确保 content script 和 background script 正确加载
- **构建配置优化**：修复了构建脚本和 Vite 配置

## 安装步骤

### 1. 构建扩展

```bash
# 确保在项目根目录
cd chrome-plugin-reading-extension

# 运行构建脚本
./build.sh
```

### 2. 在 Chrome 中加载扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"（右上角开关）
4. 点击"加载已解压的扩展程序"
5. 选择项目中的 `dist` 目录
6. 扩展应该成功加载，显示在扩展列表中

### 3. 验证安装

1. 扩展图标应该出现在浏览器工具栏中
2. 点击扩展图标应该打开 popup 界面
3. 在任意网页上应该能看到阅读模式的浮动按钮

## 测试步骤

### 1. 基础功能测试

1. 打开 `test-extension.html` 文件
2. 点击扩展图标，检查 popup 是否正常打开
3. 尝试启用阅读模式
4. 检查是否有错误信息

### 2. 调试信息

如果遇到问题，请检查：

1. **浏览器控制台**：

   - 按 F12 打开开发者工具
   - 查看 Console 标签页的错误信息

2. **扩展管理页面**：

   - 访问 `chrome://extensions/`
   - 点击扩展的"详情"按钮
   - 查看"错误"部分

3. **常见错误及解决方案**：

   - **"Could not establish connection. Receiving end does not exist."**

     - 原因：内容脚本未正确加载
     - 解决：检查 manifest.json 中的路径配置

   - **"Content script not found"**

     - 原因：文件路径错误
     - 解决：确保构建后的文件在正确位置

   - **"Permission denied"**
     - 原因：权限配置问题
     - 解决：检查 manifest.json 中的 permissions 配置

## 文件结构

构建后的文件结构：

```
dist/
├── manifest.json          # 扩展配置文件
├── index.html             # Popup页面
├── assets/
│   ├── style.css          # 内容脚本样式
│   └── popup.css          # Popup样式
└── src/
    ├── content/
    │   └── contentShadcn.js  # 内容脚本
    ├── background/
    │   └── background.js     # 后台脚本
    └── popup/
        └── popup.js          # Popup脚本
```

## 修复内容

### 1. manifest.json 路径修复

- 修正了 content_scripts 的 js 和 css 路径
- 修正了 background script 路径
- 修正了 web_accessible_resources 路径

### 2. 构建脚本优化

- 修复了构建顺序（先复制静态文件，再构建）
- 使用正确的 Vite 配置文件
- 确保所有文件输出到正确位置

### 3. 错误处理改进

- 添加了更详细的错误日志
- 改进了消息通信的错误处理
- 优化了初始化流程

## 版本信息

- **扩展版本**：1.8.0
- **修复日期**：2024 年 8 月 1 日
- **兼容性**：Chrome 88+

## 技术支持

如果仍然遇到问题，请：

1. 检查浏览器版本是否支持
2. 确认所有文件都已正确构建
3. 查看浏览器控制台的详细错误信息
4. 尝试重新加载扩展
