**Chrome 阅读增强插件 - Sprint 1 开发指导文档**

**目标:** 搭建项目基础框架，实现 `storage`、`content` 和 `popup` 模块，并实现基本的阅读模式切换、主题切换和字体大小调整功能。

**时间预估:** 根据团队实际情况预估。

**一、 任务分解**

Sprint 1 的主要任务可以分解为以下几个部分：

1. **项目基础框架搭建:**
   - 创建项目，安装依赖。
   - 集成 Tailwind CSS, Zustand, ESLint, Prettier, Husky, lint-staged。
   - 创建目录结构, 编写 `manifest.json`。
   - 提取通用 UI 组件到 `ui` 目录。
   - 提取常用工具函数到 `utils` 目录。
2. `storage`** 模块开发:**
   - 创建 `storage.ts`，封装 `chrome.storage.sync` 和 `chrome.storage.local` 的操作。
   - 定义存储的 key。
   - 编写单元测试用例。
3. `content`** 模块开发:**
   - 创建 `content.ts`。
   - 集成 Readability.js 或类似库，实现正文提取。
   - 实现基本的阅读模式切换。
   - 仔细考虑 `content` 脚本的注入时机和方式。
   - 添加完善的错误处理机制, 提供友好的错误提示。
   - 记录更详细的日志。
4. `popup`** 模块开发:**
   - 创建 `Popup.tsx`。
   - 设计 UI 界面。
   - 使用 Zustand 管理状态。
   - 添加事件监听器。
   - 提供明显的 UI 反馈。
5. `background`** 模块开发 (可选):**
   - 创建 `background.ts`。
   - 监听事件, 按需注入 `content.ts`。
   - 考虑是否可以用 `content` 或 `popup` 实现 `background` 的功能，尽量减少 `background` 的使用。
6. **测试:**
   - 编写单元测试用例。
   - 编写 E2E 测试用例。
   - 进行兼容性和性能测试。
   - 制定 AI 分段效果的评估标准。
7. **文档:**
   - 补充 API 文档和设计文档。

**二、 开发步骤与设计要点**

**1. 项目基础框架搭建**

- **步骤 1.1: 创建项目**
  ll

````
    - 删除 `vite` 自带的无用代码, 只保留干净的 `main.tsx`, `App.tsx` 等必要文件。
+ **步骤 1.2: 集成 Tailwind CSS**
    - 按照 Tailwind CSS 官方文档，在项目中安装和配置 Tailwind CSS。
    - 在 `tailwind.config.js` 中自定义主题，以匹配 Chrome 的原生 UI 风格。可以参考 `https://developer.chrome.com/docs/extensions/` 调整颜色、字体等样式。
+ **步骤 1.3: 集成 Zustand**
    - 安装 Zustand：

```bash
pnpm install zustand
````

    - 创建 `src/store.ts` 文件，用于定义全局状态 (例如主题、字体大小等)，并使用 `create` 函数创建一个 store：

```typescript
import { create } from "zustand";

interface AppState {
  theme: "light" | "dark";
  fontSize: number;
  setTheme: (theme: "light" | "dark") => void;
  setFontSize: (fontSize: number) => void;
}

const useAppStore = create<AppState>((set) => ({
  theme: "light", // 默认值
  fontSize: 16, // 默认值
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
}));

export default useAppStore;
```

- **步骤 1.4: 配置 ESLint 和 Prettier**
  - 安装 ESLint 和 Prettier：

```bash
npm install eslint prettier eslint-plugin-react eslint-config-airbnb-typescript eslint-plugin-import --save-dev
npx eslint --init
```

    - 在项目根目录下创建 `.eslintrc.cjs` 文件，配置 ESLint 规则，参考 `airbnb` 规范。
    - 在项目根目录下创建 `.prettierrc.cjs` 文件，配置 Prettier 规则，如:

```javascript
module.exports = {
  trailingComma: "es5",
  tabWidth: 2,
  semi: true,
  singleQuote: true,
};
```

    - 建议配置 VS Code, 保存时自动格式化。

- **步骤 1.5: 配置 Git Hooks**
  - 使用 `husky` 和 `lint-staged` 等工具配置 Git Hooks，在 commit 之前自动运行 ESLint 和 Prettier：

```bash
npx husky-init
npm install lint-staged
```

修改 `package.json`, 添加:

```plain
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

