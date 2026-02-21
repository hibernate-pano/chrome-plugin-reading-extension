/**
 * Export Module - Export articles to different formats
 * Supports: Markdown, HTML, PDF (via print)
 */

import type { ExtractedContent } from '../shared/types';

/**
 * Export content as Markdown
 */
export function exportToMarkdown(content: ExtractedContent): string {
  let md = `# ${content.title}\n\n`;
  
  if (content.byline) {
    md += `*By ${content.byline}*\n\n`;
  }
  
  if (content.siteName) {
    md += `*Source: ${content.siteName}*\n\n`;
  }
  
  md += `---\n\n`;
  md += content.content;
  
  return md;
}

/**
 * Export content as HTML
 */
export function exportToHTML(content: ExtractedContent): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    .content { line-height: 1.8; }
    .content img { max-width: 100%; height: auto; }
    .content pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; }
    .content code { background: #f5f5f5; padding: 0.2rem 0.4rem; }
  </style>
</head>
<body>
  <h1>${content.title}</h1>
  <div class="meta">
    ${content.byline ? `<span>By ${content.byline}</span>` : ''}
    ${content.siteName ? `<span> | ${content.siteName}</span>` : ''}
    <span> | ${content.estimatedReadTime} min read</span>
    <span> | ${content.wordCount.toLocaleString()} words</span>
  </div>
  <div class="content">
    ${content.content}
  </div>
</body>
</html>`;
}

/**
 * Download content as file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export and download as Markdown
 */
export function downloadAsMarkdown(content: ExtractedContent): void {
  const md = exportToMarkdown(content);
  const filename = `${content.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.md`;
  downloadFile(md, filename, 'text/markdown');
}

/**
 * Export and download as HTML
 */
export function downloadAsHTML(content: ExtractedContent): void {
  const html = exportToHTML(content);
  const filename = `${content.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.html`;
  downloadFile(html, filename, 'text/html');
}

/**
 * Print (PDF export via browser print)
 */
export function printContent(content: ExtractedContent): void {
  const html = exportToHTML(content);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
