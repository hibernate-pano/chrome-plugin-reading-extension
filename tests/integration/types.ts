/**
 * 集成测试类型定义
 */

/**
 * 测试状态
 */
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

/**
 * 测试模块
 */
export interface TestModule {
  /** 模块名称 */
  name: string;
  /** 模块描述 */
  description: string;
  /** 全局名称（用于访问） */
  globalName?: string;
  /** 模块路径 */
  path?: string;
  /** 模块依赖 */
  dependencies?: string[];
  /** 模块类型 */
  type: 'core' | 'ui' | 'feature' | 'utility' | 'integration';
  /** 模块配置 */
  config?: Record<string, any>;
  /** 测试优先级 */
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 测试步骤
 */
export interface TestStep {
  /** 步骤名称 */
  name: string;
  /** 步骤描述 */
  description: string;
  /** 步骤类型 */
  type: 'action' | 'verification' | 'wait' | 'setup' | 'cleanup';
  /** 步骤参数 */
  params?: Record<string, any>;
  /** 预期结果 */
  expectedResult?: any;
  /** 超时时间 (ms) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
}

/**
 * 测试场景
 */
export interface TestScenario {
  /** 场景名称 */
  name: string;
  /** 场景描述 */
  description: string;
  /** 场景类型 */
  type: 'user-flow' | 'integration' | 'regression' | 'performance' | 'accessibility';
  /** 测试步骤 */
  steps: TestStep[];
  /** 前置条件 */
  prerequisites?: string[];
  /** 后置条件 */
  postconditions?: string[];
  /** 预期结果 */
  expectedResults?: Record<string, any>;
  /** 性能要求 */
  performanceRequirements?: {
    maxDuration?: number;
    maxMemoryUsage?: number;
    maxCpuUsage?: number;
  };
  /** 场景优先级 */
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 模块测试结果
 */
export interface ModuleTestResult {
  /** 测试状态 */
  status: TestStatus;
  /** 测试持续时间 */
  duration: number;
  /** 测试用例列表 */
  tests: TestCaseResult[];
  /** 错误列表 */
  errors: TestError[];
  /** 警告列表 */
  warnings: TestWarning[];
  /** 性能指标 */
  performance?: {
    memoryUsage?: number;
    cpuUsage?: number;
    responseTime?: number;
  };
}

/**
 * 场景测试结果
 */
export interface ScenarioTestResult {
  /** 测试状态 */
  status: TestStatus;
  /** 测试持续时间 */
  duration: number;
  /** 测试步骤列表 */
  steps: TestStepResult[];
  /** 错误列表 */
  errors: TestError[];
  /** 警告列表 */
  warnings: TestWarning[];
  /** 性能指标 */
  performance?: {
    memoryUsage?: number;
    cpuUsage?: number;
    responseTime?: number;
  };
}

/**
 * 测试用例结果
 */
export interface TestCaseResult {
  /** 测试用例名称 */
  name: string;
  /** 测试状态 */
  status: TestStatus;
  /** 测试持续时间 */
  duration: number;
  /** 错误信息 */
  error?: string;
  /** 测试数据 */
  data?: Record<string, any>;
}

/**
 * 测试步骤结果
 */
export interface TestStepResult {
  /** 步骤名称 */
  name: string;
  /** 步骤状态 */
  status: TestStatus;
  /** 步骤持续时间 */
  duration: number;
  /** 错误信息 */
  error?: string;
  /** 步骤数据 */
  data?: Record<string, any>;
}

/**
 * 测试错误
 */
export interface TestError {
  /** 错误类型 */
  type: 'test-execution' | 'global-error' | 'unhandled-rejection' | 'module-error' | 'scenario-error';
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 错误上下文 */
  context?: Record<string, any>;
  /** 时间戳 */
  timestamp: number;
  /** 是否可恢复 */
  recoverable?: boolean;
}

/**
 * 测试警告
 */
export interface TestWarning {
  /** 警告类型 */
  type: 'performance' | 'memory' | 'cpu' | 'deprecation' | 'general';
  /** 警告消息 */
  message: string;
  /** 警告上下文 */
  context?: Record<string, any>;
  /** 时间戳 */
  timestamp: number;
  /** 警告级别 */
  level: 'low' | 'medium' | 'high';
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 总时间 */
  totalTime: number;
  /** 模块时间 */
  moduleTimes: Map<string, number>;
  /** 场景时间 */
  scenarioTimes: Map<string, number>;
  /** 内存使用 */
  memoryUsage?: number;
  /** CPU使用 */
  cpuUsage?: number;
}

/**
 * 集成测试结果
 */
export interface IntegrationTestResult {
  /** 测试ID */
  id: string;
  /** 测试名称 */
  name: string;
  /** 测试状态 */
  status: TestStatus;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 测试持续时间 */
  duration: number;
  /** 测试模块 */
  modules: TestModule[];
  /** 测试场景 */
  scenarios: TestScenario[];
  /** 模块测试结果 */
  moduleResults: Map<string, ModuleTestResult>;
  /** 场景测试结果 */
  scenarioResults: Map<string, ScenarioTestResult>;
  /** 错误列表 */
  errors: TestError[];
  /** 警告列表 */
  warnings: TestWarning[];
  /** 性能指标 */
  performance: PerformanceMetrics;
  /** 测试元数据 */
  metadata?: {
    browser?: string;
    version?: string;
    platform?: string;
    timestamp?: number;
  };
}

/**
 * 测试配置
 */
export interface IntegrationTestConfig {
  /** 是否启用详细日志 */
  verbose?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 测试超时时间 (ms) */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 并行测试数量 */
  parallelTests?: number;
  /** 是否启用错误恢复 */
  enableErrorRecovery?: boolean;
  /** 是否启用自动清理 */
  enableAutoCleanup?: boolean;
  /** 测试环境配置 */
  environment?: {
    /** 是否模拟真实环境 */
    simulateRealEnvironment?: boolean;
    /** 是否启用网络模拟 */
    enableNetworkSimulation?: boolean;
    /** 是否启用设备模拟 */
    enableDeviceSimulation?: boolean;
  };
}

/**
 * 测试环境
 */
export interface TestEnvironment {
  /** 环境名称 */
  name: string;
  /** 环境类型 */
  type: 'development' | 'staging' | 'production' | 'testing';
  /** 环境配置 */
  config: Record<string, any>;
  /** 环境变量 */
  variables: Record<string, string>;
  /** 模拟设置 */
  mocks?: {
    /** API模拟 */
    api?: boolean;
    /** 存储模拟 */
    storage?: boolean;
    /** 网络模拟 */
    network?: boolean;
  };
}

/**
 * 测试报告
 */
export interface IntegrationTestReport {
  /** 报告ID */
  id: string;
  /** 生成时间 */
  generatedAt: number;
  /** 测试摘要 */
  summary: {
    /** 总测试数 */
    totalTests: number;
    /** 通过测试数 */
    passedTests: number;
    /** 失败测试数 */
    failedTests: number;
    /** 跳过测试数 */
    skippedTests: number;
    /** 总持续时间 */
    totalDuration: number;
    /** 平均持续时间 */
    averageDuration: number;
  };
  /** 测试结果 */
  testResults: IntegrationTestResult[];
  /** 模块统计 */
  moduleStats: {
    /** 模块总数 */
    totalModules: number;
    /** 通过模块数 */
    passedModules: number;
    /** 失败模块数 */
    failedModules: number;
  };
  /** 场景统计 */
  scenarioStats: {
    /** 场景总数 */
    totalScenarios: number;
    /** 通过场景数 */
    passedScenarios: number;
    /** 失败场景数 */
    failedScenarios: number;
  };
  /** 性能统计 */
  performanceStats: {
    /** 平均模块时间 */
    averageModuleTime: number;
    /** 平均场景时间 */
    averageScenarioTime: number;
    /** 总性能时间 */
    totalPerformanceTime: number;
  };
  /** 错误分析 */
  errorAnalysis: {
    /** 错误类型分布 */
    errorTypeDistribution: Record<string, number>;
    /** 错误频率 */
    errorFrequency: Record<string, number>;
    /** 常见错误 */
    commonErrors: TestError[];
  };
  /** 建议和改进 */
  recommendations: {
    /** 性能改进 */
    performance?: string[];
    /** 稳定性改进 */
    stability?: string[];
    /** 功能改进 */
    functionality?: string[];
  };
}
