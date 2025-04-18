// 导出所有提取器
export * from './contentExtractor';
export * from './defuddleExtractor';
export * from './tableExtractor';
export * from './mediaExtractor';
export * from './enhancedMediaExtractor';
export * from './codeExtractor';
export * from './listExtractor';

// 导出默认实例
import { contentExtractor } from './contentExtractor';
import { defuddleExtractor } from './defuddleExtractor';
import { tableExtractor } from './tableExtractor';
import { mediaExtractor } from './mediaExtractor';
import { enhancedMediaExtractor } from './enhancedMediaExtractor';
import { codeExtractor } from './codeExtractor';
import { listExtractor } from './listExtractor';

export {
  contentExtractor,
  defuddleExtractor,
  tableExtractor,
  mediaExtractor,
  enhancedMediaExtractor,
  codeExtractor,
  listExtractor
};
