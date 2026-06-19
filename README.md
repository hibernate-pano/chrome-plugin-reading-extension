# 📚 Folio — Chrome 阅读助手

> 版本 v3.1.5 | 极简 · 优雅 · 专注 · 本地优先

一款 Chrome 阅读扩展（Manifest V3）。打开任意网页，一键进入纯净阅读模式——剥离广告、导航、悬浮元素，只留下正文与恰到好处的排版。

## ✨ 核心功能

- **一键阅读模式**：点击工具栏图标或按 `Ctrl/Cmd + Shift + R`，0.5 秒内进入沉浸阅读
- **智能内容提取**：基于 Mozilla Readability，自动识别文章主体，过滤导航/广告/侧栏
- **Shadow DOM 隔离**：通过 Shadow DOM 注入样式，页面 CSS 无法穿透，扩展样式也不会泄漏到原页面
- **32 个主题**：浅色/深色/护眼三大基础，加上纸张、自然、电子、艺术四大类共 32 个主题
- **排版可调**：字号 12–32px、行高 1.2–2.0、页宽 600–1200px、字体可换、代码块字号独立可调
- **图片开关**：阅读技术文章时可一键隐藏图片，专注文字
- **代码高亮**：内置轻量 tokenizer，支持 15 种语言的高亮与一键复制
- **键盘快捷键**：
  - `Ctrl/Cmd + Shift + R` — 切换阅读模式
  - `Ctrl/Cmd + Shift + S` — 打开/关闭设置面板
  - `Ctrl/Cmd + Shift + +` / `-` — 放大/缩小字号
  - `Ctrl/Cmd + Shift + T` — 切换主题
  - `Esc` — 退出阅读模式（设置面板打开时先关面板）

## 🌟 进阶能力

- **阅读进度自动保存**：滚动时自动保存位置，下次打开同一篇文章自动恢复（保留最近 100 条）
- **稍后读 / 收藏**：把当前文章加入收藏夹，带标签管理
- **阅读历史**：记录最近 200 篇阅读过的文章，可查阅读时长、访问次数
- **TTS 朗读**：使用 Web Speech API 朗读全文，支持中英文优先
- **文本划选**：选中文字弹出复制/引用按钮
- **导出**：当前文章可导出为 Markdown、HTML，或通过浏览器打印为 PDF
- **夜间模式自动切换**：可设置 20:00–07:00 自动启用深色主题
- **高对比度模式**：三档对比度（normal/high/ultra），为视力障碍用户优化
- **可访问性**：ARIA radiogroup、focus trap、skip-to-content 链接、键盘可达

## 🔒 隐私

- **本地优先**：所有数据（设置、历史、收藏）存于 Chrome Storage API，不上传任何服务器
- **无跟踪**：不收集、不上报任何用户行为
- **离线可用**：核心功能完全在本地运行，无需网络
- **最小权限**：`storage` + `activeTab` + `tabs` + `scripting`，无 `<all_urls>` 的 host permission 滥用（manifest 显式声明）

## 🛠️ 技术栈

- React 18 + TypeScript 5
- Vite 5（多配置：主入口构建 popup+background；content config 构建 IIFE 格式的 content script）
- Chrome Extension Manifest V3（Service Worker）
- Shadow DOM + `?inline` CSS 注入
- @mozilla/readability 0.5
- vitest + jsdom（测试）

## 🚀 快速开始

### 前提

- Node.js 18+
- pnpm 9+（推荐）

### 安装与开发

```bash
# 克隆与安装
git clone <repository-url>
cd chrome-plugin-reading-extension
pnpm install

# 开发模式（vite watch，构建持续刷新到 dist/）
pnpm run dev

# 生产构建
pnpm run build

# 类型检查 + 测试
pnpm run test
pnpm run test:coverage
```

### 加载到 Chrome

1. 运行 `pnpm run build`（或 `pnpm run dev` 持续构建）
2. 打开 `chrome://extensions/`
3. 启用右上角**开发者模式**
4. 点击**加载已解压的扩展程序**，选择项目根目录下的 `dist/` 文件夹
5. 工具栏出现 Folio 图标 → 完成

## 📁 项目结构

```
src/
├── background/        # Service Worker：消息路由 + content script 注入
├── content/           # 内容脚本（Shadow DOM 挂载点）
│   ├── features/      # 阅读进度、文本划选、高对比度、导出
│   ├── hooks/         # useKeyboardShortcuts
│   ├── ReaderView.tsx
│   ├── SettingsPanel.tsx
│   ├── CodeBlock.tsx
│   ├── extractor.ts
│   └── index.ts
├── popup/             # 工具栏弹窗 UI
├── shared/            # 跨组件共享：storage/types/themes/TTS/history/favorites/export
├── components/        # ErrorBoundary、UI 原子
└── utils/             # logger、accessibility

public/                # 静态资源（图标、manifest.json）
tests/                 # vitest 测试
dist/                  # 构建产物（加载此目录到 Chrome）
```

总计：33 个 TS/TSX 文件，约 5.7k 行。

## 🏗️ 架构

```
┌──────────────────────────────────────────────────────────────┐
│                     Chrome Extension (MV3)                    │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │   Popup      │  │   Background    │  │  Content Script  │  │
│  │   (React)    │  │ (Service Worker)│  │   (Shadow DOM)   │  │
│  │              │  │                 │  │                  │  │
│  │ • toggle     │  │ • 注入脚本       │  │ • 提取正文       │  │
│  │ • 显示状态    │  │ • 消息转发       │  │ • 渲染 ReaderView│  │
│  │              │  │ • 注入受限 URL   │  │ • 拦截 ESC/快捷键 │  │
│  └──────┬───────┘  └────────┬────────┘  └────────┬─────────┘  │
│         │ chrome.runtime    │ chrome.tabs         │            │
│         └───────────────────┴─────────────────────┘            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Shared Modules                       │   │
│  │  storage · types · themes · history · favorites       │   │
│  │  TTS · export · nightMode · readerThemes              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 设计原则

1. **简单优先**：每个模块只做一件事，做好一件事
2. **最小依赖**：依赖仅必要项（Readability、React、Radix UI）
3. **直接实现**：避免过度抽象，代码直接表达意图
4. **渐进增强**：核心功能可靠，高级功能可选
5. **本地优先**：任何涉及用户数据的设计先问"能在本地完成吗？"

## 🧪 测试

```bash
pnpm run test           # 单次跑全部测试
pnpm run test:watch     # 监听模式
pnpm run test:coverage  # 覆盖率报告（HTML 输出在 coverage/）
```

覆盖率阈值：statements/branches/functions/lines ≥ 70%。

## 🤝 贡献

1. Fork 仓库
2. 创建分支：`git checkout -b feature/amazing-feature`
3. 提交：`git commit -m 'feat: add amazing feature'`
4. 推送：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 提交规范（Conventional Commits）

- `feat:` 新功能
- `fix:` 修 bug
- `docs:` 文档
- `style:` 格式
- `refactor:` 重构
- `perf:` 性能
- `test:` 测试
- `chore:` 工具/构建

## 📄 许可证

MIT License

## 💬 联系

欢迎提交 Issue 与 PR。

---

**Made with ❤️ for better reading experience.**