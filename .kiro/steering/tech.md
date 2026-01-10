# Technology Stack

## Core Technologies
- **TypeScript** 5.2.2 - Primary language with strict mode enabled
- **React** 18.2.0 - UI framework for popup and settings panels
- **Vite** 5.1.6 - Build tool with multiple configs for different entry points

## UI & Styling
- **Tailwind CSS** 3.4.0 - Utility-first CSS framework
- **Shadcn/UI** - Component library built on Radix UI primitives
- **Radix UI** - Accessible UI components (Dialog, Dropdown, Select, Slider, Switch, Tabs, Tooltip)
- **Lucide React** - Icon library
- **CSS Modules** - Scoped styling for reader components

## State Management & Storage
- **Zustand** 4.5.2 - Lightweight state management
- **Chrome Storage API** - Local data persistence via custom middleware

## Content Processing
- **@mozilla/readability** 0.5.0 - Content extraction engine
- **Turndown** 7.2.0 - HTML to Markdown conversion
- **Web Workers** - Background processing for content extraction and markdown conversion

## Package Manager
- **pnpm** - Required package manager (see pnpm-workspace.yaml)

## Build Commands

```bash
# Install dependencies
pnpm install

# Development build (with source maps and console logs)
pnpm run build:debug

# Production build
pnpm run build

# Watch mode for development
pnpm run watch

# Lint code
pnpm run lint

# Dev server (for popup development)
pnpm run dev
```

## Build Configuration
The project uses three Vite configs:
- `vite.config.ts` - Main build (popup + background script)
- `vite.content.config.ts` - Content script (IIFE format)
- `vite.worker.config.ts` - Web Workers (ES modules)

## Path Aliases
- `@/*` maps to `src/*` (configured in tsconfig.json)

## Chrome Extension
- Manifest V3
- Permissions: storage, activeTab, tabs, scripting
- Service worker background script
