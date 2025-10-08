/**
 * 测试样本管理器
 * 管理端到端测试的URL样本和性能基准
 */

export interface TestSample {
  id: string;
  name: string;
  url: string;
  category: 'news' | 'blog' | 'documentation' | 'forum' | 'ecommerce' | 'social';
  description: string;
  expectedElements: {
    title: boolean;
    content: boolean;
    images: boolean;
    codeBlocks: boolean;
    tables: boolean;
    lists: boolean;
  };
  complexity: 'simple' | 'medium' | 'complex';
  size: 'small' | 'medium' | 'large';
}

export interface PerformanceBaseline {
  extractionTime: number; // 内容提取时间 (ms)
  processingTime: number; // 处理时间 (ms)
  renderingTime: number; // 渲染时间 (ms)
  totalTime: number; // 总时间 (ms)
  memoryUsage: number; // 内存使用 (MB)
  cacheHitRate: number; // 缓存命中率
  errorRate: number; // 错误率
}

export interface TestResult {
  sampleId: string;
  timestamp: number;
  success: boolean;
  performance: PerformanceBaseline;
  errors: string[];
  extractedData: {
    title?: string;
    contentLength: number;
    imageCount: number;
    codeBlockCount: number;
    tableCount: number;
    listCount: number;
  };
}

/**
 * 测试样本管理器
 */
export class TestSampleManager {
  private static instance: TestSampleManager;
  private samples: TestSample[] = [];
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private results: TestResult[] = [];

  private constructor() {
    this.initializeSamples();
    this.initializeBaselines();
  }

  public static getInstance(): TestSampleManager {
    if (!TestSampleManager.instance) {
      TestSampleManager.instance = new TestSampleManager();
    }
    return TestSampleManager.instance;
  }

  /**
   * 初始化测试样本
   */
  private initializeSamples(): void {
    this.samples = [
      // 新闻类
      {
        id: 'news-1',
        name: 'BBC News Article',
        url: 'https://www.bbc.com/news/technology-12345678',
        category: 'news',
        description: 'BBC技术新闻文章，包含标题、正文、图片',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: false,
          tables: false,
          lists: true
        },
        complexity: 'simple',
        size: 'medium'
      },
      {
        id: 'news-2',
        name: 'CNN Tech News',
        url: 'https://edition.cnn.com/2024/01/15/tech/ai-advancements/index.html',
        category: 'news',
        description: 'CNN科技新闻，包含多媒体内容',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: false,
          tables: true,
          lists: true
        },
        complexity: 'medium',
        size: 'large'
      },

