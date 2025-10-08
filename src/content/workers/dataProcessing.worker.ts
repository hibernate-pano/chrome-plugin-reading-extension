/**
 * 数据处理 Worker
 * 处理数据转换、格式化等任务
 */

interface WorkerMessage {
  id: string;
  type: string;
  data: any;
}

// Worker消息处理
self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const { id, type, data } = e.data;

  try {
    let result: any;

    switch (type) {
      case 'process-data':
        result = processData(data);
        break;

      case 'parse-json':
        result = parseJSON(data);
        break;

      case 'format-data':
        result = formatData(data);
        break;

      case 'validate-data':
        result = validateData(data);
        break;

      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    self.postMessage({
      id,
      success: true,
      result
    });
  } catch (error: any) {
    self.postMessage({
      id,
      success: false,
      error: error.message
    });
  }
};

function processData(data: any): any {
  // 基础数据处理
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'object' && item !== null) {
        return { ...item, processed: true };
      }
      return item;
    });
  }
  return data;
}

function parseJSON(data: string): any {
  try {
    return JSON.parse(data);
  } catch (error) {
    throw new Error('Invalid JSON data');
  }
}

function formatData(data: any): string {
  return JSON.stringify(data, null, 2);
}

function validateData(data: any): boolean {
  // 基础数据验证
  return data !== null && data !== undefined;
}
