import { extractorRuleModel } from '../../storage/models';
import { ContentExtractionError } from '../../types/errors';
import { BaseExtractor } from './BaseExtractor';
import { DefaultExtractor } from './DefaultExtractor';

/**
 * 提取器工厂，负责创建适合当前网页的内容提取器
 */
export class ExtractorFactory {
  /**
   * 为指定URL创建最适合的提取器
   */
  public static async createExtractor(url: string): Promise<BaseExtractor> {
    try {
      // 尝试获取特定网站的提取规则
      const rule = await extractorRuleModel.getRuleForUrl(url);
      
      // 使用默认提取器，但可能带有自定义规则
      return new DefaultExtractor(rule);
    } catch (error) {
      // 出现错误时使用无规则的默认提取器
      console.error('创建提取器失败', error);
      return new DefaultExtractor();
    }
  }

  /**
   * 提取网页内容
   */
  public static async extractContent(document: Document, url: string): Promise<any> {
    try {
      const extractor = await this.createExtractor(url);
      return await extractor.extract(document, url);
    } catch (error) {
      console.error('提取内容失败', error);
      throw new ContentExtractionError('内容提取失败', {
        url,
        error
      });
    }
  }
} 