# 📋 Chrome 阅读扩展 API 参考文档

> 🎯 **技术栈**: React 18 + TypeScript 5 + Tailwind CSS 4 + Shadcn/UI
> 📅 **最后更新**: 2024年12月
> 🚀 **版本**: v3.0 (Shadcn/UI)

**📚 [返回文档中心](./README.md)** | **📖 [开发指南](./DEVELOPMENT_GUIDE.md)** | **🎨 [设计系统](./design-system-spec.md)** | **🔄 [迁移指南](./MIGRATION_GUIDE.md)**

---

## 📋 目录

- [🏪 Store APIs](#-store-apis)
- [💾 Storage APIs](#-storage-apis)
- [📨 Message APIs](#-message-apis)
- [🎨 Design System APIs](#-design-system-apis)
- [🔧 Utility APIs](#-utility-apis)

---

## 🏪 Store APIs

### SettingsStore

基于 Zustand 的设置状态管理。

#### 类型定义

```typescript
interface UserSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  fontFamily: string;
  backgroundColor: string;
}

interface SettingsStore {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>;
  initSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
}
```

#### 使用示例

```typescript
import { useSettingsStore } from '../store/settingsStore';

// 在组件中使用
const { settings, updateSetting } = useSettingsStore();

// 更新单个设置
await updateSetting('fontSize', 16);

// 获取当前设置
console.log(settings.theme); // 'light' | 'dark'
```

#### API 方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `updateSetting` | `key: keyof UserSettings, value: any` | `Promise<void>` | 更新单个设置项 |
| `initSettings` | - | `Promise<void>` | 初始化设置（从存储加载） |
| `resetSettings` | - | `Promise<void>` | 重置为默认设置 |

---

## 💾 Storage APIs

### Storage Utilities

Chrome 存储 API 的封装工具。

#### 基础存储操作

```typescript
// 存储数据
await setStorage(StorageKeys.USER_SETTINGS, settings);

// 获取数据
const settings = await getStorage<UserSettings>(StorageKeys.USER_SETTINGS);

// 删除数据
await removeStorage(StorageKeys.USER_SETTINGS);

// 清空所有数据
await clearStorage();
```

#### 存储键常量

```typescript
export const StorageKeys = {
  USER_SETTINGS: 'userSettings',
  ACTIVE_PRESET: 'activePreset',
  READING_PROGRESS: 'readingProgress',
  ANNOTATIONS: 'annotations'
} as const;
```

#### 类型安全的存储操作

```typescript
// 泛型支持，提供类型安全
const getStorage = <T>(key: string): Promise<T | null>;
const setStorage = <T>(key: string, value: T): Promise<void>;
```

### Storage Manager

高级存储管理功能。

```typescript
class StorageManager {
  // 批量操作
  static async batchSet(items: Record<string, any>): Promise<void>;
  static async batchGet(keys: string[]): Promise<Record<string, any>>;
  
  // 存储监听
  static onChanged(callback: (changes: chrome.storage.StorageChange) => void): void;
  
  // 存储统计
  static async getUsage(): Promise<number>;
  static async getQuota(): Promise<number>;
}
```

---

## 📨 Message APIs

### 消息类型

```typescript
export const MESSAGE_TYPES = {
  // 阅读模式控制
  ENABLE_READING_MODE: 'enableReadingMode',
  DISABLE_READING_MODE: 'disableReadingMode',
  GET_READING_MODE_STATE: 'getReadingModeState',
  
  // 设置同步
  APPLY_SETTINGS: 'applySettings',
  APPLY_PRESET: 'applyPreset',
  
  // 内容操作
  EXTRACT_CONTENT: 'extractContent',
  PROCESS_CONTENT: 'processContent'
} as const;
```

### 消息处理

#### 发送消息

```typescript
// 发送到内容脚本
chrome.tabs.sendMessage(tabId, {
  action: MESSAGE_TYPES.ENABLE_READING_MODE,
  preset: 'paper'
}, (response) => {
  if (response?.success) {
    console.log('阅读模式已启用');
  }
});

// 发送到后台脚本
chrome.runtime.sendMessage({
  action: MESSAGE_TYPES.APPLY_SETTINGS,
  settings: newSettings
});
```

#### 接收消息

```typescript
// 在内容脚本中
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case MESSAGE_TYPES.ENABLE_READING_MODE:
      enableReadingMode(message.preset);
      sendResponse({ success: true });
      break;
      
    case MESSAGE_TYPES.APPLY_SETTINGS:
      applySettings(message.settings);
      sendResponse({ success: true });
      break;
  }
  
  return true; // 保持消息通道开放
});
```

### 消息接口定义

```typescript
interface BaseMessage {
  action: string;
  timestamp?: number;
}

interface ReadingModeMessage extends BaseMessage {
  action: typeof MESSAGE_TYPES.ENABLE_READING_MODE | typeof MESSAGE_TYPES.DISABLE_READING_MODE;
  preset?: string;
}

interface SettingsMessage extends BaseMessage {
  action: typeof MESSAGE_TYPES.APPLY_SETTINGS;
  settings: Partial<UserSettings>;
}

interface MessageResponse {
  success: boolean;
  error?: string;
  data?: any;
}
```

---

## 🎨 Design System APIs

### Tailwind CSS 配置

```typescript
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
    },
  },
  plugins: [],
}
```

### Shadcn/UI 组件 APIs

#### Button 组件

```typescript
import { Button } from '@/components/ui/button';

interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

// 使用示例
<Button variant="default" size="default" onClick={handleClick}>
  确认
</Button>

<Button variant="outline" size="sm">
  取消
</Button>

<Button variant="ghost" size="icon">
  <Icon />
</Button>
```

#### Card 组件

```typescript
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// 使用示例
<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
  </CardHeader>
  <CardContent>
    <p>卡片内容</p>
  </CardContent>
  <CardFooter>
    <Button>操作按钮</Button>
  </CardFooter>
</Card>
```

#### Input 组件

```typescript
import { Input } from '@/components/ui/input';

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}

// 使用示例
<Input
  type="text"
  placeholder="请输入内容"
  value={value}
  onChange={handleChange}
/>
```

#### Switch 组件

```typescript
import { Switch } from '@/components/ui/switch';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

// 使用示例
<Switch
  checked={isEnabled}
  onCheckedChange={setIsEnabled}
/>
```

#### Slider 组件

```typescript
import { Slider } from '@/components/ui/slider';

interface SliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

// 使用示例
<Slider
  value={[fontSize]}
  onValueChange={(value) => setFontSize(value[0])}
  min={12}
  max={24}
  step={1}
/>
```

---

## 🔧 Utility APIs

### DOM 工具

```typescript
// DOM 操作工具
export const domUtils = {
  // 查找元素
  findElement: (selector: string, context?: Element) => Element | null,
  
  // 创建元素
  createElement: <T extends keyof HTMLElementTagNameMap>(
    tag: T, 
    props?: Partial<HTMLElementTagNameMap[T]>
  ) => HTMLElementTagNameMap[T],
  
  // 样式操作
  setStyles: (element: Element, styles: Partial<CSSStyleDeclaration>) => void,
  
  // 类名操作
  addClass: (element: Element, className: string) => void,
  removeClass: (element: Element, className: string) => void,
  toggleClass: (element: Element, className: string) => void
};
```

### 性能工具

```typescript
// 性能监控
export const performance = {
  // 计时器
  startTimer: (name: string) => void,
  endTimer: (name: string) => number,
  
  // 防抖
  debounce: <T extends (...args: any[]) => any>(
    func: T, 
    delay: number
  ) => (...args: Parameters<T>) => void,
  
  // 节流
  throttle: <T extends (...args: any[]) => any>(
    func: T, 
    delay: number
  ) => (...args: Parameters<T>) => void
};
```

### 日志工具

```typescript
// 日志管理
export const logger = {
  info: (message: string, ...args: any[]) => void,
  warn: (message: string, ...args: any[]) => void,
  error: (message: string, ...args: any[]) => void,
  debug: (message: string, ...args: any[]) => void,
  
  // 设置日志级别
  setLevel: (level: 'debug' | 'info' | 'warn' | 'error') => void
};
```

---

## 🔍 类型定义

### 核心类型

```typescript
// 用户设置
export interface UserSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  fontFamily: string;
  backgroundColor: string;
}

// 预设配置
export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  settings: Partial<UserSettings>;
}

// 阅读进度
export interface ReadingProgress {
  url: string;
  scrollPosition: number;
  timestamp: number;
}

// 注释数据
export interface Annotation {
  id: string;
  url: string;
  text: string;
  note: string;
  position: {
    start: number;
    end: number;
  };
  timestamp: number;
}
```

### 错误类型

```typescript
// 扩展错误
export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

// 错误代码
export const ERROR_CODES = {
  STORAGE_ERROR: 'STORAGE_ERROR',
  CONTENT_EXTRACTION_FAILED: 'CONTENT_EXTRACTION_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_SETTINGS: 'INVALID_SETTINGS'
} as const;
```

---

## 📝 使用示例

### 完整的功能实现示例

```typescript
// 实现一个完整的设置更新功能
async function updateFontSize(newSize: number) {
  try {
    // 1. 验证输入
    if (newSize < 12 || newSize > 24) {
      throw new ExtensionError(
        '字体大小必须在 12-24 之间',
        ERROR_CODES.INVALID_SETTINGS
      );
    }
    
    // 2. 更新状态
    await useSettingsStore.getState().updateSetting('fontSize', newSize);
    
    // 3. 应用到当前页面
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, {
        action: MESSAGE_TYPES.APPLY_SETTINGS,
        settings: { fontSize: newSize }
      });
    }
    
    // 4. 记录日志
    logger.info('字体大小已更新', { newSize });
    
  } catch (error) {
    logger.error('更新字体大小失败', error);
    throw error;
  }
}
```

---

## 🔗 相关文档

- [开发指南](./DEVELOPMENT_GUIDE.md)
- [设计系统规范](./design-system-spec.md)
- [故障排除](./TROUBLESHOOTING.md)

---

**注意**：所有 API 都支持 TypeScript，建议在开发时充分利用类型检查功能。
