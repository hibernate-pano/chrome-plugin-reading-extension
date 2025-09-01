import { TestScenario } from './types';

/**
 * 预定义的测试场景配置
 * 提供各种常见的性能测试场景
 */

/**
 * 内容提取测试场景
 */
export const contentExtractionScenarios: TestScenario[] = [
  {
    type: 'content-extraction',
    name: '简单内容提取',
    description: '测试简单网页内容的提取性能',
    config: {
      iterations: 10,
      complexity: 'low'
    },
    expectedResults: {
      maxExtractionTime: 100,
      minSuccessRate: 0.95
    }
  },
  {
    type: 'content-extraction',
    name: '中等复杂度内容提取',
    description: '测试中等复杂度网页内容的提取性能',
    config: {
      iterations: 10,
      complexity: 'medium'
    },
    expectedResults: {
      maxExtractionTime: 200,
      minSuccessRate: 0.90
    }
  },
  {
    type: 'content-extraction',
    name: '高复杂度内容提取',
    description: '测试高复杂度网页内容的提取性能',
    config: {
      iterations: 10,
      complexity: 'high'
    },
    expectedResults: {
      maxExtractionTime: 500,
      minSuccessRate: 0.85
    }
  }
];

/**
 * UI渲染测试场景
 */
export const uiRenderingScenarios: TestScenario[] = [
  {
    type: 'ui-rendering',
    name: '简单UI渲染',
    description: '测试简单UI组件的渲染性能',
    config: {
      iterations: 5,
      complexity: 'low'
    },
    expectedResults: {
      maxRenderTime: 50,
      minSuccessRate: 0.95
    }
  },
  {
    type: 'ui-rendering',
    name: '中等复杂度UI渲染',
    description: '测试中等复杂度UI组件的渲染性能',
    config: {
      iterations: 5,
      complexity: 'medium'
    },
    expectedResults: {
      maxRenderTime: 100,
      minSuccessRate: 0.90
    }
  },
  {
    type: 'ui-rendering',
    name: '高复杂度UI渲染',
    description: '测试高复杂度UI组件的渲染性能',
    config: {
      iterations: 5,
      complexity: 'high'
    },
    expectedResults: {
      maxRenderTime: 200,
      minSuccessRate: 0.85
    }
  }
];

/**
 * 内存使用测试场景
 */
export const memoryUsageScenarios: TestScenario[] = [
  {
    type: 'memory-usage',
    name: '基础内存使用',
    description: '测试基础功能的内存使用情况',
    config: {
      iterations: 1
    },
    expectedResults: {
      maxMemoryUsage: 30,
      minSuccessRate: 0.95
    }
  },
  {
    type: 'memory-usage',
    name: '扩展内存使用',
    description: '测试扩展功能的内存使用情况',
    config: {
      iterations: 1
    },
    expectedResults: {
      maxMemoryUsage: 50,
      minSuccessRate: 0.90
    }
  }
];

/**
 * CPU性能测试场景
 */
export const cpuPerformanceScenarios: TestScenario[] = [
  {
    type: 'cpu-performance',
    name: 'CPU性能测试',
    description: '测试CPU密集型操作的性能',
    config: {
      iterations: 1
    },
    expectedResults: {
      maxCpuUsage: 0.1,
      minSuccessRate: 0.95
    }
  }
];

/**
 * 用户交互测试场景
 */
export const userInteractionScenarios: TestScenario[] = [
  {
    type: 'user-interaction',
    name: '简单交互测试',
    description: '测试简单用户交互的响应性能',
    config: {
      iterations: 10,
      complexity: 'low'
    },
    expectedResults: {
      maxUserInteractionTime: 50,
      minSuccessRate: 0.95
    }
  },
  {
    type: 'user-interaction',
    name: '中等复杂度交互测试',
    description: '测试中等复杂度用户交互的响应性能',
    config: {
      iterations: 10,
      complexity: 'medium'
    },
    expectedResults: {
      maxUserInteractionTime: 100,
      minSuccessRate: 0.90
    }
  },
  {
    type: 'user-interaction',
    name: '高复杂度交互测试',
    description: '测试高复杂度用户交互的响应性能',
    config: {
      iterations: 10,
      complexity: 'high'
    },
    expectedResults: {
      maxUserInteractionTime: 200,
      minSuccessRate: 0.85
    }
  }
];

/**
 * 压力测试场景
 */
