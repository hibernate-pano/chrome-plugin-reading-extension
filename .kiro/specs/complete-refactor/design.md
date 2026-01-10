# Design Document: Complete Refactor

## Overview

本设计文档描述了 AI Reading Extension 的彻底重构方案。目标是将当前过度工程化的 100+ 文件架构简化为约 15-20 个核心文件，同时保持所有核心功能。

### 设计原则

1. **简单优先**：每个模块只做一件事，做好一件事
2. **最小依赖**：减少第三方库，只保留必要的（Readability、React）
3. **直接实现**：避免过度抽象，代码应该直接表达意图
4. **渐进增强**：核心功能必须可靠，高级功能可选

### 新架构 vs 旧架构

| 方面 | 旧架构 | 新架构 |
|------|--------|--------|
| 文件数量 | 100+ | ~15 |
| 内容脚本 | 2个重复的 (content.ts, unifiedContentScript.ts) | 1个 (content.ts) |
| 状态管理 | Zustand + 多层中间件 | 直接使用 Chrome Storage API |
| 错误处理 | 5个管理器类 | 1个简单的错误处理函数 |
| 缓存 | 多层缓存策略 | 简单的内存缓存 |
| 代码高亮 | 动态加载 highlight.js | 轻量级 Prism.js |

## Architecture

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

## Components and Interfaces

### 1. Storage Module (`src/storage.ts`)

简化的存储模块，直接封装 Chrome Storage API。

```typescript
interface Settings {
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;      // 12-32
  lineHeight: number;    // 1.2-2.0
  pageWidth: number;     // 600-1200
  fontFamily: string;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  fontSize: 18,
  lineHeight: 1.6,
  pageWidth: 800,
  fontFamily: 'system-ui'
};

// Simple API
async function getSettings(): Promise<Settings>;
async function saveSettings(settings: Partial<Settings>): Promise<void>;
async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]>;
async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
```

### 2. Content Extractor (`src/content/extractor.ts`)

基于 Mozilla Readability 的内容提取器。

```typescript
interface ExtractedContent {
  title: string;
  content: string;      // HTML string
  textContent: string;  // Plain text
  excerpt: string;
  byline: string | null;
  siteName: string | null;
}

interface ExtractionResult {
  success: true;
  data: ExtractedContent;
} | {
  success: false;
  error: string;
}

function extractContent(doc: Document): ExtractionResult;
```

### 3. Reader View Component (`src/content/ReaderView.tsx`)

阅读模式的主要 React 组件。

```typescript
interface ReaderViewProps {
  content: ExtractedContent;
  settings: Settings;
  onClose: () => void;
  onSettingsChange: (settings: Partial<Settings>) => void;
}

function ReaderView(props: ReaderViewProps): JSX.Element;
```

### 4. Settings Panel Component (`src/content/SettingsPanel.tsx`)

悬浮设置面板组件。

```typescript
interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Partial<Settings>) => void;
  onClose: () => void;
}

function SettingsPanel(props: SettingsPanelProps): JSX.Element;
```

### 5. Content Script Entry (`src/content/index.ts`)

内容脚本入口，处理消息和生命周期。

```typescript
// Message types
type MessageType = 
  | 'ENABLE_READING_MODE'
  | 'DISABLE_READING_MODE'
  | 'GET_STATE'
  | 'UPDATE_SETTINGS';

interface Message {
  type: MessageType;
  payload?: unknown;
}

// State
interface ContentScriptState {
  isActive: boolean;
  settings: Settings;
  originalContent: string | null;
}
```

### 6. Popup Component (`src/popup/Popup.tsx`)

极简的弹出窗口组件。

```typescript
function Popup(): JSX.Element;
// 只包含一个开关和状态显示
```

### 7. Background Script (`src/background/index.ts`)

服务工作者，处理扩展生命周期和消息路由。

