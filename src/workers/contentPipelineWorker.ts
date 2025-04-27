/**
 * 内容处理管道工作线程
 * 在后台线程中执行内容提取、Markdown转换和渲染操作
 */

// 工作线程消息类型
export interface WorkerMessage {
  id: string;
  action: string;
  payload: any;
}

// 工作线程响应类型
export interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

// 导入必要的库
import Defuddle from 'defuddle';
import TurndownService from 'turndown';

// 处理消息
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, action, payload } = event.data;

  try {
    let result;

    // 根据不同的操作类型执行不同的处理
    switch (action) {
      case 'processPipeline':
        result = await processPipeline(payload.html, payload.url, payload.options);
        break;
      case 'extractContent':
        result = await extractContent(payload.html, payload.url, payload.options);
        break;
      case 'convertToMarkdown':
        result = convertToMarkdown(payload.html, payload.options);
        break;
      default:
        throw new Error(`未知操作: ${action}`);
    }

    // 发送成功响应
    const response: WorkerResponse = {
      id,
      success: true,
      data: result
    };

    self.postMessage(response);
  } catch (error) {
    // 发送错误响应
    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };

    self.postMessage(response);
  }
};

/**
 * 完整的内容处理管道
 * @param html 原始HTML
 * @param url 页面URL
 * @param options 处理选项
 */
async function processPipeline(html: string, url: string, options: any = {}) {
  // 记录开始时间
  const startTime = performance.now();

  // 1. 内容提取
  const extractionStart = performance.now();
  const extractionResult = await extractContent(html, url, options.extractorOptions);
  const extractionTime = performance.now() - extractionStart;

  // 2. Markdown转换
  const conversionStart = performance.now();
  const markdown = convertToMarkdown(extractionResult.html, options.converterOptions);
  const conversionTime = performance.now() - conversionStart;

  // 3. 记录总处理时间
  const totalTime = performance.now() - startTime;

  return {
    html: extractionResult.html,
    markdown,
    title: extractionResult.metadata?.title || '',
    metadata: extractionResult.metadata || {},
    performance: {
      extraction: extractionTime,
      conversion: conversionTime,
      total: totalTime
    }
  };
}

/**
 * 使用 defuddle 提取内容
 * @param html 原始HTML
 * @param url 页面URL
 * @param options 提取选项
 */
async function extractContent(html: string, url: string, options: any = {}) {
  try {
    // 创建临时 DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 应用特殊站点处理
    if (options?.specialSites) {
      const hostname = new URL(url).hostname;
      const specialHandler = options.specialSites[hostname];
      if (typeof specialHandler === 'function') {
        specialHandler(doc);
      }
    }

    // 使用 defuddle 提取内容
    const defuddleOptions = {
      ...options?.defuddleOptions,
      url
    };

    const result = await Defuddle(doc, defuddleOptions);

    return {
      html: result.html,
      metadata: {
        title: result.title || doc.title,
        excerpt: result.excerpt || '',
        byline: result.byline || '',
        siteName: result.siteName || '',
        readingTime: result.readingTime || 0
      }
    };
  } catch (error) {
    console.error('内容提取错误:', error);
    throw error;
  }
}

/**
 * 使用 turndown 将 HTML 转换为 Markdown
 * @param html HTML内容
 * @param options 转换选项
 */
function convertToMarkdown(html: string, options: any = {}) {
  try {
    // 创建 Turndown 实例
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      bulletListMarker: '-',
      ...options
    });

    // 自定义规则：保留代码块语言标记
    turndownService.addRule('codeBlocks', {
      filter: (node) => {
        return (
          node.nodeName === 'PRE' &&
          node.firstChild &&
          node.firstChild.nodeName === 'CODE'
        );
      },
      replacement: (content, node) => {
        const code = node.firstChild as HTMLElement;
        const className = code.getAttribute('class') || '';
        const language = className.replace(/^language-/, '');
        return '\n```' + language + '\n' + code.textContent + '\n```\n';
      },
    });

    // 自定义规则：处理图片和图片说明
    turndownService.addRule('images', {
      filter: 'figure',
      replacement: (content, node) => {
        const img = node.querySelector('img');
        const figcaption = node.querySelector('figcaption');

        if (!img) return content;

        const alt = img.getAttribute('alt') || '';
        const src = img.getAttribute('src') || '';
        const caption = figcaption ? figcaption.textContent : '';

        return `![${alt}](${src})${caption ? '\n*' + caption + '*' : ''}`;
      },
    });

    // 转换 HTML 为 Markdown
    return turndownService.turndown(html);
  } catch (error) {
    console.error('Markdown转换错误:', error);
    throw error;
  }
}