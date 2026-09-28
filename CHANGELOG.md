# Changelog

All notable changes to this project will be documented in this file.

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

*Previous changelog available in CHANGELOG_v1.9.0.md*