```typescript
// 主要职责：
// 1. 监听扩展图标点击
// 2. 路由消息到正确的标签页
// 3. 管理内容脚本注入
```

## Data Models

### Settings Model

```typescript
interface Settings {
  // 主题
  theme: 'light' | 'dark' | 'sepia';
  
  // 排版
  fontSize: number;      // 12-32px
  lineHeight: number;    // 1.2-2.0
  pageWidth: number;     // 600-1200px
  fontFamily: string;    // CSS font-family value
}

// 验证函数
function validateSettings(settings: Partial<Settings>): Settings {
  return {
    theme: ['light', 'dark', 'sepia'].includes(settings.theme) 
      ? settings.theme 
      : DEFAULT_SETTINGS.theme,
    fontSize: clamp(settings.fontSize ?? DEFAULT_SETTINGS.fontSize, 12, 32),
    lineHeight: clamp(settings.lineHeight ?? DEFAULT_SETTINGS.lineHeight, 1.2, 2.0),
    pageWidth: clamp(settings.pageWidth ?? DEFAULT_SETTINGS.pageWidth, 600, 1200),
    fontFamily: settings.fontFamily ?? DEFAULT_SETTINGS.fontFamily,
  };
}
```

### Extracted Content Model

```typescript
interface ExtractedContent {
  title: string;
  content: string;      // Sanitized HTML
  textContent: string;  // Plain text for accessibility
  excerpt: string;      // First ~200 chars
  byline: string | null;
  siteName: string | null;
  wordCount: number;
  estimatedReadTime: number; // minutes
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Settings Round-Trip Consistency

*For any* valid settings object, saving it to storage and then loading it back SHALL produce an equivalent settings object.

**Validates: Requirements 3.3, 3.4, 5.3, 5.4**

```typescript
// Property: save(settings) then load() === settings
// For all valid Settings s:
//   saveSettings(s) >> getSettings() === s
```

### Property 2: Content Extraction Preserves Essential Elements

*For any* HTML document containing headings, paragraphs, images, code blocks, or lists, the extracted content SHALL contain all of these elements.

**Validates: Requirements 2.2, 2.3**

```typescript
// Property: essential elements are preserved
// For all HTML documents d with essential elements E:
//   extractContent(d).content contains all elements in E
```

### Property 3: Reading Mode Toggle Restores Original State

*For any* webpage, enabling then disabling reading mode SHALL restore the page to its original DOM state.

**Validates: Requirements 1.3, 1.5**

```typescript
// Property: toggle is reversible
// For all pages p:
//   let original = p.innerHTML
//   enable() >> disable()
//   p.innerHTML === original
```

### Property 4: Code Block Rendering Applies Highlighting

*For any* code block with identifiable programming language, the rendered output SHALL include syntax highlighting classes.

**Validates: Requirements 4.1, 4.2**

```typescript
// Property: code blocks are highlighted
// For all code blocks c with language L:
//   render(c).classList contains highlighting classes
```

### Property 5: Initialization Performance

*For any* webpage, enabling reading mode SHALL complete within 2000ms, and the content script initialization SHALL complete within 500ms.

**Validates: Requirements 1.2, 7.2**

```typescript
// Property: initialization is fast
// For all pages p:
//   time(enable(p)) < 2000ms
//   time(init()) < 500ms
```

### Property 6: Resource Cleanup on Disable

*For any* reading mode session, disabling reading mode SHALL remove all injected DOM elements and event listeners, and repeated toggling SHALL NOT cause memory growth.

**Validates: Requirements 7.4, 7.5**

```typescript
// Property: no resource leaks
// For all toggle sequences of length n:
//   memory_after(toggle * n) ≈ memory_before
//   DOM.querySelectorAll('[data-reader]').length === 0 after disable
```

### Property 7: Keyboard Accessibility

*For any* interactive element in the reader view, it SHALL be focusable via Tab key and activatable via Enter or Space key.

**Validates: Requirements 6.5**

```typescript
// Property: keyboard accessible
// For all interactive elements e in ReaderView:
//   e.tabIndex >= 0
//   e responds to 'keydown' with Enter or Space
```

### Property 8: Error Resilience

*For any* error condition during content extraction or rendering, the page SHALL remain responsive and not crash.

**Validates: Requirements 8.3**

```typescript
// Property: errors don't crash the page
// For all error scenarios e:
//   try { operation() } catch { }
//   page.isResponsive === true
```

## Error Handling

### 错误处理策略

采用简单直接的错误处理，不使用复杂的错误管理器类。

```typescript
// 简单的错误处理函数
function handleError(error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Reader] ${context}:`, message);
  
  // 显示用户友好的错误消息
  showToast({
    type: 'error',
    message: getErrorMessage(context),
    duration: 5000
  });
}

// 用户友好的错误消息映射
const ERROR_MESSAGES: Record<string, string> = {
  'extraction': '无法提取页面内容，请尝试其他页面',
  'storage': '保存设置失败，请重试',
  'render': '显示内容时出现问题',
  'default': '发生意外错误'
};

function getErrorMessage(context: string): string {
  return ERROR_MESSAGES[context] ?? ERROR_MESSAGES.default;
}
```

