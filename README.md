# 📚 Chrome 阅读助手

> 版本 v2.0.0 | 极简 · 优雅 · 专注

一款专注于"极简设计、本地优先"的 Chrome 阅读扩展，提供纯净、沉浸的网页阅读体验。

## ✨ v2.0.0 重大更新

🎉 **完全重构** - 从 100+ 文件简化为 ~15 个核心文件，代码更简洁、更易维护。

### 新架构亮点

| 方面 | 旧架构 | 新架构 |
|------|--------|--------|
| 文件数量 | 100+ | ~15 |
| 状态管理 | Zustand + 多层中间件 | 直接使用 Chrome Storage API |
| 错误处理 | 5个管理器类 | 1个简单的错误处理函数 |
| 代码高亮 | 动态加载 highlight.js | 轻量级内置高亮 |

## ✨ 功能特点

### 🎯 核心功能

- **一键开启**：极简 popup 界面，点击即可切换阅读模式
- **智能提取**：基于 Mozilla Readability，精准提取网页主要内容
- **沉浸阅读**：过滤广告、导航等干扰元素，专注内容本身
- **悬浮设置**：极简悬浮面板，快速调整阅读参数

### 🎨 阅读体验

- **多主题支持**：浅色、深色、护眼三种主题
- **字体定制**：自定义字体选择
- **灵活排版**：自定义字号、行高、页面宽度
- **代码高亮**：支持技术文章中的代码块语法高亮

### 🔒 隐私保护

- **本地优先**：所有数据本地存储，不依赖云服务
- **无跟踪**：不收集任何用户数据
- **离线可用**：无需网络连接即可使用

### ⚡ 性能优化

- **按需加载**：内容脚本采用最小化注入
- **轻量级**：Bundle 大小 < 500KB
- **快速启动**：阅读模式 2 秒内启动

## 🛠️ 技术栈

### 核心框架

- **React** 18.2.0 - 声明式 UI 框架
- **TypeScript** 5.2.2 - 类型安全开发
- **Vite** 5.1.6 - 快速构建工具

### UI & 样式

- **Tailwind CSS** 3.4.0 - 原子化 CSS 框架
- **CSS Modules** - 组件级样式隔离

### 存储

- **Chrome Storage API** - 本地数据持久化

### 内容处理

- **@mozilla/readability** 0.5.0 - 智能内容提取

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
pnpm run build:new:debug

# 生产构建
pnpm run build:new

# 代码检查
pnpm run lint

# 运行测试
pnpm run test
```

### 加载到 Chrome

1. 运行构建命令：

   ```bash
   pnpm run build:new
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
│   ├── background/
│   │   └── index.ts          # Service Worker 入口
│   ├── content/
│   │   ├── index.ts          # 内容脚本入口
│   │   ├── extractor.ts      # 内容提取器
│   │   ├── ReaderView.tsx    # 阅读视图组件
│   │   ├── SettingsPanel.tsx # 设置面板组件
│   │   ├── CodeBlock.tsx     # 代码块组件
│   │   ├── errorHandling.ts  # 错误处理
│   │   └── styles.css        # 阅读模式样式
│   ├── popup/
│   │   ├── index.tsx         # Popup 入口
│   │   ├── Popup.tsx         # Popup 组件
│   │   └── styles.css        # Popup 样式
│   └── shared/
│       ├── storage.ts        # 存储工具
│       ├── types.ts          # TypeScript 类型
│       ├── constants.ts      # 常量和默认值
│       └── index.ts          # 导出入口
├── public/
│   ├── manifest.json         # Chrome 扩展清单
│   └── icon*.png             # 扩展图标
├── tests/
│   ├── setup.ts              # 测试设置
│   └── extractor.test.ts     # 提取器测试
├── dist/                     # 构建输出（加载此目录）
└── package.json

总计: ~15 个核心文件（相比旧架构的 100+ 文件）
```

## 🏗️ 架构设计

### 简化的架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Popup     │  │  Background │  │   Content Script    │  │
│  │  (React)    │  │  (Service   │  │                     │  │
│  │             │  │   Worker)   │  │  ┌───────────────┐  │  │
│  │ ┌─────────┐ │  │             │  │  │ ReaderView    │  │  │
│  │ │ Toggle  │ │  │ ┌─────────┐ │  │  │ (React)       │  │  │
│  │ │ Switch  │ │  │ │ Message │ │  │  └───────────────┘  │  │
│  │ └─────────┘ │  │ │ Router  │ │  │  ┌───────────────┐  │  │
│  └─────────────┘  │ └─────────┘ │  │  │ Settings      │  │  │
│                   └─────────────┘  │  │ Panel         │  │  │
│                                    │  └───────────────┘  │  │
│                                    │  ┌───────────────┐  │  │
│                                    │  │ Extractor     │  │  │
│                                    │  └───────────────┘  │  │
│                                    └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Shared Modules                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Storage    │  │   Types     │  │   Constants         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 设计原则

1. **简单优先**：每个模块只做一件事，做好一件事
2. **最小依赖**：减少第三方库，只保留必要的（Readability、React）
3. **直接实现**：避免过度抽象，代码应该直接表达意图
4. **渐进增强**：核心功能必须可靠，高级功能可选

## 🧪 测试

```bash
# 运行所有测试
pnpm run test

# 监听模式
pnpm run test:watch

# 覆盖率报告
pnpm run test:coverage
```

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
