# AGENTS.md — Folio (Chrome MV3 reader extension)

Guidelines for agentic coding agents working in this codebase.

**Folio** is a Manifest V3 Chrome extension that turns any web page into a clean,
distraction-free reader, and exports the article as a paginated A4 PDF. It has
**no server, no analytics, and three runtime dependencies**. Everything it
stores lives in the user's browser.

## What the extension actually is

There is **no popup**. The entire UI is a React overlay injected into the host
page, plus a standalone print page. Understanding the three surfaces is the
fastest way to orient yourself.

| Surface         | Built by                 | Lives at                               | Runs as                                |
| --------------- | ------------------------ | -------------------------------------- | -------------------------------------- |
| Service worker  | `vite.config.ts`         | `dist/background.js`                   | MV3 ES-module service worker           |
| Reader overlay  | `vite.content.config.ts` | `dist/content.js` + `dist/content.css` | Content script, IIFE                   |
| PDF export page | `vite.print.config.ts`   | `dist/print.html`                      | Ordinary extension page in its own tab |

### Runtime flow

1. **Activation.** `public/manifest.json` registers `content.js` on `<all_urls>`
   at `document_idle`. The service worker handles the toolbar click, injects the
   script if the tab missed it (`ENSURE_CONTENT_SCRIPT`), then sends
   `ENABLE_READING_MODE`. Reading mode is **manual by design** — Readability is a
   lossy transform that drops interactive elements, so auto-enabling would break
   shopping, dashboards, and docs sites.
2. **Extraction.** The content script runs `@mozilla/readability` and sanitizes
   the result (`src/shared/sanitize.ts`).
3. **Overlay.** It creates `<div id="ai-reader-host">`, calls
   `attachShadow({ mode: 'open' })`, and mounts a React root inside. CSS is
   imported as a **string** (`import readerCSS from './styles.css?inline'`) and
   injected into the shadow root, so neither host-page CSS nor extension CSS can
   cross the boundary in either direction.
4. **PDF export.** On `EXPORT_PDF` the service worker stages the article HTML in
   `chrome.storage.session` under `print_payload_<token>`, then opens
   `chrome.runtime.getURL('print.html') + '#' + token`. The print page reads its
   payload on boot, **deletes the key**, renders at A4 (174mm content width),
   and hands off to `window.print()`.
   - `chrome.storage.session` is capped at 10 MB, so the worker sweeps stranded
     payloads _before_ staging and caps articles at `MAX_PRINT_PAYLOAD_CHARS`
     (2,000,000). If you touch the export path, keep that ordering — sweeping
     afterwards races the hand-off.
   - The print page runs **no** article scripts and accepts source links only
     when they are `http(s)`.
   - There is deliberately **no pagination preview**. Browsers expose no API to
     query where a page break falls, so any preview would be an estimate that
     looks authoritative and is often wrong. Chrome's print dialog shows the
     real thing.

### Storage

`chrome.storage.local` holds `reader_settings`, `reading_history` (capped at 200
entries) and `print_settings`. `chrome.storage.session` holds only the one-shot
print payloads. Keys live in `src/shared/constants.ts` (`STORAGE_KEYS`).

## Commands

Every script below exists in `package.json`. There is no Playwright and no
separate unit/integration/e2e split.

```bash
# Build (this is the real dev loop — it is watch mode, not a dev server)
pnpm run dev           # alias for pnpm run watch
pnpm run watch         # rebuild background + content on change
pnpm run build         # production build of all three surfaces + public/ -> dist/
pnpm run build:debug   # same, but --mode development: sourcemaps, console kept
pnpm run build:dev     # production build with NODE_ENV=development

# Code quality
pnpm run type-check    # tsc --noEmit. Covers src/ ONLY — tests/ are not type-checked
pnpm run lint          # eslint with --max-warnings 0
pnpm run lint:fix      # eslint --fix

# Tests
pnpm run test          # vitest --run (all 20 files / 523 tests)
pnpm run test:watch    # watch mode
pnpm run test:coverage # v8 coverage; enforces thresholds (see vitest.config.ts)

# The same four gates CI runs on every push and pull request
pnpm run verify        # type-check && lint && test && build
```

Run `pnpm run verify` before you call anything done.

### Running a single test

```bash
# One file (the tests/ tree is flat — there is no tests/unit/)
npx vitest run tests/print/markBreaks.test.ts

# One test by name
npx vitest run -t "should mark oversized blocks"

# Watch a single file
npx vitest tests/content/ReaderView.test.tsx
```

## Directory layout

