# 🚀 快速开始指南

> 5分钟快速上手 Chrome 阅读扩展开发

**📚 [返回文档中心](./README.md)** | **📖 [开发指南](./DEVELOPMENT_GUIDE.md)** | **🎨 [设计系统](./design-system-spec.md)**

---

## 📋 前置要求

### 环境检查

在开始之前，请确保你的开发环境满足以下要求：

```bash
# 检查 Node.js 版本 (需要 18.0.0 或更高)
node --version

# 检查 pnpm 版本 (需要 8.0.0 或更高)
pnpm --version

# 如果没有安装 pnpm
npm install -g pnpm
```

### 浏览器要求

- **Chrome/Chromium** 88+ (支持 Manifest V3)
- **Edge** 88+ (基于 Chromium)

---

## ⚡ 快速启动

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd chrome-plugin-reading-extension
```

### 2. 安装依赖

```bash
# 使用 pnpm 安装依赖 (推荐)
pnpm install

# 或使用 npm
npm install
```

### 3. 开发构建

```bash
# 构建所有模块
pnpm run build

# 或者分模块构建 (用于调试特定模块)
pnpm run build:content     # 内容脚本
pnpm run build:background  # 后台脚本
pnpm run build:popup       # Popup 界面
```

### 4. 加载扩展到浏览器

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择项目的 `dist` 目录
6. 扩展加载成功！🎉

### 5. 测试扩展

1. 访问任意网页（如新闻文章）
2. 点击浏览器工具栏中的扩展图标
3. 开启 **"阅读模式"** 开关
4. 页面应该转换为优化的阅读视图

---

## 🛠️ 开发工作流

### 监听模式开发

```bash
# 启动文件监听，代码变更时自动重新构建
pnpm run watch
```

### Popup 界面开发

```bash
# 启动开发服务器，支持热重载
pnpm run dev

# 在浏览器中访问 http://localhost:3000 预览 Popup 界面
```

### 调试技巧

#### 1. 内容脚本调试

```bash
# 在网页上按 F12 打开开发者工具
# 在 Console 中查看内容脚本日志
console.log('[Reading Extension] 内容脚本已加载');
```

#### 2. 后台脚本调试

```bash
# 访问 chrome://extensions/
# 点击扩展卡片中的 "检查视图 service worker"
# 在打开的开发者工具中查看后台脚本日志
```

#### 3. Popup 调试

```bash
# 右键点击扩展图标
# 选择 "检查弹出内容"
# 在开发者工具中调试 Popup 界面
```

---

## 📁 项目结构速览

```
src/
├── content/           # 内容脚本 - 在网页中运行
├── background/        # 后台脚本 - 扩展服务
├── popup/            # Popup 界面 - 扩展弹窗
├── design-system/    # 设计系统 - UI 组件库
├── store/            # 状态管理 - Zustand
├── storage/          # 数据存储 - Chrome Storage API
└── types/            # TypeScript 类型定义
```

---

## 🔧 常见问题

### Q: 构建失败，提示 "Node.js version not supported"

**A:** 请升级 Node.js 到 18.0.0 或更高版本：

```bash
# 使用 nvm 管理 Node.js 版本
nvm install 18
nvm use 18
```

### Q: 扩展无法加载，显示 "Manifest file is missing or unreadable"

**A:** 确保已经运行构建命令：

```bash
pnpm run build
# 检查 dist 目录是否存在 manifest.json
ls dist/manifest.json
```

### Q: 内容脚本不工作，页面没有变化

**A:** 检查以下几点：

1. 确保扩展已正确加载
2. 检查浏览器控制台是否有错误信息
3. 尝试刷新页面后再次使用扩展
4. 检查网站是否在扩展的权限范围内

### Q: Popup 界面样式异常

**A:** 清除浏览器缓存并重新构建：

```bash
# 重新构建 Popup
pnpm run build:popup

# 在 chrome://extensions/ 中点击扩展的刷新按钮
```

### Q: 开发服务器无法启动

**A:** 检查端口是否被占用：

```bash
# 检查 3000 端口
lsof -i :3000

# 或指定其他端口
pnpm run dev --port 3001
```

---

## 📚 下一步

恭喜！你已经成功设置了开发环境。接下来可以：

1. **阅读完整文档**: 查看 [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) 了解详细开发指导
2. **了解设计系统**: 查看 [`design-system-spec.md`](./design-system-spec.md) 了解 UI 设计规范
3. **查看代码示例**: 浏览 `src/` 目录中的代码实现
4. **参与开发**: 开始添加新功能或修复问题

---

## 🆘 获取帮助

如果遇到问题，可以：

1. 查看 [故障排除指南](./TROUBLESHOOTING.md) (即将添加)
2. 查看项目的 Issues 页面
3. 阅读 Chrome 扩展官方文档

---

**祝你开发愉快！** 🎉
