/**
 * Worker任务接口
 */
export interface WorkerTask {
  id: string;
  type: string;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  progress?: number;
}

/**
 * Worker配置接口
 */
export interface WorkerConfig {
  maxWorkers: number;
  maxQueueSize: number;
  taskTimeout: number;
  enablePriorityQueue: boolean;
  enableProgressTracking: boolean;
}

/**
 * Worker统计信息
 */
export interface WorkerStats {
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  totalMemoryUsage: number;
}

/**
 * Web Worker管理器
 * 
 * 功能：
 * - 管理多个Web Worker实例
 * - 任务队列和优先级管理
 * - 性能监控和统计
 * - 自动负载均衡
 * - 错误处理和恢复
 */
export class WebWorkerManager {
  private static instance: WebWorkerManager;
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private completedTasks: WorkerTask[] = [];
  private config: WorkerConfig;
  private isInitialized: boolean = false;
  private workerUrls: Map<string, string> = new Map();
  private taskResolvers: Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }> = new Map();
  
  // 事件回调
  private onTaskComplete: ((task: WorkerTask) => void) | null = null;
  private onTaskProgress: ((taskId: string, progress: number) => void) | null = null;
  private onWorkerError: ((worker: Worker, error: ErrorEvent) => void) | null = null;
  private onStatsUpdate: ((stats: WorkerStats) => void) | null = null;

  constructor() {
    this.config = {
      maxWorkers: navigator.hardwareConcurrency || 4,
      maxQueueSize: 100,
      taskTimeout: 30000, // 30秒
      enablePriorityQueue: true,
      enableProgressTracking: true
    };
    
    this.initializeWorkerUrls();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): WebWorkerManager {
    if (!WebWorkerManager.instance) {
      WebWorkerManager.instance = new WebWorkerManager();
    }
    return WebWorkerManager.instance;
  }

  /**
   * 初始化Worker URL映射
   */
  private initializeWorkerUrls(): void {
    // 使用Chrome扩展URL而不是blob URL以避免CSP违规
    // 映射任务类型到Worker文件
    this.workerUrls.set('content-extraction', 'workers/contentExtraction.worker.js');
    this.workerUrls.set('data-processing', 'workers/dataProcessing.worker.js');
    this.workerUrls.set('markdown-processing', 'workers/markdown.worker.js');
    
    // 其他任务类型默认使用数据处理Worker
    this.workerUrls.set('performance-monitor', 'workers/dataProcessing.worker.js');
    this.workerUrls.set('code-processing', 'workers/dataProcessing.worker.js');
    this.workerUrls.set('image-processing', 'workers/dataProcessing.worker.js');
  }

  /**
   * 初始化Worker管理器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 创建初始Worker
      await this.createWorkers(Math.min(2, this.config.maxWorkers));
      this.isInitialized = true;
      
      console.log('[WebWorkerManager] 初始化完成');
    } catch (error) {
      console.error('[WebWorkerManager] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建Worker实例
   */
  private async createWorkers(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      try {
        const worker = await this.createWorker();
        this.workers.push(worker);
      } catch (error) {
        console.warn(`[WebWorkerManager] 创建Worker ${i + 1} 失败:`, error);
      }
    }
  }

  /**
   * 创建单个Worker
   */
  private async createWorker(scriptType: string = 'data-processing'): Promise<Worker> {
    const workerPath = this.workerUrls.get(scriptType);
    if (!workerPath) {
      throw new Error(`Unknown script type: ${scriptType}`);
    }

    // 使用Chrome扩展URL而不是blob URL以避免CSP违规
    const workerUrl = chrome.runtime.getURL(workerPath);
    
    const worker = new Worker(workerUrl);
    
    // 设置Worker事件处理
    worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
    worker.onerror = (e) => this.handleWorkerError(worker, e);
    
    return worker;
  }

  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(worker: Worker, event: MessageEvent): void {
    const { id, status, result, error, progress } = event.data;
    const task = this.activeTasks.get(id);
    
    if (!task) {
      console.warn(`[WebWorkerManager] 收到未知任务的消息: ${id}`);
      return;
    }
    
    switch (status) {
      case 'completed':
        task.status = 'completed';
        task.result = result;
        this.completeTask(task);
        {
          const resolver = this.taskResolvers.get(id);
          if (resolver) { resolver.resolve(result); this.taskResolvers.delete(id); }
        }
        break;
        
      case 'failed':
        task.status = 'failed';
        task.error = error;
        this.failTask(task);
        {
          const resolver = this.taskResolvers.get(id);
          if (resolver) { resolver.reject(new Error(error)); this.taskResolvers.delete(id); }
        }
        break;
        
      case 'progress':
        if (this.config.enableProgressTracking && progress !== undefined) {
          task.progress = progress;
          if (this.onTaskProgress) {
            this.onTaskProgress(id, progress);
          }
        }
        break;
    }
  }

  /**
   * 处理Worker错误
   */
  private handleWorkerError(worker: Worker, event: ErrorEvent): void {
    console.error('[WebWorkerManager] Worker错误:', event);
    
    if (this.onWorkerError) {
      this.onWorkerError(worker, event);
    }
    
    // 尝试恢复Worker
    this.recoverWorker(worker);
  }

  /**
   * 恢复Worker
   */
  private async recoverWorker(worker: Worker): Promise<void> {
    try {
      // 终止当前Worker
      worker.terminate();
      
      // 从列表中移除
      const index = this.workers.indexOf(worker);
      if (index > -1) {
        this.workers.splice(index, 1);
      }
      
      // 重新创建Worker
      const newWorker = await this.createWorker();
      this.workers.push(newWorker);
      
      console.log('[WebWorkerManager] Worker恢复成功');
    } catch (error) {
      console.error('[WebWorkerManager] Worker恢复失败:', error);
    }
  }

  /**
   * 提交任务
   */
  public async submitTask(
    type: string,
    data: any,
    priority: WorkerTask['priority'] = 'normal',
    scriptType: string = 'data-processing'
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const task: WorkerTask = {
      id: this.generateTaskId(),
      type,
      data,
      priority,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    // 添加到队列
    this.addToQueue(task);
    
    // 尝试执行任务
    this.processQueue();
    
    return task.id;
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加任务到队列
   */
  private addToQueue(task: WorkerTask): void {
    if (this.taskQueue.length >= this.config.maxQueueSize) {
      throw new Error('任务队列已满');
    }
    
    if (this.config.enablePriorityQueue) {
      // 按优先级插入
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const insertIndex = this.taskQueue.findIndex(
        q => priorityOrder[q.priority] > priorityOrder[task.priority]
      );
      
      if (insertIndex === -1) {
        this.taskQueue.push(task);
      } else {
        this.taskQueue.splice(insertIndex, 0, task);
      }
    } else {
      this.taskQueue.push(task);
    }
  }

  /**
   * 处理任务队列
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.activeTasks.size < this.workers.length) {
      const task = this.taskQueue.shift();
      if (task) {
        this.executeTask(task);
      }
    }
  }

  /**
   * 执行任务
   */
  private executeTask(task: WorkerTask): void {
    if (this.workers.length === 0) {
      console.warn('[WebWorkerManager] 没有可用的Worker');
      return;
    }
    
    // 选择负载最低的Worker
    const worker = this.selectWorker();
    if (!worker) {
      return;
    }
    
    // 更新任务状态
    task.status = 'running';
    this.activeTasks.set(task.id, task);
    
    // 发送任务到Worker
    worker.postMessage({
      id: task.id,
      type: task.type,
      data: task.data
    });
    
    // 设置任务超时
    setTimeout(() => {
      if (task.status === 'running') {
        this.timeoutTask(task);
      }
    }, this.config.taskTimeout);
  }

  /**
   * 选择Worker
   */
  private selectWorker(): Worker | null {
    // 简单的负载均衡：选择活跃任务最少的Worker
    const workerLoads = this.workers.map((worker, index) => ({
      worker,
      index,
      load: Array.from(this.activeTasks.values()).filter(t => 
        t.workerIndex === index
      ).length
    }));
    
    workerLoads.sort((a, b) => a.load - b.load);
    return workerLoads[0]?.worker || null;
  }

  /**
   * 完成任务
   */
  private completeTask(task: WorkerTask): void {
    this.activeTasks.delete(task.id);
    this.completedTasks.push(task);
    
    // 限制完成的任务数量
    if (this.completedTasks.length > 1000) {
      this.completedTasks = this.completedTasks.slice(-1000);
    }
    
    if (this.onTaskComplete) {
      this.onTaskComplete(task);
    }
    
    // 继续处理队列
    this.processQueue();
  }

  /**
   * 任务失败
   */
  private failTask(task: WorkerTask): void {
    this.activeTasks.delete(task.id);
    this.completedTasks.push(task);
    
    console.error(`[WebWorkerManager] 任务失败: ${task.id}`, task.error);
    
    // 继续处理队列
    this.processQueue();
  }

  /**
   * 任务超时
   */
  private timeoutTask(task: WorkerTask): void {
    task.status = 'cancelled';
    task.error = '任务超时';
    
    this.activeTasks.delete(task.id);
    this.completedTasks.push(task);
    
    console.warn(`[WebWorkerManager] 任务超时: ${task.id}`);
    
    // 继续处理队列
    this.processQueue();

    const resolver = this.taskResolvers.get(task.id);
    if (resolver) { resolver.reject(new Error('任务超时')); this.taskResolvers.delete(task.id); }
  }

  /**
   * 便捷：提交任务并等待结果
   */
  public async runTask<T = any>(
    type: string,
    data: any,
    priority: WorkerTask['priority'] = 'normal',
    scriptType: string = 'data-processing'
  ): Promise<T> {
    const id = await this.submitTask(type, data, priority, scriptType);
    return new Promise<T>((resolve, reject) => {
      this.taskResolvers.set(id, { resolve, reject });
    });
  }

  /**
   * 便捷：HTML转Markdown
   */
  public async convertHtmlToMarkdown(html: string): Promise<string> {
    const result = await this.runTask<{ markdown: string }>(
      'html-to-markdown',
      { html },
      'high',
      'markdown-processing'
    );
    return result.markdown;
  }

  /**
   * 便捷：内容提取
   */
  public async extractContent(html: string): Promise<string> {
    const result = await this.runTask<{ content: string }>(
      'extract-text',
      { html },
      'normal',
      'content-extraction'
    );
    return result.content;
  }

  /**
   * 便捷：内容清理
   */
  public async cleanContent(content: string): Promise<string> {
    const result = await this.runTask<{ content: string }>(
      'clean-content',
      { content },
      'normal',
      'content-extraction'
    );
    return result.content;
  }

  /**
   * 便捷：解析元数据
   */
  public async parseMetadata(html: string): Promise<any> {
    const result = await this.runTask<{ metadata: any }>(
      'parse-metadata',
      { html },
      'normal',
      'content-extraction'
    );
    return result.metadata;
  }

  /**
   * 便捷：代码高亮处理
   */
  public async highlightCode(code: string, language: string = 'text'): Promise<string> {
    const result = await this.runTask<{ highlighted: string }>(
      'highlight-code',
      { code, language },
      'normal',
      'code-processing'
    );
    return result.highlighted;
  }

  /**
   * 便捷：图片处理
   */
  public async processImage(imageData: string, options: any = {}): Promise<string> {
    const result = await this.runTask<{ processed: string }>(
      'process-image',
      { imageData, options },
      'low',
      'image-processing'
    );
    return result.processed;
  }

  /**
   * 取消任务
   */
  public cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = 'cancelled';
      this.activeTasks.delete(taskId);
      this.completedTasks.push(task);
      return true;
    }
    
    const queuedTask = this.taskQueue.find(t => t.id === taskId);
    if (queuedTask) {
      queuedTask.status = 'cancelled';
      this.completedTasks.push(queuedTask);
      this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
      return true;
    }
    
    return false;
  }

  /**
   * 获取任务状态
   */
  public getTaskStatus(taskId: string): WorkerTask | null {
    return this.activeTasks.get(taskId) || 
           this.completedTasks.find(t => t.id === taskId) ||
           this.taskQueue.find(t => t.id === taskId) ||
           null;
  }

  /**
   * 获取统计信息
   */
  public getStats(): WorkerStats {
    const completed = this.completedTasks.filter(t => t.status === 'completed');
    const failed = this.completedTasks.filter(t => t.status === 'failed');
    
    const averageTaskTime = completed.length > 0
      ? completed.reduce((sum, t) => sum + (Date.now() - t.timestamp), 0) / completed.length
      : 0;
    
    const totalMemoryUsage = this.workers.length * 2; // 估算每个Worker约2MB
    
    return {
      activeWorkers: this.workers.length,
      queuedTasks: this.taskQueue.length,
      completedTasks: completed.length,
      failedTasks: failed.length,
      averageTaskTime,
      totalMemoryUsage
    };
  }

  /**
   * 设置配置
   */
  public setConfig(config: Partial<WorkerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  public getConfig(): WorkerConfig {
    return { ...this.config };
  }

  /**
   * 设置事件回调
   */
  public setTaskCompleteCallback(callback: (task: WorkerTask) => void): void {
    this.onTaskComplete = callback;
  }

  public setTaskProgressCallback(callback: (taskId: string, progress: number) => void): void {
    this.onTaskProgress = callback;
  }

  public setWorkerErrorCallback(callback: (worker: Worker, error: ErrorEvent) => void): void {
    this.onWorkerError = callback;
  }

  public setStatsUpdateCallback(callback: (stats: WorkerStats) => void): void {
    this.onStatsUpdate = callback;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    // 终止所有Worker
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    
    // 清理任务
    this.activeTasks.clear();
    this.taskQueue = [];
    this.completedTasks = [];
    
    this.isInitialized = false;
  }
}

// 导出单例实例
export const webWorkerManager = WebWorkerManager.getInstance();
