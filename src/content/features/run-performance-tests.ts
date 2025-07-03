/**
 * 性能测试运行脚本
 * 用于自动化运行性能测试并生成报告
 */

import { PerformanceTestRunner } from './performance-test-runner';
import { PerformanceReportGenerator } from './performance-report-generator';
import { MinimalInjectionBenchmark, BEFORE_VERSION, AFTER_VERSION } from './minimal-injection-benchmark';

/**
 * 测试配置
 */
interface TestConfig {
  // 测试的URL列表
  testUrls: string[];
  // 每个URL的样本数量
  samplesPerUrl: number;
  // 是否清除之前的数据
  clearPreviousData: boolean;
  // 是否保存报告
  saveReport: boolean;
  // 是否在控制台显示进度
  logProgress: boolean;
}

/**
 * 默认测试配置
 */
const DEFAULT_CONFIG: TestConfig = {
  testUrls: [
    'https://medium.com/javascript-in-plain-english/20-javascript-shorthand-techniques-that-will-save-your-time-f1671aab405f',
    'https://www.smashingmagazine.com/2021/06/dynamic-header-intersection-observer/',
    'https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/',
    'https://web.dev/optimize-lcp/'
  ],
  samplesPerUrl: 5,
  clearPreviousData: true,
  saveReport: true,
  logProgress: true
};

/**
 * 运行性能测试
 * @param config 测试配置
 * @returns 返回性能测试报告
 */
export async function runPerformanceTests(config: Partial<TestConfig> = {}) {
  const mergedConfig: TestConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log('============================================');
  console.log('开始运行最小注入性能测试');
  console.log('============================================');
  console.log(`测试URL: ${mergedConfig.testUrls.length}个`);
  console.log(`每个URL的样本数量: ${mergedConfig.samplesPerUrl}`);
  console.log('============================================\n');
  
  try {
    // 创建测试运行器和报告生成器
    const testRunner = new PerformanceTestRunner({
      testUrls: mergedConfig.testUrls,
      samplesPerUrl: mergedConfig.samplesPerUrl,
      clearPreviousData: mergedConfig.clearPreviousData,
      autoSaveReport: true
    });
    
    const reportGenerator = new PerformanceReportGenerator();
    
    // 进度回调函数
    const progressCallback = mergedConfig.logProgress ? 
      (progress: number, status: string, version: string) => {
        console.log(`[${version}] ${status} - ${progress}%`);
      } : undefined;
    
    // 运行比较测试
    console.log('\n运行比较测试中...');
    await testRunner.runComparisonTests(progressCallback);
    
    console.log('\n生成报告中...');
    const report = await reportGenerator.generateReport();
    
    // 显示报告摘要
    console.log('\n============================================');
    console.log('测试报告摘要');
    console.log('============================================');
    console.log(`重构前版本: ${report.beforeVersion}`);
    console.log(`重构后版本: ${report.afterVersion}`);
    console.log(`总体性能变化: ${report.overallChangePercent.toFixed(2)}%`);
    console.log(`改进的指标: ${report.metrics.filter(m => m.isImprovement).length}/${report.metrics.length}`);
    console.log(`延迟加载的模块: ${report.lazyLoadedModules.join(', ')}`);
    console.log('============================================\n');
    
    // 保存报告
    if (mergedConfig.saveReport) {
      console.log('保存报告...');
      reportGenerator.saveReportAsMarkdown(report);
      console.log('报告已保存\n');
    }
    
    console.log('性能测试完成!');
    
    // 返回报告摘要供调用者使用
    return report;
  } catch (error) {
    console.error('测试执行失败:', error);
    throw error;
  }
}

// 当直接运行此脚本时执行测试
if (require.main === module) {
  runPerformanceTests()
    .then(() => console.log('测试脚本执行完毕'))
    .catch(err => console.error('测试脚本执行失败:', err));
} 