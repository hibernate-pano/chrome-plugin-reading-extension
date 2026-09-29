# 📚 Folio — Chrome 阅读助手

> 版本 v3.4.0 | 极简 · 优雅 · 专注 · 本地优先

一款 Chrome 阅读扩展（Manifest V3）。点击工具栏图标进入纯净阅读模式——剥离广告、导航、悬浮元素，只留下正文与恰到好处的排版。

## ✨ 核心功能

- **手动触发的阅读模式**：点击工具栏图标切换进入/退出。不做全站自动触发——阅读模式是有损的（Readability 会丢弃交互元素与动态内容），自动启用会在电商、后台、文档站上碍事
- **智能内容提取**：基于 Mozilla Readability，自动识别文章主体，过滤导航/广告/侧栏
- **Shadow DOM 隔离**：样式注入 Shadow DOM，页面 CSS 无法穿透，扩展样式也不会泄漏到原页面
- **三套主题**：浅色 / 深色 / 护眼
- **排版可调**：字号 12–32px、行高 1.2–2.0、页宽 600–1200px
- **代码高亮**：内置轻量 tokenizer，支持 15 种语言的高亮与一键复制
- **一键导出 PDF**：以 A4 排版输出当前文章，文字可选中可搜索
- **阅读历史**：记录最近 200 篇阅读过的文章，保存在本地

### 导出 PDF

点击阅读模式工具栏的下载图标，在新标签页中：

- 以 **A4 纸张**排版（上下 20mm、左右 18mm 页边距，正文宽 174mm）
- 可切换**浅色 / 护眼**纸张主题，调节**字号 9–13pt** 和**图片大小**（大/中/小）
- 点「打印 / 存为 PDF」交给 Chrome 排版引擎输出——文字保持矢量，5 千字文章约数百 KB

打印设置会被记住。深色主题**不提供**导出选项：整页黑底打印费墨且对比度差。

预览页是**连续滚动**，不显示分页。浏览器没有分页查询 API，任何自行模拟的分页预览都会与实际输出有偏差；精确分页请看 Chrome 打印对话框的预览。

### 键盘操作

| 按键 | 作用 |
|------|------|
| `Esc` | 退出阅读模式（设置面板打开时先关面板） |

## 🔒 隐私

- **本地优先**：所有数据（设置、阅读历史）存于 Chrome Storage API，不上传任何服务器
- **无跟踪**：不收集、不上报任何用户行为
- **离线可用**：核心功能完全在本地运行
- **最小权限**：`storage` + `activeTab` + `tabs` + `scripting` + `<all_urls>` host permission（内容脚本需在任意页面运行）

## 🛠️ 技术栈

- React 18 + TypeScript 5（strict）
- Vite 5（两套配置：`vite.config.ts` 构建 background；`vite.content.config.ts` 构建 IIFE 格式的 content script）
- Chrome Extension Manifest V3（Service Worker）
- Shadow DOM + `?inline` CSS 注入
- @mozilla/readability 0.5
- vitest + jsdom

## 🚀 快速开始

### 前提

- Node.js 18+
- pnpm 9+

### 安装与开发

```bash
git clone <repository-url>
cd chrome-plugin-reading-extension
pnpm install

pnpm run dev          # watch 模式，构建持续刷新到 dist/
pnpm run build        # 生产构建
pnpm run test         # 运行测试
pnpm run lint         # ESLint
```

### 加载到 Chrome

1. 运行 `pnpm run build`
2. 打开 `chrome://extensions/`
3. 启用右上角**开发者模式**
4. 点击**加载已解压的扩展程序**，选择项目根目录下的 `dist/` 文件夹
5. 工具栏出现 Folio 图标 → 完成

## 📁 项目结构

```
src/
├── background/        # Service Worker：消息路由 + content script 注入 + 导出调度
├── content/           # 内容脚本（Shadow DOM 挂载点）
│   ├── ReaderView.tsx     # 阅读主视图 + 工具栏（含导出按钮）
│   ├── SettingsPanel.tsx  # 设置面板
│   ├── CodeBlock.tsx      # 代码块（高亮 + 复制）
│   ├── extractor.ts       # Readability 封装 + 缓存
│   ├── errorHandling.ts   # ErrorBoundary 与错误上报
│   ├── styles.css         # 阅读样式（注入 Shadow DOM）
│   └── index.ts           # 入口：Shadow DOM 容器与消息处理
├── print/             # PDF 导出页（扩展页面，A4 排版）
│   ├── main.ts            # 入口：读数据 → 渲染 → 接线
│   ├── buildDocument.ts   # 文章 → 打印文档（含清洗与代码高亮）
│   ├── prepareImages.ts   # 懒加载图片修复 + 就绪等待
│   ├── print.css          # @page A4 + pt 排版
│   └── preview.css        # 屏幕预览（工具条，打印时不生效）
├── shared/            # 跨模块共享
│   ├── storage.ts        # 设置持久化与校验
│   ├── printSettings.ts  # 打印设置持久化
│   ├── codeHighlight.ts  # 语法高亮 tokenizer
│   ├── history.ts        # 阅读历史
│   ├── readerThemes.ts   # 主题定义
│   ├── constants.ts      # 消息类型、存储键、A4 尺寸、默认值
│   └── types.ts          # 类型定义
└── types/

print.html                # 打印页 HTML 入口（vite 构建为 dist/print.html）
public/                   # 静态资源（图标、manifest.json）
tests/                    # vitest 测试
dist/                     # 构建产物（加载此目录到 Chrome）
```

总计：19 个 TS/TSX 文件，约 3.3k 行。

## 🏗️ 架构

```
┌──────────────────────────────────────────────────────────────┐
│                     Chrome Extension (MV3)                    │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │   Background    │  │ Content Script  │  │   Shadow DOM  │  │
│  │ (Service Worker)│  │                 │  │  (ReaderView) │  │
│  │                 │  │ • 提取正文       │  │               │  │
│  │ • 注入脚本       │  │ • 管理挂载点     │  │ • 渲染正文     │  │
│  │ • 消息转发       │  │ • 处理设置变更   │  │ • 工具栏       │  │
│  │ • 图标点击切换   │  │                 │  │ • 设置面板     │  │
│  └────────┬────────┘  └────────┬────────┘  └───────────────┘  │
│           │ chrome.tabs      │ chrome.runtime                │
│           └──────────────────┘                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Shared Modules                       │   │
│  │  storage · history · readerThemes · constants · types │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 设计原则

1. **手动触发，不打扰**：阅读模式是有损降级，应当由用户主动进入
2. **简单优先**：每个模块只做一件事，做好一件事
3. **最小依赖**：只保留真正被用到的依赖
4. **直接实现**：避免过度抽象，代码直接表达意图
5. **本地优先**：任何涉及用户数据的设计先问"能在本地完成吗？"

## 🧪 测试

```bash
pnpm run test           # 单次跑全部测试
pnpm run test:watch     # 监听模式
pnpm run test:coverage  # 覆盖率报告
```

## 🤝 贡献

1. Fork 仓库
2. 创建分支：`git checkout -b feature/xxx`
3. 提交：`git commit -m 'feat: xxx'`
4. 推送：`git push origin feature/xxx`
5. 提交 Pull Request

### 提交规范（Conventional Commits）

`feat:` 新功能 · `fix:` 修 bug · `docs:` 文档 · `refactor:` 重构 · `perf:` 性能 · `test:` 测试 · `chore:` 工具/构建

## 📄 许可证

MIT License

---

**Made with ❤️ for better reading experience.**