      // 博客类
      {
        id: 'blog-1',
        name: 'Medium Tech Blog',
        url: 'https://medium.com/@author/tech-article-title-1234567890ab',
        category: 'blog',
        description: 'Medium技术博客，包含代码示例',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: true,
          tables: false,
          lists: true
        },
        complexity: 'medium',
        size: 'medium'
      },
      {
        id: 'blog-2',
        name: 'Dev.to Article',
        url: 'https://dev.to/username/programming-tutorial-123456',
        category: 'blog',
        description: 'Dev.to编程教程，包含大量代码块',
        expectedElements: {
          title: true,
          content: true,
          images: false,
          codeBlocks: true,
          tables: true,
          lists: true
        },
        complexity: 'complex',
        size: 'large'
      },

      // 文档类
      {
        id: 'doc-1',
        name: 'MDN Web Docs',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
        category: 'documentation',
        description: 'MDN JavaScript指南，包含代码示例和表格',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: true,
          tables: true,
          lists: true
        },
        complexity: 'complex',
        size: 'large'
      },
      {
        id: 'doc-2',
        name: 'React Documentation',
        url: 'https://react.dev/learn/thinking-in-react',
        category: 'documentation',
        description: 'React官方文档，包含交互式示例',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: true,
          tables: false,
          lists: true
        },
        complexity: 'medium',
        size: 'medium'
      },

      // 论坛类
      {
        id: 'forum-1',
        name: 'Stack Overflow Question',
        url: 'https://stackoverflow.com/questions/12345678/javascript-question',
        category: 'forum',
        description: 'Stack Overflow问答，包含代码和讨论',
        expectedElements: {
          title: true,
          content: true,
          images: false,
          codeBlocks: true,
          tables: false,
          lists: true
        },
        complexity: 'medium',
        size: 'medium'
      },
      {
        id: 'forum-2',
        name: 'Reddit Discussion',
        url: 'https://www.reddit.com/r/programming/comments/1234567/discussion_topic/',
        category: 'forum',
        description: 'Reddit编程讨论，包含嵌套评论',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: true,
          tables: false,
          lists: true
        },
        complexity: 'complex',
        size: 'large'
      },

      // 电商类
      {
        id: 'ecommerce-1',
        name: 'Amazon Product Page',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        category: 'ecommerce',
        description: 'Amazon产品页面，包含图片、描述、评论',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: false,
          tables: true,
          lists: true
        },
        complexity: 'complex',
        size: 'large'
      },
      {
        id: 'ecommerce-2',
        name: 'Shopify Product',
        url: 'https://shop.example.com/products/product-name',
        category: 'ecommerce',
        description: 'Shopify产品页面，包含多媒体内容',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: false,
          tables: false,
          lists: true
        },
        complexity: 'medium',
        size: 'medium'
      },

      // 社交媒体类
      {
        id: 'social-1',
        name: 'Twitter Thread',
        url: 'https://twitter.com/username/status/1234567890123456789',
        category: 'social',
        description: 'Twitter长推文，包含链接和媒体',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: false,
          tables: false,
          lists: false
        },
        complexity: 'simple',
        size: 'small'
      },
      {
        id: 'social-2',
        name: 'LinkedIn Article',
        url: 'https://www.linkedin.com/pulse/article-title-1234567890',
        category: 'social',
        description: 'LinkedIn文章，包含专业内容',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: false,
          tables: true,
          lists: true
        },
        complexity: 'medium',
        size: 'medium'
      },

      // 技术文档类
      {
        id: 'tech-1',
        name: 'GitHub README',
        url: 'https://github.com/username/repository/blob/main/README.md',
        category: 'documentation',
        description: 'GitHub项目README，包含Markdown格式',
        expectedElements: {
          title: true,
          content: true,
          images: true,
          codeBlocks: true,
          tables: true,
          lists: true
        },
        complexity: 'medium',
        size: 'medium'
      },
      {
        id: 'tech-2',
        name: 'API Documentation',
        url: 'https://api.example.com/docs/endpoints',
        category: 'documentation',
        description: 'API文档，包含代码示例和参数表格',
        expectedElements: {
          title: true,
          content: true,
          images: false,
          codeBlocks: true,
          tables: true,
          lists: true
        },
        complexity: 'complex',
        size: 'large'
      }
    ];
  }

  /**
   * 初始化性能基准
   */
  private initializeBaselines(): void {
    // 简单页面基准
    this.baselines.set('simple', {
      extractionTime: 100,
      processingTime: 50,
      renderingTime: 200,
      totalTime: 350,
      memoryUsage: 10,
      cacheHitRate: 0.8,
      errorRate: 0.01
    });

    // 中等复杂度页面基准
    this.baselines.set('medium', {
      extractionTime: 200,
      processingTime: 100,
      renderingTime: 300,
      totalTime: 600,
      memoryUsage: 20,
      cacheHitRate: 0.7,
      errorRate: 0.02
    });

    // 复杂页面基准
    this.baselines.set('complex', {
      extractionTime: 400,
      processingTime: 200,
      renderingTime: 500,
      totalTime: 1100,
      memoryUsage: 40,
      cacheHitRate: 0.6,
      errorRate: 0.05
    });
  }

  /**
   * 获取所有测试样本
   */
  public getSamples(): TestSample[] {
    return [...this.samples];
  }

  /**
   * 根据类别获取样本
   */
  public getSamplesByCategory(category: TestSample['category']): TestSample[] {
    return this.samples.filter(sample => sample.category === category);
  }

  /**
   * 根据复杂度获取样本
   */
  public getSamplesByComplexity(complexity: TestSample['complexity']): TestSample[] {
    return this.samples.filter(sample => sample.complexity === complexity);
  }

  /**
   * 获取性能基准
   */
  public getBaseline(complexity: TestSample['complexity']): PerformanceBaseline {
    return this.baselines.get(complexity) || this.baselines.get('medium')!;
  }

  /**
   * 记录测试结果
   */
  public recordResult(result: TestResult): void {
    this.results.push(result);
    
    // 限制结果数量，保留最近1000条
    if (this.results.length > 1000) {
      this.results = this.results.slice(-1000);
    }
  }

  /**
   * 获取测试结果
   */
  public getResults(sampleId?: string): TestResult[] {
    if (sampleId) {
      return this.results.filter(result => result.sampleId === sampleId);
    }
    return [...this.results];
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): {
    averageTimes: PerformanceBaseline;
    successRate: number;
    totalTests: number;
    recentTrends: {
      extractionTime: number[];
      processingTime: number[];
      totalTime: number[];
    };
  } {
    const recentResults = this.results.slice(-100); // 最近100次测试
    
    if (recentResults.length === 0) {
      return {
        averageTimes: this.getBaseline('medium'),
        successRate: 0,
        totalTests: 0,
        recentTrends: {
          extractionTime: [],
          processingTime: [],
          totalTime: []
        }
      };
    }

    const successfulResults = recentResults.filter(r => r.success);
    const successRate = successfulResults.length / recentResults.length;

    const averageTimes: PerformanceBaseline = {
      extractionTime: successfulResults.reduce((sum, r) => sum + r.performance.extractionTime, 0) / successfulResults.length,
      processingTime: successfulResults.reduce((sum, r) => sum + r.performance.processingTime, 0) / successfulResults.length,
      renderingTime: successfulResults.reduce((sum, r) => sum + r.performance.renderingTime, 0) / successfulResults.length,
      totalTime: successfulResults.reduce((sum, r) => sum + r.performance.totalTime, 0) / successfulResults.length,
      memoryUsage: successfulResults.reduce((sum, r) => sum + r.performance.memoryUsage, 0) / successfulResults.length,
      cacheHitRate: successfulResults.reduce((sum, r) => sum + r.performance.cacheHitRate, 0) / successfulResults.length,
      errorRate: recentResults.reduce((sum, r) => sum + (r.success ? 0 : 1), 0) / recentResults.length
    };

    const recentTrends = {
      extractionTime: successfulResults.slice(-20).map(r => r.performance.extractionTime),
      processingTime: successfulResults.slice(-20).map(r => r.performance.processingTime),
      totalTime: successfulResults.slice(-20).map(r => r.performance.totalTime)
    };

    return {
      averageTimes,
      successRate,
      totalTests: recentResults.length,
      recentTrends
    };
  }

  /**
   * 检查性能是否达标
   */
  public checkPerformance(result: TestResult): {
    passed: boolean;
    issues: string[];
    score: number;
  } {
    const baseline = this.getBaseline(
      this.samples.find(s => s.id === result.sampleId)?.complexity || 'medium'
    );
    
    const issues: string[] = [];
    let score = 100;

    // 检查各项指标
    if (result.performance.extractionTime > baseline.extractionTime * 1.5) {
      issues.push(`内容提取时间过长: ${result.performance.extractionTime}ms > ${baseline.extractionTime * 1.5}ms`);
      score -= 20;
    }

    if (result.performance.processingTime > baseline.processingTime * 1.5) {
      issues.push(`处理时间过长: ${result.performance.processingTime}ms > ${baseline.processingTime * 1.5}ms`);
      score -= 20;
    }

    if (result.performance.totalTime > baseline.totalTime * 1.5) {
      issues.push(`总时间过长: ${result.performance.totalTime}ms > ${baseline.totalTime * 1.5}ms`);
      score -= 15;
    }

    if (result.performance.memoryUsage > baseline.memoryUsage * 2) {
      issues.push(`内存使用过多: ${result.performance.memoryUsage}MB > ${baseline.memoryUsage * 2}MB`);
      score -= 15;
    }

    if (result.performance.cacheHitRate < baseline.cacheHitRate * 0.5) {
      issues.push(`缓存命中率过低: ${result.performance.cacheHitRate} < ${baseline.cacheHitRate * 0.5}`);
      score -= 10;
    }

    if (result.performance.errorRate > baseline.errorRate * 2) {
      issues.push(`错误率过高: ${result.performance.errorRate} > ${baseline.errorRate * 2}`);
      score -= 20;
    }

    return {
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  /**
   * 生成测试报告
   */
  public generateReport(): string {
    const stats = this.getPerformanceStats();
    const samples = this.getSamples();
    
    let report = '# 端到端测试报告\n\n';
    report += `**生成时间:** ${new Date().toISOString()}\n`;
    report += `**测试样本数:** ${samples.length}\n`;
    report += `**总测试次数:** ${stats.totalTests}\n`;
    report += `**成功率:** ${(stats.successRate * 100).toFixed(1)}%\n\n`;

    report += '## 性能基准\n\n';
    report += '| 复杂度 | 提取时间(ms) | 处理时间(ms) | 渲染时间(ms) | 总时间(ms) | 内存(MB) | 缓存命中率 | 错误率 |\n';
    report += '|--------|-------------|-------------|-------------|-----------|----------|-----------|--------|\n';
    
    ['simple', 'medium', 'complex'].forEach(complexity => {
      const baseline = this.getBaseline(complexity as TestSample['complexity']);
      report += `| ${complexity} | ${baseline.extractionTime} | ${baseline.processingTime} | ${baseline.renderingTime} | ${baseline.totalTime} | ${baseline.memoryUsage} | ${(baseline.cacheHitRate * 100).toFixed(1)}% | ${(baseline.errorRate * 100).toFixed(1)}% |\n`;
    });

    report += '\n## 当前性能\n\n';
    report += `- **平均提取时间:** ${stats.averageTimes.extractionTime.toFixed(1)}ms\n`;
    report += `- **平均处理时间:** ${stats.averageTimes.processingTime.toFixed(1)}ms\n`;
    report += `- **平均渲染时间:** ${stats.averageTimes.renderingTime.toFixed(1)}ms\n`;
    report += `- **平均总时间:** ${stats.averageTimes.totalTime.toFixed(1)}ms\n`;
    report += `- **平均内存使用:** ${stats.averageTimes.memoryUsage.toFixed(1)}MB\n`;
    report += `- **平均缓存命中率:** ${(stats.averageTimes.cacheHitRate * 100).toFixed(1)}%\n`;
    report += `- **平均错误率:** ${(stats.averageTimes.errorRate * 100).toFixed(1)}%\n\n`;

    report += '## 测试样本\n\n';
    report += '| ID | 名称 | 类别 | 复杂度 | 大小 | 描述 |\n';
    report += '|----|------|------|--------|------|------|\n';
    
    samples.forEach(sample => {
      report += `| ${sample.id} | ${sample.name} | ${sample.category} | ${sample.complexity} | ${sample.size} | ${sample.description} |\n`;
    });

    return report;
  }

  /**
   * 清理测试结果
   */
  public clearResults(): void {
    this.results = [];
  }
}

// 导出单例实例
export const testSampleManager = TestSampleManager.getInstance();
