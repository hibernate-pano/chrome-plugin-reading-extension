import { v4 as uuidv4 } from 'uuid'; // Assuming uuid library is available for message IDs

export class MarkdownWorkerManager {
  private worker: Worker;
  private messageCallbacks: Map<string, { resolve: (markdown: string) => void, reject: (error: Error) => void }> = new Map();

  constructor() {
    this.worker = new Worker(new URL("./markdownWorker.ts", import.meta.url));
    this.worker.addEventListener("message", this.handleWorkerMessage);
    this.worker.addEventListener("error", this.handleWorkerError);
  }

  private handleWorkerMessage = (event: MessageEvent) => {
    const { id, markdown, error } = event.data;
    const callback = this.messageCallbacks.get(id);

    if (callback) {
      if (error) {
        console.error("[MarkdownWorkerManager] Received error from worker:", error);
        const workerError = new Error(error.message || "Unknown worker error");
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
    const workerError = new Error(`Worker encountered an error: ${event.message || 'Unknown ErrorEvent'}`);
    if (event.error) {
      workerError.stack = event.error.stack;
    }
    this.messageCallbacks.forEach(callback => callback.reject(workerError));
    this.messageCallbacks.clear();
  };

  async convertToMarkdown(html: string): Promise<string> {
    const id = uuidv4();

    return new Promise((resolve, reject) => {
      this.messageCallbacks.set(id, { resolve, reject });

      this.worker.postMessage({ id, action: "convert", html });
    });
  }

  destroy(): void {
    this.worker.terminate();
    this.messageCallbacks.clear();
  }
} 