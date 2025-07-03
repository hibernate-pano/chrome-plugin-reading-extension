/**
 * 性能报告生成器
 * 用于分析最小注入重构前后的性能差异并生成详细报告
 */

import {
  MinimalInjectionBenchmark,
  BEFORE_VERSION,
  AFTER_VERSION,
  ModuleType,
  MinimalInjectionMetric,
  BenchmarkReport
} from './minimal-injection-benchmark';
import { PerformanceRecord } from '../../utils/performance';

/**
 * 性能比较结果
 */
interface PerformanceComparison {
  // 指标名称
  metric: string;
  // 重构前值
  beforeValue: number;
  // 重构后值
  afterValue: number;
  // 变化百分比 (负值表示性能提升)
  changePercent: number;
  // 是否是性能提升
  isImprovement: boolean;
}

/**
 * 模块加载时间比较
 */
interface ModuleLoadComparison {
  // 模块名称
  moduleName: ModuleType;
  // 重构前加载时间
  beforeLoadTime: number;
  // 重构后加载时间
  afterLoadTime: number;
  // 变化百分比
  changePercent: number;
  // 是否延迟加载
  isLazyLoaded: boolean;
}

/**
 * 完整性能报告
 */
interface PerformanceReport {
  // 报告生成时间
  timestamp: number;
  // 重构前版本
  beforeVersion: string;
  // 重构后版本
  afterVersion: string;
  // 测试URL数量
  testUrlCount: number;
  // 每个URL的样本数
  samplesPerUrl: number;
  // 总体性能变化百分比 (负值表示整体性能提升)
  overallChangePercent: number;
  // 各项指标比较
  metrics: PerformanceComparison[];
  // 模块加载时间比较
  moduleLoadTimes: ModuleLoadComparison[];
  // 关键发现
  keyFindings: string[];
  // 建议
  recommendations: string[];
  summary: {
    overallImprovement: number;
    totalMetricsImproved: number;
    totalMetrics: number;
  };
  lazyLoadedModules: string[];
  rawData: {
    before: PerformanceRecord[];
    after: PerformanceRecord[];
  };
}

/**
 * 性能报告生成器类
 */
export class PerformanceReportGenerator {
  private benchmark: MinimalInjectionBenchmark;
  
  constructor() {
    this.benchmark = MinimalInjectionBenchmark.getInstance();
  }
  
  /**
   * 生成性能比较报告
   */
  public async generateReport(): Promise<PerformanceReport> {
    console.log('正在生成性能比较报告...');
    
    // 获取测试报告
    const beforeReports = await this.benchmark.getReports(BEFORE_VERSION);
    const afterReports = await this.benchmark.getReports(AFTER_VERSION);
    
    if (beforeReports.length === 0 || afterReports.length === 0) {
      throw new Error(`无法生成报告：缺少测试数据 (前: ${beforeReports.length}, 后: ${afterReports.length})`);
    }
    
    console.log(`找到测试报告 - 重构前: ${beforeReports.length}, 重构后: ${afterReports.length}`);
    
    // 计算平均指标
    const beforeMetrics = this.calculateAverageMetrics(beforeReports);
    const afterMetrics = this.calculateAverageMetrics(afterReports);
    
    // 生成指标比较
    const metricsComparison = this.compareMetrics(beforeMetrics, afterMetrics);
    
    // 比较模块加载时间
    const moduleLoadComparison = this.compareModuleLoadTimes(beforeReports, afterReports);
    
    // 计算总体性能变化
    const overallChange = this.calculateOverallChange(metricsComparison);
    
    // 生成关键发现和建议
    const keyFindings = this.generateKeyFindings(metricsComparison, moduleLoadComparison, overallChange);
    const recommendations = this.generateRecommendations(metricsComparison, moduleLoadComparison);
    
    // 创建完整报告
    const report: PerformanceReport = {
      timestamp: Date.now(),
      beforeVersion: BEFORE_VERSION,
      afterVersion: AFTER_VERSION,
      testUrlCount: this.countUniqueUrls(beforeReports, afterReports),
      samplesPerUrl: this.calculateSamplesPerUrl(beforeReports, afterReports),
      overallChangePercent: overallChange,
      metrics: metricsComparison,
      moduleLoadTimes: moduleLoadComparison,
      keyFindings,
      recommendations,
      summary: {
        overallImprovement: overallChange,
        totalMetricsImproved: metricsComparison.filter(m => m.isImprovement).length,
        totalMetrics: metricsComparison.length
      },
      lazyLoadedModules: this.identifyLazyLoadedModules(moduleLoadComparison),
      rawData: {
        before: beforeReports,
        after: afterReports
      }
    };
    
    return report;
  }
  
