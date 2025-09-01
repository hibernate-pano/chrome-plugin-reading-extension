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
  private workerScripts: Map<string, string> = new Map();
  
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
    
    this.initializeWorkerScripts();
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
   * 初始化Worker脚本
   */
  private initializeWorkerScripts(): void {
    // 内容提取Worker
    this.workerScripts.set('content-extraction', `
      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        
        try {
          let result;
          
          switch (type) {
            case 'extract-text':
              result = extractText(data.html);
              break;
            case 'clean-content':
              result = cleanContent(data.content);
              break;
            case 'parse-metadata':
              result = parseMetadata(data.html);
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }
          
          self.postMessage({
            id,
            status: 'completed',
            result
          });
        } catch (error) {
          self.postMessage({
            id,
            status: 'failed',
            error: error.message
          });
        }
      };
      
      function extractText(html) {
        // 简单的文本提取逻辑
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
      }
      
      function cleanContent(content) {
        // 内容清理逻辑
        return content.replace(/\\s+/g, ' ').trim();
      }
      
      function parseMetadata(html) {
        // 元数据解析逻辑
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\\/title>/i);
        const title = titleMatch ? titleMatch[1] : '';
        
        return { title };
      }
    `);
    
    // 数据处理Worker
    this.workerScripts.set('data-processing', `
      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        
        try {
          let result;
          
          switch (type) {
            case 'process-array':
              result = processArray(data.array, data.operation);
              break;
            case 'filter-data':
              result = filterData(data.items, data.criteria);
              break;
            case 'sort-data':
              result = sortData(data.items, data.key, data.direction);
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }
          
          self.postMessage({
            id,
            status: 'completed',
            result
          });
        } catch (error) {
          self.postMessage({
            id,
            status: 'failed',
            error: error.message
          });
        }
      };
      
      function processArray(array, operation) {
        switch (operation) {
          case 'sum':
            return array.reduce((sum, num) => sum + num, 0);
          case 'average':
            return array.reduce((sum, num) => sum + num, 0) / array.length;
          case 'max':
            return Math.max(...array);
          case 'min':
            return Math.min(...array);
          default:
            return array;
        }
      }
      
      function filterData(items, criteria) {
        return items.filter(item => {
          return Object.entries(criteria).every(([key, value]) => {
            return item[key] === value;
          });
        });
      }
      
      function sortData(items, key, direction) {
        return [...items].sort((a, b) => {
          const aVal = a[key];
          const bVal = b[key];
          
          if (direction === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });
      }
    `);
    
    // 性能监控Worker
    this.workerScripts.set('performance-monitor', `
      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        
        try {
          let result;
          
          switch (type) {
            case 'calculate-stats':
              result = calculateStats(data.metrics);
              break;
            case 'detect-anomalies':
              result = detectAnomalies(data.metrics, data.threshold);
              break;
            case 'generate-report':
              result = generateReport(data.metrics);
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }
          
          self.postMessage({
            id,
            status: 'completed',
            result
          });
        } catch (error) {
          self.postMessage({
            id,
            status: 'failed',
            error: error.message
          });
        }
      };
      
      function calculateStats(metrics) {
        if (!metrics || metrics.length === 0) {
          return { count: 0, average: 0, min: 0, max: 0, median: 0 };
        }
        
        const values = metrics.map(m => m.value || m).filter(v => typeof v === 'number');
        const sorted = values.sort((a, b) => a - b);
        
        const count = values.length;
        const sum = values.reduce((a, b) => a + b, 0);
        const average = sum / count;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = sorted[Math.floor(count / 2)];
        
        return { count, average, min, max, median };
      }
      
      function detectAnomalies(metrics, threshold) {
        if (!metrics || metrics.length === 0) return [];
        
        const values = metrics.map(m => m.value || m).filter(v => typeof v === 'number');
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        return values
          .map((value, index) => ({ value, index }))
          .filter(({ value }) => Math.abs(value - mean) > threshold * stdDev);
      }
      
      function generateReport(metrics) {
        const stats = calculateStats(metrics);
        const anomalies = detectAnomalies(metrics, 2);
        
        return {
          summary: stats,
          anomalies: anomalies.length,
          recommendations: generateRecommendations(stats, anomalies.length)
        };
      }
      
      function generateRecommendations(stats, anomalyCount) {
        const recommendations = [];
        
        if (stats.average > 1000) {
          recommendations.push('性能指标偏高，建议优化相关操作');
        }
        
        if (anomalyCount > stats.count * 0.1) {
          recommendations.push('异常数据较多，建议检查数据质量');
        }
        
        if (stats.max / stats.average > 5) {
          recommendations.push('性能波动较大，建议检查系统稳定性');
        }
        
        return recommendations;
      }
    `);
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
    const script = this.workerScripts.get(scriptType);
    if (!script) {
      throw new Error(`Unknown script type: ${scriptType}`);
    }

    // 创建Blob URL
    const blob = new Blob([script], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    
    const worker = new Worker(url);
    
    // 设置Worker事件处理
    worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
    worker.onerror = (e) => this.handleWorkerError(worker, e);
    
    // 清理Blob URL
    URL.revokeObjectURL(url);
    
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
        break;
        
      case 'failed':
        task.status = 'failed';
        task.error = error;
        this.failTask(task);
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
  public onTaskComplete(callback: (task: WorkerTask) => void): void {
    this.onTaskComplete = callback;
  }

  public onTaskProgress(callback: (taskId: string, progress: number) => void): void {
    this.onTaskProgress = callback;
  }

  public onWorkerError(callback: (worker: Worker, error: ErrorEvent) => void): void {
    this.onWorkerError = callback;
  }

  public onStatsUpdate(callback: (stats: WorkerStats) => void): void {
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
