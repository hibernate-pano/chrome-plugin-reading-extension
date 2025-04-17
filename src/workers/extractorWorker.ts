/**
 * 内容提取工作线程
 * 用于在后台线程中处理耗时的内容提取操作
 */

// 工作线程消息类型
export interface WorkerMessage {
  id: string;
  action: string;
  payload: any;
}

// 工作线程响应类型
export interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

// 导入 Readability
import { Readability } from '@mozilla/readability';

// 处理消息
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, action, payload } = event.data;

  try {
    let result;

    // 根据不同的操作类型执行不同的处理
    switch (action) {
      case 'extractContent':
        result = await extractContent(payload.html, payload.url);
        break;
      case 'processTable':
        result = processTable(payload.tableHtml);
        break;
      case 'processCodeBlock':
        result = processCodeBlock(payload.codeHtml, payload.language);
        break;
      case 'processList':
        result = processList(payload.listHtml);
        break;
      default:
        throw new Error(`未知操作: ${action}`);
    }

    // 发送成功响应
    const response: WorkerResponse = {
      id,
      success: true,
      data: result
    };

    self.postMessage(response);
  } catch (error) {
    // 发送错误响应
    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };

    self.postMessage(response);
  }
};

/**
 * 提取内容
 */
async function extractContent(html: string, url?: string): Promise<any> {
  // 在 Web Worker 中不能使用 document
  // 返回原始 HTML，让主线程处理
  throw new Error('Web Worker 中不能使用 document，请在主线程中处理');
}

/**
 * 预处理文档
 */
function preProcessDocument(doc: Document): void {
  // 在 Web Worker 中不能使用 document
  throw new Error('Web Worker 中不能使用 document，请在主线程中处理');
}

/**
 * 修复嵌套列表
 */
function fixNestedLists(doc: Document): void {
  // 在 Web Worker 中不能使用 document
  throw new Error('Web Worker 中不能使用 document，请在主线程中处理');
}

/**
 * 修复表格结构
 */
function fixTableStructure(doc: Document): void {
  // 在 Web Worker 中不能使用 document
  throw new Error('Web Worker 中不能使用 document，请在主线程中处理');
}

/**
 * 后处理内容
 */
function postProcessContent(container: HTMLElement): void {
  // 在 Web Worker 中不能使用 document
  throw new Error('Web Worker 中不能使用 document，请在主线程中处理');
}

/**
 * 检测代码语言
 */
function detectCodeLanguage(code: string): string {
  // 简单的语言检测逻辑
  if (code.includes('function') && (code.includes('{') || code.includes('=>'))) {
    return 'javascript';
  }
  if (code.includes('def ') && code.includes(':')) {
    return 'python';
  }
  if (code.includes('class ') && code.includes('{') && code.includes('public')) {
    return 'java';
  }
  if (code.includes('<html') || code.includes('<!DOCTYPE')) {
    return 'html';
  }
  if (code.includes('import ') && code.includes('from ')) {
    return 'python';
  }
  if (code.includes('package ') && code.includes('func ')) {
    return 'go';
  }
  if (code.includes('#include') && (code.includes('<iostream>') || code.includes('<stdio.h>'))) {
    return 'cpp';
  }

  return 'plaintext';
}

/**
 * 处理表格
 */
function processTable(tableHtml: string): any {
  // 在 Web Worker 中不能使用 document
  throw new Error('Web Worker 中不能使用 document，请在主线程中处理');
}

/**
 * 处理代码块
 */
function processCodeBlock(codeHtml: string, language?: string): any {
  // 在 Web Worker 中不能使用 document
  throw new Error('Web Worker 中不能使用 document，请在主线程中处理');
}

/**
 * 处理列表
 */
function processList(listHtml: string): any {
  // 在 Web Worker 中不能使用 document
  throw new Error('Web Worker 中不能使用 document，请在主线程中处理');
}

// 通知主线程工作线程已准备好
self.postMessage({ id: 'init', success: true, data: 'Worker initialized' });
