# Chrome 阅读插件

一款专注于"简洁易用、本地优先"的Chrome阅读插件，旨在提供极简、优雅的网页阅读体验，同时保护用户隐私。

## 功能特点

- **内容提取**：智能提取网页主要内容，过滤广告、导航等干扰元素
- **排版优化**：提供多种阅读主题和排版选项，优化阅读体验
- **本地优先**：所有数据本地存储，不依赖云服务，保护用户隐私
- **性能优化**：采用按需加载机制，减少对页面性能的影响
- **代码高亮**：支持代码块语法高亮，提升技术文章阅读体验

## 技术栈

- **React** 18.2.0 - UI 框架
- **TypeScript** 5.2.2 - 类型安全
- **Vite** 5.1.6 - 构建工具（多配置构建）
- **Tailwind CSS** 4.x - 现代CSS框架（使用@theme指令）
- **Shadcn/UI** - 高质量React组件库
- **Zustand** 4.5.2 - 轻量级状态管理
- **@mozilla/readability** 0.5.0 - 智能内容提取
- **Radix UI** - 无障碍UI基础组件
- **Lucide React** - 现代图标库
- **pnpm** - 首选包管理工具

## 开发环境设置

### 前提条件

- Node.js 18+
- pnpm (必须使用pnpm作为包管理工具)

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd chrome-plugin-reading-extension

# 安装依赖
pnpm install
```

### 开发

```bash
# 启动开发服务器
pnpm run dev

# 构建扩展
pnpm run build

# 构建特定部分
pnpm run build:content   # 仅构建内容脚本
pnpm run build:background # 仅构建后台脚本
pnpm run build:popup     # 仅构建弹出页面
```

### 安装到Chrome

1. 构建项目：`pnpm run build`
2. 打开Chrome，进入扩展管理页面 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的`dist`目录

## 项目结构

```
chrome-plugin-reading-extension/
├── src/                  # 源代码
│   ├── components/       # UI组件系统 (Shadcn/UI)
│   │   └── ui/          # 统一UI组件库
│   ├── content/          # 内容脚本
│   │   ├── features/     # 功能模块
│   │   ├── ui/           # 内容相关UI组件
│   │   ├── extractors/   # 内容提取器
│   │   ├── workers/      # Web Workers
│   │   └── contentLoader.ts  # 内容脚本入口（最小化注入）
│   ├── background/       # 后台脚本
│   ├── popup/            # 弹出页面
│   ├── store/            # 状态管理
│   ├── types/            # 类型定义
│   └── utils/            # 工具函数
├── public/               # 静态资源
│   └── manifest.json     # 扩展清单
├── dist/                 # 构建输出目录
├── vite.config.ts        # Vite配置文件
├── package.json          # 项目依赖
└── README.md             # 项目文档
```

## 架构设计

### 内容脚本架构

内容脚本采用最小化注入、按需加载的架构：

1. **contentLoader.ts**：最小化入口脚本，只包含基本的消息监听和浮动按钮
2. **按需加载**：用户激活阅读模式时，才加载完整功能模块
3. **代码分割**：将功能模块拆分为独立的块，减少初始加载大小

### 🎨 UI 设计架构

采用现代化的设计系统架构：

1. **Tailwind CSS 4**：使用@theme指令定义设计令牌
2. **Shadcn/UI组件**：基于Radix UI的高质量组件库
3. **设计令牌系统**：统一的颜色、间距、字体规范
4. **响应式设计**：移动优先的自适应布局
5. **无障碍支持**：完整的a11y实现

### 内容提取架构

采用基于Readability.js的提取引擎：

1. **BaseExtractor**：提取器基类，定义通用接口
2. **ReadabilityExtractor**：基于Mozilla Readability的提取器
3. **ContentExtractor**：自定义提取器，作为备选
4. **ExtractorFactory**：工厂类，根据网页类型选择最合适的提取器
5. **处理器系统**：对提取的内容进行后处理（代码块、图片等）

### 状态管理架构

使用Zustand进行状态管理：

1. **settingsStore**：管理用户设置
2. **readingProgressStore**：管理阅读进度
3. **chromeStorageMiddleware**：同步状态到Chrome存储

## 📚 文档

### 🚀 快速开始
- [快速开始指南](./docs/QUICK_START.md) - 5分钟快速上手开发

### 📖 开发文档
- [📚 文档中心](./docs/README.md) - 完整的文档导航和索引
- [🚀 快速开始](./docs/QUICK_START.md) - 5分钟快速上手指南
- [📖 开发指南](./docs/DEVELOPMENT_GUIDE.md) - 完整的开发指导文档
- [📋 API 参考](./docs/API_REFERENCE.md) - 完整的 API 参考文档
- [🎨 设计系统规范](./docs/design-system-spec.md) - Shadcn/UI 设计系统规范
- [🔄 迁移指南](./docs/MIGRATION_GUIDE.md) - 从 MD3 到 Shadcn/UI 的迁移指南
- [🛠️ 测试指南](./docs/TESTING.md) - 完整的测试策略
- [⚡ 性能优化](./docs/PERFORMANCE.md) - 性能优化最佳实践
- [🔧 故障排除](./docs/TROUBLESHOOTING.md) - 常见问题解决方案

### 🔧 运维文档
- [故障排除指南](./docs/TROUBLESHOOTING.md) - 常见问题诊断和解决
- [性能优化指南](./docs/PERFORMANCE.md) - 性能优化最佳实践
- [测试指南](./docs/TESTING.md) - 完整的测试策略和实践

### 📝 项目文档
- [Popup 重设计文档](./docs/popup-redesign-spec.md) - Popup 界面设计规范
- [文档更新日志](./docs/CHANGELOG_DOCS.md) - 文档版本变更记录

## 贡献指南

1. Fork项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交Pull Request

## 许可证

[MIT](LICENSE) 