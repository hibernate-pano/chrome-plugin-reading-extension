import React, { useState, useEffect } from 'react';
import { PerformanceTestRunner } from './performance-test-runner';
import { PerformanceReportGenerator } from './performance-report-generator';
import { MinimalInjectionBenchmark, BEFORE_VERSION, AFTER_VERSION } from './minimal-injection-benchmark';

/**
 * 性能测试UI状态
 */
interface PerformanceTestUIState {
  // 当前测试状态
  status: 'idle' | 'running-before' | 'running-after' | 'generating-report' | 'completed' | 'error';
  // 当前测试进度 (0-100)
  progress: number;
  // 测试结果摘要
  resultSummary: string | null;
  // 错误信息
  errorMessage: string | null;
  // 测试配置
  config: {
    testUrls: string[];
    samplesPerUrl: number;
    clearPreviousData: boolean;
  };
}

/**
 * 性能测试UI组件
 */
export const PerformanceTestUI: React.FC = () => {
  // 组件状态
  const [state, setState] = useState<PerformanceTestUIState>({
    status: 'idle',
    progress: 0,
    resultSummary: null,
    errorMessage: null,
    config: {
      testUrls: [
        'https://medium.com/javascript-in-plain-english/20-javascript-shorthand-techniques-that-will-save-your-time-f1671aab405f',
        'https://www.smashingmagazine.com/2021/06/dynamic-header-intersection-observer/',
        'https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/',
        'https://web.dev/optimize-lcp/'
      ],
      samplesPerUrl: 3,
      clearPreviousData: false
    }
  });
  
  // 测试运行器和报告生成器
  const testRunner = new PerformanceTestRunner();
  const reportGenerator = new PerformanceReportGenerator();
  const benchmark = MinimalInjectionBenchmark.getInstance();
  
  // 更新配置
  const updateConfig = (field: keyof PerformanceTestUIState['config'], value: any) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }));
  };
  
  // 添加测试URL
  const addTestUrl = () => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        testUrls: [...prev.config.testUrls, '']
      }
    }));
  };
  
  // 更新测试URL
  const updateTestUrl = (index: number, value: string) => {
    setState(prev => {
      const newUrls = [...prev.config.testUrls];
      newUrls[index] = value;
      return {
        ...prev,
        config: {
          ...prev.config,
          testUrls: newUrls
        }
      };
    });
  };
  
  // 删除测试URL
  const removeTestUrl = (index: number) => {
    setState(prev => {
      const newUrls = [...prev.config.testUrls];
      newUrls.splice(index, 1);
      return {
        ...prev,
        config: {
          ...prev.config,
          testUrls: newUrls
        }
      };
    });
  };
  
  // 开始测试
  const startTest = async () => {
    try {
      // 清除之前的错误
      setState(prev => ({ ...prev, errorMessage: null }));
      
      // 检查配置
      if (state.config.testUrls.length === 0) {
        throw new Error('至少需要一个测试URL');
      }
      
      if (state.config.samplesPerUrl < 1) {
        throw new Error('每个URL的样本数量必须大于0');
      }
      
      // 清除之前的测试数据
      if (state.config.clearPreviousData) {
        setState(prev => ({ 
          ...prev, 
          status: 'running-before', 
          progress: 0,
          resultSummary: null
        }));
        
        await benchmark.clearAllReports();
        console.log('已清除之前的测试数据');
      }
      
      // 运行重构前版本测试
      setState(prev => ({ 
        ...prev, 
        status: 'running-before', 
        progress: 0 
      }));
      
      await runVersionTest(BEFORE_VERSION);
      
      // 运行重构后版本测试
      setState(prev => ({ 
        ...prev, 
        status: 'running-after', 
        progress: 0 
      }));
      
      await runVersionTest(AFTER_VERSION);
      
      // 生成报告
      setState(prev => ({ 
        ...prev, 
        status: 'generating-report', 
        progress: 90 
      }));
      
      const report = await reportGenerator.generateReport();
      const reportMarkdown = reportGenerator.exportReportAsMarkdown(report);
      
      // 完成测试
      setState(prev => ({ 
        ...prev, 
        status: 'completed', 
        progress: 100,
        resultSummary: reportMarkdown
      }));
      
    } catch (error) {
      console.error('测试执行失败:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        errorMessage: error instanceof Error ? error.message : '未知错误' 
      }));
    }
  };
  
  // 运行单个版本的测试
  const runVersionTest = async (version: string) => {
    const totalTests = state.config.testUrls.length * state.config.samplesPerUrl;
    let completedTests = 0;
    
    // 创建自定义测试运行器
    const runner = new PerformanceTestRunner({
      testUrls: state.config.testUrls,
      samplesPerUrl: state.config.samplesPerUrl,
      currentVersion: version,
      autoSaveReport: true,
      autoCompare: false,
      clearPreviousData: false
    });
    
    // 模拟测试进度
    for (let urlIndex = 0; urlIndex < state.config.testUrls.length; urlIndex++) {
      for (let sampleIndex = 0; sampleIndex < state.config.samplesPerUrl; sampleIndex++) {
        // 模拟测试执行
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 更新进度
        completedTests++;
        const progress = (completedTests / totalTests) * 100;
        
        setState(prev => ({
          ...prev,
          progress: Math.round(progress)
        }));
      }
    }
  };
  
  // 保存报告
  const saveReport = () => {
    if (state.status === 'completed' && state.resultSummary) {
      const blob = new Blob([state.resultSummary], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-report-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      
      URL.revokeObjectURL(url);
    }
  };
  
  // 重置测试
  const resetTest = () => {
    setState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      resultSummary: null,
      errorMessage: null
    }));
  };
  
  // 渲染UI
  return (
    <div className="performance-test-ui p-4 bg-white rounded shadow-md max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">最小注入重构性能测试</h2>
      
      {/* 配置部分 */}
      {state.status === 'idle' && (
        <div className="test-config mb-6">
          <h3 className="text-lg font-semibold mb-2">测试配置</h3>
          
          <div className="mb-4">
            <label className="block mb-2 font-medium">测试URL列表:</label>
            {state.config.testUrls.map((url, index) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => updateTestUrl(index, e.target.value)}
                  className="flex-grow p-2 border rounded"
                  placeholder="输入测试URL"
                />
                <button
                  onClick={() => removeTestUrl(index)}
                  className="ml-2 px-3 py-2 bg-red-500 text-white rounded"
                >
                  删除
                </button>
              </div>
            ))}
            <button
              onClick={addTestUrl}
              className="px-3 py-2 bg-blue-500 text-white rounded"
            >
              添加URL
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 font-medium">
              每个URL的样本数量:
              <input
                type="number"
                value={state.config.samplesPerUrl}
                onChange={(e) => updateConfig('samplesPerUrl', parseInt(e.target.value))}
                min="1"
                max="10"
                className="ml-2 p-2 border rounded w-20"
              />
            </label>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.config.clearPreviousData}
                onChange={(e) => updateConfig('clearPreviousData', e.target.checked)}
                className="mr-2"
              />
              清除之前的测试数据
            </label>
          </div>
          
          <button
            onClick={startTest}
            className="px-4 py-2 bg-green-600 text-white rounded font-medium"
          >
            开始测试
          </button>
        </div>
      )}
      
      {/* 进度部分 */}
      {['running-before', 'running-after', 'generating-report'].includes(state.status) && (
        <div className="test-progress mb-6">
          <h3 className="text-lg font-semibold mb-2">
            {state.status === 'running-before' && `正在测试重构前版本 (${BEFORE_VERSION})...`}
            {state.status === 'running-after' && `正在测试重构后版本 (${AFTER_VERSION})...`}
            {state.status === 'generating-report' && '正在生成报告...'}
          </h3>
          
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-blue-600 h-4 rounded-full"
              style={{ width: `${state.progress}%` }}
            ></div>
          </div>
          
          <div className="text-right text-sm text-gray-600">
            {state.progress}% 完成
          </div>
        </div>
      )}
      
      {/* 结果部分 */}
      {state.status === 'completed' && state.resultSummary && (
        <div className="test-results mb-6">
          <h3 className="text-lg font-semibold mb-2">测试结果</h3>
          
          <div className="result-summary bg-gray-100 p-4 rounded mb-4 max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap">{state.resultSummary}</pre>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={saveReport}
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium"
            >
              保存报告
            </button>
            
            <button
              onClick={resetTest}
              className="px-4 py-2 bg-gray-600 text-white rounded font-medium"
            >
              重新测试
            </button>
          </div>
        </div>
      )}
      
      {/* 错误部分 */}
      {state.status === 'error' && state.errorMessage && (
        <div className="test-error mb-6">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4">
            <p className="font-bold">测试失败</p>
            <p>{state.errorMessage}</p>
          </div>
          
          <button
            onClick={resetTest}
            className="px-4 py-2 bg-gray-600 text-white rounded font-medium"
          >
            重新测试
          </button>
        </div>
      )}
    </div>
  );
};

export default PerformanceTestUI; 