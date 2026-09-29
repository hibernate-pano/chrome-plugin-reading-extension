# 📚 Folio — Chrome 阅读助手

> 开发版 v3.5.0（未发布，最新已发布版本 v3.4.0） | 极简 · 优雅 · 专注 · 本地优先

一款 Chrome 阅读扩展（Manifest V3）。点击工具栏图标进入纯净阅读模式——剥离广告、导航、悬浮元素，只留下正文与恰到好处的排版。

## ✨ 核心功能

- **手动触发的阅读模式**：点击工具栏图标切换进入/退出。不做全站自动触发——阅读模式是有损的（Readability 会丢弃交互元素与动态内容），自动启用会在电商、后台、文档站上碍事
- **智能内容提取**：基于 Mozilla Readability，自动识别文章主体，过滤导航/广告/侧栏
- **Shadow DOM 隔离**：样式注入 Shadow DOM，页面 CSS 无法穿透，扩展样式也不会泄漏到原页面
- **三套主题**：浅色 / 深色 / 护眼
- **排版可调**：字号 12–32px、行高 1.2–2.0、页宽 600–1200px
- **代码高亮**：内置轻量 tokenizer，支持 15 种语言的高亮与一键复制
- **一键导出 PDF**：以 A4 排版输出当前文章，文字可选中可搜索
- **阅读历史**：记录最近 200 篇读过的文章，点击工具栏时钟图标查看，可逐条删除或一次性清空

### 导出 PDF

点击阅读模式工具栏的下载图标，在新标签页中：

- 以 **A4 纸张**排版（上下 20mm、左右 18mm 页边距，正文宽 174mm）
- 可切换**浅色 / 护眼**纸张主题，调节**字号 9–13pt** 和**图片大小**（大/中/小）
- 点「打印 / 存为 PDF」交给 Chrome 排版引擎输出——文字保持矢量，5 千字文章约数百 KB

打印设置会被记住。深色主题**不提供**导出选项：整页黑底打印费墨且对比度差。

预览页是**连续滚动**，不显示分页。浏览器没有分页查询 API，任何自行模拟的分页预览都会与实际输出有偏差；精确分页请看 Chrome 打印对话框的预览。

### 阅读历史

每次进入阅读模式都会在本地记一条：标题、域名、摘要、预计阅读时长、所用主题与字号。同一篇文章重复阅读更新同一条记录并累加次数，上限 200 条。

点工具栏的**时钟图标**打开历史面板：

- 列表按最近阅读排序，显示「刚刚 / N 分钟前 / N 天前 / 具体日期」
- 点标题在新标签页重开该文章（只接受 http/https 地址，其余按纯文本显示，不会变成可点击链接）
- 每条右侧的垃圾桶按钮删除单条
- 底部「清空全部」需二次确认
- 面板底部常驻一句：记录只存在这台设备上，可随时清空

历史记录只写入 `chrome.storage.local`，扩展不发送任何网络请求。要抹掉它们只有两条路：在历史面板里逐条删除，或「清空全部」清空整个列表——设置面板的「恢复默认设置」只重置排版设置，不动历史记录。

### 键盘操作

| 按键                | 作用                                                |
| ------------------- | --------------------------------------------------- |
| `Esc`               | 关闭当前面板；面板未打开时退出阅读模式              |
| `Tab` / `Shift+Tab` | 在设置面板 / 历史面板内循环焦点，不会跑到背后的页面 |

## 🔒 隐私

- **本地优先**：所有数据（设置、阅读历史）存于 Chrome Storage API，不上传任何服务器
- **无跟踪**：不收集、不上报任何用户行为；`src/` 中不存在任何 `fetch` / `XMLHttpRequest` / `WebSocket` 调用
- **离线可用**：核心功能完全在本地运行
- **最小权限**：`storage` + `activeTab` + `tabs` + `scripting` + `<all_urls>` host permission（内容脚本需在任意页面运行）
- **阅读历史不出设备**：逐条记录只写入本机 `chrome.storage.local`，不与任何账号或服务同步；可在历史面板里逐条删除或一键清空
- **扩展页面的 CSP**：`public/manifest.json` 为扩展页面声明了 `content_security_policy.extension_pages = script-src 'self'; object-src 'self'; worker-src 'self'`——扩展自己的页面（导出 PDF 的打印页）不允许内联脚本、远程脚本与 `eval`
- **扩展资源不对网页开放**：manifest 未声明 `web_accessible_resources`，任何网站都无法读取扩展内的文件；打印页只能由扩展用 `chrome.tabs.create` 主动打开

## 🛠️ 技术栈