```
src/
├── background/index.ts   # Service worker: message routing, content-script
│                         # injection, print-payload staging and sweeping
├── content/              # The reader overlay
│   ├── index.ts          #   entry: message listener, Shadow DOM mount
│   ├── extractor.ts      #   Readability wrapper + extraction cache
│   ├── ReaderView.tsx    #   main reader component
│   ├── SettingsPanel.tsx #   settings UI
│   ├── CodeBlock.tsx     #   code block + copy button
│   ├── errorHandling.ts  #   ErrorBoundary + error reporting
│   └── styles.css        #   inlined into the shadow root via ?inline
├── print/                # PDF export page (v3.4.0)
│   ├── main.ts           #   entry: payload read, toolbar, window.print()
│   ├── buildDocument.ts  #   sanitized document + filename construction
│   ├── prepareImages.ts  #   lazy-image backfill, decode wait, height clamping
│   ├── markBreaks.ts     #   page-break policy for code blocks / tall blocks
│   ├── print.css         #   @media print rules
│   └── preview.css       #   on-screen preview chrome (toolbar, sheet)
├── shared/               # Imported by every surface
│   ├── types.ts          #   Type-only; excluded from coverage on purpose
│   ├── constants.ts      #   STORAGE_KEYS, MESSAGE_TYPES, A4 geometry, limits
│   ├── storage.ts        #   settings load/save/validate
│   ├── printSettings.ts  #   print settings load/save
│   ├── history.ts        #   reading history (max 200)
│   ├── readerThemes.ts   #   light / dark / sepia palettes
│   ├── sanitize.ts       #   HTML allowlist sanitizer
│   └── codeHighlight.ts  #   small tokenizer, 15 languages
└── types/vite-env.d.ts   # Vite ambient types (?inline, ?url, …)

print.html                # Print-page HTML entry — at the ROOT on purpose, so
                          # Vite emits dist/print.html and the worker can getURL it

tests/                    # Flat, mirroring src/ — no unit/integration/e2e split
├── setup.ts             #   global test setup (also imported directly by some tests)
├── setup.test.ts
├── extractor.test.ts
├── background/messageRouting.test.ts
├── content/{CodeBlock,ReaderView,SettingsPanel,errorHandling,
│            exportHandoff,messageHandling}.test.tsx|.ts
├── print/{buildDocument,main,markBreaks,prepareImages,printSettings}.test.ts
└── shared/{codeHighlight,history,printSettings,readerThemes,sanitize,storage}.test.ts

public/                   # Copied to dist/ by the build; manifest lives here
docs/                     # Release notes and design/plan specs
```

## Build system

Three Vite configs, one per surface. All three set `base: './'`, externalize
`chrome`, target `es2020`, and minify with terser. In production terser runs with
`drop_console: true` and `drop_debugger: true`, which removes **every** console
call from the shipped bundle — including `console.error`.

| Config                   | Entry                     | Output format                    | Why it is separate                                                                                         |
| ------------------------ | ------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `vite.config.ts`         | `src/background/index.ts` | ES module                        | MV3 service worker with `"type": "module"`                                                                 |
| `vite.content.config.ts` | `src/content/index.ts`    | **IIFE**, `inlineDynamicImports` | Content scripts cannot use ES modules at runtime; all CSS is forced to `content.css` to match the manifest |
| `vite.print.config.ts`   | `print.html` (root)       | ES module                        | A normal extension page — neither worker nor content script                                                |

Only the first config sets `emptyOutDir: true`; the other two write into the
same `dist/` and must not wipe it. `pnpm run build` runs them in that order, then
copies `public/*` into `dist/`.

PostCSS runs **autoprefixer only** (`postcss.config.js`) — there is no Tailwind
and no CSS framework. Styling is plain CSS with BEM-style class names.

## TypeScript configuration

- **Target / lib**: `ES2020` (not ES2022), with `DOM` and `DOM.Iterable`
- **Module**: `ESNext`, `moduleResolution: bundler`, `isolatedModules`
- **JSX**: `react-jsx` (no need to import React for JSX)
- **Strict**, plus `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`
- **Path alias**: `@/* -> src/*` is declared in `tsconfig.json`, and `@`,
  `@shared`, `@content`, `@background`, `@print` exist in the Vite/Vitest
  configs. **No source file uses any of them** — every import in `src/` and
  `tests/` is relative. Match the surrounding code and keep using relative
  paths; do not introduce the first alias import.

## Code style

### Naming

| Type               | Convention              | Example                                 |
| ------------------ | ----------------------- | --------------------------------------- |
| Components         | PascalCase              | `ReaderView.tsx`, `SettingsPanel.tsx`   |
| Functions          | camelCase               | `getSettings()`, `validateSettings()`   |
| Constants          | UPPER_SNAKE_CASE        | `DEFAULT_SETTINGS`, `STORAGE_KEYS`      |
| Types / Interfaces | PascalCase              | `Settings`, `ExtractedContent`          |
| Files              | camelCase or PascalCase | `storage.ts`, `ReaderView.tsx`          |
| CSS classes        | kebab-case, BEM         | `reader-container`, `reader-meta__item` |

### Import ordering

React first, then types, then components, then utilities — relatives only:

```typescript
import React, { useState, useCallback, useEffect, type JSX } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Settings, ExtractedContent } from '../shared/types';

import { CodeBlock } from './CodeBlock';

import { getSettings, saveSettings } from '../shared/storage';
```

### Component structure