### 错误边界

React 组件使用错误边界防止整个应用崩溃：

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
```

## Testing Strategy

### 测试框架

- **单元测试**: Vitest（与 Vite 集成良好）
- **属性测试**: fast-check
- **组件测试**: @testing-library/react

### 单元测试

针对具体示例和边界情况：

```typescript
// storage.test.ts
describe('Storage', () => {
  it('should return default settings when storage is empty', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
  
  it('should validate fontSize bounds', async () => {
    await saveSetting('fontSize', 100);
    const settings = await getSettings();
    expect(settings.fontSize).toBe(32); // clamped to max
  });
});
```

### 属性测试

使用 fast-check 进行属性测试，每个属性至少运行 100 次迭代：

```typescript
// storage.property.test.ts
import * as fc from 'fast-check';

describe('Storage Properties', () => {
  // Feature: complete-refactor, Property 1: Settings Round-Trip Consistency
  // Validates: Requirements 3.3, 3.4, 5.3, 5.4
  it('settings round-trip preserves data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          theme: fc.constantFrom('light', 'dark', 'sepia'),
          fontSize: fc.integer({ min: 12, max: 32 }),
          lineHeight: fc.float({ min: 1.2, max: 2.0 }),
          pageWidth: fc.integer({ min: 600, max: 1200 }),
          fontFamily: fc.string()
        }),
        async (settings) => {
          await saveSettings(settings);
          const loaded = await getSettings();
          expect(loaded).toEqual(settings);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 测试配置

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      threshold: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70
      }
    }
  }
});
```

## File Structure

```
src/
├── background/
│   └── index.ts              # Service worker entry
├── content/
│   ├── index.ts              # Content script entry
│   ├── extractor.ts          # Content extraction
│   ├── ReaderView.tsx        # Main reader component
│   ├── SettingsPanel.tsx     # Settings panel component
│   ├── CodeBlock.tsx         # Code block with highlighting
│   └── styles.css            # Reader styles
├── popup/
│   ├── index.tsx             # Popup entry
│   └── Popup.tsx             # Popup component
├── shared/
│   ├── storage.ts            # Storage utilities
│   ├── types.ts              # TypeScript types
│   └── constants.ts          # Constants and defaults
└── tests/
    ├── setup.ts              # Test setup
    ├── storage.test.ts       # Storage unit tests
    ├── storage.property.test.ts  # Storage property tests
    ├── extractor.test.ts     # Extractor tests
    └── extractor.property.test.ts # Extractor property tests

public/
├── manifest.json
└── icons/

Total: ~15 files (vs 100+ in current architecture)
```
