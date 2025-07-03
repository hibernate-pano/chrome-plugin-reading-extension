/**
 * 性能监控工具
 * 用于测量和记录各种操作的性能指标
 */

// 为 Chrome 的 Performance 扩展接口定义
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// 扩展 Performance 接口
interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}

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
  private measurements: Record<string, { start: number; end?: number }> = {};
  private cpuMeasurements: number[] = [];
  private cpuMeasurementInterval: number | null = null;

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
    const extendedPerf = performance as ExtendedPerformance;
    if (extendedPerf.memory) {
      memoryUsage = extendedPerf.memory.usedJSHeapSize;
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
    const extendedPerf = performance as ExtendedPerformance;
    if (extendedPerf.memory && record.memoryUsage) {
      const currentMemory = extendedPerf.memory.usedJSHeapSize;
      memoryUsageDiff = currentMemory - record.memoryUsage;
    }

    const updatedRecord: PerformanceRecord = {
      ...record,
      endTime,
      duration
    };

    this.records.set(name, updatedRecord);

    console.debug(`[性能监控] ${name}: ${duration.toFixed(2)}ms${memoryUsageDiff ? `, 内存变化: ${this.formatBytes(memoryUsageDiff)}` : ''
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
   * 记录性能数据
   * @param name 操作名称
   * @param duration 持续时间（毫秒）
   */
  public record(name: string, duration: number): void {
    if (!this.enabled) return;

    const timestamp = performance.now();
    const record: PerformanceRecord = {
      name,
      startTime: timestamp - duration,
      endTime: timestamp,
      duration
    };

    this.records.set(name, record);

    console.debug(`[性能监控] ${name}: ${duration.toFixed(2)}ms`);
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

  /**
   * 开始测量
   * @param name 测量名称
   */
  public startMeasuring(name: string): void {
    this.measurements[name] = {
      start: performance.now()
    };
  }

  /**
   * 结束测量
   * @param name 测量名称
   * @returns 测量时间（毫秒）
   */
  public endMeasuring(name: string): number | undefined {
    const measurement = this.measurements[name];
    if (!measurement) {
      console.warn(`[PerformanceMonitor] 未找到测量: ${name}`);
      return undefined;
    }

    measurement.end = performance.now();
    const duration = measurement.end - measurement.start;
    
    console.log(`[PerformanceMonitor] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * 获取测量结果
   * @param name 测量名称
   */
  public getMeasurement(name: string): number | undefined {
    const measurement = this.measurements[name];
    if (!measurement || measurement.end === undefined) {
      return undefined;
    }
    return measurement.end - measurement.start;
  }

  /**
   * 开始测量CPU使用率
   * 每秒采样一次
   */
  public startCPUMeasurement(): void {
    // 清除之前的测量
    this.stopCPUMeasurement();
    this.cpuMeasurements = [];
    
    // 开始新的测量
    if ('memory' in performance) {
      this.cpuMeasurementInterval = window.setInterval(() => {
        // 使用简单的启发式方法估算CPU使用率
        const startTime = performance.now();
        let counter = 0;
        
        // 执行一些计算密集型操作
        for (let i = 0; i < 1000000; i++) {
          counter += i * i;
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // 基于基准时间计算相对CPU负载
        // 这只是一个粗略的估计，实际上Chrome扩展无法直接获取精确的CPU使用率
        const baselineDuration = 50; // 假设的基准时间（毫秒）
        const cpuUsage = Math.min(100, (baselineDuration / duration) * 100);
        
        this.cpuMeasurements.push(cpuUsage);
      }, 1000);
    }
  }

  /**
   * 停止测量CPU使用率
   */
  public stopCPUMeasurement(): void {
    if (this.cpuMeasurementInterval !== null) {
      clearInterval(this.cpuMeasurementInterval);
      this.cpuMeasurementInterval = null;
    }
  }

  /**
   * 获取平均CPU使用率
   */
  public getAverageCPUUsage(): number {
    if (this.cpuMeasurements.length === 0) {
      return 0;
    }
    
    const sum = this.cpuMeasurements.reduce((a, b) => a + b, 0);
    return sum / this.cpuMeasurements.length;
  }

  /**
   * 清除所有测量
   */
  public clearMeasurements(): void {
    this.measurements = {};
    this.stopCPUMeasurement();
    this.cpuMeasurements = [];
  }
}

// 导出单例实例
export const performanceMonitor = new PerformanceMonitor();
