import { ExtractedContent } from "../../types";
import { ContentExtractor } from "./contentExtractor";
import { ReadabilityExtractor } from "./ReadabilityExtractor";
import { BaseExtractor } from "./BaseExtractor";

/**
 * 提取器工厂，负责创建适合当前网页的内容提取器
 * 优先使用ReadabilityExtractor，如果失败则尝试其他提取器
 */
export class ExtractorFactory {
  // 所有可用的提取器
  private static extractors: BaseExtractor[] = [
    new ReadabilityExtractor(), // 优先级最高
    new ContentExtractor(),     // 作为备选
  ];

  /**
   * 为指定URL创建最适合的提取器
   */
  public static async createExtractor(url: string): Promise<BaseExtractor> {
    // 按优先级排序提取器
    const sortedExtractors = [...this.extractors].sort(
      (a, b) => b.getPriority() - a.getPriority()
    );

    // 找到第一个能处理当前URL的提取器
    const extractor = sortedExtractors.find(e => e.canHandle(url));
    
    // 如果没有找到合适的提取器，使用ReadabilityExtractor作为默认
    return extractor || new ReadabilityExtractor();
  }

  /**
   * 提取网页内容
   * 尝试使用最合适的提取器，如果失败则尝试下一个
   */
  public static async extractContent(document: Document, url: string): Promise<ExtractedContent> {
    try {
      // 获取所有可以处理当前URL的提取器，按优先级排序
      const sortedExtractors = [...this.extractors]
        .filter(e => e.canHandle(url))
        .sort((a, b) => b.getPriority() - a.getPriority());

      // 如果没有找到合适的提取器，使用ReadabilityExtractor作为默认
      if (sortedExtractors.length === 0) {
        sortedExtractors.push(new ReadabilityExtractor());
      }

      // 尝试每个提取器，直到成功或全部失败
      let lastError: Error | null = null;
      for (const extractor of sortedExtractors) {
        try {
          const content = await extractor.extract(document, url);
          // 如果内容为空或只有错误信息，继续尝试下一个提取器
          if (!content.content || content.content.includes('无法提取主要内容') || content.content.includes('内容提取失败')) {
            continue;
          }
          return content;
        } catch (error) {
          console.warn(`提取器 ${extractor.constructor.name} 失败:`, error);
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      // 所有提取器都失败了，返回错误
      throw lastError || new Error('所有提取器均失败');
    } catch (error) {
      console.error('提取内容失败', error);
      // 返回一个符合 ExtractedContent 接口的错误对象
      return { 
        title: document.title || null, 
        content: '<p>内容提取失败，请重试。</p>', 
        author: null 
      };
    }
  }

  /**
   * 注册新的提取器
   */
  public static registerExtractor(extractor: BaseExtractor): void {
    this.extractors.push(extractor);
  }
} 