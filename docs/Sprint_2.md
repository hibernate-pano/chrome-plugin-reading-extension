**Chrome 阅读增强插件 - Sprint 2 开发指导文档**

****

**目标:**  实现 AI 智能分段和 AI 翻译 (集成 Google Translate API) 功能, 并进行初步的测试。

**时间预估:** 根据团队实际情况预估。

**一、 任务分解**

Sprint 2 的主要任务可以分解为以下几个部分：

1. `ai`** 模块开发 (OpenAI API 集成):**
    - 创建 `ai` 目录和 `openai.ts` 文件。
    - 封装 OpenAI API 的调用，实现 AI 分段功能。
    - 设计 prompt，指导 AI 进行分段。
    - 处理 API 密钥的安全性。
    - 编写单元测试用例。
2. `content`** 模块集成 AI 分段:**
    - 将提取的正文传递给 `ai` 模块。
    - 接收 `ai` 模块返回的分段结果。
    - 将分段后的文本渲染到页面。
    - 允许用户手动调整分段 (可选)。
3. `ai`** 模块开发 (Google Translate API 集成):**
    - 在 `ai` 目录下创建 `google-translate.ts` (或类似名称) 文件。
    - 封装 Google Translate API 的调用，实现文本翻译功能。
    - 编写单元测试用例。
4. `popup`** 模块集成翻译功能:**
    - 添加翻译功能的 UI 控件 (例如选择文本后出现的翻译图标或按钮)。
    - 添加翻译语言选择的 UI 控件 (例如下拉菜单)。
    - 调用 `ai` 模块的翻译功能。
    - 展示翻译结果。
5. `content`** 模块集成翻译功能:**
    - 处理选中的文本。
    - 将选中的文本传递给 `ai` 模块。
    - 接收 `ai` 模块返回的翻译结果。
    - 展示翻译结果 (例如在选中文本下方或旁边显示翻译结果)。
6. **测试:**
    - 单元测试。
    - 集成测试。
    - E2E 测试。

**二、 开发步骤与设计要点**

**1. **`ai`** 模块开发 (OpenAI API 集成)**

+ **步骤 1.1: 创建 **`openai.ts`
    - 在 `src/ai` 目录下创建 `openai.ts` 文件。
+ **步骤 1.2: 封装 OpenAI API 调用**
    - 安装 OpenAI 官方 Node.js 库 (可选, 你也可以直接使用 `fetch`):

```bash
npm install openai
```

    - 参考 OpenAI API 文档，使用 `openai` 提供的 `chat.completions` 接口实现文本分段功能。

