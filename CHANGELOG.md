# Changelog

All notable changes to this project will be documented in this file.

## [3.2.0] - 2026-06-19

### Changed

- 🔧 **Architecture cleanup**
  - Removed unused Web Worker scaffolding (`src/content/workers/`, `vite.worker.config.ts`) — extraction now runs on the main thread
  - Removed legacy build configs (`vite.config.dev.ts`, `vite.new.config.ts`, `vite.new.content.config.ts`) — only `vite.config.ts` (popup + background) and `vite.content.config.ts` (content script) remain
  - Removed duplicate theme source: deleted orphan `THEME_COLORS` and `CUSTOM_THEMES` from `src/shared/constants.ts`; `src/shared/themes.ts` is now the single source of truth for theme palettes

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
  - Rewrote README to align with v3.2.0 reality (33 source files, ~5.7k LOC; full feature catalog including reading progress, favorites, TTS, export, keyboard shortcuts, a11y)

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
