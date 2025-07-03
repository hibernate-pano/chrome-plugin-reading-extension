# 最小注入性能测量系统

本文档介绍如何使用最小注入性能测量系统来评估content.ts重构为contentLoader.ts的性能影响。

## 背景

在v1.7.0版本中，我们将content.ts重构为contentLoader.ts，采用了最小初始注入和懒加载策略，目的是减少初始脚本大小和提高页面加载性能。本性能测量系统专门设计用于量化这一重构的性能影响。

## 测量的关键指标

该系统测量以下关键性能指标：

1. **初始脚本大小** - 初始注入的JavaScript代码大小
2. **完整脚本大小** - 所有相关脚本的总大小
3. **浮动按钮显示时间** - 从注入到浮动按钮显示的时间
4. **初始加载时间** - 初始脚本注入和执行的时间
5. **懒加载延迟** - 激活阅读模式时，加载额外模块所需的时间
6. **内存使用** - 初始和激活后的内存占用
7. **DOM变更数量** - 对页面DOM的修改次数
8. **CPU使用率** - 初始注入和激活时的CPU使用情况

## 如何使用

### 1. 在代码中集成测量点

在contentLoader.ts中添加以下测量点：

```typescript
// 1. 在初始注入开始时
minimalInjectionBenchmark.startInitialInjection();

// 2. 在初始注入完成时
minimalInjectionBenchmark.endInitialInjection();

// 3. 在浮动按钮渲染完成时
minimalInjectionBenchmark.recordButtonRendered();

// 4. 在用户点击激活阅读模式时
minimalInjectionBenchmark.startActivation();

// 5. 在每个模块加载完成时
minimalInjectionBenchmark.recordModuleLoaded(ModuleType.CORE);
minimalInjectionBenchmark.recordModuleLoaded(ModuleType.READER_MODE);
// ... 其他模块

// 6. 在阅读模式完全激活后
minimalInjectionBenchmark.endActivation();

// 7. 保存性能报告
await minimalInjectionBenchmark.saveReport();
```

### 2. 运行测试

为了获得有意义的比较数据，需要在两个版本上运行测试：

1. **v1.6.0 (重构前)**: 
   ```typescript
   import { minimalInjectionBenchmark } from './minimal-injection-benchmark';
   import { BEFORE_VERSION } from './minimal-injection-benchmark';
   
   // 在content.ts中集成测量点
   // ...
   
   // 保存报告
   await minimalInjectionBenchmark.saveReport(BEFORE_VERSION);
   ```

2. **v1.7.0 (重构后)**:
   ```typescript
   import { minimalInjectionBenchmark } from './minimal-injection-benchmark';
   import { AFTER_VERSION } from './minimal-injection-benchmark';
   
   // 在contentLoader.ts中集成测量点
   // ...
   
   // 保存报告
   await minimalInjectionBenchmark.saveReport(AFTER_VERSION);
   ```

### 3. 比较性能结果

收集足够的测试数据后（建议至少10个不同网页），可以使用以下方法比较结果：

```typescript
import { MinimalInjectionBenchmark } from './minimal-injection-benchmark';

// 导出比较结果到控制台
await MinimalInjectionBenchmark.exportComparisonResults();
```

这将生成一个详细的比较报告，显示每个指标的改进或退化百分比。

## 自动化测试

为了简化测试过程，我们提供了`minimal-injection-test.ts`文件，其中包含了自动化测试函数：

```typescript
import { runPerformanceTest, comparePerformance } from './minimal-injection-test';

// 在v1.6.0中运行
await runPerformanceTest(true);

// 在v1.7.0中运行
await runPerformanceTest(false);

// 在任一版本中比较结果
await comparePerformance();
```

## 结果解读

比较报告会显示每个指标的变化百分比，以及是改进还是退化：

- **初始脚本大小**: 减少表示改进，这是最小注入策略的主要目标
- **浮动按钮显示时间**: 减少表示改进，影响用户感知的初始加载速度
- **懒加载延迟**: 这是新增的开销，但应该被初始加载时间的减少所抵消
- **总内存影响**: 应该保持相似或略有减少
- **DOM变更数量**: 减少表示对页面的干扰更少

## 注意事项

1. 测试应在相同的设备和浏览器环境中进行，以确保结果可比
2. 在多种类型的网页上测试（简单页面、复杂页面、动态页面等）
3. 每个版本至少收集10个样本，以获得统计学上有意义的结果
4. 记录任何异常情况或特殊观察

## 故障排除

如果遇到测量问题：

1. 确保两个版本都正确集成了测量点
2. 检查控制台是否有错误日志
3. 使用`MinimalInjectionBenchmark.clearAllReports()`清除旧数据后重新测试
4. 确保Chrome扩展权限包含存储访问权限 