```typescript
// ai/openai.ts
import { getStorage } from '../storage/storage';
import { StorageKeys } from '../types';
import OpenAI from 'openai';

export async function getOpenAI() {
  const apiKey = await getStorage<string>(StorageKeys.OPENAI_API_KEY, 'local'); // 假设存储在 local 中
  if (!apiKey) {
    throw new Error('OpenAI API key not found in storage.');
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

export async function smartParagraphSegmentation(text: string): Promise<string[]> {
  const openai = await getOpenAI();
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // 或更新的模型
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that divides text into paragraphs based on semantic coherence.',
        },
        {
          role: 'user',
          content: `Please divide the following text into paragraphs based on semantic coherence and content relatedness. Maintain the original order of sentences and ensure a logical flow between paragraphs.`

          Text:
            ${text}
            Paragraphs:,
                },
              ],
            });
            // 需要根据 OpenAI API 的返回格式进行解析
            const segmentedText = response.choices[0].message.content;
            if (!segmentedText) {
              return [];
            }
            return segmentedText.split('\n\n'); // 假设返回的文本中段落之间用两个换行符分隔
          } catch (error) {
            console.error('Error calling OpenAI API:', error);
            throw new Error('Failed to segment text.');
          }
        }
       
```

 也可以直接使用 fetch` API:

```typescript
// ai/openai.ts
import { getStorage } from '../storage/storage';
import { StorageKeys } from '../types';
async function callOpenAI(
  messages: any[],
  model = 'gpt-3.5-turbo'
) {
  const apiKey = await getStorage<string>(StorageKeys.OPENAI_API_KEY, 'local'); // 假设存储在 local 中

  if (!apiKey) {
    throw new Error('OpenAI API key not found in storage.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `OpenAI API error: ${response.status} ${
        response.statusText
      } - ${JSON.stringify(errorData)}`
    );
  }

  return await response.json();
}

export async function smartParagraphSegmentation(text: string): Promise<string[]> {
  try {
    const response = await callOpenAI([
      {
        role: 'system',
        content:
          'You are a helpful assistant that divides text into paragraphs based on semantic coherence.',
      },
      {
        role: 'user',
        content: `Please divide the following text into paragraphs based on semantic coherence and content relatedness. Maintain the original order of sentences and ensure a logical flow between paragraphs.
        Text:
${text}
Paragraphs:`,
              },
            ]);
            // 需要根据 OpenAI API 的返回格式进行解析
            const segmentedText = response.choices[0].message.content;
            if (!segmentedText) {
              return [];
            }
            return segmentedText.split('\n\n'); // 假设返回的文本中段落之间用两个换行符分隔
          } catch (error) {
            console.error('Error calling OpenAI API:', error);
            throw new Error('Failed to segment text.');
          }
        }
```

+ **步骤 1.3: 设计 Prompt**
    - 精心设计 prompt，指导 GPT 模型进行分段。例如，你可以使用类似以下的 prompt：

```plain
"Please divide the following text into paragraphs based on semantic coherence and content relatedness. Maintain the original order of sentences and ensure a logical flow between paragraphs.

Text:
[需要分段的文本]

Paragraphs:"
```

    - 不断测试和优化 prompt，以获得最佳的分段效果。
+ **步骤 1.4: API 密钥安全性**
    - **不要将 API 密钥硬编码到代码中。**
    - 考虑让用户在使用时自行输入自己的 OpenAI API Key，并将其存储在 `chrome.storage.local` 中 (注意：`chrome.storage.sync` 会同步到云端，不适合存储敏感信息)。在 `options` 页面提供输入框.

```typescript
// options/Options.tsx
import React, { useState, useEffect } from 'react';
import { getStorage, setStorage } from '../storage/storage';
import { StorageKeys } from '../types';

const Options: React.FC = () => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const loadApiKey = async () => {
      const storedApiKey = await getStorage<string>(
        StorageKeys.OPENAI_API_KEY,
        'local'
      );
      if (storedApiKey) {
        setApiKey(storedApiKey);
      }
    };

    loadApiKey();
  }, []);

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };

  const handleSave = async () => {
    await setStorage(StorageKeys.OPENAI_API_KEY, apiKey, 'local');
    alert('API Key saved successfully.');
  };

  return (
    <div>
      <h1>Options</h1>

      <div>
        <label htmlFor="api-key">OpenAI API Key:</label>

        <input
          type="text"
          id="api-key"
          value={apiKey}
          onChange={handleApiKeyChange}
        />
      </div>

      <button onClick={handleSave}>Save</button>

    </div>

  );
};

export default Options;
```

修改 `manifest.json`:

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
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.ts"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "src/background/background.ts"
  },
  "options_page": "options.html" // 增加这行
}
```

添加 `options.html` 到 `public` 目录下。

    - 在 `popup` 或 `content` 脚本中检查用户是否已经输入了 API 密钥，如果没有，提示用户输入。
+ **步骤 1.5: 错误处理**
    - 使用 `try...catch` 捕获 API 调用过程中可能出现的错误，例如网络错误、API 密钥错误等，并向用户显示友好的错误提示。
+ **步骤 1.6: 编写单元测试**
    - 使用 Jest 或 Vitest 为 `openai.ts` 中的函数编写单元测试用例，模拟 API 的返回结果，测试函数的逻辑是否正确。

**2. **`content`** 模块集成 AI 分段**

+ **步骤 2.1: 传递文本**
    - 在 `content.ts` 中，将提取的正文文本传递给 `ai` 模块的 `smartParagraphSegmentation` 函数。
+ **步骤 2.2: 接收分段结果**
    - `smartParagraphSegmentation` 函数返回分段后的文本数组。
+ **步骤 2.3: 渲染分段结果**
    - 将分段后的文本数组渲染到页面上。可以根据分段结果，创建多个 `<p>` 标签或其他合适的 HTML 元素。
    - 更新 `content/components/Article.tsx` 组件, 根据分段结果渲染:

```tsx
// content/components/Article.tsx
import React, { useEffect, useState } from 'react';
import useAppStore from '../../store';
import './Article.css';
import { smartParagraphSegmentation } from '../../ai/openai';

interface ArticleProps {
  content: string;
}

