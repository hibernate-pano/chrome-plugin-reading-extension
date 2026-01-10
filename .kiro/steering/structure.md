# Project Structure (v2.0.0 - Refactored)

```
src/
├── background/
│   └── index.ts          # Service Worker entry
├── content/
│   ├── index.ts          # Content script entry
│   ├── extractor.ts      # Content extraction (Readability-based)
│   ├── ReaderView.tsx    # Main reader component
│   ├── SettingsPanel.tsx # Settings panel component
│   ├── CodeBlock.tsx     # Code block with highlighting
│   ├── errorHandling.ts  # Error handling utilities
│   └── styles.css        # Reader styles
├── popup/
│   ├── index.tsx         # Popup entry
│   ├── Popup.tsx         # Popup component
│   ├── popup.html        # Popup HTML
│   └── styles.css        # Popup styles
└── shared/
    ├── storage.ts        # Storage utilities
    ├── types.ts          # TypeScript types
    ├── constants.ts      # Constants and defaults
    └── index.ts          # Shared exports

public/
├── manifest.json         # Chrome extension manifest
└── icon*.png            # Extension icons

tests/
├── setup.ts             # Test setup
└── extractor.test.ts    # Extractor tests

dist/                    # Build output (load this in Chrome)

Total: ~15 files (vs 100+ in previous architecture)
```

## Key Entry Points
- `src/popup/index.tsx` - Popup UI entry
- `src/background/index.ts` - Service worker
- `src/content/index.ts` - Content script entry

## Architecture Patterns

### Simplified Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Popup     │  │  Background │  │   Content Script    │  │
│  │  (React)    │  │  (Service   │  │                     │  │
│  │             │  │   Worker)   │  │  ┌───────────────┐  │  │
│  │ ┌─────────┐ │  │             │  │  │ ReaderView    │  │  │
│  │ │ Toggle  │ │  │ ┌─────────┐ │  │  │ (React)       │  │  │
│  │ │ Switch  │ │  │ │ Message │ │  │  └───────────────┘  │  │
│  │ └─────────┘ │  │ │ Router  │ │  │  ┌───────────────┐  │  │
│  └─────────────┘  │ └─────────┘ │  │  │ Settings      │  │  │
│                   └─────────────┘  │  │ Panel         │  │  │
│                                    │  └───────────────┘  │  │
│                                    │  ┌───────────────┐  │  │
│                                    │  │ Extractor     │  │  │
│                                    │  └───────────────┘  │  │
│                                    └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Shared Modules                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Storage    │  │   Types     │  │   Constants         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### State Flow
```
User Action → Chrome Storage API → Persistent Storage
```

### Content Extraction Pipeline
```
Web Page → Readability Extraction → React Rendering
```

### Design Principles
1. **Simple First**: Each module does one thing well
2. **Minimal Dependencies**: Only essential libraries (Readability, React)
3. **Direct Implementation**: Avoid over-abstraction
4. **Progressive Enhancement**: Core features must be reliable

## Build Commands
```bash
# Development build
pnpm run build:new:debug

# Production build
pnpm run build:new

# Run tests
pnpm run test
```
