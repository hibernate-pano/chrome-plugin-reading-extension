import { webWorkerManager } from "../features/performance/WebWorkerManager";

export class MarkdownWorkerManager {
  constructor() {
    console.log("[MarkdownWorkerManager] 已初始化 - 使用 WebWorkerManager 任务API");
  }

  async convertToMarkdown(html: string): Promise<string> {
    if (!html || typeof html !== 'string') {
      throw new Error("HTML内容无效");
    }

    const result = await webWorkerManager.runTask<{ markdown: string }>(
      'html-to-markdown',
      { html },
      'high',
      'markdown-processing'
    );

    if (!result || typeof result.markdown !== 'string') {
      throw new Error('Markdown转换失败: 返回结果无效');
    }
    return result.markdown;
  }

  destroy(): void {
    console.log("[MarkdownWorkerManager] 资源已清理");
  }
}