修改 `.husky/pre-commit`:

```plain
npx lint-staged
```

- **步骤 1.6: 目录结构**

```plain
my-reading-extension/
├── public/
│   └── manifest.json
├── src/
│   ├── content/
│   │   ├── content.ts
│   │   └── components/
│   ├── popup/
│   │   ├── Popup.tsx
│   │   └── components/
│   ├── background/
│   │   └── background.ts
│   ├── options/
│   │   └── Options.tsx
│   ├── ai/
│   ├── storage/
│   │   └── storage.ts
│   ├── ui/
│   │   └── components/
│   ├── utils/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── store.ts
│   └── types.ts
├── .eslintrc.cjs
├── .gitignore
├── .prettierrc.cjs
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

- **步骤 1.7: 编写 **`manifest.json`
  - 在 `public` 目录下创建 `manifest.json` 文件，并进行必要的配置。例如:

```json
{
  "manifest_version": 3,
  "name": "My Reading Extension",
  "version": "1.0.0",
  "description": "An AI-powered reading extension for Chrome",
  "action": {
    "default_popup": "index.html",
    "default_icon": "icon.png"
  },
  "permissions": ["storage", "activeTab", "scripting"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.ts"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "src/background/background.ts"
  }
}
```

    - 根据实际情况修改 `manifest.json`。

- **步骤 1.8: 提取通用 UI 组件**
  - 在 `src/ui/components` 目录下创建通用的 UI 组件，例如 `Button.tsx`、`Slider.tsx`、`Select.tsx` 等。
  - 这些组件应该基于 Tailwind CSS 进行样式设计，并与 Chrome 的原生 UI 风格保持一致。
- **步骤 1.9: 提取常用工具函数**
  - 在 `src/utils/index.ts` 文件中定义常用的工具函数，例如 `DOM` 操作、字符串处理、数据格式化等。
  - 可以按功能模块划分，例如 `dom.ts`、`string.ts` 等。

**2. **`storage`** 模块开发**

- **步骤 2.1: 创建 **`storage.ts`
  - 在 `src/storage` 目录下创建 `storage.ts` 文件。
- **步骤 2.2: 封装函数**
  - 封装 `chrome.storage.sync` 和 `chrome.storage.local` 的操作，提供以下函数：

```typescript
export async function getStorage<T>(
  key: StorageKeysType,
  storageArea: "sync" | "local" = "sync"
): Promise<T | null> {
  const result = await chrome.storage[storageArea].get(key);
  return result[key] ?? null;
}

export async function setStorage<T>(
  key: StorageKeysType,
  value: T,
  storageArea: "sync" | "local" = "sync"
): Promise<void> {
  await chrome.storage[storageArea].set({ [key]: value });
}

export async function removeStorage(
  key: StorageKeysType,
  storageArea: "sync" | "local" = "sync"
): Promise<void> {
  await chrome.storage[storageArea].remove(key);
}

export async function clearStorage(
  storageArea: "sync" | "local" = "sync"
): Promise<void> {
  await chrome.storage[storageArea].clear();
}
```

- **步骤 2.3: 定义存储的 key**
  - 定义一个 `enum` 或 `const` 对象来管理存储的 key，例如：

```typescript
export const StorageKeys = {
  THEME: "theme",
  FONT_SIZE: "fontSize",
  // ... 其他 key
} as const;

