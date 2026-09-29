# Changelog

All notable changes to this project will be documented in this file.

## [3.6.0] - 2026-09-29

一轮五方向并行深审（安全 / 消息与生命周期 / PDF 导出 / 阅读器界面 / 测试有效性），
27 条发现经第二位工程师独立复核后**确认 15 条**——复核层淘汰了 44% 的主张，
其中三条被评为「高危」的结论被证伪，未做修改。

### Security

- **修复一个真实 XSS**：`serializeNode` 回吐文本节点的 `nodeValue`（已解码），
  把消毒器转义过的 `&lt;` 又还原成真 `<`，再经 `dangerouslySetInnerHTML` 注入。
  一段讲解 HTML 的正文、或带 code 块的段落，会在阅读器里变成活 DOM。
  改为在 sink 处转义，并丢弃注释节点。**真实 Chrome 中已复验。**
- 懒加载的 `data-*` 属性（`data-src` 等）既不在协议白名单也不在剥离名单里，
  绕过了全流程唯一的 URL 协议检查；打印页又把它直接提升为活 `src`。
  抽出 `sanitizeUrlValue()` 作为唯一策略出口，两条路径不再各写一套而漂移。

### Fixed

- 并发 `ENABLE_READING_MODE` 会卸载首个 host 却复用其 react root，
  阅读器永久白屏且两次调用都报成功（守卫在两个 await 之后才置位）
- 双击工具栏会在同一标签页注入两份 content.js，留下两个常驻消息监听器
- 设置写入失败时内存 / DOM / 存储三层不一致，下次重绘回滚到从未保存的值
- 同一上下文内的阅读历史读改写会互相覆盖；读失败被折叠成空数组后写回，
  可清空全部历史并报成功
- 用齿轮按钮关闭面板时不归还焦点，Tab 会走到宿主页面

### Accessibility

- 主题选择器声明 `role="radiogroup"` 却是三个 Tab 停靠点且方向键无效，
  改为 roving tabindex + 方向键 / Home / End，选择跟随焦点
- 点击面板内不可聚焦内容会把焦点丢给 `<body>`，焦点陷阱两个分支都不匹配，
  Tab 直接走出 `aria-modal` 弹窗
- 错误边界的重试回调允许返回 Promise，此前被丢弃，失败会变成未捕获的 rejection

### Changed

- 测试 601 → **701**，语句覆盖率 **93.15% → 97.06%**，棘轮抬到 97/92/96/97
- 每个修复都配了变异测试：回退修复后对应用例会红，确保测试不是摆设
- 真实 Chrome（Playwright Chrome for Testing）端到端复验 **14/14 通过**

### Documentation

- 更正 3.4.0 关于「`srcset` 回填真实地址」的错误描述——`srcset` 在消毒阶段
  即被剥离，该能力从未生效。改为在「已知限制」中如实说明

### 仍未解决

- **跨标签页阅读历史仍会丢记录。** 每个标签页是独立模块副本，跨标签并发
  无法用队列串行化。真修需要改存储布局（一条记录一个 key + 单独维护索引），
  属于 schema 迁移而非缺陷修复，待定。

## [3.5.0] - 2026-09-29

### Added

- 🕘 **阅读历史面板**
  - 工具栏新增时钟图标，浮层列出最近读过的文章：标题、域名、相对时间、预计阅读时长
  - 点标题在新标签页重开；地址不是 http(s) 的记录降级为纯文本，不会变成可点击链接
  - 每条可单独删除；「清空全部」需二次确认并回显条数；没有记录时显示空状态
  - 面板打开时才读存储，不在每次进入阅读模式时多付一次 IO
  - 此前 `getReadingHistory` / `deleteFromHistory` / `clearHistory` 全部零调用方：
    扩展在静默收集最多 200 条浏览记录，用户既看不见也删不掉
- ♻️ 设置面板新增「恢复默认设置」，一键回到出厂值（`resetSettings` 此前同样是死代码）

### Changed

- 测试 523 → 601（22 个文件），语句覆盖率 **24.79% → 93.15%**；
  `vitest.config.ts` 的阈值改为 ratchet 并由 CI 强制执行
- 依赖 43 → 27。运行时 18 → 3，只剩 `@mozilla/readability` / `react` / `react-dom`；
  移除 8 个 `@radix-ui/*`、`zustand`、`clsx`、`tailwind-merge`、
  `class-variance-authority`、`turndown`、`lucide-react` 与直接依赖的 `esbuild`
