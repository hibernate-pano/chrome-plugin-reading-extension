import { v4 as uuidv4 } from 'uuid'; // Assuming uuid library is available for message IDs

export class MarkdownWorkerManager {
  private worker: Worker | null = null;
  private messageCallbacks: Map<string, { resolve: (markdown: string) => void, reject: (error: Error) => void }> = new Map();
  private maxRetries = 2;
  private retryDelay = 500; // 毫秒

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(new URL("./markdownWorker.ts", import.meta.url));
      this.worker.addEventListener("message", this.handleWorkerMessage);
      this.worker.addEventListener("error", this.handleWorkerError);
      console.log("[MarkdownWorkerManager] Worker初始化成功");
    } catch (error) {
      console.error("[MarkdownWorkerManager] Worker初始化失败:", error);
      // 在构造函数中，我们不会立即重试，而是在首次调用时尝试重新初始化
      this.worker = null;
    }
  }

  private handleWorkerMessage = (event: MessageEvent) => {
    const { id, markdown, error } = event.data;
    const callback = this.messageCallbacks.get(id);

    if (callback) {
      if (error) {
        console.error("[MarkdownWorkerManager] 收到Worker错误:", error);
        const workerError = new Error(error.message || "未知Worker错误");
        workerError.stack = error.stack;
        callback.reject(workerError);
      } else {
        callback.resolve(markdown);
      }
      this.messageCallbacks.delete(id);
    }
  };

  private handleWorkerError = (event: ErrorEvent) => {
    console.error("[MarkdownWorkerManager] Worker ErrorEvent:", event);
    const workerError = new Error(`Worker遇到错误: ${event.message || '未知ErrorEvent'}`);
    if (event.error) {
      workerError.stack = event.error.stack;
    }
    
    // 尝试重新初始化Worker
    this.restartWorker();
    
    // 通知所有等待中的回调
    this.messageCallbacks.forEach(callback => callback.reject(workerError));
    this.messageCallbacks.clear();
  };

  private restartWorker(): void {
    console.log("[MarkdownWorkerManager] 尝试重启Worker");
    
    if (this.worker) {
      // 先移除事件监听器，避免内存泄漏
      this.worker.removeEventListener("message", this.handleWorkerMessage);
      this.worker.removeEventListener("error", this.handleWorkerError);
      
      try {
        this.worker.terminate();
      } catch (e) {
        console.error("[MarkdownWorkerManager] 终止Worker时出错:", e);
      }
      
      this.worker = null;
    }
    
    // 重新初始化Worker
    try {
      this.initWorker();
      console.log("[MarkdownWorkerManager] Worker重启成功");
    } catch (e) {
      console.error("[MarkdownWorkerManager] Worker重启失败:", e);
    }
  }

  async convertToMarkdown(html: string, retryCount = 0): Promise<string> {
    if (!this.worker) {
      console.log("[MarkdownWorkerManager] Worker不存在，尝试初始化");
      this.initWorker();
      
      if (!this.worker) {
        if (retryCount < this.maxRetries) {
          console.log(`[MarkdownWorkerManager] 初始化失败，${this.retryDelay}ms后重试 (${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          return this.convertToMarkdown(html, retryCount + 1);
        } else {
          throw new Error("无法初始化Markdown转换Worker");
        }
      }
    }
    
    // 验证输入
    if (!html || typeof html !== 'string') {
      throw new Error("HTML内容无效");
    }
    
    // 如果HTML太大，尝试分块处理
    if (html.length > 500000) { // 500KB
      console.log("[MarkdownWorkerManager] HTML内容过大，进行分块处理");
      return this.handleLargeHtml(html);
    }

    const id = uuidv4();

    try {
      return await new Promise((resolve, reject) => {
        if (!this.worker) {
          reject(new Error("Worker不可用"));
          return;
        }
        
        // 设置超时处理
        const timeoutId = setTimeout(() => {
          this.messageCallbacks.delete(id);
          
          if (retryCount < this.maxRetries) {
            console.log(`[MarkdownWorkerManager] 操作超时，尝试重试 (${retryCount + 1}/${this.maxRetries})`);
            // 尝试重启Worker并重试
            this.restartWorker();
            this.convertToMarkdown(html, retryCount + 1)
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error("Markdown转换超时"));
          }
        }, 10000); // 10秒超时
        
        this.messageCallbacks.set(id, { 
          resolve: (result) => {
            clearTimeout(timeoutId);
            resolve(result);
          }, 
          reject: (error) => {
            clearTimeout(timeoutId);
            reject(error);
          } 
        });

        this.worker.postMessage({ id, action: "convert", html });
      });
    } catch (error) {
      // 处理Promise内部抛出的错误
      if (retryCount < this.maxRetries) {
        console.log(`[MarkdownWorkerManager] 转换失败，${this.retryDelay}ms后重试 (${retryCount + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.convertToMarkdown(html, retryCount + 1);
      }
      
      // 重试次数用尽，抛出错误
      throw error;
    }
  }

  // 处理过大的HTML
  private async handleLargeHtml(html: string): Promise<string> {
    // 实现简单的HTML分块处理
    // 将HTML分割成多个部分，避免内存问题
    const chunks = this.splitHtmlIntoChunks(html);
    console.log(`[MarkdownWorkerManager] 将HTML分为${chunks.length}个块处理`);
    
    let results: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[MarkdownWorkerManager] 处理第${i + 1}/${chunks.length}个块`);
      try {
        const result = await this.convertToMarkdown(chunks[i]);
        results.push(result);
      } catch (error) {
        console.error(`[MarkdownWorkerManager] 处理第${i + 1}块时出错:`, error);
        // 继续处理其他块，不要中断整个过程
        results.push(`[无法转换此部分内容]`);
      }
    }
    
    return results.join('\n\n');
  }
  
  // 将HTML分割成多个块
  private splitHtmlIntoChunks(html: string, chunkSize = 200000): string[] {
    // 如果HTML不够大，不需要分割
    if (html.length <= chunkSize) {
      return [html];
    }
    
    const chunks: string[] = [];
    
    // 尝试在段落或元素边界分割，而不是硬分割
    let currentPos = 0;
    
    while (currentPos < html.length) {
      let endPos = currentPos + chunkSize;
      
      // 如果没有到达HTML末尾，寻找合适的分割点
      if (endPos < html.length) {
        // 从理想位置向后寻找闭合标签
        const closingTagMatch = html.substring(endPos).match(/<\/[^>]+>/);
        
        if (closingTagMatch && closingTagMatch.index !== undefined && closingTagMatch.index < 5000) {
          // 找到合适的闭合标签，在此处分割
          endPos += closingTagMatch.index + closingTagMatch[0].length;
        } else {
          // 向前寻找段落结束点
          const lookback = html.substring(Math.max(0, endPos - 5000), endPos);
          const paragraphEndMatch = lookback.lastIndexOf('</p>');
          
          if (paragraphEndMatch !== -1) {
            endPos = Math.max(0, endPos - 5000) + paragraphEndMatch + 4;
          }
        }
      }
      
      // 提取当前块并添加到结果
      chunks.push(html.substring(currentPos, Math.min(endPos, html.length)));
      currentPos = endPos;
    }
    
    return chunks;
  }

  destroy(): void {
    if (this.worker) {
      this.worker.removeEventListener("message", this.handleWorkerMessage);
      this.worker.removeEventListener("error", this.handleWorkerError);
      this.worker.terminate();
      this.worker = null;
    }
    this.messageCallbacks.clear();
  }
} 