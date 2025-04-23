/**
 * 错误代码枚举
 */
export type ErrorCode = 
  | 'CONTENT_EXTRACTION_FAILED'
  | 'STORAGE_OPERATION_FAILED'
  | 'NETWORK_REQUEST_FAILED'
  | 'RENDER_FAILED'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT_EXCEEDED'
  | 'VALIDATION_FAILED'
  | 'UNEXPECTED_STATE';

/**
 * 基础错误类型
 */
export class ReaderError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public context?: unknown
  ) {
    super(message);
    this.name = 'ReaderError';
  }
}

/**
 * 内容提取错误
 */
export class ContentExtractionError extends ReaderError {
  constructor(message: string, context?: unknown) {
    super(message, 'CONTENT_EXTRACTION_FAILED', context);
    this.name = 'ContentExtractionError';
  }
}

/**
 * 存储错误
 */
export class StorageError extends ReaderError {
  constructor(message: string, context?: unknown) {
    super(message, 'STORAGE_OPERATION_FAILED', context);
    this.name = 'StorageError';
  }
}

/**
 * 网络错误
 */
export class NetworkError extends ReaderError {
  constructor(message: string, context?: unknown) {
    super(message, 'NETWORK_REQUEST_FAILED', context);
    this.name = 'NetworkError';
  }
}

/**
 * 渲染错误
 */
export class RenderError extends ReaderError {
  constructor(message: string, context?: unknown) {
    super(message, 'RENDER_FAILED', context);
    this.name = 'RenderError';
  }
} 