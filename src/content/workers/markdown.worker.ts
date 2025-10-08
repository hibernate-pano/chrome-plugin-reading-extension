/**
 * Markdown 转换 Worker
 * 处理 HTML 到 Markdown 的转换
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
      case 'html-to-markdown':
        result = { markdown: convertHtmlToMarkdown(data) };
        break;

      case 'markdown-to-html':
        result = { html: convertMarkdownToHtml(data) };
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

function convertHtmlToMarkdown(html: string): string {
  // 基础 HTML 到 Markdown 转换
  let markdown = html;

  // 标题
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

  // 粗体和斜体
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // 链接
  markdown = markdown.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // 图片
  markdown = markdown.replace(/<img[^>]+alt=["']([^"']*)["'][^>]+src=["']([^"']+)["'][^>]*>/gi, '![$1]($2)');
  markdown = markdown.replace(/<img[^>]+src=["']([^"']+)["'][^>]+alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, '![]($1)');

  // 列表
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1\n');
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1\n');

  // 段落
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

  // 换行
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

  // 移除剩余的 HTML 标签
  markdown = markdown.replace(/<[^>]+>/g, '');

  // 清理多余的空行
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  return markdown.trim();
}

function convertMarkdownToHtml(markdown: string): string {
  // 基础 Markdown 到 HTML 转换
  let html = markdown;

  // 标题
  html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // 段落
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  return html;
}
