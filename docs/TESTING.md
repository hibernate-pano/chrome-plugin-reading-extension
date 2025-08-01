# 🧪 测试指南

> Chrome 阅读扩展的完整测试策略

**📚 [返回文档中心](./README.md)** | **📖 [开发指南](./DEVELOPMENT_GUIDE.md)** | **🔧 [故障排除](./TROUBLESHOOTING.md)**

---

## 📋 测试策略概览

### 🎯 测试金字塔

```
        /\
       /  \
      / E2E \     <- 端到端测试 (10%)
     /______\
    /        \
   /Integration\ <- 集成测试 (20%)
  /____________\
 /              \
/   Unit Tests   \ <- 单元测试 (70%)
/________________\
```

---

## 🔧 测试环境配置

### 1. 安装测试依赖

```bash
# 核心测试框架
pnpm add -D vitest @vitest/ui jsdom

# React 测试工具
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Chrome 扩展测试工具
pnpm add -D webextensions-api-fake chrome-types

# E2E 测试
pnpm add -D playwright @playwright/test
```

### 2. 测试配置文件

```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn()
  }
} as any;
```

---

## 🧩 单元测试

### 1. 组件测试

```typescript
// src/design-system/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  test('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  test('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies variant styles correctly', () => {
    render(<Button variant="outlined">Outlined Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('button--outlined');
  });

  test('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 2. Store 测试

```typescript
// src/store/__tests__/settingsStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useSettingsStore } from '../settingsStore';

describe('SettingsStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useSettingsStore.getState().resetSettings();
  });

  test('initializes with default settings', () => {
    const { result } = renderHook(() => useSettingsStore());
    
    expect(result.current.settings).toEqual({
      theme: 'light',
      fontSize: 16,
      lineHeight: 1.6,
      paragraphSpacing: 1.2,
      fontFamily: 'system',
      backgroundColor: 'white'
    });
  });

  test('updates settings correctly', async () => {
    const { result } = renderHook(() => useSettingsStore());
    
    await act(async () => {
      await result.current.updateSetting('fontSize', 18);
    });
    
    expect(result.current.settings.fontSize).toBe(18);
  });

  test('persists settings to Chrome storage', async () => {
    const { result } = renderHook(() => useSettingsStore());
    const mockSet = vi.mocked(chrome.storage.local.set);
    
    await act(async () => {
      await result.current.updateSetting('theme', 'dark');
    });
    
    expect(mockSet).toHaveBeenCalledWith({
      userSettings: expect.objectContaining({ theme: 'dark' })
    });
  });
});
```

### 3. 工具函数测试

```typescript
// src/utils/__tests__/dom.test.ts
import { domUtils } from '../dom';

describe('DOM Utils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('createElement creates element with correct properties', () => {
    const button = domUtils.createElement('button', {
      textContent: 'Test Button',
      className: 'test-class'
    });
    
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toBe('Test Button');
    expect(button.className).toBe('test-class');
  });

  test('findElement returns correct element', () => {
    document.body.innerHTML = '<div class="test">Test Content</div>';
    
    const element = domUtils.findElement('.test');
    expect(element).toBeTruthy();
    expect(element?.textContent).toBe('Test Content');
  });

  test('setStyles applies styles correctly', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    
    domUtils.setStyles(div, {
      color: 'red',
      fontSize: '16px'
    });
    
    expect(div.style.color).toBe('red');
    expect(div.style.fontSize).toBe('16px');
  });
});
```

---

## 🔗 集成测试

### 1. 消息传递测试

```typescript
// src/test/integration/messaging.test.ts
import { MESSAGE_TYPES } from '../../constants';

describe('Message Passing Integration', () => {
  test('popup can communicate with content script', async () => {
    const mockSendMessage = vi.mocked(chrome.tabs.sendMessage);
    mockSendMessage.mockImplementation((tabId, message, callback) => {
      // 模拟内容脚本响应
      if (callback) {
        callback({ success: true, readingMode: false });
      }
    });

    // 模拟 popup 发送消息
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(
        1,
        { action: MESSAGE_TYPES.GET_READING_MODE_STATE },
        resolve
      );
    });

    expect(response).toEqual({ success: true, readingMode: false });
    expect(mockSendMessage).toHaveBeenCalledWith(
      1,
      { action: MESSAGE_TYPES.GET_READING_MODE_STATE },
      expect.any(Function)
    );
  });
});
```

### 2. 存储集成测试

```typescript
// src/test/integration/storage.test.ts
import { StorageManager } from '../../storage/storage-manager';

describe('Storage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('storage manager handles batch operations', async () => {
    const mockSet = vi.mocked(chrome.storage.local.set);
    const mockGet = vi.mocked(chrome.storage.local.get);
    
    mockGet.mockResolvedValue({
      key1: 'value1',
      key2: 'value2'
    });

    // 测试批量设置
    await StorageManager.batchSet({
      key1: 'newValue1',
      key2: 'newValue2'
    });

    expect(mockSet).toHaveBeenCalledWith({
      key1: 'newValue1',
      key2: 'newValue2'
    });

    // 测试批量获取
    const result = await StorageManager.batchGet(['key1', 'key2']);
    expect(result).toEqual({
      key1: 'value1',
      key2: 'value2'
    });
  });
});
```

---

## 🎭 端到端测试

### 1. Playwright 配置

```javascript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    headless: false, // 显示浏览器窗口
    viewport: { width: 1280, height: 720 },
    actionTimeout: 0,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### 2. 扩展加载测试

