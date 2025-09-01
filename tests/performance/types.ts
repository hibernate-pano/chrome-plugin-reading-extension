/**
 * 性能测试类型定义
 */

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 内容提取时间 (ms) */
  extractionTime: number;
  /** UI渲染时间 (ms) */
  renderTime: number;
  /** 内存使用量 (MB) */
  memoryUsage: number;
  /** CPU使用时间 (s) */
  cpuUsage: number;
  /** 用户交互时间 (ms) */
  userInteractionTime: number;
  /** 错误率 (0-1) */
  errorRate: number;
  /** 成功率 (0-1) */
  successRate: number;
}

/**
 * 测试场景类型
 */
export type TestScenarioType = 
  | 'content-extraction'
  | 'ui-rendering'
  | 'memory-usage'
  | 'cpu-performance'
  | 'user-interaction'
  | 'stress-test';

/**
 * 测试场景配置
 */
export interface TestScenario {
  /** 测试类型 */
  type: TestScenarioType;
  /** 测试名称 */
  name: string;
  /** 测试描述 */
  description: string;
  /** 测试配置 */
  config: {
    /** 迭代次数 */
    iterations?: number;
    /** 复杂度级别 */
    complexity?: 'low' | 'medium' | 'high';
    /** 持续时间 (ms) */
    duration?: number;
    /** 负载级别 */
    load?: 'low' | 'medium' | 'high';
    /** 自定义参数 */
    [key: string]: any;
  };
  /** 预期结果 */
  expectedResults?: {
    /** 最大提取时间 (ms) */
    maxExtractionTime?: number;
    /** 最大渲染时间 (ms) */
    maxRenderTime?: number;
    /** 最大内存使用 (MB) */
    maxMemoryUsage?: number;
    /** 最大CPU使用时间 (s) */
    maxCpuUsage?: number;
    /** 最小成功率 */
    minSuccessRate?: number;
  };
}

/**
 * 性能条目
 */
export interface PerformanceEntry {
  /** 条目名称 */
  name: string;
  /** 条目类型 */
  entryType: string;
  /** 开始时间 */
  startTime: number;
  /** 持续时间 */
  duration: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 测试错误
 */
export interface TestError {
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 测试警告
 */
export interface TestWarning {
  /** 警告消息 */
  message: string;
  /** 警告类型 */
  type: 'performance' | 'memory' | 'cpu' | 'general';
  /** 时间戳 */
  timestamp: number;
}

/**
 * 测试状态
 */
export type TestStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * 性能测试结果
 */
export interface PerformanceTestResult {
  /** 测试ID */
  id: string;
  /** 测试场景 */
  scenario: TestScenario;
  /** 测试状态 */
  status: TestStatus;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 测试持续时间 */
  duration: number;
  /** 性能指标 */
  metrics: PerformanceMetrics;
  /** 性能条目 */
  performanceEntries: PerformanceEntry[];
  /** 错误列表 */
  errors: TestError[];
  /** 警告列表 */
  warnings: TestWarning[];
}

/**
 * 基准测试结果
 */
export interface BenchmarkResult {
  /** 基准名称 */
  name: string;
  /** 测试结果 */
  results: PerformanceTestResult[];
  /** 统计信息 */
  statistics: {
    /** 平均值 */
    mean: PerformanceMetrics;
    /** 中位数 */
    median: PerformanceMetrics;
    /** 标准差 */
    standardDeviation: PerformanceMetrics;
    /** 最小值 */
    min: PerformanceMetrics;
    /** 最大值 */
    max: PerformanceMetrics;
    /** 样本数量 */
    sampleCount: number;
  };
  /** 通过率 */
  passRate: number;
  /** 是否通过基准测试 */
  passed: boolean;
}

/**
 * 性能测试配置
 */
export interface PerformanceTestConfig {
  /** 是否启用详细日志 */
  verbose?: boolean;
  /** 是否启用性能监控 */
  enableMonitoring?: boolean;
  /** 测试超时时间 (ms) */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 基准阈值 */
  thresholds?: {
    /** 内容提取时间阈值 (ms) */
    extractionTime?: number;
    /** UI渲染时间阈值 (ms) */
    renderTime?: number;
    /** 内存使用阈值 (MB) */
    memoryUsage?: number;
    /** CPU使用时间阈值 (s) */
    cpuUsage?: number;
    /** 用户交互时间阈值 (ms) */
    userInteractionTime?: number;
    /** 最小成功率阈值 */
    minSuccessRate?: number;
  };
}

/**
 * 性能监控事件
 */
export interface PerformanceMonitorEvent {
  /** 事件类型 */
  type: 'test-start' | 'test-progress' | 'test-complete' | 'test-error';
  /** 测试ID */
  testId: string;
  /** 事件数据 */
  data: any;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 性能优化建议
 */
export interface PerformanceOptimizationSuggestion {
  /** 建议类型 */
  type: 'extraction' | 'rendering' | 'memory' | 'cpu' | 'general';
  /** 建议标题 */
  title: string;
  /** 建议描述 */
  description: string;
  /** 预期改进 */
  expectedImprovement: string;
  /** 优先级 */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** 实施难度 */
  difficulty: 'easy' | 'medium' | 'hard';
  /** 相关代码位置 */
  codeLocations?: string[];
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  /** 报告ID */
  id: string;
  /** 生成时间 */
  generatedAt: number;
  /** 测试摘要 */
  summary: {
    /** 总测试数 */
    totalTests: number;
    /** 完成测试数 */
    completedTests: number;
    /** 失败测试数 */
    failedTests: number;
    /** 平均性能指标 */
    averageMetrics: PerformanceMetrics;
  };
  /** 测试结果 */
  testResults: PerformanceTestResult[];
  /** 基准测试结果 */
  benchmarkResults: BenchmarkResult[];
  /** 性能优化建议 */
  optimizationSuggestions: PerformanceOptimizationSuggestion[];
  /** 报告元数据 */
  metadata: {
    /** 浏览器信息 */
    browser: string;
    /** 操作系统 */
    os: string;
    /** 设备类型 */
    deviceType: string;
    /** 扩展版本 */
    extensionVersion: string;
  };
}