const Article: React.FC<ArticleProps> = ({ content }) => {
  const theme = useAppStore((state) => state.theme);
  const [paragraphs, setParagraphs] = useState<string[]>([]);

  useEffect(() => {
    const segmentText = async () => {
      try {
        const segments = await smartParagraphSegmentation(content);
        setParagraphs(segments);
      } catch (error) {
        console.error('Failed to segment text:', error);
        setParagraphs([content]); // Fallback to original content
      }
    };

    segmentText();
  }, [content]);

  return (
    <div id="my-reading-content" className={`my-reading-mode ${theme}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>

      ))}
    </div>

  );
};

export default Article;
```

+ **步骤 2.4: 手动调整 (可选)**
    - 可以考虑允许用户手动调整 AI 分段的结果，例如合并或拆分段落。这需要添加额外的 UI 控件和事件处理逻辑。

**3. **`ai`** 模块开发 (Google Translate API 集成)**

+ **步骤 3.1: 创建 **`google-translate.ts`
    - 在 `src/ai` 目录下创建 `google-translate.ts` 文件。
+ **步骤 3.2: 封装 Google Translate API 调用**
    - 参考 Google Translate API 文档，使用 `fetch` API 发送 HTTP 请求到 Google Translate API。

```typescript
// ai/google-translate.ts
import { getStorage } from '../storage/storage';
import { StorageKeys } from '../types';

async function callGoogleTranslateApi(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'auto'
) {
  const apiKey = await getStorage<string>(
    StorageKeys.GOOGLE_TRANSLATE_API_KEY,
    'local'
  );

  if (!apiKey) {
    throw new Error('Google Translate API key not found in storage.');
  }

  const encodedParams = new URLSearchParams();
  encodedParams.set('q', text);
  encodedParams.set('target', targetLanguage);
  encodedParams.set('source', sourceLanguage);

  const url =
    'https://translation.googleapis.com/language/translate/v2?' +
    encodedParams.toString();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Google Translate API error: ${response.status} ${
        response.statusText
      } - ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();
  return data;
}

export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  try {
    const response = await callGoogleTranslateApi(text, targetLanguage);
    const translatedText = response.data.translations[0].translatedText;
    return translatedText;
  } catch (error) {
    console.error('Error calling Google Translate API:', error);
    throw new Error('Failed to translate text.');
  }
}
```

    - 你也可以使用第三方库简化 API 调用。
    - 实现文本翻译功能，支持设置目标语言和源语言 (可选)。
+ **步骤 3.3: API 密钥安全性**
    - 同样，不要将 API 密钥硬编码到代码中。让用户自行输入并存储在 `chrome.storage.local`。
+ **步骤 3.4: 错误处理**
    - 使用 `try...catch` 捕获 API 调用过程中可能出现的错误，并向用户显示友好的错误提示。
+ **步骤 3.5: 编写单元测试**
    - 为 `google-translate.ts` 中的函数编写单元测试用例。

**4. **`popup`** 模块集成翻译功能**

+ **步骤 4.1: 添加 UI 控件**
    - 在 `popup` 中添加触发翻译功能的 UI 控件。例如，当用户选中一段文本后，显示一个"翻译"图标或按钮。
+ **步骤 4.2: 添加语言选择 UI**
    - 在 `popup` 中添加选择目标语言的 UI 控件，例如下拉菜单，并监听其 `change` 事件。可以使用 `ui` 模块中封装的通用组件。
+ **步骤 4.3: 调用翻译功能**
    - 当用户点击"翻译"按钮时，获取选中的文本，并调用 `ai` 模块的 `translateText` 函数进行翻译。
+ **步骤 4.4: 展示翻译结果**
    - 将翻译结果显示在 `popup` 中。可以在 `popup` 中创建一个专门的区域来显示翻译结果，或者使用 `tooltip` 等方式展示。

**5. **`content`** 模块集成翻译功能**

+ **步骤 5.1: 处理选中的文本**
    - 在 `content.ts` 中，监听用户的鼠标事件 (例如 `mouseup`)，判断用户是否选中了文本。可以使用 `window.getSelection()` 获取选中的文本。
+ **步骤 5.2: 传递选中的文本**
    - 如果用户选中了文本，将选中的文本和目标语言 (如果用户在 `popup` 中选择了) 传递给 `ai` 模块的 `translateText` 函数。
+ **步骤 5.3: 接收翻译结果**
    - `translateText` 函数返回翻译后的文本。
+ **步骤 5.4: 展示翻译结果**
    - 将翻译结果展示给用户。可以采用以下几种方式：
        * **在选中文本下方或旁边显示一个小型的翻译窗口。**
        * **使用 tooltip 显示翻译结果。**
        * **替换选中的文本 (不推荐，会破坏原文)。**
    - 添加 `content/components/TranslateModal.tsx` (或其他类似名称) 组件，用来控制翻译窗口的显示, 可以参考以下代码：

```tsx
// content/components/TranslateModal.tsx
import React, { useState, useEffect } from 'react';
import { translateText } from '../../ai/google-translate';
import { getStorage } from '../../storage/storage';
import { StorageKeys } from '../../types';
import './TranslateModal.css';

interface TranslateModalProps {
  selectedText: string;
  top: number;
  left: number;
}

const TranslateModal: React.FC<TranslateModalProps> = ({
  selectedText,
  top,
  left,
}) => {
  const [translatedText, setTranslatedText] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('zh-CN'); // 默认翻译成中文
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchTranslation = async () => {
      try {
        const savedTargetLanguage = await getStorage<string>(
          StorageKeys.TARGET_LANGUAGE,
          'sync'
        );
        if (savedTargetLanguage) {
          setTargetLanguage(savedTargetLanguage);
        }
        const translation = await translateText(selectedText, targetLanguage);
        setTranslatedText(translation);
        setShowModal(true);
      } catch (error) {
        console.error('Failed to translate text:', error);
        setTranslatedText('翻译失败');
      }
    };

    if (selectedText) {
      fetchTranslation();
    } else {
      setShowModal(false);
    }
  }, [selectedText, targetLanguage]);

  const handleClose = () => {
    setShowModal(false);
  };

  return showModal ? (
    <div
      className="translate-modal"
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 1000,
      }}
    >
      <div className="translate-modal-content">
        <p>{translatedText}</p>

        <button onClick={handleClose}>关闭</button>

      </div>

    </div>

  ) : null;
};

export default TranslateModal;
```

    - 修改 `content.ts`，监听鼠标事件，并渲染 `TranslateModal` 组件：

```typescript
// content.ts
import { createRoot } from 'react-dom/client';
// ... 其他引入
import TranslateModal from './components/TranslateModal';

let translateModalRoot: any = null;

document.addEventListener('mouseup', (event) => {
  const selectedText = window.getSelection()?.toString().trim();
  if (selectedText) {
    const range = window.getSelection()!.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!translateModalRoot) {
      const modalContainer = document.createElement('div');
      document.body.appendChild(modalContainer);
      translateModalRoot = createRoot(modalContainer);
    }

    translateModalRoot.render(
      <TranslateModal
        selectedText={selectedText}
        top={rect.bottom + window.scrollY}
        left={rect.left + window.scrollX}
      />
    );
  } else {
    if (translateModalRoot) {
      translateModalRoot.unmount();
      translateModalRoot = null;
    }
  }
});
```

**三、 测试要求**

+ **单元测试:**
    - 为 `ai` 模块中的 `openai.ts` 和 `google-translate.ts` 编写单元测试用例，模拟 API 的返回结果，测试函数的逻辑是否正确。
+ **集成测试:**
    - 测试 `content` 模块与 `ai` 模块的集成是否正常，例如 `content` 模块是否正确地将文本传递给了 `ai` 模块，`ai` 模块是否返回了正确的结果，`content` 模块是否正确地将结果渲染到了页面上。
+ **E2E 测试:**
    - 编写 E2E 测试用例，模拟用户的操作流程，例如：
        * 打开一个网页，点击插件图标，进入阅读模式。
        * 选中一段文本，触发翻译功能，验证翻译结果是否正确。
        * 使用 AI 分段功能，验证分段结果是否合理。

**四、 文档**

+ **API 文档:**
    - 为 `ai` 模块中的函数编写 API 文档，说明函数的作用、参数、返回值等信息。
+ **设计文档:**
    - 记录 Sprint 2 的设计思路和决策过程，例如为什么选择某种技术方案、如何处理某些边界情况等。

**五、 注意事项**

+ **代码规范:**  遵循 ESLint 和 Prettier 的代码规范，保持代码风格的一致性。
+ **提交信息:**  编写清晰、简洁的 Git 提交信息，说明每次提交的目的和修改内容。
+ **沟通:**  团队成员之间要保持密切沟通，及时同步开发进度和遇到的问题。
+ **Code Review:**  可以进行 Code Review，互相检查代码，提高代码质量。
+ **API 密钥管理:**  再次强调，不要将 API 密钥硬编码到代码中，确保 API 密钥的安全性。

**六、 总结**

Sprint 2 的开发工作主要围绕 AI 功能的实现展开，包括 AI 智能分段和 AI 翻译。通过合理的任务分解、详细的开发步骤、明确的设计要点、严格的测试要求和完善的文档，可以确保 Sprint 2 的开发工作高效、有序地进行。同时需要注意 API 密钥的管理和代码质量控制。

请根据你的团队的实际情况和开发能力对上述计划进行调整。在开发过程中，要灵活应变，不断学习，持续改进。祝你和你的团队开发顺利！