export const stressTestScenarios: TestScenario[] = [
  {
    type: 'stress-test',
    name: '低负载压力测试',
    description: '测试低负载情况下的性能表现',
    config: {
      duration: 10000,
      load: 'low'
    },
    expectedResults: {
      minSuccessRate: 0.95
    }
  },
  {
    type: 'stress-test',
    name: '中等负载压力测试',
    description: '测试中等负载情况下的性能表现',
    config: {
      duration: 15000,
      load: 'medium'
    },
    expectedResults: {
      minSuccessRate: 0.90
    }
  },
  {
    type: 'stress-test',
    name: '高负载压力测试',
    description: '测试高负载情况下的性能表现',
    config: {
      duration: 20000,
      load: 'high'
    },
    expectedResults: {
      minSuccessRate: 0.80
    }
  }
];

/**
 * 综合测试场景
 */
export const comprehensiveScenarios: TestScenario[] = [
  ...contentExtractionScenarios,
  ...uiRenderingScenarios,
  ...memoryUsageScenarios,
  ...cpuPerformanceScenarios,
  ...userInteractionScenarios
];

/**
 * 快速测试场景（用于开发阶段）
 */
export const quickTestScenarios: TestScenario[] = [
  {
    type: 'content-extraction',
    name: '快速内容提取测试',
    description: '快速测试内容提取性能',
    config: {
      iterations: 3,
      complexity: 'low'
    },
    expectedResults: {
      maxExtractionTime: 100,
      minSuccessRate: 0.90
    }
  },
  {
    type: 'ui-rendering',
    name: '快速UI渲染测试',
    description: '快速测试UI渲染性能',
    config: {
      iterations: 2,
      complexity: 'low'
    },
    expectedResults: {
      maxRenderTime: 50,
      minSuccessRate: 0.90
    }
  }
];

/**
 * 回归测试场景（用于版本发布前）
 */
export const regressionTestScenarios: TestScenario[] = [
  {
    type: 'content-extraction',
    name: '回归测试-内容提取',
    description: '回归测试内容提取功能',
    config: {
      iterations: 20,
      complexity: 'medium'
    },
    expectedResults: {
      maxExtractionTime: 200,
      minSuccessRate: 0.95
    }
  },
  {
    type: 'ui-rendering',
    name: '回归测试-UI渲染',
    description: '回归测试UI渲染功能',
    config: {
      iterations: 15,
      complexity: 'medium'
    },
    expectedResults: {
      maxRenderTime: 100,
      minSuccessRate: 0.95
    }
  },
  {
    type: 'memory-usage',
    name: '回归测试-内存使用',
    description: '回归测试内存使用情况',
    config: {
      iterations: 1
    },
    expectedResults: {
      maxMemoryUsage: 50,
      minSuccessRate: 0.95
    }
  },
  {
    type: 'stress-test',
    name: '回归测试-压力测试',
    description: '回归测试压力情况下的性能',
    config: {
      duration: 30000,
      load: 'medium'
    },
    expectedResults: {
      minSuccessRate: 0.90
    }
  }
];

/**
 * 根据测试类型获取测试场景
 */
export function getTestScenariosByType(type: string): TestScenario[] {
  switch (type) {
    case 'content-extraction':
      return contentExtractionScenarios;
    case 'ui-rendering':
      return uiRenderingScenarios;
    case 'memory-usage':
      return memoryUsageScenarios;
    case 'cpu-performance':
      return cpuPerformanceScenarios;
    case 'user-interaction':
      return userInteractionScenarios;
    case 'stress-test':
      return stressTestScenarios;
    case 'comprehensive':
      return comprehensiveScenarios;
    case 'quick':
      return quickTestScenarios;
    case 'regression':
      return regressionTestScenarios;
    default:
      return [];
  }
}

/**
 * 获取所有可用的测试场景类型
 */
export function getAvailableTestTypes(): string[] {
  return [
    'content-extraction',
    'ui-rendering',
    'memory-usage',
    'cpu-performance',
    'user-interaction',
    'stress-test',
    'comprehensive',
    'quick',
    'regression'
  ];
}

/**
 * 获取测试场景的统计信息
 */
export function getTestScenariosStats(): {
  totalScenarios: number;
  scenariosByType: Record<string, number>;
  totalExpectedTests: number;
} {
  const allScenarios = comprehensiveScenarios;
  const scenariosByType: Record<string, number> = {};
  
  allScenarios.forEach(scenario => {
    const type = scenario.type;
    scenariosByType[type] = (scenariosByType[type] || 0) + 1;
  });

  const totalExpectedTests = allScenarios.reduce((sum, scenario) => {
    const iterations = scenario.config.iterations || 1;
    return sum + iterations;
  }, 0);

  return {
    totalScenarios: allScenarios.length,
    scenariosByType,
    totalExpectedTests
  };
}