- dev 依赖 25 → 24：移除 `fast-check`、`eslint-plugin-react-hooks`、
  `eslint-plugin-react-refresh`、`@types/turndown`、`tailwindcss`，
  新增 `prettier` / `husky` / `lint-staged` / `@testing-library/dom`
- 语法高亮补上按语言区分的 `#` 行注释（python / yaml / bash / ruby / perl），
  YAML 里的 `https://` 不再被当成注释
- CI 增加 `type-check` 步骤，以及 package.json / public/manifest.json / dist
  三方版本一致性校验
- 恢复 pre-commit（husky + lint-staged + prettier），prettier 覆盖 markdown
- manifest 补 `minimum_chrome_version: 102`（`chrome.storage.session` 的起始版本）
- 补 `LICENSE`（MIT）、重写 `AGENTS.md`、修正 README 与 PDF 设计文档的漂移

### Removed

- **Tailwind**：配置存在但完全失效（全仓 0 处 `@tailwind` / `@apply`），
  移除后 `dist/` 产物字节不变；`postcss.config.js` 只剩 autoprefixer
- `package-lock.json`：与 pnpm 锁文件并存且停留在 `ai-reading-extension@2.9.0`，
  项目是 pnpm-only
- **manifest 的 `web_accessible_resources`**：整段删除。原声明把 `print.html` 对
  `<all_urls>` 开放，且指向从未被构建出来的 `content.css`；打印页由扩展自己
  `chrome.tabs.create` 打开，不需要对网页暴露
- 死代码：空的 `src/shared/index.ts` barrel、`build.sh`、`public/vite.svg`、
  `.github/instructions/` 样板

### Fixed

- 💥 **语法高亮产出的是非法 HTML**：`highlightCode` 对同一字符串串行执行 6 次
  `replace`，前面几轮刚写回 `<span class="token-comment">`，后面几轮就把这些
  自生成的标签再高亮一遍，产出 `<span <span class=…>` 这种无法解析的标记——
  阅读页与打印页的**每一个**代码块都是坏的。改为单遍扫描，每个字符最多被一条规则消费
- **阅读页没有消毒，打印页有**：Readability 实测会原样保留 `onerror`。抽出共享消毒器
  `src/shared/sanitize.ts`，两端走同一条路。当前不构成权限提升（内容来自用户正在看的
  页面），但两端行为不一致本身就是隐患
- **内容脚本可能永久失聪**：`initialize()` 先 await 设置再注册监听器，任一环节抛错
  就再也收不到消息，此后点图标、导出 PDF 全部无响应且无任何提示。改为先注册监听器
- **阅读时长把词数又除了一次 6**：入参本就是词数，2000 词的文章算出 2 分钟而不是 10 分钟
- **会话存储里的打印载荷只删不漏**：只在读成功时删除，关掉标签页就残留到会话结束。
  补上启动时与导出前的清扫（含并发导出的竞态保护）与体积上限
- **5 秒上限时仍在加载的图片不计入任何一桶**：图片服务器无响应时打印出一片空白框，
  工具条却不吭声。现在 `failed` / `pending` 分开统计并如实播报
- **历史记录写入的是刷新前的旧设置**：`addToHistory` 用的 `state.settings` 早于刷新
- `generateId` 的正负号碰撞：`Math.abs` 把 hash 5 与 -5 映射到同一个 id，
  两篇不同文章会合并成一条。改用 `>>> 0`
- `validateSettings` 放过 `NaN`：`typeof NaN === 'number'`，会渲染出 `font-size: NaNpx`
- `ReaderView` 元信息分隔符是恒真表达式 `(content.byline || true)`
- `processContentWithCodeBlocks` 把 `<pre><code>` 匹配两次，再靠 `indexOf` 字符串
  回查占位符——文章里出现同样字面量就会切错位置。改为单次遍历
- `getErrorMessage('toString')` 返回的是 `Object.prototype` 上的函数，会被当文案渲染
- CodeBlock 复制失败时 `execCommand` 抛错，跳过 `removeChild` 留下 textarea
- 设置面板打开后工具栏仍在 3 秒后自动隐藏：`showToolbar` 依赖导致 effect 重建，
  又挂上无条件的隐藏定时器

