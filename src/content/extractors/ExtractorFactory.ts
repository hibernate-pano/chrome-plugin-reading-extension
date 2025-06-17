import { ExtractedContent } from "../../types";
import { ContentExtractor } from "./contentExtractor";

/**
 * 提取器工厂，负责创建适合当前网页的内容提取器
 */
export class ExtractorFactory {
  /**
   * 为指定URL创建最适合的提取器
   */
  public static async createExtractor(url: string): Promise<ContentExtractor> {
    // 直接返回 ContentExtractor 实例
    return new ContentExtractor();
  }

  /**
   * 提取网页内容
   */
  public static async extractContent(document: Document, url: string): Promise<ExtractedContent> {
    try {
      const extractor = await this.createExtractor(url);
      return await extractor.extract(document, url);
    } catch (error) {
      console.error('提取内容失败', error);
      // 返回一个符合 ExtractedContent 接口的错误对象
      return { title: null, content: '<p>内容提取失败，请重试。</p>', author: null };
    }
  }
} 