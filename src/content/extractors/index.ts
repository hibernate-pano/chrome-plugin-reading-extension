// 导出所有提取器
export * from './contentExtractor';
export * from './tableExtractor';
export * from './mediaExtractor';
export * from './codeExtractor';
export * from './listExtractor';

// 导出默认实例
import { contentExtractor } from './contentExtractor';
import { tableExtractor } from './tableExtractor';
import { mediaExtractor } from './mediaExtractor';
import { codeExtractor } from './codeExtractor';
import { listExtractor } from './listExtractor';

export {
  contentExtractor,
  tableExtractor,
  mediaExtractor,
  codeExtractor,
  listExtractor
};
