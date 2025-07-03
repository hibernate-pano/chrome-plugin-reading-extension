import { ContentProcessor } from './CodeBlockProcessor';
import { codeBlockProcessor } from './CodeBlockProcessor';
import { imageProcessor } from './ImageProcessor';

/**
 * 内容处理器管理器
 * 用于管理所有内容处理器
 */
export class ProcessorManager {
  private processors: ContentProcessor[] = [];

  constructor() {
    // 注册默认处理器
    this.registerProcessor(codeBlockProcessor);
    this.registerProcessor(imageProcessor);
  }

  /**
   * 注册内容处理器
   * @param processor 内容处理器
   */
  public registerProcessor(processor: ContentProcessor): void {
    this.processors.push(processor);
  }

  /**
   * 处理HTML内容
   * @param content HTML内容
   * @returns 处理后的HTML内容
   */
  public process(content: string): string {
    // 依次应用所有处理器
    let processedContent = content;
    for (const processor of this.processors) {
      processedContent = processor.process(processedContent);
    }
    return processedContent;
  }
}

// 导出默认实例
export const processorManager = new ProcessorManager(); 