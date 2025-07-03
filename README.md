# Chrome 阅读插件

一款专注于"简洁易用、本地优先"的Chrome阅读插件，旨在提供极简、优雅的网页阅读体验，同时保护用户隐私。

## 功能特点

- **内容提取**：智能提取网页主要内容，过滤广告、导航等干扰元素
- **排版优化**：提供多种阅读主题和排版选项，优化阅读体验
- **本地优先**：所有数据本地存储，不依赖云服务，保护用户隐私
- **性能优化**：采用按需加载机制，减少对页面性能的影响
- **代码高亮**：支持代码块语法高亮，提升技术文章阅读体验

## 技术栈

- TypeScript
- React
- Tailwind CSS
- Zustand
- Vite
- pnpm (首选包管理工具)
- @mozilla/readability

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
│   ├── content/          # 内容脚本
│   │   ├── features/     # 功能模块
│   │   ├── ui/           # UI组件
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
├── vite.*.config.ts      # Vite配置文件
├── package.json          # 项目依赖
└── README.md             # 项目文档
```

## 架构设计

### 内容脚本架构

内容脚本采用最小化注入、按需加载的架构：

1. **contentLoader.ts**：最小化入口脚本，只包含基本的消息监听和浮动按钮
2. **按需加载**：用户激活阅读模式时，才加载完整功能模块
3. **代码分割**：将功能模块拆分为独立的块，减少初始加载大小

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

## 贡献指南

1. Fork项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交Pull Request

## 许可证

[MIT](LICENSE) 