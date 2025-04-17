/**
 * 工作线程管理器
 * 用于创建和管理工作线程，处理与工作线程的通信
 */

import { WorkerMessage, WorkerResponse } from './extractorWorker';
import { performanceMonitor } from '../utils/performance';

// 工作线程请求接口
export interface WorkerRequest {
  id: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  startTime: number;
}

// 工作线程管理器类
export class WorkerManager {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, WorkerRequest> = new Map();
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private workerUrl: string;

  constructor(workerUrl: string) {
    this.workerUrl = workerUrl;
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
        performanceMonitor.start('workerInitialization');

        // 创建工作线程
        try {
          this.worker = new Worker(this.workerUrl);
        } catch (workerError) {
          console.error('创建工作线程失败:', workerError);
          // 直接标记为初始化成功，但实际上会回退到主线程处理
          this.isInitialized = true;
          performanceMonitor.end('workerInitialization');
          resolve();
          return;
        }

        // 设置消息处理器
        this.worker.onmessage = this.handleWorkerMessage.bind(this);

        // 设置错误处理器
        this.worker.onerror = (error) => {
          console.error('工作线程错误:', error);
          this.isInitialized = true; // 标记为初始化成功，但实际上会回退到主线程处理
          this.worker = null;
          performanceMonitor.end('workerInitialization');
          resolve(); // 不拒绝承诺，而是允许继续执行，但会回退到主线程
        };

        // 简化初始化过程，不等待工作线程的初始化消息
        this.isInitialized = true;
        performanceMonitor.end('workerInitialization');
        console.log('工作线程初始化完成');
        resolve();
      } catch (error) {
        this.isInitialized = true; // 标记为初始化成功，但实际上会回退到主线程处理
        this.worker = null;
        performanceMonitor.end('workerInitialization');
        console.warn('工作线程初始化失败，将回退到主线程处理:', error);
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
        console.warn('收到无效的工作线程响应:', event.data);
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

      console.debug(`工作线程请求完成: ${response.id}, 耗时: ${duration.toFixed(2)}ms`);

      // 从待处理请求中移除
      this.pendingRequests.delete(response.id);

      // 处理响应
      if (response.success) {
        request.resolve(response.data);
      } else {
        request.reject(new Error(response.error || '未知错误'));
      }
    } catch (error) {
      console.warn('处理工作线程消息时发生错误:', error);
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
        throw new Error('工作线程不可用，将在主线程中处理');
      }
    } catch (error) {
      // 如果初始化失败或没有工作线程，抛出错误以触发回退到主线程
      console.warn('工作线程不可用，将在主线程中处理:', error);
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
          console.debug(`发送请求到工作线程: ${action}`);
        } else {
          throw new Error('工作线程不存在');
        }
      } catch (error) {
        // 移除请求
        this.pendingRequests.delete(id);
        console.error('发送消息到工作线程失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 提取内容
   */
  public async extractContent(html: string, url?: string): Promise<any> {
    return performanceMonitor.measure('extractContent_worker', async () => {
      return this.sendRequest('extractContent', { html, url });
    });
  }

  /**
   * 处理表格
   */
  public async processTable(tableHtml: string): Promise<any> {
    return performanceMonitor.measure('processTable_worker', async () => {
      return this.sendRequest('processTable', { tableHtml });
    });
  }

  /**
   * 处理代码块
   */
  public async processCodeBlock(codeHtml: string, language?: string): Promise<any> {
    return performanceMonitor.measure('processCodeBlock_worker', async () => {
      return this.sendRequest('processCodeBlock', { codeHtml, language });
    });
  }

  /**
   * 处理列表
   */
  public async processList(listHtml: string): Promise<any> {
    return performanceMonitor.measure('processList_worker', async () => {
      return this.sendRequest('processList', { listHtml });
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
        request.reject(new Error('工作线程已终止'));
      });

      this.pendingRequests.clear();

      console.log('工作线程已终止');
    }
  }
}

// 创建工作线程管理器实例
let workerManager: WorkerManager | null = null;

/**
 * 获取工作线程管理器实例
 */
export function getWorkerManager(): WorkerManager {
  if (!workerManager) {
    // 创建 Blob URL
    const workerBlob = new Blob(
      [`importScripts(${JSON.stringify(chrome.runtime.getURL('workers/extractorWorker.js'))});`],
      { type: 'application/javascript' }
    );
    const workerUrl = URL.createObjectURL(workerBlob);

    workerManager = new WorkerManager(workerUrl);
  }

  return workerManager;
}

/**
 * 释放工作线程管理器实例
 */
export function releaseWorkerManager(): void {
  if (workerManager) {
    workerManager.terminate();
    workerManager = null;
  }
}
