/**
 * 内容提取 Worker
 * 处理 HTML 内容提取和清理
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
      case 'extract-text':
        result = extractText(data);
        break;

      case 'clean-html':
        result = cleanHTML(data);
        break;

      case 'extract-links':
        result = extractLinks(data);
        break;

      case 'extract-images':
        result = extractImages(data);
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

function extractText(html: string): string {
  // 移除 HTML 标签
  return html.replace(/<[^>]*>/g, '').trim();
}

function cleanHTML(html: string): string {
  // 清理 HTML，移除脚本和样式
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

function extractLinks(html: string): string[] {
  const links: string[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    links.push(match[1]);
  }

  return links;
}

function extractImages(html: string): string[] {
  const images: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
  }

  return images;
}
