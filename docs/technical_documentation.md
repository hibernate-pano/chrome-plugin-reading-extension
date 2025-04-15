# AI 阅读助手技术文档

## 架构概述

AI 阅读助手采用模块化架构设计，遵循 Chrome 扩展的标准结构，主要包含以下核心组件：

1. **内容脚本 (Content Script)**：注入到网页中执行的脚本，负责页面内容的处理和优化
2. **弹出窗口 (Popup)**：点击扩展图标时显示的界面，提供设置和控制功能
3. **后台脚本 (Background Script)**：在扩展生命周期内持续运行的脚本，处理全局事件
4. **存储模块 (Storage)**：管理用户设置和偏好的持久化存储
5. **状态管理 (Store)**：使用 Zustand 实现的全局状态管理

## 技术栈详解

### 前端框架与工具

- **React 18**：用于构建用户界面，主要用于弹出窗口和设置页面
- **TypeScript**：提供类型安全和更好的开发体验
- **Vite**：现代化构建工具，提供快速的开发体验和优化的构建输出
- **Zustand**：轻量级状态管理库，用于管理全局状态
- **Tailwind CSS**：实用优先的 CSS 框架，用于快速构建自定义界面
- **Headless UI**：无样式的 UI 组件库，提供可访问性和交互逻辑

### 核心库与依赖

- **Mozilla Readability**：用于提取网页主要内容，实现阅读模式
- **Prism.js**：用于代码语法高亮
- **Pangu.js**：用于自动在中英文之间添加空格

## 模块详解

### 1. 内容脚本 (Content Script)

内容脚本是扩展的核心，负责实现阅读模式和页面优化功能。

#### 主要功能

- **内容提取**：使用 Readability 库提取页面主要内容
- **样式应用**：根据用户设置应用自定义样式
- **代码高亮**：处理页面中的代码块，应用语法高亮
- **目录生成**：根据页面标题自动生成导航目录
- **媒体处理**：控制图片和其他媒体元素的显示

#### 关键实现

```typescript
// 启用阅读模式的核心函数
async function enableReadingMode() {
  // 保存原始内容
  if (!originalContent) {
    originalContent = document.documentElement.innerHTML;
  }

  // 创建新的文档用于解析
  const documentClone = document.implementation.createHTMLDocument();
  documentClone.documentElement.innerHTML = originalContent;

  // 清理和规范化 HTML
  cleanupHtml(documentClone);

  // 使用 Readability 解析内容
  const reader = new Readability(documentClone);
  const article = reader.parse();

  // 获取用户设置
  const settings = await fetchSettings();

  // 创建阅读模式容器
  const container = document.createElement('div');
  container.id = 'reading-mode-container';

  // 添加文章标题和内容
  // ...

  // 应用样式
  applyStyles(settings);

  // 生成目录
  if (settings.showDirectory) {
    generateTableOfContents(container, article.title || document.title);
  }

  // 应用自动间距
  await applyAutoSpacing();
}
```

### 2. 弹出窗口 (Popup)

弹出窗口提供了用户界面，允许用户控制阅读模式和自定义设置。

#### 主要功能

- **阅读模式切换**：启用/禁用阅读模式
- **主题切换**：在明亮和暗黑主题之间切换
- **设置面板**：提供多种自定义选项

#### 组件结构

- **Tabs**：基础、样式和高级设置的标签页
- **Sliders**：用于调整字体大小、行高等数值设置
- **Switches**：用于切换布尔值设置（如首行缩进、显示图片等）
- **Buttons**：用于选择字体、背景色等预设选项

#### 关键实现

```tsx
// Popup 组件的核心结构
export const Popup = () => {
  // 使用 Zustand 存储
  const {
    theme,
    fontSize,
    readingMode,
    // ...其他状态
    setTheme,
    setFontSize,
    setReadingMode,
    // ...其他设置函数
  } = useAppStore();

  // 切换阅读模式
  const toggleReadingMode = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'TOGGLE_READING_MODE' },
          (response) => {
            if (response?.success) {
              setReadingMode(response.isReadingMode);
            }
          }
        );
      }
    } catch (error) {
      console.error('切换阅读模式时发生错误:', error);
    }
  };

  // 渲染 UI
  return (
    <div className="w-[440px] h-[580px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden">
      {/* 顶部导航栏 */}
      {/* 标签页导航 */}
      {/* 设置面板 */}
    </div>
  );
};
```

### 3. 存储模块 (Storage)

存储模块负责管理用户设置的持久化，使用 Chrome 的存储 API。

#### 主要功能

- **设置存储**：保存用户自定义设置
- **设置读取**：读取已保存的设置
- **默认值管理**：提供默认设置值

#### 关键实现