- React 18 + TypeScript 5（strict）
- Vite 5（**三套配置**：`vite.config.ts` 构建 background；`vite.content.config.ts` 构建 IIFE 格式的 content script；`vite.print.config.ts` 构建导出 PDF 的打印页 `print.html`）
- Chrome Extension Manifest V3（Service Worker，最低 Chrome 102）
- Shadow DOM + `?inline` CSS 注入
- @mozilla/readability 0.5
- vitest + jsdom
- 运行时依赖仅 3 个：`@mozilla/readability` / `react` / `react-dom`

## 🚀 快速开始

### 前提

- Node.js **22.12 或 24**（CI 固定 24；Node 18 已于 2025-04、Node 20 已于 2026-04 结束维护）
- pnpm **11+**（CI 固定 11；pnpm 11 内部依赖 Node ≥ 22.5 提供的 `node:sqlite`，在更低的 Node 上启动即崩）

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
│   ├── ReaderView.tsx     # 阅读主视图 + 工具栏（导出 / 历史 / 设置）
│   ├── HistoryPanel.tsx   # 阅读历史面板（列表 / 单条删除 / 清空）
│   ├── SettingsPanel.tsx  # 设置面板
│   ├── CodeBlock.tsx      # 代码块（高亮 + 复制）
│   ├── usePanelDismiss.ts # 浮层的 Esc 关闭 + 焦点陷阱 + 点击外部关闭
│   ├── extractor.ts       # Readability 封装 + 消毒 + 缓存
│   ├── errorHandling.ts   # ErrorBoundary 与错误上报
│   ├── styles.css         # 阅读样式（注入 Shadow DOM）
│   └── index.ts           # 入口：Shadow DOM 容器与消息处理
├── print/             # PDF 导出页（扩展页面，A4 排版）
│   ├── main.ts            # 入口：读数据 → 渲染 → 接线
│   ├── buildDocument.ts   # 文章 → 打印文档（含消毒与代码高亮）
│   ├── prepareImages.ts   # 懒加载图片修复 + 就绪等待
│   ├── markBreaks.ts      # 按渲染后实测高度决定代码块/表格能否跨页
│   ├── print.css          # @page A4 + pt 排版
│   └── preview.css        # 屏幕预览（工具条，打印时不生效）
├── shared/            # 跨模块共享
│   ├── storage.ts        # 设置持久化与校验
│   ├── printSettings.ts  # 打印设置持久化
│   ├── codeHighlight.ts  # 语法高亮 tokenizer
│   ├── sanitize.ts       # 文章 HTML 消毒（阅读页与打印页共用同一个）
│   ├── history.ts        # 阅读历史
│   ├── readerThemes.ts   # 主题定义
│   ├── constants.ts      # 消息类型、存储键、A4 尺寸、默认值
│   └── types.ts          # 类型定义
└── types/
    └── vite-env.d.ts     # Vite 环境类型（?inline / ?url）

print.html                # 打印页 HTML 入口（vite.print.config.ts 构建为 dist/print.html）
public/                   # 静态资源（图标、manifest.json）
tests/                    # vitest 测试
docs/                     # 设计文档与手工验收清单
dist/                     # 构建产物（加载此目录到 Chrome）
```

总计：22 个 TS/TSX 文件、4,685 行（`find src -name "*.ts*" | wc -l`），另有 2,110 行 CSS。

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
│  │                 │  │                 │  │ • 历史面板      │  │
│  └────────┬────────┘  └────────┬────────┘  └───────────────┘  │
│           │ chrome.tabs      │ chrome.runtime                │
│           └──────────────────┘                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Shared Modules                       │   │
│  │  storage · history · readerThemes · constants · types │   │
│  │  sanitize · codeHighlight · printSettings             │   │
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
pnpm run test:coverage  # 覆盖率报告（CI 跑的是这个，会强制阈值）
pnpm run verify         # type-check + lint + test + build 串行
```

当前规模：22 个测试文件、601 个用例全绿，语句覆盖率 93.15%。
`vitest.config.ts` 里的覆盖率阈值是 ratchet，由 CI 强制执行：新增未被覆盖的代码会让流水线变红。

## 🤝 贡献

1. Fork 仓库
2. 创建分支：`git checkout -b feature/xxx`
3. 提交：`git commit -m 'feat: xxx'`
4. 推送：`git push origin feature/xxx`
5. 提交 Pull Request

### 提交规范（Conventional Commits）

`feat:` 新功能 · `fix:` 修 bug · `docs:` 文档 · `refactor:` 重构 · `perf:` 性能 · `test:` 测试 · `chore:` 工具/构建

## 📄 许可证

MIT License，完整文本见 [`LICENSE`](./LICENSE)。

---

**Made with ❤️ for better reading experience.**