### Notes

- 阅读历史只写入 `chrome.storage.local`，不与任何账号或服务同步；
  可在历史面板逐条删除或一次性清空

### Verification

tsc 零错误 · eslint（`--max-warnings 0`）零警告 · vitest 601/601 通过（22 文件）·
语句覆盖率 93.15%（高于 ratchet 阈值）· 三套 vite 配置构建产物正常

## [3.4.0] - 2026-09-29

### Added

- 📄 **一键导出 PDF**
  - 阅读模式工具栏新增下载按钮，在新标签页以 A4 排版输出当前文章
  - 纸张主题：浅色 / 护眼（刻意不提供深色，打印费墨且对比度差）
  - 字号可在 9–13pt 间调节；图片大小三档可选（大/中/小，默认大），
    缩小图片同时减小"整图推下页"造成的留白；两项选择均被持久化
  - 借用 Chrome 排版引擎输出：文字矢量可选中，5 千字文章约数百 KB，零新增运行时依赖
  - A4 分页规范：标题不落页底、段落避免孤行、代码块按行数分档决定是否允许跨页、
    图片不跨页切断且不超一页高、宽表格压在 174mm 内
  - 修复懒加载图片：识别透明占位图，从 `data-src` 等懒加载属性回填真实地址
    （`srcset` 在消毒阶段即被剥离，不在回填来源内；仅有 `srcset` 的图片仍会打印为空白）
  - 打印前等待图片解码（上限 5 秒），失败时如实提示数量而非静默输出空白
  - 打印页不执行文章内的任何脚本，并拒绝非 http(s) 的来源链接

### Changed

- 抽出 `src/shared/codeHighlight.ts`，供阅读视图与打印页共用同一套 tokenizer
  （移除 CodeBlock.tsx 中 133 行重复实现）
- 新增 `vite.print.config.ts` 构建打印页；`build` 脚本串联三套配置
- manifest 的 web_accessible_resources 增加 print.html

### Fixed

- 🖨 **调整字号/图片大小后打印与预览差异变大**：分页决策（哪些代码块/表格
  允许跨页）只在打开时按当时字号实测一次，之后调字号标记即过期——变大的
  块仍被禁止跨页，打印时被整体推页留下大片空白。现在设置变更后 120ms 重新
  实测，并在点击打印前兜底重测一次
- 🖨 **预览正文列比打印窄约 0.5mm**：预览纸张容器的 1px 边框参与布局
  （border-box），挤占列宽导致换行位置可能与打印差一个字；改用 outline
  （不占布局），预览与打印换行逐行一致
- 🖨 **预览与打印列宽不一致**：预览纸张容器把 174mm 当作含边距总宽，
  border-box 下正文列实际只剩 138mm；改为 210mm 总宽（20/18mm 内边距），
  正文列与打印输出完全一致
- 🖨 **打印出现大片空白**：三处缓解——图片高度上限从近整页（247mm）收紧到
  150mm；超过半页高的代码块与表格按渲染后实测高度改为允许跨页
  （markBreaks 模块，图片加载完成后测量）；预览纸张宽度修正后，
  实测结果对打印排版有效

### Notes

- 预览页为连续滚动，**不提供分页预览**。浏览器无分页查询 API，自行模拟的断页
  与实际输出必然有偏差且无法修正；精确分页请使用 Chrome 打印对话框的预览。
  详见 `docs/superpowers/specs/2026-09-29-pdf-export-design.md` §6

## [3.3.0] - 2026-09-28

扩展收敛为单一职责：抽取正文并在 Shadow DOM 中以阅读格式展示。代码量从 5.7k 行降至 2.4k 行。

### ⚠️ BREAKING CHANGES

- **移除 popup 界面**：扩展不再弹出面板。点击工具栏图标将**直接切换阅读模式**（此前是弹出面板，再由面板触发）。依赖旧交互的用户需注意
- **移除全部导出功能**：Markdown / HTML / PDF 导出暂时下线（PDF 能力正在以 A4 排版为目标重建）
- **移除 32 套主题**：主题收敛为浅色 / 深色 / 护眼三套

### Removed

以下模块均未接入主流程，或已被现有实现取代：

