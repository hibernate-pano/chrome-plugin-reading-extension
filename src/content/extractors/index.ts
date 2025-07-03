// 导出所有提取器
export * from './contentExtractor';
export * from './ReadabilityExtractor';
export * from './BaseExtractor';
export * from './ExtractorFactory';

// 导出默认实例
import { contentExtractor } from './contentExtractor';
import { readabilityExtractor } from './ReadabilityExtractor';
import { ExtractorFactory } from './ExtractorFactory';

export {
  contentExtractor,
  readabilityExtractor,
  ExtractorFactory
};
