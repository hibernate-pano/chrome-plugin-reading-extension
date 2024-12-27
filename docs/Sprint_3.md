**Chrome 阅读增强插件 - Sprint 3 开发指导文档**

**目标:** 集成 Google 翻译和 Microsoft 翻译两种翻译引擎，完善翻译功能，并进行充分的测试。

**时间预估:** 根据团队实际情况预估。

**一、 任务分解**

Sprint 3 的主要任务可以分解为以下几个部分：

1. `ai`** 模块开发 (翻译引擎基类和 Google 翻译):**
    - 创建 `ai/base-translate.ts`，提取 Google 翻译和 Microsoft 翻译的公共逻辑。
    - 创建 `ai/google-translate.ts`，封装 Google Translate API 的调用，继承 `base-translate.ts`。
    - 定义 `Translator` 接口。
    - 定义自定义错误类型。
    - 添加详细的日志记录。
    - 编写单元测试用例。
2. `ai`** 模块开发 (Microsoft 翻译 API 集成):**
    - 创建 `ai/microsoft-translate.ts`，封装 Microsoft 翻译 API 的调用，继承 `base-translate.ts`。
    - 处理 API 密钥/区域 的安全性。
    - 编写单元测试用例。
3. `popup`** 模块完善:**
    - 添加切换翻译引擎的 UI 控件。
    - 根据用户选择的翻译引擎，调用 `ai` 模块中相应的翻译函数。
    - 优化翻译结果的展示，添加 loading 状态。
    - 记住用户的翻译引擎和目标语言选择。
4. `content`** 模块完善:**
    - 根据用户选择的翻译引擎，调用 `ai` 模块中相应的翻译函数。
    - 优化翻译结果的展示，添加 loading 状态。
    - 统一 `popup` 和 `content` 中翻译结果的展示样式。
5. **测试:**
    - 单元测试 (包括 `base-translate.ts`)。
    - 集成测试。
    - E2E 测试。

**二、 开发步骤与设计要点**

**1. **`ai`** 模块开发 (翻译引擎基类和 Google 翻译)**

+ **步骤 1.1: 创建 **`base-translate.ts`
    - 在 `src/ai` 目录下创建 `base-translate.ts` 文件，定义 `Translator` 接口和自定义错误类型：

```typescript
// ai/base-translate.ts
export interface Translator {
  translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string>;
}

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TranslateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslateError';
  }
}

// 可以添加其他错误类型
```

    - 提取 `google-translate.ts` 和 `microsoft-translate.ts` 中的公共逻辑到 `base-translate.ts` 中，例如发送 HTTP 请求、处理错误等。可以创建一个抽象类 `BaseTranslator` 实现 `Translator` 接口，并封装公共方法。

```typescript
// ai/base-translate.ts
import { getStorage } from '../storage/storage';
import { StorageKeys } from '../types';

// ... 接口和错误类型定义

export abstract class BaseTranslator implements Translator {
  abstract translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string>;

  protected async getApiKey(key: StorageKeys): Promise<string> {
    const apiKey = await getStorage<string>(key, 'local');
    if (!apiKey) {
      throw new ApiKeyError(`${key} not found in storage.`);
    }
    return apiKey;
  }

  protected async handleApiError(response: Response): Promise<never> {
    const errorData = await response.json();
    throw new TranslateError(
      `API error: ${response.status} ${response.statusText} - ${JSON.stringify(
        errorData
      )}`
    );
  }
}
```

+ **步骤 1.2: 创建 **`google-translate.ts`
    - 在 `src/ai` 目录下创建 `google-translate.ts` 文件。

```typescript
// ai/google-translate.ts
import { BaseTranslator, TranslateError } from './base-translate';
import { StorageKeys } from '../types';

export class GoogleTranslator extends BaseTranslator {
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'auto'
  ): Promise<string> {
    try {
      const apiKey = await this.getApiKey(StorageKeys.GOOGLE_TRANSLATE_API_KEY);
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
        return this.handleApiError(response);
      }

      const data = await response.json();
      return data.data.translations[0].translatedText;
    } catch (error) {
      console.error('Error calling Google Translate API:', error);
      if (error instanceof TranslateError) {
        throw error;
      } else {
        throw new TranslateError('Failed to translate text.');
      }
    }
  }
}
```

+ **步骤 1.3: 实现 **`GoogleTranslator`** 类**
    - `GoogleTranslator` 类继承 `BaseTranslator`，并实现 `translateText` 方法。
+ **步骤 1.4: 错误处理**
    - 使用 `try...catch` 捕获 API 调用过程中可能出现的错误，并抛出自定义的错误类型。
+ **步骤 1.5: 日志记录**
    - 在关键步骤添加日志记录，例如 API 请求的 URL、参数、返回结果等。
+ **步骤 1.6: 编写单元测试**
    - 为 `base-translate.ts` 和 `google-translate.ts` 中的函数编写单元测试用例，可以使用 Mock 数据来模拟 API 的返回结果。

**2. **`ai`** 模块开发 (Microsoft 翻译 API 集成)**

