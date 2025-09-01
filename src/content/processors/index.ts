// 导出所有优化的内容处理器
export * from './ContentProcessorManager';
export * from './EnhancedCodeBlockProcessor';
export * from './EnhancedImageProcessor';
export * from './EnhancedTableProcessor';

// 导出默认实例
import { contentProcessorManager } from './ContentProcessorManager';
import { enhancedCodeBlockProcessor } from './EnhancedCodeBlockProcessor';
import { enhancedImageProcessor } from './EnhancedImageProcessor';
import { enhancedTableProcessor } from './EnhancedTableProcessor';

// 注册默认处理器
contentProcessorManager.registerProcessor(enhancedCodeBlockProcessor);
contentProcessorManager.registerProcessor(enhancedImageProcessor);
contentProcessorManager.registerProcessor(enhancedTableProcessor);

export {
  contentProcessorManager,
  enhancedCodeBlockProcessor,
  enhancedImageProcessor,
  enhancedTableProcessor
};
