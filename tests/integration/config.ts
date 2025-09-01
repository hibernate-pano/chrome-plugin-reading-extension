/**
 * 集成测试配置
 */

import { IntegrationTestConfig, TestEnvironment } from './types';

/**
 * 默认测试配置
 */
export const defaultTestConfig: IntegrationTestConfig = {
  verbose: true,
  enablePerformanceMonitoring: true,
  timeout: 30000, // 30秒
  retryCount: 2,
  parallelTests: 1, // 串行执行，避免冲突
  enableErrorRecovery: true,
  enableAutoCleanup: true,
  environment: {
    simulateRealEnvironment: true,
    enableNetworkSimulation: false,
    enableDeviceSimulation: false,
  },
};

/**
 * 测试环境配置
 */
export const testEnvironments: Record<string, TestEnvironment> = {
  development: {
    name: '开发环境',
    type: 'development',
    config: {
      debug: true,
      logLevel: 'debug',
      enableMocking: true,
    },
    variables: {
      NODE_ENV: 'development',
      TEST_MODE: 'true',
      DEBUG: 'true',
    },
    mocks: {
      api: true,
      storage: true,
      network: false,
    },
  },
  testing: {
    name: '测试环境',
    type: 'testing',
    config: {
      debug: false,
      logLevel: 'info',
      enableMocking: true,
    },
    variables: {
      NODE_ENV: 'testing',
      TEST_MODE: 'true',
      DEBUG: 'false',
    },
    mocks: {
      api: true,
      storage: true,
      network: true,
    },
  },
  staging: {
    name: '预发布环境',
    type: 'staging',
    config: {
      debug: false,
      logLevel: 'warn',
      enableMocking: false,
    },
    variables: {
      NODE_ENV: 'staging',
      TEST_MODE: 'false',
      DEBUG: 'false',
    },
    mocks: {
      api: false,
      storage: false,
      network: false,
    },
  },
  production: {
    name: '生产环境',
    type: 'production',
    config: {
      debug: false,
      logLevel: 'error',
      enableMocking: false,
    },
    variables: {
      NODE_ENV: 'production',
      TEST_MODE: 'false',
      DEBUG: 'false',
    },
    mocks: {
      api: false,
      storage: false,
      network: false,
    },
  },
};

/**
 * 测试超时配置
 */
export const testTimeouts = {
  quick: 5000,      // 快速测试：5秒
  normal: 15000,    // 普通测试：15秒
  slow: 30000,      // 慢速测试：30秒
  verySlow: 60000,  // 极慢测试：60秒
  infinite: 0,      // 无超时限制
};

/**
 * 重试配置
 */
export const retryConfig = {
  quick: { count: 1, delay: 1000 },
  normal: { count: 2, delay: 2000 },
  slow: { count: 3, delay: 3000 },
  critical: { count: 5, delay: 5000 },
};

/**
 * 性能阈值配置
 */
export const performanceThresholds = {
  memory: {
    warning: 50 * 1024 * 1024,  // 50MB
    critical: 100 * 1024 * 1024, // 100MB
  },
  cpu: {
    warning: 80,  // 80%
    critical: 95, // 95%
  },
  responseTime: {
    warning: 1000,  // 1秒
    critical: 3000, // 3秒
  },
};

/**
 * 日志配置
 */
export const loggingConfig = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
  },
  colors: {
    error: '#ff0000',
    warn: '#ffa500',
    info: '#0000ff',
    debug: '#808080',
    trace: '#c0c0c0',
  },
  maxLogEntries: 1000,
  logRetention: 24 * 60 * 60 * 1000, // 24小时
};

/**
 * 错误处理配置
 */
export const errorHandlingConfig = {
  maxErrors: 100,
  errorGrouping: true,
  errorDeduplication: true,
  errorReporting: {
    enabled: true,
    includeStack: true,
    includeContext: true,
    includePerformance: true,
  },
};

/**
 * 清理配置
 */
export const cleanupConfig = {
  autoCleanup: true,
  cleanupDelay: 1000, // 1秒后清理
  cleanupTimeout: 10000, // 清理超时：10秒
  cleanupRetries: 3,
  cleanupOnError: true,
  cleanupOnSuccess: true,
};

/**
 * 报告配置
 */
export const reportingConfig = {
  generateReport: true,
  reportFormat: 'json' as 'json' | 'html' | 'markdown',
  includePerformance: true,
  includeErrors: true,
  includeWarnings: true,
  includeMetadata: true,
  reportRetention: 7 * 24 * 60 * 60 * 1000, // 7天
};

/**
 * 网络配置
 */
export const networkConfig = {
  timeout: 10000,
  retries: 3,
  backoff: {
    initial: 1000,
    multiplier: 2,
    maxDelay: 10000,
  },
  interceptors: {
    enabled: true,
    logRequests: true,
    logResponses: true,
    mockResponses: false,
  },
};

/**
 * 存储配置
 */
export const storageConfig = {
  prefix: 'integration-test-',
  cleanup: true,
  maxSize: 10 * 1024 * 1024, // 10MB
  encryption: false,
  compression: false,
};

/**
 * 设备模拟配置
 */
export const deviceSimulationConfig = {
  enabled: false,
  devices: {
    mobile: {
      width: 375,
      height: 667,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    },
    tablet: {
      width: 768,
      height: 1024,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    },
    desktop: {
      width: 1920,
      height: 1080,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  },
};

/**
 * 获取环境配置
 */
export function getEnvironmentConfig(envName: string = 'testing'): TestEnvironment {
  return testEnvironments[envName] || testEnvironments.testing;
}

/**
 * 获取测试配置
 */
export function getTestConfig(envName?: string): IntegrationTestConfig {
  const env = getEnvironmentConfig(envName);
  return {
    ...defaultTestConfig,
    environment: {
      ...defaultTestConfig.environment,
      ...env.config,
    },
  };
}

/**
 * 验证配置
 */
export function validateConfig(config: IntegrationTestConfig): string[] {
  const errors: string[] = [];

  if (config.timeout && config.timeout < 0) {
    errors.push('超时时间不能为负数');
  }

  if (config.retryCount && config.retryCount < 0) {
    errors.push('重试次数不能为负数');
  }

  if (config.parallelTests && config.parallelTests < 1) {
    errors.push('并行测试数量必须大于0');
  }

  return errors;
}