+ **步骤 2.1: 创建 **`microsoft-translate.ts`
    - 在 `src/ai` 目录下创建 `microsoft-translate.ts` 文件。

```typescript
// ai/microsoft-translate.ts
import { BaseTranslator, TranslateError } from './base-translate';
import { StorageKeys } from '../types';

export class MicrosoftTranslator extends BaseTranslator {
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'auto'
  ): Promise<string> {
    try {
      const apiKey = await this.getApiKey(StorageKeys.MICROSOFT_TRANSLATE_API_KEY);
      const region = await getStorage<string>(
        StorageKeys.MICROSOFT_TRANSLATE_API_REGION,
        'local'
      );

      if (!region) {
        throw new Error('Microsoft Translate API region not found in storage.');
      }

      const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLanguage}&from=${sourceLanguage}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify([{ text }]),
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      const data = await response.json();
      return data[0].translations[0].text;
    } catch (error) {
      console.error('Error calling Microsoft Translate API:', error);
      if (error instanceof TranslateError) {
        throw error;
      } else {
        throw new TranslateError('Failed to translate text.');
      }
    }
  }
}
```

+ **步骤 2.2: 实现 **`MicrosoftTranslator`** 类**
    - `MicrosoftTranslator` 类继承 `BaseTranslator`，并实现 `translateText` 方法。
+ **步骤 2.3: API 密钥和区域安全性**
    - 从 `chrome.storage.local` 中读取用户输入的 API 密钥和区域。
+ **步骤 2.4: 错误处理**
    - 使用 `try...catch` 捕获 API 调用过程中可能出现的错误，并抛出自定义的错误类型。
+ **步骤 2.5: 日志记录**
    - 在关键步骤添加日志记录。
+ **步骤 2.6: 编写单元测试**
    - 为 `microsoft-translate.ts` 中的函数编写单元测试用例。

**3. **`popup`** 模块完善**

+ **步骤 3.1: 添加切换翻译引擎的 UI 控件**
    - 在 `popup` 中添加选择翻译引擎的 UI 控件，例如下拉菜单或单选按钮, 可以使用 `ui` 目录中封装的组件。
    - 修改 `popup/Popup.tsx`，添加切换翻译引擎的功能。

```tsx
// popup/Popup.tsx
// ... 其他引入
import { setStorage, getStorage } from '../storage/storage';
import { StorageKeys } from '../types';

const Popup: React.FC = () => {
  // ... 其他代码

  const [currentEngine, setCurrentEngine] = useState<'google' | 'microsoft'>(
    'google'
  );

  useEffect(() => {
    const initSettings = async () => {
      // ... 其他代码
      const savedEngine = await getStorage<string>(
        StorageKeys.CURRENT_TRANSLATE_ENGINE,
        'sync'
      );
      if (savedEngine) {
        setCurrentEngine(savedEngine as 'google' | 'microsoft');
      }
    };

    initSettings();
  }, []);

  const handleEngineChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newEngine = event.target.value as 'google' | 'microsoft';
    setCurrentEngine(newEngine);
    setStorage(StorageKeys.CURRENT_TRANSLATE_ENGINE, newEngine, 'sync');
  };

  return (
    <div>
      <button onClick={toggleReadingMode}>切换阅读模式</button>

      <select value={currentEngine} onChange={handleEngineChange}>
        <option value="google">Google Translate</option>

        <option value="microsoft">Microsoft Translate</option>

      </select>

    </div>

  );
};

export default Popup;
```

+ **步骤 3.2: 根据选择调用不同的翻译函数**
    - 根据用户选择的翻译引擎，调用 `ai` 模块中相应的翻译函数 (例如 `googleTranslator.translateText` 或 `microsoftTranslator.translateText`)。
    - 可以修改 `TranslateModal.tsx` 组件, 添加 `engine` 属性, 根据不同的引擎调用对应的翻译函数。
+ **步骤 3.3: 优化翻译结果展示**
    - 美化翻译结果的展示样式，使其更易于阅读。
    - 添加 loading 状态，在翻译过程中显示 loading 动画，提升用户体验。
+ **步骤 3.4: 记住用户的选择**
    - 将用户选择的翻译引擎和目标语言保存在 `chrome.storage.sync` 中，下次使用时自动应用。

**4. **`content`** 模块完善**

+ **步骤 4.1: 根据选择调用不同的翻译函数**
    - 根据用户在 `popup` 中选择的翻译引擎 (可以在 `chrome.storage.sync` 中读取)，调用 `ai` 模块中相应的翻译函数。
    - 修改 `content/components/TranslateModal.tsx`:

