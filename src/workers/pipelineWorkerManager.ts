/**
 * 内容处理管道工作线程管理器
 * 用于在主线程中与内容处理管道工作线程通信
 */
import { performanceMonitor } from '../utils/performance';

// 工作线程请求接口
export interface WorkerRequest {
  id: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  startTime: number;
}

// 工作线程消息类型
export interface WorkerMessage {
  id: string;
  action: string;
  payload: any;
}

// 工作线程响应类型
export interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 内容处理管道工作线程管理器类
 * 用于创建和管理内容处理管道工作线程，处理与工作线程的通信
 */
export class PipelineWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, WorkerRequest> = new Map();
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private workerUrl: string;

  constructor() {
    this.workerUrl = new URL('./contentPipelineWorker.ts', import.meta.url).href;
  }

  /**
   * 初始化工作线程
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        performanceMonitor.start('pipelineWorkerInitialization');

        // 创建工作线程
        try {
          this.worker = new Worker(this.workerUrl, { type: 'module' });
        } catch (workerError) {
          console.error('创建内容处理管道工作线程失败:', workerError);
          // 直接标记为初始化成功，但实际上会回退到主线程处理
          this.isInitialized = true;
          performanceMonitor.end('pipelineWorkerInitialization');
          resolve();
          return;
        }

        // 设置消息处理器
        this.worker.onmessage = this.handleWorkerMessage.bind(this);

        // 设置错误处理器
        this.worker.onerror = (error) => {
          console.error('内容处理管道工作线程错误:', error);
          this.isInitialized = true; // 标记为初始化成功，但实际上会回退到主线程处理
          this.worker = null;
          performanceMonitor.end('pipelineWorkerInitialization');
          resolve(); // 不拒绝承诺，而是允许继续执行，但会回退到主线程
        };

        // 简化初始化过程，不等待工作线程的初始化消息
        this.isInitialized = true;
        performanceMonitor.end('pipelineWorkerInitialization');
        console.log('内容处理管道工作线程初始化完成');
        resolve();
      } catch (error) {
        this.isInitialized = true; // 标记为初始化成功，但实际上会回退到主线程处理
        this.worker = null;
        performanceMonitor.end('pipelineWorkerInitialization');
        console.warn('内容处理管道工作线程初始化失败，将回退到主线程处理:', error);
        resolve(); // 不拒绝承诺，而是允许继续执行
      }
    });

    return this.initPromise;
  }

  /**
   * 处理工作线程消息
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    try {
      const response = event.data;
      // 检查响应是否有效
      if (!response || typeof response !== 'object' || !response.id) {
        console.warn('收到无效的内容处理管道工作线程响应:', event.data);
        return;
      }

      const request = this.pendingRequests.get(response.id);

      if (!request) {
        // 如果是 init 消息或特殊消息，不显示警告
        if (response.id === 'init' || response.id.startsWith('_')) {
          return;
        }
        // 对于其他消息，显示警告但不抛出错误
        console.debug(`未找到请求 ID: ${response.id}，可能是请求已过期或被取消`);
        return;
      }

      // 计算请求耗时
      const endTime = performance.now();
      const duration = endTime - request.startTime;

      console.debug(`内容处理管道工作线程请求完成: ${response.id}, 耗时: ${duration.toFixed(2)}ms`);

      // 从待处理请求中移除
      this.pendingRequests.delete(response.id);

      // 处理响应
      if (response.success) {
        // 记录性能数据（如果有）
        if (response.data && response.data.performance) {
          const perf = response.data.performance;
          performanceMonitor.record('内容提取 (Worker)', perf.extraction);
          performanceMonitor.record('Markdown转换 (Worker)', perf.conversion);
          performanceMonitor.record('总处理时间 (Worker)', perf.total);
        }
        request.resolve(response.data);
      } else {
        request.reject(new Error(response.error || '未知错误'));
      }
    } catch (error) {
      console.warn('处理内容处理管道工作线程消息时发生错误:', error);
      return;
    }
  }

  /**
   * 发送请求到工作线程
   */
  public async sendRequest<T>(action: string, payload: any): Promise<T> {
    try {
      // 确保工作线程已初始化
      await this.initialize();

      if (!this.worker) {
        // 如果没有工作线程，直接抛出错误以触发回退到主线程
        throw new Error('内容处理管道工作线程不可用，将在主线程中处理');
      }
    } catch (error) {
      // 如果初始化失败或没有工作线程，抛出错误以触发回退到主线程
      console.warn('内容处理管道工作线程不可用，将在主线程中处理:', error);
      throw error;
    }

    return new Promise<T>((resolve, reject) => {
      // 生成唯一请求 ID
      const id = `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 创建请求对象
      const request: WorkerRequest = {
        id,
        resolve,
        reject,
        startTime: performance.now()
      };

      // 添加到待处理请求
      this.pendingRequests.set(id, request);

      // 创建消息
      const message: WorkerMessage = {
        id,
        action,
        payload
      };

      // 发送消息到工作线程
      try {
        if (this.worker) {
          this.worker.postMessage(message);
          console.debug(`发送请求到内容处理管道工作线程: ${action}`);
        } else {
          throw new Error('内容处理管道工作线程不存在');
        }
      } catch (error) {
        // 移除请求
        this.pendingRequests.delete(id);
        console.error('发送消息到内容处理管道工作线程失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 处理内容管道
   * @param html 原始HTML
   * @param url 页面URL
   * @param options 处理选项
   */
  public async processPipeline(html: string, url: string, options: any = {}): Promise<any> {
    return performanceMonitor.measure('processPipeline_worker', async () => {
      return this.sendRequest('processPipeline', { html, url, options });
    });
  }

  /**
   * 提取内容
   * @param html 原始HTML
   * @param url 页面URL
   * @param options 提取选项
   */
  public async extractContent(html: string, url: string, options: any = {}): Promise<any> {
    return performanceMonitor.measure('extractContent_worker', async () => {
      return this.sendRequest('extractContent', { html, url, options });
    });
  }

  /**
   * 转换Markdown
   * @param html HTML内容
   * @param options 转换选项
   */
  public async convertToMarkdown(html: string, options: any = {}): Promise<any> {
    return performanceMonitor.measure('convertToMarkdown_worker', async () => {
      return this.sendRequest('convertToMarkdown', { html, options });
    });
  }

  /**
   * 终止工作线程
   */
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initPromise = null;

      // 拒绝所有待处理请求
      this.pendingRequests.forEach(request => {
        request.reject(new Error('内容处理管道工作线程已终止'));
      });

      this.pendingRequests.clear();

      console.log('内容处理管道工作线程已终止');
    }
  }
}

// 创建单例实例
const pipelineWorkerManager = new PipelineWorkerManager();

// 为了向后兼容，保留原有的函数接口

/**
 * 在工作线程中处理内容
 * @param html 原始HTML
 * @param url 页面URL
 * @param options 处理选项
 */
export function processPipelineInWorker(html: string, url: string, options: any = {}) {
  return pipelineWorkerManager.processPipeline(html, url, options);
}

/**
 * 在工作线程中提取内容
 * @param html 原始HTML
 * @param url 页面URL
 * @param options 提取选项
 */
export function extractContentInWorker(html: string, url: string, options: any = {}) {
  return pipelineWorkerManager.extractContent(html, url, options);
}

/**
 * 在工作线程中转换Markdown
 * @param html HTML内容
 * @param options 转换选项
 */
export function convertToMarkdownInWorker(html: string, options: any = {}) {
  return pipelineWorkerManager.convertToMarkdown(html, options);
}