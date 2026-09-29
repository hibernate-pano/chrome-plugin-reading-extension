# AGENTS.md - AI Reading Extension

Guidelines for agentic coding agents working in this Chrome extension codebase.

## Build/Lint/Test Commands

```bash
# Development
pnpm run dev                    # Dev server for popup development
pnpm run build:debug           # Build with source maps and console logs
pnpm run build                 # Production build (multiple vite configs)

# Code Quality
pnpm run lint                  # Run ESLint
pnpm run lint:fix              # Auto-fix ESLint issues
pnpm run type-check            # TypeScript check (tsc --noEmit)

# Testing - IMPORTANT: Use these patterns for single tests
pnpm run test                  # Run all tests (vitest --run)
pnpm run test:watch            # Watch mode
pnpm run test:coverage         # Coverage report
pnpm run test:unit             # Unit tests only
pnpm run test:integration      # Integration tests only
pnpm run test:e2e              # Playwright E2E tests
```

### Running a Single Test

```bash
# Run a specific test file
npx vitest run tests/unit/extractor.test.ts

# Run tests matching a pattern
npx vitest run -t "should count words"

# Watch mode for specific file
npx vitest tests/unit/extractor.test.ts
```

## Code Style Guidelines

### TypeScript Configuration

- **Target**: ES2022, strict mode enabled
- **Module**: ESNext with bundler resolution
- **JSX**: react-jsx transform
- **Path alias**: `@/*` maps to `src/*`

### Naming Conventions

| Type             | Convention           | Example                                 |
| ---------------- | -------------------- | --------------------------------------- |
| Components       | PascalCase           | `ReaderView.tsx`, `SettingsPanel.tsx`   |
| Functions        | camelCase            | `getSettings()`, `validateSettings()`   |
| Constants        | UPPER_SNAKE_CASE     | `DEFAULT_SETTINGS`, `STORAGE_KEYS`      |
| Types/Interfaces | PascalCase           | `Settings`, `ExtractedContent`          |
| Files            | camelCase/PascalCase | `storage.ts`, `ReaderView.tsx`          |
| CSS classes      | kebab-case with BEM  | `reader-container`, `reader-meta__item` |

### Import Patterns

```typescript
// 1. React imports first
import React, { useState, useCallback, useEffect, type JSX } from 'react';

// 2. Type imports next
import type { Settings, ExtractedContent } from '../shared/types';

// 3. Component imports
import { SettingsPanel } from './SettingsPanel';
import { CodeBlock } from './CodeBlock';

// 4. Utility imports last
import { logger } from '@/utils/logger';

// Use @/ alias for src/ imports
import { validateSettings } from '@/shared/storage';
```

### Component Structure

```typescript
/**
 * Component description
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
 * Main component description
 */
export function ComponentName({ propName, onAction }: ComponentProps): JSX.Element {
  // State hooks
  const [state, setState] = useState(false);

  // Callbacks with useCallback
  const handleAction = useCallback(() => {
    onAction();
  }, [onAction]);

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}

export default ComponentName;
```

### Error Handling

```typescript
// Always wrap Chrome API calls in try-catch
export async function getSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    // ...
  } catch (error) {
    console.error('[Reader] Failed to get settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

// Re-throw errors that callers should handle
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  try {
    // ...
  } catch (error) {
    console.error('[Reader] Failed to save settings:', error);
    throw error;
  }
}
```

### Comments and Documentation

- Use JSDoc for all exported functions and interfaces
- Include requirement references: `Requirements: 3.1, 3.5`
- Prefix console logs with `[Reader]` for extension context
- Add inline comments for complex logic only

```typescript
/**
 * Validate and normalize settings object
 * Returns a complete Settings object with all invalid values replaced by defaults
 */
export function validateSettings(settings: Partial<Settings>): Settings {
  // Implementation
}
```

### Type Definitions

```typescript
// Use discriminated unions for result types
export type ExtractionResult =
  { success: true; data: ExtractedContent } | { success: false; error: string };

// Use const arrays for valid values
export const VALID_THEMES = ['light', 'dark', 'sepia'] as const;
export type Theme = (typeof VALID_THEMES)[number];

// Prefer interfaces for object types
export interface Settings {
  theme: Theme;
  fontSize: number;
}
```

### Testing Patterns

```typescript
import { describe, it, expect } from 'vitest';
import { functionName } from '../../src/module/path';

describe('Feature Name', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      const result = functionName(input);
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      expect(functionName(edgeCase)).toBe(expected);
    });
  });
});
```

### ESLint Rules

Key rules from `eslint.config.js`:

- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: error (ignore `_` prefix)
- `no-undef`: error
- Unused vars must start with `_` to be ignored

### Build System

Three Vite configs for different entry points:

- `vite.config.ts` - Main build (popup + background)
- `vite.content.config.ts` - Content script (IIFE format)
- `vite.worker.config.ts` - Web Workers

## Project Structure

```
src/
├── background/       # Service Worker
├── content/          # Content scripts and React components
├── popup/            # Popup UI
├── shared/           # Shared types, constants, storage
├── utils/            # Utility functions
└── types/            # Additional type definitions

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
├── e2e/            # Playwright E2E tests
└── setup.ts        # Test setup and mocks
```

## Key Dependencies

- React 19 + TypeScript 5.6 (strict)
- Vite 6 (multiple configs)
- Tailwind CSS 3.4 + Radix UI
- Vitest + Testing Library (jsdom)
- @mozilla/readability for content extraction
- Chrome Storage API for persistence

## Pre-commit Hooks

Runs via lint-staged:

- `eslint --fix` for `*.{ts,tsx}`
- `vitest related` for `*.{ts,tsx}`
- `prettier --write` for `*.{json,md}`