```tsx
// content/components/TranslateModal.tsx
import React, { useState, useEffect } from 'react';
import { GoogleTranslator } from '../../ai/google-translate';
import { MicrosoftTranslator } from '../../ai/microsoft-translate';
import { getStorage } from '../../storage/storage';
import { StorageKeys } from '../../types';
import './TranslateModal.css';

interface TranslateModalProps {
  selectedText: string;
  top: number;
  left: number;
  currentEngine: 'google' | 'microsoft';
}

const TranslateModal: React.FC<TranslateModalProps> = ({
  selectedText,
  top,
  left,
  currentEngine,
}) => {
  const [translatedText, setTranslatedText] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('zh-CN'); // 默认翻译成中文
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTranslation = async () => {
      setIsLoading(true);
      try {
        const savedTargetLanguage = await getStorage<string>(
          StorageKeys.TARGET_LANGUAGE,
          'sync'
        );
        if (savedTargetLanguage) {
          setTargetLanguage(savedTargetLanguage);
        }
        let translation = '';
        const googleTranslator = new GoogleTranslator();
        const microsoftTranslator = new MicrosoftTranslator();

        if (currentEngine === 'google') {
          translation = await googleTranslator.translateText(
            selectedText,
            targetLanguage
          );
        } else if (currentEngine === 'microsoft') {
          translation = await microsoftTranslator.translateText(
            selectedText,
            targetLanguage
          );
        }
        setTranslatedText(translation);
      } catch (error) {
        console.error('Failed to translate text:', error);
        setTranslatedText('翻译失败');
      } finally {
        setIsLoading(false);
        setShowModal(true);
      }
    };

    if (selectedText) {
      fetchTranslation();
    } else {
      setShowModal(false);
    }
  }, [selectedText, targetLanguage, currentEngine]);

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
        {isLoading ? (
          <p>正在翻译中...</p>

        ) : (
          <>
            <p>{translatedText}</p>

            <button onClick={handleClose}>关闭</button>

          </>
        )}
      </div>

    </div>

  ) : null;
};

export default TranslateModal;
```

+ **步骤 4.2: 优化翻译结果展示**
    - 可以使用与 `popup` 中一致的 UI 组件来展示翻译结果，保持 UI 的一致性。
    - 添加 loading 状态。

**5. **`options`** 模块开发 (根据实际情况决定是否放在当前 Sprint)**

+ **步骤 5.1: 创建 **`options`** 模块**
    - 创建 `options` 模块的页面 `options.tsx`, 并在 `public` 目录下创建 `options.html`。
    - 修改 `manifest.json`, 添加：

```plain
...
"options_page": "options.html"
...
```

+ **步骤 5.2: 添加 Microsoft 翻译 API 配置项**
    - 在 `Options.tsx` 中添加 Microsoft 翻译 API 密钥和区域的配置项。
+ **步骤 5.3: 保存配置信息**
    - 将用户输入的 API 密钥和区域保存到 `chrome.storage.local` 中。

**三、 测试要求**

+ **单元测试:**
    - 为 `base-translate.ts`、`google-translate.ts` 和 `microsoft-translate.ts` 中的函数编写单元测试用例，模拟 API 的返回结果，测试函数的逻辑是否正确。
+ **集成测试:**
    - 测试 `content`、`popup` 和 `ai` 模块的集成是否正常，特别是不同翻译引擎的切换是否正常。
+ **E2E 测试:**
    - 编写 E2E 测试用例，模拟用户的操作流程，例如：
        * 打开一个网页，点击插件图标，进入阅读模式。
        * 选中一段文本，触发翻译功能，选择 Google 翻译引擎，验证翻译结果是否正确。
        * 选中一段文本，触发翻译功能，选择 Microsoft 翻译引擎，验证翻译结果是否正确。
        * 切换不同的目标语言，验证翻译结果是否正确。
        * 测试网络异常的情况。
        * 测试 API 密钥错误的情况。

**四、 文档**

+ **API 文档:**
    - 为 `ai` 模块中的 `base-translate.ts`、`google-translate.ts` 和 `microsoft-translate.ts`  函数编写 API 文档，说明函数的作用、参数、返回值等信息。
+ **设计文档:**
    - 记录 Sprint 3 的设计思路和决策过程，例如为什么选择某种技术方案、如何处理某些边界情况等。

**五、 注意事项**

+ **代码规范:**  遵循 ESLint 和 Prettier 的代码规范，保持代码风格的一致性。
+ **提交信息:**  编写清晰、简洁的 Git 提交信息，说明每次提交的目的和修改内容。
+ **沟通:**  团队成员之间要保持密切沟通，及时同步开发进度和遇到的问题。
+ **Code Review:**  可以进行 Code Review，互相检查代码，提高代码质量。
+ **API 密钥管理:**  再次强调，不要将 API 密钥硬编码到代码中，确保 API 密钥的安全性。

**六、 总结**

Sprint 3 的开发工作主要围绕集成 Google 翻译和 Microsoft 翻译两种翻译引擎展开。通过合理的任务分解、详细的开发步骤、明确的设计要点、严格的测试要求和完善的文档，可以确保 Sprint 3 的开发工作高效、有序地进行。同时需要注意 API 密钥的管理和代码质量控制。

请根据你的团队的实际情况和开发能力对上述计划进行调整。在开发过程中，要灵活应变，不断学习，持续改进。祝你和你的团队开发顺利！

