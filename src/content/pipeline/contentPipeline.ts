/**
 * 内容处理管道
 * 整合内容提取、Markdown转换和渲染的完整流程
 */
import { defuddleExtractor } from '../extractors/defuddleExtractor';
import { turndownConverter } from '../converters/turndownConverter';
import { markdownRenderer } from '../renderers/markdownRenderer';
import { performanceMonitor } from '../../utils/performance';

// 内容处理选项接口
export interface ContentProcessingOptions {
  // 提取选项
  extractorOptions?: {
    defuddleOptions?: {
      debug?: boolean;
      url?: string;
    };
    sanitizeOptions?: {
      ALLOWED_TAGS?: string[];
      ALLOWED_ATTR?: string[];
      ADD_TAGS?: string[];
      KEEP_CONTENT?: boolean;
      ALLOW_DATA_ATTR?: boolean;
    };
  };
  // Markdown转换选项
  converterOptions?: {
    headingStyle?: "setext" | "atx";
    codeBlockStyle?: "indented" | "fenced";
    emDelimiter?: "_" | "*";
    bulletListMarker?: "-" | "*" | "+";
  };
  // 渲染选项
  rendererOptions?: {
    html?: boolean;
    linkify?: boolean;
    typographer?: boolean;
    breaks?: boolean;
    plugins?: {
      anchor?: boolean;
      toc?: boolean;
      highlightjs?: boolean;
      taskLists?: boolean;
    };
  };
}

/**
 * 内容处理管道
 * 将网页内容通过提取、转换和渲染三个步骤处理为最终的阅读模式内容
 */
export class ContentPipeline {
  private options: ContentProcessingOptions;

  constructor(options: ContentProcessingOptions = {}) {
    this.options = options;
  }

  /**
   * 处理内容
   * @param document 原始文档
   * @returns 处理后的HTML内容
   */
  async process(document: Document): Promise<{
    html: string;
    markdown: string;
    title: string;
    metadata: Record<string, any>;
  }> {
    // 1. 内容提取
    const extractionStart = performance.now();
    const extractionResult = await defuddleExtractor.extract(document, this.options.extractorOptions);
    performanceMonitor.record('内容提取', performance.now() - extractionStart);

    // 提取元数据
    const title = extractionResult.metadata?.title || document.title;
    const metadata = extractionResult.metadata || {};

    // 2. Markdown转换
    const conversionStart = performance.now();
    const markdown = turndownConverter.convertToMarkdown(
      extractionResult.html,
      this.options.converterOptions
    );
    performanceMonitor.record('Markdown转换', performance.now() - conversionStart);

    // 3. Markdown渲染
    const renderStart = performance.now();
    const html = markdownRenderer.renderMarkdown(markdown, this.options.rendererOptions);
    performanceMonitor.record('Markdown渲染', performance.now() - renderStart);

    return {
      html,
      markdown,
      title,
      metadata
    };
  }
}

// 导出默认实例
export const contentPipeline = new ContentPipeline();