```typescript
/**
 * Component description.
 * Reference requirements if applicable: Requirements: 3.1, 3.5
 */

import React, { useState, useCallback, type JSX } from 'react';
import type { SomeType } from '../shared/types';

interface ComponentProps {
  /** JSDoc for props */
  propName: string;
  /** Callback description */
  onAction: () => void;
}

/**
 * Main component description.
 */
export function ComponentName({ propName, onAction }: ComponentProps): JSX.Element {
  const [state, setState] = useState(false);

  const handleAction = useCallback(() => {
    onAction();
  }, [onAction]);

  return <div>{/* Component JSX */}</div>;
}

export default ComponentName;
```

### Error handling

Chrome APIs are always wrapped in `try-catch`. Return a usable default when the
caller should keep working; re-throw when the caller has to react.

```typescript
/** Recoverable: fall back to defaults so reading mode still works. */
export async function getSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return validateSettings(result);
  } catch (error) {
    console.error('[Reader] Failed to get settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/** Caller must handle it: surface the failure instead of swallowing it. */
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  } catch (error) {
    console.error('[Reader] Failed to save settings:', error);
    throw error;
  }
}
```

### Comments and documentation

- JSDoc on every exported function and interface. Explain **why**, not what.
- `Requirements: 1.2, 7.1` in the header JSDoc is a real convention here, but
  use it sparingly — only where a numbered spec actually exists to point at.
- Console output is prefixed `[Reader]` (e.g. `console.error('[Reader] …')`).
  But the production build sets terser `drop_console: true`, which strips **all**
  console output — `console.error` included. Use `pnpm run build:debug` when you
  need to see logs inside a built extension.
- Inline comments only for genuinely non-obvious logic — the print-payload
  sweeper and the A4 break thresholds are the models to imitate.

### Type definitions

```typescript
// Discriminated unions for results
export type ExtractionResult =
  { success: true; data: ExtractedContent } | { success: false; error: string };

// const arrays + indexed access for closed value sets
export const VALID_THEMES = ['light', 'dark', 'sepia'] as const;
export type Theme = (typeof VALID_THEMES)[number];

// Interfaces for object shapes
export interface Settings {
  theme: Theme;
  fontSize: number;
}
```

### ESLint rules

From `eslint.config.js`:

- `@typescript-eslint/no-explicit-any` — **warn**. But `pnpm run lint` runs with
  `--max-warnings 0`, so a warning **fails the build**. Treat it as an error.
- `@typescript-eslint/no-unused-vars` — error; unused bindings must start with
  `_` (`argsIgnorePattern` / `varsIgnorePattern`).
- `no-undef` — **off**, deliberately. It false-positives on browser/React
  globals used as type references; `tsc` already covers global presence.
- `dist/`, `node_modules/`, `coverage/`, and all `*.config.*` files are ignored.

## Testing

Vitest with `jsdom`, `globals: true`, and `tests/setup.ts` as the setup file.
Tests live in `tests/`, mirroring `src/`, and import across with relative paths
(`../../src/shared/...`). `@testing-library/react` is used for the components.

```typescript
import { describe, it, expect } from 'vitest';
import { functionName } from '../../src/module/path';

describe('Feature Name', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      expect(functionName(input)).toBe(expected);
    });

    it('should handle edge case', () => {
      expect(functionName(edgeCase)).toBe(expected);
    });
  });
});
```

`pnpm run test:coverage` enforces a ratchet in `vitest.config.ts`: statements
92, branches 83, functions 93, lines 94. `src/shared/types.ts` is excluded from
coverage (type-only, no runtime code). Raise the thresholds as coverage grows —
a ratchet nobody bumps is a ratchet that rots.

## Pre-commit hooks

Husky. `.husky/pre-commit` runs `pnpm exec lint-staged`, driven by the
`lint-staged` block in `package.json`:

| Glob                   | Command                                          |
| ---------------------- | ------------------------------------------------ |
| `*.{ts,tsx}`           | `eslint --fix --no-warn-ignored`                 |
| `*.{json,md,css,html}` | `prettier --write --ignore-path .prettierignore` |

`.prettierrc`: printWidth 100, tabWidth 2, semicolons, single quotes, ES5
trailing commas, LF. Prettier only covers JSON/Markdown/CSS/HTML — TypeScript
formatting is not enforced by the hook, so match the surrounding style by hand.

## Dependencies

**Runtime (3, and that is all):** `react`, `react-dom`, `@mozilla/readability`.
Everything else is a devDependency. Do not add a runtime dependency without a
very good reason — the project's stated design principle is minimal dependencies.

Toolchain: Vite 5 · TypeScript 5 · vitest 4 · ESLint 8 (flat config) · Prettier 3
· jsdom · Testing Library · terser · postcss + autoprefixer · husky + lint-staged.

## Not in this repo (do not go looking, do not re-add)

- No popup UI (`src/popup/` does not exist)
- No `src/utils/` — shared logic lives in `src/shared/`
- No web worker, no `vite.worker.config.ts`
- No Tailwind, no Radix UI, no component library
- No Playwright, no `tests/e2e/`
- No `tests/unit/` or `tests/integration/`
