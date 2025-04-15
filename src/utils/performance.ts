/**
 * 性能监控工具
 * 用于测量和记录各种操作的性能指标
 */

// 性能记录项接口
export interface PerformanceRecord {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: number;
}

// 性能监控类
export class PerformanceMonitor {
  private records: Map<string, PerformanceRecord> = new Map();
  private enabled: boolean = true;

  /**
   * 启用或禁用性能监控
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 开始测量操作性能
   */
  public start(name: string): void {
    if (!this.enabled) return;

    const startTime = performance.now();
    let memoryUsage: number | undefined = undefined;

    // 尝试获取内存使用情况（如果浏览器支持）
    if (performance.memory) {
      memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    this.records.set(name, {
      name,
      startTime,
      endTime: 0,
      duration: 0,
      memoryUsage
    });

    console.debug(`[性能监控] 开始测量: ${name}`);
  }

  /**
   * 结束测量操作性能
   */
  public end(name: string): PerformanceRecord | undefined {
    if (!this.enabled) return undefined;

    const record = this.records.get(name);
    if (!record) {
      console.warn(`[性能监控] 未找到性能记录: ${name}`);
      return undefined;
    }

    const endTime = performance.now();
    const duration = endTime - record.startTime;

    let memoryUsageDiff: number | undefined = undefined;
    if (performance.memory && record.memoryUsage) {
      const currentMemory = (performance as any).memory.usedJSHeapSize;
      memoryUsageDiff = currentMemory - record.memoryUsage;
    }

    const updatedRecord: PerformanceRecord = {
      ...record,
      endTime,
      duration
    };

    this.records.set(name, updatedRecord);

    console.debug(`[性能监控] ${name}: ${duration.toFixed(2)}ms${
      memoryUsageDiff ? `, 内存变化: ${this.formatBytes(memoryUsageDiff)}` : ''
    }`);

    return updatedRecord;
  }

  /**
   * 获取所有性能记录
   */
  public getRecords(): PerformanceRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * 获取特定操作的性能记录
   */
  public getRecord(name: string): PerformanceRecord | undefined {
    return this.records.get(name);
  }

  /**
   * 清除所有性能记录
   */
  public clearRecords(): void {
    this.records.clear();
  }

  /**
   * 格式化字节数为可读格式
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 创建一个异步操作的性能测量包装器
   */
  public async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * 创建一个同步操作的性能测量包装器
   */
  public measureSync<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      const result = fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * 生成性能报告
   */
  public generateReport(): string {
    if (this.records.size === 0) {
      return '没有性能记录';
    }

    const records = this.getRecords();
    records.sort((a, b) => b.duration - a.duration);

    let report = '性能监控报告:\n';
    report += '=================\n\n';
    
    report += '操作耗时排序 (从高到低):\n';
    records.forEach((record, index) => {
      report += `${index + 1}. ${record.name}: ${record.duration.toFixed(2)}ms\n`;
    });

    report += '\n详细记录:\n';
    records.forEach(record => {
      report += `- ${record.name}:\n`;
      report += `  开始时间: ${new Date(record.startTime).toISOString()}\n`;
      report += `  结束时间: ${new Date(record.endTime).toISOString()}\n`;
      report += `  耗时: ${record.duration.toFixed(2)}ms\n`;
      if (record.memoryUsage !== undefined) {
        report += `  内存使用: ${this.formatBytes(record.memoryUsage)}\n`;
      }
      report += '\n';
    });

    return report;
  }
}

// 导出单例实例
export const performanceMonitor = new PerformanceMonitor();
