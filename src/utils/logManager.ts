import { ReaderError, ErrorCode } from "../types/errors";

// 错误日志接口
interface ErrorLog {
  id: string;
  timestamp: number;
  code: ErrorCode;
  message: string;
  context?: unknown;
  stack?: string;
}

// Log Manager Class
class LogManager {
  private readonly MAX_LOGS = 100; // Keep the last 100 error records
  private db: IDBDatabase | null = null;
  private dbName = 'reader_logs';
  private dbVersion = 1;
  private storeName = 'error_logs';

  constructor() {
    this.initDatabase();
  }

  // Initialize the IndexedDB database for logs
  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBRequest<IDBDatabase>).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBRequest<IDBDatabase>).result;
        console.log('日志数据库初始化成功');
        this.pruneOldLogs(); // Prune logs after successful initialization
        resolve();
      };

      request.onerror = (event) => {
        console.error('无法初始化日志数据库', (event.target as IDBRequest).error);
        reject(new Error('无法初始化日志数据库'));
      };
    });
  }

  // Record an error
  async logError(error: ReaderError): Promise<void> {
    if (!this.db) {
      console.warn('日志数据库未准备好，错误将仅输出到控制台');
      console.error(error);
      return;
    }

    // Sanitize context before logging (optional but recommended for sensitive data)
    const sanitizedContext = this.sanitizeErrorContext(error.context);

    const log: ErrorLog = {
      id: crypto.randomUUID(), // Use UUID for unique ID
      timestamp: Date.now(),
      code: error.code,
      message: error.message,
      context: sanitizedContext,
      stack: error.stack
    };

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const addRequest = store.add(log);

      addRequest.onsuccess = () => {
        // console.debug('错误日志记录成功', log.id);
        this.pruneOldLogs(); // Prune logs after adding a new one
      };

      addRequest.onerror = (event) => {
        console.error('无法记录错误日志', (event.target as IDBRequest).error);
      };

      // Wait for the transaction to complete
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBRequest).error);
      });

    } catch (error) {
      console.error('日志记录过程中发生异常', error);
    }
  }

  // Clean up old logs to ensure the maximum number of logs is not exceeded
  private async pruneOldLogs(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');

      const countRequest = store.count();
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        if (count <= this.MAX_LOGS) return;

        const deleteCount = count - this.MAX_LOGS;
        const cursorRequest = index.openCursor();
        let processed = 0;

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && processed < deleteCount) {
            store.delete(cursor.primaryKey);
            processed++;
            cursor.continue();
          } else {
            // console.debug('旧日志清理完成', processed);
          }
        };

        cursorRequest.onerror = (event) => {
            console.error('清理旧日志时游标错误', (event.target as IDBRequest).error);
        };
      };
      countRequest.onerror = (event) => {
          console.error('清理旧日志时计数错误', (event.target as IDBRequest).error);
      };

    } catch (error) {
      console.error('清理旧日志过程中发生异常', error);
    }
  }

  // Get all logs
  async getLogs(): Promise<ErrorLog[]> {
    if (!this.db) {
      console.warn('日志数据库未准备好，无法获取日志');
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('获取日志失败', request.error);
        reject(new Error('获取日志失败'));
      };
    });
  }

  // Clear all logs
  async clearLogs(): Promise<void> {
      if (!this.db) {
          console.warn('日志数据库未准备好，无法清除日志');
          return;
      }

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.clear();

          request.onsuccess = () => {
              console.log('日志已清除');
              resolve();
          };

          request.onerror = () => {
              console.error('清除日志失败', request.error);
              reject(new Error('清除日志失败'));
          };
      });
  }

  // Sanitize sensitive data from error context
  private sanitizeErrorContext(context: unknown): unknown {
    if (!context) return context;

    // Simple deep copy to avoid modifying original object and handle basic structures
    let sanitized: any;
    if (Array.isArray(context)) {
      sanitized = [];
      for (const item of context) {
        sanitized.push(this.sanitizeErrorContext(item));
      }
    } else if (typeof context === 'object' && context !== null) {
      sanitized = {};
      for (const key in context) {
        if (Object.prototype.hasOwnProperty.call(context, key)) {
          const lowerKey = key.toLowerCase();
          // Redact sensitive fields
          if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('auth') || lowerKey.includes('key') || lowerKey.includes('secret')) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = this.sanitizeErrorContext((context as any)[key]);
          }
        }
      }
    } else {
      sanitized = context;
    }

    return sanitized;
  }
}

// Create a singleton instance
export const logger = new LogManager(); 