export type StorageKeysType = (typeof StorageKeys)[keyof typeof StorageKeys];
```

- **步骤 2.4: 编写单元测试**
  - 使用 Jest 或其他测试框架为 `storage` 模块编写单元测试用例，确保其功能的正确性。

**3. **`content`** 模块开发**

- **步骤 3.1: 创建 **`content.ts`
  - 在 `src/content` 目录下创建 `content.ts` 文件。
- **步骤 3.2: 正文提取**
  - 集成 Readability.js 库 (或其他类似库)，可以通过 npm 安装 `@mozilla/readability`。
  - 使用 Readability.js 提供的 `new Readability(document).parse()` 方法提取网页正文内容。
  - 可以提供一个选项让用户手动选择正文区域 (作为备选方案)。
- **步骤 3.3: 阅读模式切换**
  - 监听来自 `popup` 的消息 (例如点击了"进入阅读模式"按钮)。可以使用 `chrome.runtime.onMessage.addListener` 监听消息。
  - 接收到消息后，执行以下操作：
    - 隐藏或移除网页中的无关元素 (例如广告、导航栏等)。可以通过 `document.querySelectorAll` 找到需要隐藏的元素，并设置其 `display: none` 样式。
    - 修改 DOM 结构，创建一个新的容器 (例如 `<div id="my-reading-content">`) 来包裹 Readability.js 提取的正文内容。
    - 为正文容器添加 CSS 类名，应用阅读模式的样式，如:

```typescript
// content.ts
import { Readability } from "@mozilla/readability";
import { getStorage } from "../storage/storage";
import { StorageKeys } from "../types";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TOGGLE_READING_MODE") {
    toggleReadingMode();
  }
});

async function toggleReadingMode() {
  const article = new Readability(document).parse();
  const fontSize = await getStorage<number>(StorageKeys.FONT_SIZE, "sync");

  if (article) {
    const readingContent = document.createElement("div");
    readingContent.id = "my-reading-content";
    readingContent.innerHTML = article.content;
    readingContent.style.fontSize = `${fontSize}px`;

    // 添加自定义的类名
    readingContent.classList.add("my-reading-mode");

    document.body.innerHTML = "";
    document.body.appendChild(readingContent);
  }
}
```

        * 在 `content` 目录下创建 `components` 目录，并创建 `Article.tsx` 组件, 用于控制文章的样式，例如:

```tsx
// content/components/Article.tsx
import React from "react";
import useAppStore from "../../store";
import "./Article.css"; // 引入 Article 组件的样式文件

interface ArticleProps {
  content: string;
}

