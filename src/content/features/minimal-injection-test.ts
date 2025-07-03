/**
 * 最小注入性能基准测试示例
 * 演示如何使用MinimalInjectionBenchmark类测量重构性能
 */

import { minimalInjectionBenchmark, MinimalInjectionBenchmark, BEFORE_VERSION, AFTER_VERSION } from './minimal-injection-benchmark';
import { ModuleType } from './performance-benchmark';

/**
 * 在content.ts (v1.6.0)中测量性能
 * 这应该在旧版本中运行，记录基准性能
 */
export async function measureBeforeRefactoring(): Promise<void> {
  // 确保启用性能测量
  minimalInjectionBenchmark.setEnabled(true);
  
  console.log(`[测试] 开始测量重构前性能 (${BEFORE_VERSION})`);
  
  try {
    // 1. 开始测量初始注入
    minimalInjectionBenchmark.startInitialInjection();
    
    // 模拟初始脚本加载完成
    await simulateScriptLoad(100); // 假设加载需要100ms
    
    // 2. 结束初始注入测量
    minimalInjectionBenchmark.endInitialInjection();
    
    // 3. 记录浮动按钮渲染
    await simulateScriptLoad(50); // 假设按钮渲染需要50ms
    minimalInjectionBenchmark.recordButtonRendered();
    
    // 4. 模拟用户点击阅读模式按钮
    await simulateUserInteraction(500); // 假设用户500ms后点击
    
    // 5. 开始测量阅读模式激活
    minimalInjectionBenchmark.startActivation();
    
    // 6. 模拟各模块加载
    await simulateModuleLoad(ModuleType.CORE, 150);
    await simulateModuleLoad(ModuleType.READER_MODE, 200);
    await simulateModuleLoad(ModuleType.CONTENT_EXTRACTION, 300);
    
    // 7. 结束阅读模式激活测量
    minimalInjectionBenchmark.endActivation();
    
    // 8. 保存性能报告
    await minimalInjectionBenchmark.saveReport(BEFORE_VERSION);
    
    console.log(`[测试] 完成重构前性能测量 (${BEFORE_VERSION})`);
  } catch (error) {
    console.error('[测试] 性能测量失败:', error);
  }
}

/**
 * 在contentLoader.ts (v1.7.0)中测量性能
 * 这应该在新版本中运行，记录重构后的性能
 */
export async function measureAfterRefactoring(): Promise<void> {
  // 确保启用性能测量
  minimalInjectionBenchmark.setEnabled(true);
  
  console.log(`[测试] 开始测量重构后性能 (${AFTER_VERSION})`);
  
  try {
    // 1. 开始测量初始注入
    minimalInjectionBenchmark.startInitialInjection();
    
    // 模拟初始脚本加载完成 (应该更快，因为更小)
    await simulateScriptLoad(50); // 假设加载只需要50ms
    
    // 2. 结束初始注入测量
    minimalInjectionBenchmark.endInitialInjection();
    
    // 3. 记录浮动按钮渲染 (应该更快)
    await simulateScriptLoad(30); // 假设按钮渲染只需要30ms
    minimalInjectionBenchmark.recordButtonRendered();
    
    // 4. 模拟用户点击阅读模式按钮
    await simulateUserInteraction(500); // 假设用户500ms后点击
    
    // 5. 开始测量阅读模式激活
    minimalInjectionBenchmark.startActivation();
    
    // 6. 模拟各模块懒加载 (这里是重构的关键部分)
    await simulateModuleLoad(ModuleType.CORE, 150);
    await simulateModuleLoad(ModuleType.READER_MODE, 200);
    await simulateModuleLoad(ModuleType.CONTENT_EXTRACTION, 300);
    
    // 7. 结束阅读模式激活测量
    minimalInjectionBenchmark.endActivation();
    
    // 8. 保存性能报告
    await minimalInjectionBenchmark.saveReport(AFTER_VERSION);
    
    console.log(`[测试] 完成重构后性能测量 (${AFTER_VERSION})`);
  } catch (error) {
    console.error('[测试] 性能测量失败:', error);
  }
}

/**
 * 比较重构前后的性能差异
 */
export async function comparePerformance(): Promise<void> {
  try {
    console.log('[测试] 开始比较重构前后性能差异');
    
    // 导出比较结果
    await MinimalInjectionBenchmark.exportComparisonResults();
    
    console.log('[测试] 性能比较完成');
  } catch (error) {
    console.error('[测试] 性能比较失败:', error);
  }
}

/**
 * 清除所有测试数据
 */
export async function clearTestData(): Promise<void> {
  try {
    await MinimalInjectionBenchmark.clearAllReports();
    console.log('[测试] 已清除所有测试数据');
  } catch (error) {
    console.error('[测试] 清除测试数据失败:', error);
  }
}

/**
 * 运行完整的性能测试流程
 * 注意: 这个函数应该在两个不同的版本中分别运行
 * 1. 在v1.6.0中运行 runPerformanceTest(true)
 * 2. 在v1.7.0中运行 runPerformanceTest(false)
 * 3. 最后在任一版本中运行 comparePerformance()
 */
export async function runPerformanceTest(isBeforeVersion: boolean): Promise<void> {
  try {
    if (isBeforeVersion) {
      await measureBeforeRefactoring();
    } else {
      await measureAfterRefactoring();
    }
  } catch (error) {
    console.error('[测试] 性能测试失败:', error);
  }
}

// 辅助函数: 模拟脚本加载
async function simulateScriptLoad(delay: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

// 辅助函数: 模拟模块加载
async function simulateModuleLoad(moduleType: ModuleType, delay: number): Promise<void> {
  await simulateScriptLoad(delay);
  minimalInjectionBenchmark.recordModuleLoaded(moduleType);
}

// 辅助函数: 模拟用户交互
async function simulateUserInteraction(delay: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

// 导出测试函数
export default {
  measureBeforeRefactoring,
  measureAfterRefactoring,
  comparePerformance,
  clearTestData,
  runPerformanceTest
}; 