```typescript
// e2e/extension-loading.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Extension Loading', () => {
  test('loads extension successfully', async ({ page, context }) => {
    // 加载扩展
    const extensionPath = path.join(__dirname, '../dist');
    const extensionId = await context.addInitScript(() => {
      // 扩展加载逻辑
    });

    // 验证扩展图标存在
    await page.goto('https://example.com');
    
    // 检查扩展是否正确加载
    const extensionButton = page.locator('[data-testid="extension-button"]');
    await expect(extensionButton).toBeVisible();
  });
});
```

### 3. 功能流程测试

```typescript
// e2e/reading-mode.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Reading Mode', () => {
  test('enables reading mode on article page', async ({ page }) => {
    // 访问测试页面
    await page.goto('https://example.com/article');
    
    // 点击扩展图标
    await page.click('[data-testid="extension-icon"]');
    
    // 等待 popup 出现
    await expect(page.locator('.popup-container')).toBeVisible();
    
    // 开启阅读模式
    await page.click('[data-testid="reading-mode-toggle"]');
    
    // 验证页面转换为阅读模式
    await expect(page.locator('.reading-mode-container')).toBeVisible();
    
    // 验证内容正确提取
    const articleContent = page.locator('.reading-mode-content');
    await expect(articleContent).toContainText('Article content');
  });

  test('applies settings changes in real-time', async ({ page }) => {
    await page.goto('https://example.com/article');
    
    // 开启阅读模式
    await page.click('[data-testid="extension-icon"]');
    await page.click('[data-testid="reading-mode-toggle"]');
    
    // 打开设置
    await page.click('[data-testid="extension-icon"]');
    await page.click('[data-testid="advanced-settings-toggle"]');
    
    // 调整字体大小
    const fontSizeSlider = page.locator('[data-testid="font-size-slider"]');
    await fontSizeSlider.fill('20');
    
    // 验证字体大小变化
    const content = page.locator('.reading-mode-content');
    await expect(content).toHaveCSS('font-size', '20px');
  });
});
```

---

## 📊 测试覆盖率

### 1. 覆盖率配置

```javascript
// vitest.config.ts 中的覆盖率配置
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/types/',
        'dist/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

### 2. 覆盖率报告

```bash
# 运行测试并生成覆盖率报告
pnpm test:coverage

# 查看覆盖率报告
open coverage/index.html
```

---

## 🚀 测试脚本

### package.json 测试脚本

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "pnpm test:coverage && pnpm test:e2e"
  }
}
```

---

## 🔍 测试最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的测试命名
describe('SettingsStore', () => {
  describe('updateSetting', () => {
    test('should update fontSize when valid value provided', () => {});
    test('should throw error when fontSize is out of range', () => {});
  });
});

// ❌ 不好的测试命名
describe('Settings', () => {
  test('test1', () => {});
  test('update', () => {});
});
```

### 2. 测试数据管理

```typescript
// 使用工厂函数创建测试数据
const createMockSettings = (overrides = {}) => ({
  theme: 'light',
  fontSize: 16,
  lineHeight: 1.6,
  paragraphSpacing: 1.2,
  fontFamily: 'system',
  backgroundColor: 'white',
  ...overrides
});

// 使用 fixtures 管理复杂测试数据
const fixtures = {
  validSettings: createMockSettings(),
  darkThemeSettings: createMockSettings({ theme: 'dark' }),
  largeTextSettings: createMockSettings({ fontSize: 24 })
};
```

### 3. 异步测试

```typescript
// ✅ 正确的异步测试
test('should save settings to storage', async () => {
  const { result } = renderHook(() => useSettingsStore());
  
  await act(async () => {
    await result.current.updateSetting('theme', 'dark');
  });
  
  expect(chrome.storage.local.set).toHaveBeenCalled();
});

// ❌ 错误的异步测试
test('should save settings to storage', () => {
  const { result } = renderHook(() => useSettingsStore());
  
  result.current.updateSetting('theme', 'dark'); // 没有等待
  
  expect(chrome.storage.local.set).toHaveBeenCalled(); // 可能失败
});
```

---

## 📋 测试检查清单

### ✅ 单元测试
- [ ] 所有组件都有基础渲染测试
- [ ] 用户交互事件有对应测试
- [ ] Store 状态变更有测试覆盖
- [ ] 工具函数有完整测试用例
- [ ] 错误处理逻辑有测试

### ✅ 集成测试
- [ ] 消息传递机制测试
- [ ] 存储操作集成测试
- [ ] 组件间交互测试
- [ ] API 调用集成测试

### ✅ E2E 测试
- [ ] 扩展加载流程测试
- [ ] 核心功能流程测试
- [ ] 用户操作路径测试
- [ ] 跨页面状态同步测试

### ✅ 测试质量
- [ ] 测试覆盖率达到 80% 以上
- [ ] 测试运行稳定，无随机失败
- [ ] 测试执行时间合理
- [ ] 测试文档清晰易懂

---

**记住**：好的测试不仅能发现 bug，还能作为代码的活文档！🧪
