# 📚 Chrome 阅读助手

> 版本 v1.8.12 | 极简 · 优雅 · 专注

一款专注于"极简设计、本地优先"的 Chrome 阅读扩展，提供纯净、沉浸的网页阅读体验。

## 📖 项目文档

- **[📋 文档中心](./docs/README.md)** - 查看所有文档
- **[🚀 发版记录](./docs/releases/)** - 版本更新历史
- **[🔧 技术文档](./docs/technical/)** - 技术实现细节
- **[🐛 调试指南](./docs/debug/)** - 问题排查工具

## ✨ 功能特点

### 🎯 核心功能

- **一键开启**：极简 popup 界面，点击即可切换阅读模式
- **智能提取**：基于 Mozilla Readability，精准提取网页主要内容
- **沉浸阅读**：过滤广告、导航等干扰元素，专注内容本身
- **悬浮设置**：极简悬浮面板，快速调整阅读参数

### 🎨 阅读体验

- **多主题支持**：浅色、深色、护眼三种主题
- **字体定制**：7 种字体选择（宋体、黑体、楷体等）
- **灵活排版**：自定义字号、行高、页面宽度
- **代码高亮**：支持技术文章中的代码块语法高亮

### 🔒 隐私保护

- **本地优先**：所有数据本地存储，不依赖云服务
- **无跟踪**：不收集任何用户数据
- **离线可用**：无需网络连接即可使用

### ⚡ 性能优化

- **按需加载**：内容脚本采用最小化注入
- **动态注入**：仅在需要时才加载完整功能
- **Web Workers**：内容提取和处理在后台线程执行

## 🛠️ 技术栈

### 核心框架

- **React** 18.2.0 - 声明式 UI 框架
- **TypeScript** 5.2.2 - 类型安全开发
- **Vite** 5.1.6 - 快速构建工具

### UI & 样式

- **Tailwind CSS** 3.4.0 - 原子化 CSS 框架
- **Shadcn/UI** - 高质量 React 组件库
- **Radix UI** - 无障碍 UI 基础组件
- **Lucide React** - 现代图标库

### 状态 & 存储

- **Zustand** 4.5.2 - 轻量级状态管理
- **Chrome Storage API** - 本地数据持久化

### 内容处理

- **@mozilla/readability** 0.5.0 - 智能内容提取
- **Turndown** 7.2.0 - HTML 转 Markdown
- **Web Workers** - 后台内容处理

### 开发工具

- **pnpm** - 快速、节省空间的包管理器
- **ESLint** - 代码质量检查

## 🚀 快速开始

### 前提条件

- **Node.js** 18+
- **pnpm** 8+ (推荐使用 pnpm)

### 安装依赖

```bash
# 克隆仓库
git clone <repository-url>
cd chrome-plugin-reading-extension

# 安装依赖
pnpm install
```

### 开发构建

```bash
# 开发模式（带调试信息）
pnpm run dev

# 生产构建
pnpm run build

# 监听模式（自动重新构建）
pnpm run watch

# 代码检查
pnpm run lint
```

### 加载到 Chrome

1. 运行构建命令：

   ```bash
   pnpm run build
   ```

2. 打开 Chrome 扩展管理页面：

   ```
   chrome://extensions/
   ```

3. 启用**开发者模式**（右上角开关）

4. 点击**加载已解压的扩展程序**

5. 选择项目的 `dist` 目录

6. 完成！扩展图标会出现在工具栏

### 使用方法

1. 打开任意网页
2. 点击工具栏中的扩展图标
3. 切换**阅读模式**开关
4. 享受沉浸式阅读体验！

在阅读模式下，点击左侧悬浮按钮 ⚙️ 可调整阅读设置。

## 📁 项目结构

```
chrome-plugin-reading-extension/
├── src/
│   ├── components/          # Shadcn/UI 组件库
│   │   └── ui/             # 统一 UI 组件（Button, Dialog, Switch 等）
│   ├── content/            # 内容脚本
│   │   ├── components/     # 阅读模式组件
│   │   │   ├── ReadingSettingsPanel.tsx  # 悬浮设置面板
│   │   │   └── ReaderView/               # 阅读视图组件
│   │   ├── extractors/     # 内容提取器
│   │   ├── features/       # 功能模块
│   │   ├── workers/        # Web Workers
│   │   └── unifiedContentScript.ts  # 内容脚本入口
│   ├── popup/              # 弹出界面
│   │   └── PopupShadcn.tsx # 极简 Popup 组件
│   ├── background/         # 后台脚本
│   ├── storage/            # 数据存储
│   ├── store/              # 状态管理 (Zustand)
│   ├── types/              # TypeScript 类型
│   └── utils/              # 工具函数
├── public/
│   ├── manifest.json       # Chrome 扩展清单
│   └── icon*.png           # 扩展图标
├── dist/                   # 构建输出（加载此目录）
├── vite.config.ts          # Vite 主配置
├── vite.content.config.ts  # 内容脚本配置
├── vite.worker.config.ts   # Worker 配置
└── package.json
```

## 🏗️ 架构设计

### 内容脚本架构

采用**动态注入**和**按需加载**策略，最小化性能影响：

```
页面加载 → 注入最小化脚本 → 用户点击开关 → 动态加载完整功能
```

**核心特点**：

- ✅ 初始注入体积小（< 500KB gzipped）
- ✅ 不影响页面加载速度
- ✅ 按需加载功能模块
- ✅ 智能资源管理

### UI 设计系统

采用 **Shadcn/UI** + **Tailwind CSS** 构建现代化界面：

**Popup 界面**（200×80px）

- 极简设计，仅包含阅读模式开关
- 纯白背景，简洁优雅

**悬浮设置面板**（220×500px）

- 浮动在页面左侧的设置面板
- 5 个核心设置项：主题、字号、行高、字体、宽度
- 蓝色系配色，现代简约

### 内容提取引擎

基于 **Mozilla Readability** 的智能提取系统：

```
网页内容 → Readability 分析 → 提取主要内容 → 后处理 → 渲染展示
```

**处理流程**：

1. **内容提取**：识别文章主体内容
2. **清理过滤**：移除广告、导航等干扰
3. **代码高亮**：处理代码块语法高亮
4. **图片优化**：懒加载和预加载策略
5. **样式应用**：根据用户设置渲染

### 数据存储架构

**状态管理**：Zustand + Chrome Storage API

```typescript
用户操作 → Zustand Store → Chrome Storage Middleware → 本地持久化
```

**存储内容**：

- 用户阅读设置（主题、字号等）
- 阅读进度记录
- 自定义配置

## 📚 更多文档

- [📖 项目分析文档](./docs/PROJECT_ANALYSIS.md) - 完整的项目架构分析

## 🎯 开发计划

- [ ] 键盘快捷键支持
- [ ] 多语言国际化
- [ ] 更多主题选项
- [ ] PDF 导出功能
- [ ] 阅读统计分析

## 🤝 贡献指南

欢迎贡献代码、提交问题或建议！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建/工具相关

## 📄 许可证

[MIT License](LICENSE)

## 💬 联系方式

如有问题或建议，欢迎提交 [Issue](../../issues)。

---

**Made with ❤️ for better reading experience**