const Article: React.FC<ArticleProps> = ({ content }) => {
  const theme = useAppStore((state) => state.theme);

  return (
    <div
      id="my-reading-content"
      className={`my-reading-mode ${theme}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default Article;
```

```css
/* content/components/Article.css */
.my-reading-mode {
  /* 通用阅读模式样式 */
  font-family: sans-serif;
  line-height: 1.5;
  padding: 20px;
  margin: 0 auto;
  max-width: 800px;
}

.my-reading-mode.light {
  /* 浅色主题样式 */
  background-color: #fff;
  color: #000;
}

.my-reading-mode.dark {
  /* 深色主题样式 */
  background-color: #222;
  color: #eee;
}
```

        * 修改 `content.ts`，使用 `Article` 组件包裹文章内容, 并根据主题设置相应的 class：

```typescript
// content.ts
// ... (其他导入)
import Article from "./components/Article";
import { createRoot } from "react-dom/client";

// ... (其他代码)

async function toggleReadingMode() {
  const article = new Readability(document).parse();

  if (article) {
    // 清空 body
    document.body.innerHTML = "";
    // 创建一个 div 作为 React 根节点
    const rootDiv = document.createElement("div");
    document.body.appendChild(rootDiv);

    // 使用 createRoot 创建根实例
    const root = createRoot(rootDiv);
    // 使用 Article 组件渲染内容
    root.render(<Article content={article.content} />);
  }
}
```

- **步骤 3.4: 注入时机和方式**
  - 考虑只在用户需要时 (例如点击 popup 中的按钮) 才注入 `content` 脚本, 可以选择不在 `manifest.json` 的 `content_scripts` 字段中配置, 而是通过 `chrome.scripting.executeScript` API 动态注入。这样可以提高性能，并避免不必要的干扰。

```typescript
// background.ts
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/content/content.ts"],
    });
  }
});
```

- **步骤 3.5: 错误处理**
  - 在 `content.ts` 中添加 `try...catch` 块，捕获 Readability.js 解析错误或其他 DOM 操作错误。
  - 向用户显示友好的错误提示，例如 "无法提取当前页面的正文内容"。
- **步骤 3.6: 日志记录**
  - 在 `content.ts` 的关键步骤中添加日志记录，例如正文提取成功、阅读模式切换成功等。

**4. **`popup`** 模块开发**

- **步骤 4.1: 创建 **`Popup.tsx`
  - 在 `src/popup` 目录下创建 `Popup.tsx` 文件。
- **步骤 4.2: 设计 UI 界面**
  - 使用 Tailwind CSS 设计 `popup` 的 UI 界面，包括：
    - "进入/退出阅读模式" 按钮 (可以使用 `ui` 模块中的 `Button` 组件)。
    - 主题切换控件 (可以使用 `ui` 模块中的 `Select` 或 `RadioGroup` 组件)。
    - 字体大小调整控件 (可以使用 `ui` 模块中的 `Slider` 组件)。
  - 在 `src/popup/components` 下创建 popup 相关的组件, 如 `ThemeSelector.tsx`, `FontSizeSelector.tsx`。
- **步骤 4.3: 状态管理**
  - 使用 Zustand 管理 `popup` 的状态，例如当前主题、字体大小等。
- **步骤 4.4: 事件处理**
  - 为 UI 控件添加事件监听器，例如：
    - 点击"进入/退出阅读模式"按钮，向 `content` 脚本发送消息。可以使用 `chrome.tabs.sendMessage` 发送消息。

```typescript
// popup/Popup.tsx
import React from "react";
import useAppStore from "../store";

const Popup: React.FC = () => {
  const toggleReadingMode = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "TOGGLE_READING_MODE" });
      }
    });
  };

  return (
    <div>
      <button onClick={toggleReadingMode}>切换阅读模式</button>
    </div>
  );
};

export default Popup;
```

        * 改变主题选项，更新 Zustand 中的状态，并通过 `storage` 模块将设置保存到 `chrome.storage.sync` 中。
        * 调整字体大小，更新 Zustand 中的状态，并通过 `storage` 模块将设置保存到 `chrome.storage.sync` 中。
    - 从 `storage` 模块中读取用户的配置，并初始化 UI 控件的状态。例如，在 `Popup.tsx` 中：

```typescript
import { useEffect } from "react";
// ... 其他引入
import { getStorage } from "../storage/storage";

const Popup: React.FC = () => {
  // ... 其他代码

  useEffect(() => {
    const initSettings = async () => {
      const savedTheme = await getStorage<string>(StorageKeys.THEME, "sync");
      const savedFontSize = await getStorage<number>(
        StorageKeys.FONT_SIZE,
        "sync"
      );

      if (savedTheme) {
        setTheme(savedTheme as "light" | "dark");
      }
      if (savedFontSize) {
        setFontSize(savedFontSize);
      }
    };

    initSettings();
  }, []);

  // ... 其他代码
};
```

- **步骤 4.5: UI 反馈**
  - 为用户的操作提供明显的 UI 反馈，例如：
    - 点击按钮时，按钮的背景颜色或边框颜色发生变化。
    - 切换主题时，`popup` 的背景颜色也随之改变。

**5. **`background`** 模块开发 (可选)**

- **步骤 5.1: 创建 **`background.ts`
  - 在 `src/background` 目录下创建 `background.ts`。
- **步骤 5.2: 监听事件**
  - 监听 `chrome.runtime.onInstalled` 事件，在插件安装或更新时执行一些初始化操作 (例如设置默认配置)。
  - 通过 `chrome.runtime.onMessage.addListener` 监听 `content.ts` 或 `popup.ts` 发来的消息。
- **步骤 5.3: 注入 **`content`** 脚本**
  - 如果决定不在 `manifest.json` 中静态声明 `content_scripts`，则可以在 `background.ts` 中监听用户操作 (例如点击 `popup` 中的按钮)，然后使用 `chrome.scripting.executeScript` API 动态注入 `content.ts`：

```typescript
// background.ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_CONTENT_SCRIPT") {
    if (sender.tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        files: ["src/content/content.ts"],
      });
    }
  }
});
```

同时, 修改 `popup.tsx`:

```typescript
// popup/Popup.tsx
// ... 其他引入
const Popup: React.FC = () => {
  const toggleReadingMode = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        // chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_READING_MODE' });
        // 向 background 发送消息，让其注入 content 脚本
        chrome.runtime.sendMessage({ action: "INJECT_CONTENT_SCRIPT" });
      }
    });
  };
  // ... 其他代码
};
```

- **步骤 5.4: 考虑替代方案**
  - 认真考虑是否可以用 `content` 或 `popup` 实现 `background` 的功能，尽量减少 `background` 的使用。例如，可以将注入 `content` 脚本的逻辑放在 `popup` 中。

**6. **`options`** 模块开发 (可选)**

如果 `popup` 中的设置项不多，可以暂时不开发 `options` 模块，将该模块放到后续的 Sprint 中。

**三、 测试要求**

- **单元测试:** 为 `storage`、`utils` 模块中的函数编写单元测试用例，可以使用 Jest 或 Vitest。
- **集成测试:** 测试 `content`、`popup` 和 `background` (如果存在) 模块之间的交互是否正常。
- **E2E 测试:** 使用 Cypress 或 Puppeteer 编写 E2E 测试用例，模拟用户的操作流程，例如：
  - 打开一个网页，点击插件图标。
  - 点击"进入阅读模式"按钮，验证正文内容是否被正确提取，页面样式是否符合预期。
  - 切换主题，验证页面样式是否发生变化。
  - 调整字体大小，验证页面字体大小是否发生变化。
- **兼容性测试:** 在不同版本的 Chrome 浏览器上进行测试，确保插件的兼容性。
- **性能测试:** 使用 Chrome DevTools 的 Performance 面板对 `content` 脚本的执行效率进行性能测试，确保不会影响网页的加载速度。

**四、 文档**

- **API 文档:** 为 `storage`、`utils` 模块中的函数编写 API 文档，说明函数的作用、参数、返回值等信息。可以使用 JSDoc 或 TypeScript 的类型定义来生成 API 文档。
- **设计文档:** 记录 Sprint 1 的设计思路和决策过程，例如为什么选择某种技术方案、如何处理某些边界情况等。

**五、 注意事项**

- **代码规范:** 遵循 ESLint 和 Prettier 的代码规范，保持代码风格的一致性。
- **提交信息:** 编写清晰、简洁的 Git 提交信息，说明每次提交的目的和修改内容。
- **沟通:** 团队成员之间要保持密切沟通，及时同步开发进度和遇到的问题。
- **Code Review:** 可以进行 Code Review，互相检查代码，提高代码质量。

**六、 总结**

Sprint 1 的开发工作主要围绕搭建项目基础框架和实现阅读模式的基本功能展开。通过合理的任务分解、详细的开发步骤、明确的设计要点、严格的测试要求和完善的文档，可以确保 Sprint 1 的开发工作高效、有序地进行。

请根据你的团队的实际情况和开发能力对上述计划进行调整。在开发过程中，要灵活应变，不断学习，持续改进。祝你和你的团队开发顺利！