- popup 整套 UI（`src/popup/`）
- TTS 语音朗读、收藏夹、夜间模式自动切换、自定义主题系统
- 导出（Markdown/HTML/PDF）、高对比度、阅读进度、文本划选
- 三个 Web Worker（内容抽取 / 数据处理 / Markdown）
- 无引用的 `utils/`（accessibility、logger）与 `types/common.ts`
- `scripts/diagnose-connection.js`：检查的 dist 路径已全部失效，无任何脚本引用

### Changed

- Settings 精简为四项：theme、fontSize、lineHeight、pageWidth
- manifest 移除 `default_popup` 配置，触发方式改为 `chrome.action.onClicked`
- 构建保持两套配置：`vite.config.ts`（background）+ `vite.content.config.ts`（content script）
- README 按实际代码重写，移除所有已删除功能的描述

### Fixed

- 合并 release/v3.2.0：`pnpm-workspace.yaml` 采用 `onlyBuiltDependencies` 白名单写法

### Verification

tsc 零错误 · eslint 零警告 · vitest 9/9 通过 · 构建产物正常输出

## [3.2.0] - 2026-06-19

### Changed

- 🔧 **Architecture cleanup**
  - Removed unused Web Worker scaffolding (`src/content/workers/`, `vite.worker.config.ts`) — extraction now runs on the main thread
  - Removed legacy build configs (`vite.config.dev.ts`, `vite.new.config.ts`, `vite.new.content.config.ts`)
  - ~~Removed duplicate theme source: `src/shared/themes.ts` is now the single source of truth for theme palettes~~ — **已在 3.3.0 中移除**，`src/shared/themes.ts` 连同 32 套主题一并删除，现由 `src/shared/readerThemes.ts` 提供三套基础主题

### Fixed

- 🧪 **Test configuration drift**
  - `vitest.config.ts` alias and coverage paths pointed at non-existent `src-new/`; now correctly point at `src/`
  - Added `@shared`, `@content`, `@background` aliases matching the source tree
- 📦 **pnpm 11 compatibility**
  - `pnpm-workspace.yaml` `allowBuilds.esbuild` was a placeholder string (`"set this to true or false"`); replaced with `true`
  - Added `onlyBuiltDependencies: [esbuild]` whitelist (pnpm 9.4+ recommended pattern)
  - `pnpm install` / `pnpm run build` / `pnpm run test` now pass cleanly through pnpm's `runDepsStatusCheck`

### Added

- 🛠️ **Conductor integration**
  - Added `.conductor/settings.toml` for shared workspace config (setup / run / archive / prompts)
  - Enables parallel workspace development with `scripts.run_mode = "concurrent"`
- 📝 **Documentation**
  - ~~Rewrote README to align with v3.2.0 reality~~ — 该描述已不成立，README 描述的功能（收藏、TTS、导出、32 主题等）已在 3.3.0 中移除

## [3.1.5] - 2026-05-XX

### Changed

- Internal manifest and dependency updates

## [3.1.1] - 2026-02-24

### Fixed

- Minor bug fixes and improvements

## [3.1.0] - 2026-02-24

### Added

- 🖼️ **Image Toggle Feature**
  - Show/Hide images in reading mode
  - Settings panel toggle for quick switching
  - Hide images completely to save bandwidth
- 💻 **Code Font Size Setting**
  - Separate font size control for code blocks
  - Independent from main content font size
  - Range: 10px - 24px

### Improved

- UI/UX micro-interactions and animations
- Smoother transition effects with cubic-bezier easing
- Enhanced button hover states with lift effects

## [3.0.1] - 2026-02-23

### Fixed

- Minor bug fixes and improvements

## [3.0.0] - 2026-02-22

### Added

- Complete rebuild of reading experience
- New clean UI design
- Three themes: Light, Dark, Sepia

## [2.9.0] - 2026-02-22

### Added

- ✨ **Text Selection Feature**
  - Show toolbar when text is selected
  - 📋 Copy - copy selected content
  - 💬 Quote - copy with quotation marks
  - Auto-hide when selection is cleared

## [2.8.1] - 2026-02-22

### Changed

- Reinstall dependencies to fix potential issues

## [2.8.0] - 2026-02-21

### Added

- Onboarding guide
- Update changelog

---

_3.0.0 之前（含 v1.9.0）的记录不在本文件中，可从 git 历史取回：
`git show 14250e8:CHANGELOG_v1.9.0.md`。该文件在 v3.1.3 时被删除。_