  /**
   * 计算平均性能指标
   */
  private calculateAverageMetrics(reports: BenchmarkReport[]): Record<string, number> {
    if (reports.length === 0) return {};
    
    const metrics: Record<string, number> = {};
    const metricCounts: Record<string, number> = {};
    
    // 累加所有指标值
    reports.forEach(report => {
      Object.entries(report.metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          metrics[key] = (metrics[key] || 0) + value;
          metricCounts[key] = (metricCounts[key] || 0) + 1;
        }
      });
    });
    
    // 计算平均值
    Object.keys(metrics).forEach(key => {
      if (metricCounts[key] > 0) {
        metrics[key] = metrics[key] / metricCounts[key];
      }
    });
    
    return metrics;
  }
  
  /**
   * 比较性能指标
   */
  private compareMetrics(
    beforeMetrics: Record<string, number>,
    afterMetrics: Record<string, number>
  ): PerformanceComparison[] {
    const comparisons: PerformanceComparison[] = [];
    
    // 合并所有指标键
    const allMetricKeys = new Set([
      ...Object.keys(beforeMetrics),
      ...Object.keys(afterMetrics)
    ]);
    
    // 计算每个指标的比较结果
    allMetricKeys.forEach(metric => {
      const beforeValue = beforeMetrics[metric] || 0;
      const afterValue = afterMetrics[metric] || 0;
      
      // 只有当两个值都存在且至少一个大于0时才计算变化百分比
      if (beforeValue > 0 || afterValue > 0) {
        let changePercent = 0;
        
        if (beforeValue > 0) {
          changePercent = ((afterValue - beforeValue) / beforeValue) * 100;
        } else if (afterValue > 0) {
          changePercent = 100; // 如果之前为0，视为100%增加
        }
        
        // 对于大多数指标，值越低越好（负变化表示改进）
        // 但对于某些特殊指标可能需要反转逻辑
        const isImprovement = changePercent < 0;
        
        comparisons.push({
          metric,
          beforeValue,
          afterValue,
          changePercent,
          isImprovement
        });
      }
    });
    
    // 按照变化幅度排序（改进最大的在前）
    return comparisons.sort((a, b) => a.changePercent - b.changePercent);
  }
  
  /**
   * 比较模块加载时间
   */
  private compareModuleLoadTimes(
    beforeReports: BenchmarkReport[],
    afterReports: BenchmarkReport[]
  ): ModuleLoadComparison[] {
    // 提取模块加载时间
    const beforeModuleTimes = this.extractAverageModuleLoadTimes(beforeReports);
    const afterModuleTimes = this.extractAverageModuleLoadTimes(afterReports);
    
    // 确定哪些模块在重构后是懒加载的
    const lazyLoadedModules = this.identifyLazyLoadedModules(beforeReports, afterReports);
    
    // 合并所有模块名称
    const allModules = new Set([
      ...Object.keys(beforeModuleTimes),
      ...Object.keys(afterModuleTimes)
    ]) as Set<ModuleType>;
    
    // 创建比较结果
    const comparisons: ModuleLoadComparison[] = [];
    
    allModules.forEach(module => {
      const beforeLoadTime = beforeModuleTimes[module] || 0;
      const afterLoadTime = afterModuleTimes[module] || 0;
      
      let changePercent = 0;
      if (beforeLoadTime > 0) {
        changePercent = ((afterLoadTime - beforeLoadTime) / beforeLoadTime) * 100;
      } else if (afterLoadTime > 0) {
        changePercent = 100;
      }
      
      comparisons.push({
        moduleName: module,
        beforeLoadTime,
        afterLoadTime,
        changePercent,
        isLazyLoaded: lazyLoadedModules.has(module)
      });
    });
    
    // 按照变化幅度排序
    return comparisons.sort((a, b) => a.changePercent - b.changePercent);
  }
  
  /**
   * 提取平均模块加载时间
   */
  private extractAverageModuleLoadTimes(reports: BenchmarkReport[]): Record<ModuleType, number> {
    const moduleTimes: Record<ModuleType, number> = {} as Record<ModuleType, number>;
    const moduleCounts: Record<ModuleType, number> = {} as Record<ModuleType, number>;
    
    reports.forEach(report => {
      if (report.moduleLoadTimes) {
        Object.entries(report.moduleLoadTimes).forEach(([module, time]) => {
          const moduleType = module as ModuleType;
          moduleTimes[moduleType] = (moduleTimes[moduleType] || 0) + time;
          moduleCounts[moduleType] = (moduleCounts[moduleType] || 0) + 1;
        });
      }
    });
    
    // 计算平均值
    Object.keys(moduleTimes).forEach(module => {
      const moduleType = module as ModuleType;
      if (moduleCounts[moduleType] > 0) {
        moduleTimes[moduleType] = moduleTimes[moduleType] / moduleCounts[moduleType];
      }
    });
    
    return moduleTimes;
  }
  
  /**
   * 识别懒加载模块
   */
  private identifyLazyLoadedModules(
    beforeReports: BenchmarkReport[],
    afterReports: BenchmarkReport[]
  ): Set<ModuleType> {
    const lazyLoadedModules = new Set<ModuleType>();
    
    // 提取所有模块名称
    const allModules = new Set<ModuleType>();
    
    beforeReports.forEach(report => {
      if (report.moduleLoadTimes) {
        Object.keys(report.moduleLoadTimes).forEach(module => {
          allModules.add(module as ModuleType);
        });
      }
    });
    
    afterReports.forEach(report => {
      if (report.moduleLoadTimes) {
        Object.keys(report.moduleLoadTimes).forEach(module => {
          allModules.add(module as ModuleType);
        });
      }
    });
    
    // 检查每个模块的加载时间差异
    // 如果重构后的加载时间明显晚于初始加载，则认为是懒加载
    allModules.forEach(module => {
      const beforeLoadTimes = this.extractModuleLoadTimesRelativeToStart(beforeReports, module);
      const afterLoadTimes = this.extractModuleLoadTimesRelativeToStart(afterReports, module);
      
      if (beforeLoadTimes.length > 0 && afterLoadTimes.length > 0) {
        const beforeAvg = beforeLoadTimes.reduce((sum, val) => sum + val, 0) / beforeLoadTimes.length;
        const afterAvg = afterLoadTimes.reduce((sum, val) => sum + val, 0) / afterLoadTimes.length;
        
        // 如果重构后的相对加载时间比重构前晚100ms以上，则认为是懒加载
        if (afterAvg - beforeAvg > 100) {
          lazyLoadedModules.add(module);
        }
      }
    });
    
    return lazyLoadedModules;
  }
  
  /**
   * 提取模块相对于初始加载的加载时间
   */
  private extractModuleLoadTimesRelativeToStart(
    reports: BenchmarkReport[],
    module: ModuleType
  ): number[] {
    const relativeTimes: number[] = [];
    
    reports.forEach(report => {
      if (report.moduleLoadTimes && report.moduleLoadTimes[module] !== undefined) {
        const startTime = report.metrics.scriptInjectionTime || 0;
        const moduleLoadTime = report.moduleLoadTimes[module];
        
        // 计算相对于脚本注入时间的加载时间
        relativeTimes.push(moduleLoadTime - startTime);
      }
    });
    
    return relativeTimes;
  }
  
  /**
   * 计算总体性能变化
   */
  private calculateOverallChange(comparisons: PerformanceComparison[]): number {
    if (comparisons.length === 0) return 0;
    
    // 为不同指标分配权重
    const weights: Record<string, number> = {
      initialScriptSize: 3,
      buttonRenderTime: 3,
      activationTime: 4,
      memoryUsage: 2,
      domMutations: 1,
      cpuUsage: 2
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    comparisons.forEach(comparison => {
      const weight = weights[comparison.metric] || 1;
      weightedSum += comparison.changePercent * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  
  /**
   * 生成关键发现
   */
  private generateKeyFindings(
    metricsComparison: PerformanceComparison[],
    moduleLoadComparison: ModuleLoadComparison[],
    overallChange: number
  ): string[] {
    const findings: string[] = [];
    
    // 总体性能变化
    if (overallChange < -20) {
      findings.push(`重构后整体性能显著提升，平均提升了 ${Math.abs(overallChange).toFixed(1)}%`);
    } else if (overallChange < -5) {
      findings.push(`重构后整体性能有所提升，平均提升了 ${Math.abs(overallChange).toFixed(1)}%`);
    } else if (overallChange > 5) {
      findings.push(`重构后整体性能有所下降，平均下降了 ${overallChange.toFixed(1)}%`);
    } else {
      findings.push(`重构前后整体性能变化不大，变化幅度为 ${overallChange.toFixed(1)}%`);
    }
    
    // 最显著的改进
    const improvements = metricsComparison.filter(c => c.isImprovement && c.changePercent < -10);
    if (improvements.length > 0) {
      const topImprovement = improvements[0];
      findings.push(`最显著的改进是 ${topImprovement.metric}，提升了 ${Math.abs(topImprovement.changePercent).toFixed(1)}%`);
    }
    
    // 最显著的退步
    const regressions = metricsComparison.filter(c => !c.isImprovement && c.changePercent > 10);
    if (regressions.length > 0) {
      const worstRegression = regressions[regressions.length - 1];
      findings.push(`最显著的退步是 ${worstRegression.metric}，下降了 ${worstRegression.changePercent.toFixed(1)}%`);
    }
    
    // 懒加载模块数量
    const lazyLoadedModules = moduleLoadComparison.filter(m => m.isLazyLoaded);
    if (lazyLoadedModules.length > 0) {
      findings.push(`共有 ${lazyLoadedModules.length} 个模块实现了懒加载: ${lazyLoadedModules.map(m => m.moduleName).join(', ')}`);
    }
    
    // 初始脚本大小变化
    const scriptSizeComparison = metricsComparison.find(c => c.metric === 'initialScriptSize');
    if (scriptSizeComparison) {
      const changeDirection = scriptSizeComparison.isImprovement ? '减小' : '增加';
      const changePercent = Math.abs(scriptSizeComparison.changePercent).toFixed(1);
      findings.push(`初始脚本大小${changeDirection}了 ${changePercent}%，从 ${formatBytes(scriptSizeComparison.beforeValue)} 变为 ${formatBytes(scriptSizeComparison.afterValue)}`);
    }
    
    // 内存使用变化
    const memoryComparison = metricsComparison.find(c => c.metric === 'memoryUsage');
    if (memoryComparison) {
      const changeDirection = memoryComparison.isImprovement ? '减少' : '增加';
      const changePercent = Math.abs(memoryComparison.changePercent).toFixed(1);
      findings.push(`内存使用${changeDirection}了 ${changePercent}%，从 ${formatBytes(memoryComparison.beforeValue)} 变为 ${formatBytes(memoryComparison.afterValue)}`);
    }
    
    return findings;
  }
  
  /**
   * 生成建议
   */
  private generateRecommendations(
    metricsComparison: PerformanceComparison[],
    moduleLoadComparison: ModuleLoadComparison[]
  ): string[] {
    const recommendations: string[] = [];
    
    // 基于性能数据生成建议
    const regressions = metricsComparison.filter(c => !c.isImprovement && c.changePercent > 10);
    
    if (regressions.length > 0) {
      recommendations.push(`需要进一步优化以下指标: ${regressions.map(r => r.metric).join(', ')}`);
    }
    
    // 检查是否有模块加载时间增加
    const slowModules = moduleLoadComparison.filter(m => m.changePercent > 20);
    if (slowModules.length > 0) {
      recommendations.push(`以下模块加载时间增加较多，需要优化: ${slowModules.map(m => m.moduleName).join(', ')}`);
    }
    
    // 检查是否有未实现懒加载的大型模块
    const nonLazyModules = moduleLoadComparison.filter(m => !m.isLazyLoaded && m.afterLoadTime > 50);
    if (nonLazyModules.length > 0) {
      recommendations.push(`考虑对以下模块实现懒加载: ${nonLazyModules.map(m => m.moduleName).join(', ')}`);
    }
    
    // 添加通用建议
    recommendations.push('持续监控性能指标，特别是在添加新功能时');
    recommendations.push('考虑实现更细粒度的代码分割，进一步减小初始加载体积');
    
    return recommendations;
  }
  
  /**
   * 计算测试中使用的唯一URL数量
   */
  private countUniqueUrls(beforeReports: BenchmarkReport[], afterReports: BenchmarkReport[]): number {
    const uniqueUrls = new Set<string>();
    
    beforeReports.forEach(report => {
      if (report.description && report.description.includes('URL:')) {
        const urlMatch = report.description.match(/URL: ([^,]+)/);
        if (urlMatch && urlMatch[1]) {
          uniqueUrls.add(urlMatch[1]);
        }
      }
    });
    
    afterReports.forEach(report => {
      if (report.description && report.description.includes('URL:')) {
        const urlMatch = report.description.match(/URL: ([^,]+)/);
        if (urlMatch && urlMatch[1]) {
          uniqueUrls.add(urlMatch[1]);
        }
      }
    });
    
    return uniqueUrls.size;
  }
  
  /**
   * 计算每个URL的平均样本数
   */
  private calculateSamplesPerUrl(beforeReports: BenchmarkReport[], afterReports: BenchmarkReport[]): number {
    const urlCounts: Record<string, number> = {};
    let totalReports = 0;
    
    // 统计每个URL的报告数量
    const countReports = (reports: BenchmarkReport[]) => {
      reports.forEach(report => {
        if (report.description && report.description.includes('URL:')) {
          const urlMatch = report.description.match(/URL: ([^,]+)/);
          if (urlMatch && urlMatch[1]) {
            const url = urlMatch[1];
            urlCounts[url] = (urlCounts[url] || 0) + 1;
            totalReports++;
          }
        }
      });
    };
    
    countReports(beforeReports);
    countReports(afterReports);
    
    // 计算每个URL的平均样本数
    const uniqueUrls = Object.keys(urlCounts).length;
    return uniqueUrls > 0 ? totalReports / uniqueUrls / 2 : 0; // 除以2是因为每个URL有before和after两组测试
  }
  
  /**
   * 将性能报告导出为Markdown格式
   */
  public exportReportAsMarkdown(report: PerformanceReport): string {
    const { 
      beforeVersion, 
      afterVersion, 
      testUrlCount, 
      samplesPerUrl,
      overallChangePercent, 
      metrics, 
      moduleLoadTimes, 
      keyFindings, 
      recommendations 
    } = report;
    
    let markdown = `# 最小注入重构性能报告\n\n`;
    markdown += `**比较版本:** ${beforeVersion} → ${afterVersion}\n`;
    markdown += `**生成时间:** ${new Date(report.timestamp).toLocaleString()}\n`;
    markdown += `**测试范围:** ${testUrlCount} 个URL，每个URL ${samplesPerUrl} 个样本\n\n`;
    
    // 总体性能变化
    const changeDirection = overallChangePercent < 0 ? '提升' : '下降';
    markdown += `## 总体性能变化\n\n`;
    markdown += `整体性能${changeDirection}: **${Math.abs(overallChangePercent).toFixed(2)}%**\n\n`;
    
    // 关键发现
    markdown += `## 关键发现\n\n`;
    keyFindings.forEach(finding => {
      markdown += `- ${finding}\n`;
    });
    markdown += '\n';
    
    // 性能指标比较
    markdown += `## 性能指标比较\n\n`;
    markdown += `| 指标 | ${beforeVersion} | ${afterVersion} | 变化 (%) | 改进? |\n`;
    markdown += `|------|--------------|--------------|----------|-------|\n`;
    
    metrics.forEach(metric => {
      const formattedBefore = formatMetricValue(metric.metric, metric.beforeValue);
      const formattedAfter = formatMetricValue(metric.metric, metric.afterValue);
      const change = metric.changePercent.toFixed(2);
      const improvement = metric.isImprovement ? '✅' : '❌';
      
      markdown += `| ${formatMetricName(metric.metric)} | ${formattedBefore} | ${formattedAfter} | ${change}% | ${improvement} |\n`;
    });
    markdown += '\n';
    
    // 模块加载时间比较
    markdown += `## 模块加载时间比较\n\n`;
    markdown += `| 模块 | ${beforeVersion} (ms) | ${afterVersion} (ms) | 变化 (%) | 懒加载? |\n`;
    markdown += `|------|-----------------|-----------------|----------|----------|\n`;
    
    moduleLoadTimes.forEach(module => {
      const before = module.beforeLoadTime.toFixed(2);
      const after = module.afterLoadTime.toFixed(2);
      const change = module.changePercent.toFixed(2);
      const lazyLoaded = module.isLazyLoaded ? '✅' : '❌';
      
      markdown += `| ${module.moduleName} | ${before} | ${after} | ${change}% | ${lazyLoaded} |\n`;
    });
    markdown += '\n';
    
    // 建议
    markdown += `## 建议\n\n`;
    recommendations.forEach(recommendation => {
      markdown += `- ${recommendation}\n`;
    });
    markdown += '\n';
    
    return markdown;
  }
  
  /**
   * 将性能报告保存为Markdown文件
   */
  public saveReportAsMarkdown(report: PerformanceReport): void {
    const markdown = this.exportReportAsMarkdown(report);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${report.beforeVersion}-vs-${report.afterVersion}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化指标名称
 */
function formatMetricName(metric: string): string {
  // 将camelCase转换为人类可读格式
  return metric
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

/**
 * 格式化指标值
 */
function formatMetricValue(metric: string, value: number): string {
  // 根据指标类型选择合适的格式
  if (metric.includes('Size') || metric.includes('memory') || metric.includes('Memory')) {
    return formatBytes(value);
  } else if (metric.includes('Time') || metric.includes('time')) {
    return `${value.toFixed(2)} ms`;
  } else if (metric.includes('Count') || metric.includes('Mutations') || metric.includes('count')) {
    return Math.round(value).toString();
  } else if (metric.includes('Usage') && !metric.includes('Memory')) {
    return `${value.toFixed(2)}%`;
  }
  
  // 默认格式
  return value.toFixed(2);
}

/**
 * 创建并导出默认实例
 */
export const performanceReportGenerator = new PerformanceReportGenerator(); 