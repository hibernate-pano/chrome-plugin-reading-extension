// 导出所有处理器
export * from './CodeBlockProcessor';
export * from './ImageProcessor';
export * from './ProcessorManager';

// 导出默认实例
import { codeBlockProcessor } from './CodeBlockProcessor';
import { imageProcessor } from './ImageProcessor';
import { processorManager } from './ProcessorManager';

export {
  codeBlockProcessor,
  imageProcessor,
  processorManager
}; 