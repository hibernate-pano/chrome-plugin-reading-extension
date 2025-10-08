/**
 * 测试报告生成器
 * 生成详细的测试报告和性能分析
 */

import { testSampleManager, TestResult } from './TestSampleManager';
import { e2eTestRunner, TestProgress } from './E2ETestRunner';
import { performanceMonitor, PerformanceReport } from './PerformanceMonitor';

export interface TestReport {
  metadata: {
    title: string;
    generatedAt: string;
    version: string;
    environment: string;
  };
  summary: {
    totalSamples: number;
    totalTests: number;
    successRate: number;
    averageScore: number;
    executionTime: number;
  };
  performance: PerformanceReport;
  results: {
    byCategory: Record<string, TestResult[]>;
    byComplexity: Record<string, TestResult[]>;
    failed: TestResult[];
    topPerformers: TestResult[];
    worstPerformers: TestResult[];
  };
  analysis: {
    trends: {
      performance: 'improving' | 'stable' | 'degrading';
      success: 'improving' | 'stable' | 'degrading';
      errors: 'increasing' | 'stable' | 'decreasing';
    };
    insights: string[];
    recommendations: string[];
  };
  charts: {
    performanceOverTime: Array<{ timestamp: number; value: number; label: string }>;
    successRateByCategory: Array<{ category: string; rate: number }>;
    performanceByComplexity: Array<{ complexity: string; averageTime: number }>;
  };
}

/**
 * 测试报告生成器
 */
export class TestReportGenerator {
  private static instance: TestReportGenerator;

  private constructor() {}

  public static getInstance(): TestReportGenerator {
    if (!TestReportGenerator.instance) {
      TestReportGenerator.instance = new TestReportGenerator();
    }
    return TestReportGenerator.instance;
  }

  /**
   * 生成完整测试报告
   */
  public generateReport(): TestReport {
    const results = testSampleManager.getResults();
    const samples = testSampleManager.getSamples();
    const performanceReport = performanceMonitor.generateReport();

    return {
      metadata: {
        title: 'Chrome阅读扩展端到端测试报告',
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        environment: this.getEnvironmentInfo()
      },
      summary: this.generateSummary(results, samples),
      performance: performanceReport,
      results: this.analyzeResults(results, samples),
      analysis: this.generateAnalysis(results, performanceReport),
      charts: this.generateCharts(results, samples)
    };
  }

  /**
   * 生成摘要信息
   */
  private generateSummary(results: TestResult[], samples: TestSample[]): TestReport['summary'] {
    const successfulResults = results.filter(r => r.success);
    const successRate = results.length > 0 ? successfulResults.length / results.length : 0;
    
    // 计算平均分数
    const scores = results.map(result => {
      const check = testSampleManager.checkPerformance(result);
      return check.score;
    });
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    // 计算执行时间
    const executionTime = results.length > 0 
      ? results.reduce((sum, r) => sum + r.performance.totalTime, 0) 
      : 0;

    return {
      totalSamples: samples.length,
      totalTests: results.length,
      successRate,
      averageScore,
      executionTime
    };
  }

  /**
   * 分析测试结果
   */
  private analyzeResults(results: TestResult[], samples: TestSample[]): TestReport['results'] {
    const byCategory: Record<string, TestResult[]> = {};
    const byComplexity: Record<string, TestResult[]> = {};
    const failed: TestResult[] = [];
    const topPerformers: TestResult[] = [];
    const worstPerformers: TestResult[] = [];

    // 按类别分组
    samples.forEach(sample => {
      if (!byCategory[sample.category]) {
        byCategory[sample.category] = [];
      }
      const sampleResults = results.filter(r => r.sampleId === sample.id);
      byCategory[sample.category].push(...sampleResults);
    });

    // 按复杂度分组
    samples.forEach(sample => {
      if (!byComplexity[sample.complexity]) {
        byComplexity[sample.complexity] = [];
      }
      const sampleResults = results.filter(r => r.sampleId === sample.id);
      byComplexity[sample.complexity].push(...sampleResults);
    });

    // 分类结果
    results.forEach(result => {
      if (!result.success) {
        failed.push(result);
      }
    });

    // 按性能排序
    const sortedByPerformance = results
      .filter(r => r.success)
      .sort((a, b) => a.performance.totalTime - b.performance.totalTime);

    topPerformers.push(...sortedByPerformance.slice(0, 5));
    worstPerformers.push(...sortedByPerformance.slice(-5).reverse());

    return {
      byCategory,
      byComplexity,
      failed,
      topPerformers,
      worstPerformers
    };
  }