```typescript
// 存储键枚举
export enum StorageKeys {
  THEME = 'theme',
  FONT_SIZE = 'fontSize',
  LINE_HEIGHT = 'lineHeight',
  // ...其他键
}

// 获取存储值
export async function getStorage<T>(
  key: StorageKeysType,
  storageArea: "sync" | "local" = "local"
): Promise<T | null> {
  const result = await chrome.storage[storageArea].get(key);
  return result[key] ?? null;
}

// 设置存储值
export async function setStorage<T>(
  key: StorageKeysType,
  value: T,
  storageArea: "sync" | "local" = "local"
): Promise<void> {
  await chrome.storage[storageArea].set({ [key]: value });
}

// 初始化默认设置
export async function initializeDefaultSettings(): Promise<void> {
  await setStorage(StorageKeys.THEME, 'light');
  await setStorage(StorageKeys.FONT_SIZE, 18);
  // ...其他默认设置
}
```

### 4. 状态管理 (Store)

使用 Zustand 实现的全局状态管理，用于在组件之间共享状态。

#### 主要功能

- **状态存储**：存储应用状态
- **状态更新**：提供更新状态的方法
- **状态同步**：与 Chrome 存储同步

#### 关键实现

```typescript
// 应用状态接口
interface AppState {
  theme: 'light' | 'dark';
  fontSize: number;
  readingMode: boolean;
  // ...其他状态
}

// 初始状态
const initialState: AppState = {
  theme: 'light',
  fontSize: 16,
  readingMode: false,
  // ...其他初始值
};

// 使用 Zustand 创建 store
const useAppStore = create<AppState & Actions>((set) => ({
  ...initialState,
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  // ...其他 actions
}));
```

### 5. 后台脚本 (Background Script)

后台脚本在扩展的生命周期内持续运行，处理全局事件和初始化。

#### 主要功能

- **初始化设置**：在扩展安装或更新时初始化默认设置
- **消息处理**：处理来自弹出窗口和内容脚本的消息

#### 关键实现

```typescript
// 插件安装或更新时初始化设置
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDefaultSettings();
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'INJECT_CONTENT_SCRIPT') {
    if (sender.tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        files: ['src/content/content.js']
      });
    }
  }
});
```

## 数据流

1. **用户交互** → **Popup 组件** → **状态更新** → **存储更新** → **内容脚本响应**
2. **存储变化** → **内容脚本监听** → **样式更新**
3. **页面加载** → **内容脚本初始化** → **读取存储设置** → **应用样式**

## 构建流程

项目使用 Vite 进行构建，采用多配置构建方式，分别构建：

1. **内容脚本 (content script)**：注入到网页的脚本
2. **后台脚本 (background script)**：扩展的后台进程
3. **弹出窗口 (popup)**：点击扩展图标显示的界面

构建配置文件：
- `vite.content.config.ts`：内容脚本构建配置
- `vite.background.config.ts`：后台脚本构建配置
- `vite.popup.config.ts`：弹出窗口构建配置

## 性能优化

1. **样式优化**：使用 CSS 变量实现实时更新，避免频繁的 DOM 操作
2. **内容处理**：优化内容提取算法，提高处理速度
3. **代码分割**：将不同功能模块分割为独立的脚本，减少加载时间
4. **懒加载**：对非关键资源采用懒加载策略

## 扩展点

项目设计了多个扩展点，便于未来功能扩展：

1. **主题系统**：可以扩展更多主题选项
2. **代码高亮**：可以添加更多语言支持和主题
3. **内容处理**：可以添加更多内容优化算法
4. **UI 组件**：可以扩展更多自定义设置选项

## 调试指南

1. **开发环境设置**：
   ```bash
   pnpm install
   pnpm dev
   ```

2. **加载未打包扩展**：
   - 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
   - 启用开发者模式
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 目录

3. **调试内容脚本**：
   - 在页面上右键点击，选择"检查"
   - 在开发者工具中，可以看到内容脚本的日志和错误

4. **调试弹出窗口**：
   - 右键点击扩展图标，选择"检查弹出内容"
   - 在开发者工具中调试弹出窗口

5. **调试后台脚本**：
   - 在扩展管理页面，点击扩展的"背景页"链接
   - 在开发者工具中调试后台脚本

## 测试策略

1. **单元测试**：使用 Jest 测试独立功能模块
2. **集成测试**：测试模块之间的交互
3. **端到端测试**：使用 Playwright 测试完整的用户流程
4. **兼容性测试**：在不同版本的 Chrome 和其他 Chromium 浏览器中测试

## 安全考虑

1. **内容安全策略 (CSP)**：限制脚本和资源的来源
2. **权限最小化**：只请求必要的权限
3. **数据隔离**：确保用户数据不会泄露
4. **输入验证**：验证所有用户输入，防止注入攻击

## 未来技术规划

1. **性能优化**：
   - 使用 Web Workers 处理复杂计算
   - 优化大型页面的处理能力

2. **架构改进**：
   - 采用更模块化的设计
   - 引入插件系统，支持社区扩展

3. **AI 集成**：
   - 集成自然语言处理功能
   - 添加智能内容分析和推荐

4. **跨平台支持**：
   - 支持 Firefox 和 Safari
   - 考虑使用 WebExtension API 实现跨浏览器兼容
