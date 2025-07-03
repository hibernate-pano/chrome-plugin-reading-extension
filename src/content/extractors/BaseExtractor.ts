import { ExtractedContent } from '../../types';

/**
 * 提取器基类
 * 定义了所有提取器必须实现的接口
 */
export abstract class BaseExtractor {
  /**
   * 从文档中提取内容
   * @param document 当前文档
   * @param url 当前URL
   * @returns 提取的内容
   */
  public abstract extract(document: Document, url: string): Promise<ExtractedContent>;

  /**
   * 检查提取器是否适用于当前URL
   * @param url 当前URL
   * @returns 是否适用
   */
  public canHandle(url: string): boolean {
    // 默认实现：所有URL都可以处理
    return true;
  }

  /**
   * 获取提取器的优先级
   * 优先级越高，越先被尝试
   * @returns 优先级（0-100）
   */
  public getPriority(): number {
    // 默认优先级
    return 50;
  }
} 