  /**
   * 生成分析
   */
  private generateAnalysis(results: TestResult[], performanceReport: PerformanceReport): TestReport['analysis'] {
    const insights: string[] = [];
    const recommendations: string[] = [];

    // 分析趋势
    const trends = this.analyzeTrends(results);

    // 生成洞察
    if (trends.performance === 'degrading') {
      insights.push('性能呈下降趋势，需要关注系统负载和资源使用');
    } else if (trends.performance === 'improving') {
      insights.push('性能持续改善，优化措施效果显著');
    }

    if (trends.success === 'degrading') {
      insights.push('成功率下降，可能存在稳定性问题');
    }

    if (results.filter(r => !r.success).length > results.length * 0.1) {
      insights.push('失败率超过10%，需要检查错误处理机制');
    }

    // 生成建议
    recommendations.push(...performanceReport.recommendations);

    if (trends.errors === 'increasing') {
      recommendations.push('错误率上升，建议增加错误监控和自动恢复机制');
    }

    const avgMemoryUsage = results.reduce((sum, r) => sum + r.performance.memoryUsage, 0) / results.length;
    if (avgMemoryUsage > 50) {
      recommendations.push('平均内存使用较高，建议优化内存管理策略');
    }

    return {
      trends,
      insights,
      recommendations
    };
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(results: TestResult[]): TestReport['analysis']['trends'] {
    if (results.length < 10) {
      return {
        performance: 'stable',
        success: 'stable',
        errors: 'stable'
      };
    }

    const recent = results.slice(-10);
    const older = results.slice(-20, -10);

    // 性能趋势
    const recentAvgTime = recent.reduce((sum, r) => sum + r.performance.totalTime, 0) / recent.length;
    const olderAvgTime = older.reduce((sum, r) => sum + r.performance.totalTime, 0) / older.length;
    const performanceChange = (recentAvgTime - olderAvgTime) / olderAvgTime;

    // 成功率趋势
    const recentSuccessRate = recent.filter(r => r.success).length / recent.length;
    const olderSuccessRate = older.filter(r => r.success).length / older.length;
    const successChange = recentSuccessRate - olderSuccessRate;

    // 错误趋势
    const recentErrorRate = recent.filter(r => !r.success).length / recent.length;
    const olderErrorRate = older.filter(r => !r.success).length / older.length;
    const errorChange = recentErrorRate - olderErrorRate;

    return {
      performance: performanceChange > 0.1 ? 'degrading' : performanceChange < -0.1 ? 'improving' : 'stable',
      success: successChange > 0.05 ? 'improving' : successChange < -0.05 ? 'degrading' : 'stable',
      errors: errorChange > 0.05 ? 'increasing' : errorChange < -0.05 ? 'decreasing' : 'stable'
    };
  }

  /**
   * 生成图表数据
   */
  private generateCharts(results: TestResult[], samples: TestSample[]): TestReport['charts'] {
    return {
      performanceOverTime: this.generatePerformanceOverTimeChart(results),
      successRateByCategory: this.generateSuccessRateByCategoryChart(results, samples),
      performanceByComplexity: this.generatePerformanceByComplexityChart(results, samples)
    };
  }

  /**
   * 生成性能时间线图表
   */
  private generatePerformanceOverTimeChart(results: TestResult[]): Array<{ timestamp: number; value: number; label: string }> {
    return results
      .filter(r => r.success)
      .map(r => ({
        timestamp: r.timestamp,
        value: r.performance.totalTime,
        label: r.sampleId
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 生成按类别成功率图表
   */
  private generateSuccessRateByCategoryChart(results: TestResult[], samples: TestSample[]): Array<{ category: string; rate: number }> {
    const categoryStats: Record<string, { total: number; success: number }> = {};

    samples.forEach(sample => {
      if (!categoryStats[sample.category]) {
        categoryStats[sample.category] = { total: 0, success: 0 };
      }
      
      const sampleResults = results.filter(r => r.sampleId === sample.id);
      categoryStats[sample.category].total += sampleResults.length;
      categoryStats[sample.category].success += sampleResults.filter(r => r.success).length;
    });

    return Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      rate: stats.total > 0 ? stats.success / stats.total : 0
    }));
  }

  /**
   * 生成按复杂度性能图表
   */
  private generatePerformanceByComplexityChart(results: TestResult[], samples: TestSample[]): Array<{ complexity: string; averageTime: number }> {
    const complexityStats: Record<string, { total: number; time: number }> = {};

    samples.forEach(sample => {
      if (!complexityStats[sample.complexity]) {
        complexityStats[sample.complexity] = { total: 0, time: 0 };
      }
      
      const sampleResults = results.filter(r => r.sampleId === sample.id && r.success);
      complexityStats[sample.complexity].total += sampleResults.length;
      complexityStats[sample.complexity].time += sampleResults.reduce((sum, r) => sum + r.performance.totalTime, 0);
    });

    return Object.entries(complexityStats).map(([complexity, stats]) => ({
      complexity,
      averageTime: stats.total > 0 ? stats.time / stats.total : 0
    }));
  }

  /**
   * 获取环境信息
   */
  private getEnvironmentInfo(): string {
    return `Chrome ${navigator.userAgent.includes('Chrome') ? navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown' : 'Unknown'}, ${navigator.platform}`;
  }

  /**
   * 导出报告为Markdown
   */
  public exportToMarkdown(report: TestReport): string {
    let markdown = `# ${report.metadata.title}\n\n`;
    
    markdown += `**生成时间:** ${report.metadata.generatedAt}\n`;
    markdown += `**版本:** ${report.metadata.version}\n`;
    markdown += `**环境:** ${report.metadata.environment}\n\n`;

    // 摘要
    markdown += `## 测试摘要\n\n`;
    markdown += `- **测试样本数:** ${report.summary.totalSamples}\n`;
    markdown += `- **总测试次数:** ${report.summary.totalTests}\n`;
    markdown += `- **成功率:** ${(report.summary.successRate * 100).toFixed(1)}%\n`;
    markdown += `- **平均分数:** ${report.summary.averageScore.toFixed(1)}/100\n`;
    markdown += `- **总执行时间:** ${(report.summary.executionTime / 1000).toFixed(2)}s\n\n`;

    // 性能分析
    markdown += `## 性能分析\n\n`;
    markdown += `- **平均提取时间:** ${report.performance.summary.averagePerformance.extractionTime.toFixed(1)}ms\n`;
    markdown += `- **平均处理时间:** ${report.performance.summary.averagePerformance.processingTime.toFixed(1)}ms\n`;
    markdown += `- **平均总时间:** ${report.performance.summary.averagePerformance.totalTime.toFixed(1)}ms\n`;
    markdown += `- **平均内存使用:** ${report.performance.summary.averagePerformance.memoryUsage.toFixed(1)}MB\n`;
    markdown += `- **平均缓存命中率:** ${(report.performance.summary.averagePerformance.cacheHitRate * 100).toFixed(1)}%\n`;
    markdown += `- **性能趋势:** ${report.performance.summary.performanceTrend}\n\n`;

    // 分析洞察
    markdown += `## 分析洞察\n\n`;
    report.analysis.insights.forEach(insight => {
      markdown += `- ${insight}\n`;
    });
    markdown += `\n`;

    // 建议
    markdown += `## 改进建议\n\n`;
    report.analysis.recommendations.forEach(recommendation => {
      markdown += `- ${recommendation}\n`;
    });
    markdown += `\n`;

    // 失败测试
    if (report.results.failed.length > 0) {
      markdown += `## 失败测试\n\n`;
      markdown += `| 样本ID | 错误信息 |\n`;
      markdown += `|--------|----------|\n`;
      report.results.failed.forEach(result => {
        markdown += `| ${result.sampleId} | ${result.errors.join(', ')} |\n`;
      });
      markdown += `\n`;
    }

    return markdown;
  }

  /**
   * 导出报告为JSON
   */
  public exportToJson(report: TestReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * 导出报告为HTML
   */
  public exportToHtml(report: TestReport): string {
    const markdown = this.exportToMarkdown(report);
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.metadata.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metric { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
    </style>
</head>
<body>
    <h1>${report.metadata.title}</h1>
    <div class="metric">
        <strong>生成时间:</strong> ${report.metadata.generatedAt}<br>
        <strong>版本:</strong> ${report.metadata.version}<br>
        <strong>环境:</strong> ${report.metadata.environment}
    </div>
    
    <h2>测试摘要</h2>
    <div class="metric">
        <strong>测试样本数:</strong> ${report.summary.totalSamples}<br>
        <strong>总测试次数:</strong> ${report.summary.totalTests}<br>
        <strong>成功率:</strong> <span class="${report.summary.successRate > 0.9 ? 'success' : report.summary.successRate > 0.7 ? 'warning' : 'error'}">${(report.summary.successRate * 100).toFixed(1)}%</span><br>
        <strong>平均分数:</strong> ${report.summary.averageScore.toFixed(1)}/100<br>
        <strong>总执行时间:</strong> ${(report.summary.executionTime / 1000).toFixed(2)}s
    </div>
    
    <h2>性能分析</h2>
    <div class="metric">
        <strong>平均提取时间:</strong> ${report.performance.summary.averagePerformance.extractionTime.toFixed(1)}ms<br>
        <strong>平均处理时间:</strong> ${report.performance.summary.averagePerformance.processingTime.toFixed(1)}ms<br>
        <strong>平均总时间:</strong> ${report.performance.summary.averagePerformance.totalTime.toFixed(1)}ms<br>
        <strong>平均内存使用:</strong> ${report.performance.summary.averagePerformance.memoryUsage.toFixed(1)}MB<br>
        <strong>平均缓存命中率:</strong> ${(report.performance.summary.averagePerformance.cacheHitRate * 100).toFixed(1)}%<br>
        <strong>性能趋势:</strong> <span class="${report.performance.summary.performanceTrend === 'improving' ? 'success' : report.performance.summary.performanceTrend === 'stable' ? 'warning' : 'error'}">${report.performance.summary.performanceTrend}</span>
    </div>
    
    <h2>分析洞察</h2>
    <ul>
        ${report.analysis.insights.map(insight => `<li>${insight}</li>`).join('')}
    </ul>
    
    <h2>改进建议</h2>
    <ul>
        ${report.analysis.recommendations.map(recommendation => `<li>${recommendation}</li>`).join('')}
    </ul>
    
    ${report.results.failed.length > 0 ? `
    <h2>失败测试</h2>
    <table>
        <tr><th>样本ID</th><th>错误信息</th></tr>
        ${report.results.failed.map(result => `<tr><td>${result.sampleId}</td><td>${result.errors.join(', ')}</td></tr>`).join('')}
    </table>
    ` : ''}
</body>
</html>`;
  }
}

// 导出单例实例
export const testReportGenerator = TestReportGenerator.getInstance();
