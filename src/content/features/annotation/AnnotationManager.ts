/**
 * 注释管理器
 * 负责高亮、注释、导出功能的统一管理
 */

import { enhancedProcessingManager } from '../performance/EnhancedProcessingManager';

export interface Annotation {
  id: string;
  text: string;
  note?: string;
  color: string;
  position: {
    start: number;
    end: number;
  };
  timestamp: number;
  url: string;
  title: string;
}

export interface ExportOptions {
  format: 'markdown' | 'html' | 'json';
  includeMetadata?: boolean;
  includeHighlights?: boolean;
  includeNotes?: boolean;
  filename?: string;
}

export interface AnnotationStats {
  totalAnnotations: number;
  totalHighlights: number;
  totalNotes: number;
  byColor: Record<string, number>;
  byDate: Record<string, number>;
}

/**
 * 注释管理器
 */
export class AnnotationManager {
  private static instance: AnnotationManager;
  private annotations: Map<string, Annotation> = new Map();
  private isInitialized = false;
  private storageKey = 'reader-annotations';

  // 高亮颜色选项
  private readonly highlightColors = [
    { name: '黄色', value: '#ffeb3b', class: 'highlight-yellow' },
    { name: '绿色', value: '#a5d6a7', class: 'highlight-green' },
    { name: '蓝色', value: '#90caf9', class: 'highlight-blue' },
    { name: '粉色', value: '#f48fb1', class: 'highlight-pink' },
    { name: '紫色', value: '#ce93d8', class: 'highlight-purple' },
  ];

  private constructor() {}

  public static getInstance(): AnnotationManager {
    if (!AnnotationManager.instance) {
      AnnotationManager.instance = new AnnotationManager();
    }
    return AnnotationManager.instance;
  }

  /**
   * 初始化注释管理器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 加载已保存的注释
      await this.loadAnnotations();
      
      // 注入高亮样式
      this.injectHighlightStyles();
      
      // 恢复当前页面的高亮
      this.restoreHighlights();
      
      this.isInitialized = true;
      console.log('✅ 注释管理器初始化完成');
    } catch (error) {
      console.error('❌ 注释管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 注入高亮样式
   */
  private injectHighlightStyles(): void {
    if (document.getElementById('annotation-highlight-styles')) return;

    const style = document.createElement('style');
    style.id = 'annotation-highlight-styles';
    
    let css = `
      .reader-highlight {
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 2px;
        padding: 0 2px;
      }
      
      .reader-highlight:hover {
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
      }
      
      .reader-highlight::after {
        content: '';
        position: absolute;
        top: -2px;
        right: -2px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .reader-highlight:hover::after {
        opacity: 0.6;
      }
    `;

    // 为每种颜色生成样式
    this.highlightColors.forEach(color => {
      css += `
        .${color.class} {
          background-color: ${color.value}40;
          color: inherit;
        }
        
        .${color.class}.dark {
          background-color: ${color.value}60;
        }
      `;
    });

    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * 创建高亮
   */
  public createHighlight(text: string, color: string = '#ffeb3b', note?: string): string | null {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      console.warn('没有选中的文本');
      return null;
    }

    try {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      
      if (!selectedText) {
        console.warn('选中的文本为空');
        return null;
      }

      // 创建注释ID
      const annotationId = this.generateAnnotationId();
      
      // 创建高亮元素
      const highlightElement = document.createElement('span');
      highlightElement.className = 'reader-highlight';
      highlightElement.setAttribute('data-annotation-id', annotationId);
      highlightElement.setAttribute('data-color', color);
      
      // 应用颜色样式
      const colorClass = this.highlightColors.find(c => c.value === color)?.class || 'highlight-yellow';
      highlightElement.classList.add(colorClass);
      
      // 如果有注释，添加注释图标
      if (note) {
        highlightElement.setAttribute('data-has-note', 'true');
        highlightElement.title = note;
      }

      // 包装选中的文本
      try {
        range.surroundContents(highlightElement);
      } catch (error) {
        // 如果surroundContents失败，使用extractContents和insertNode
        const contents = range.extractContents();
        highlightElement.appendChild(contents);
        range.insertNode(highlightElement);
      }

      // 创建注释对象
      const annotation: Annotation = {
        id: annotationId,
        text: selectedText,
        note,
        color,
        position: {
          start: this.getTextPosition(selectedText),
          end: this.getTextPosition(selectedText) + selectedText.length
        },
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title
      };

      // 保存注释
      this.annotations.set(annotationId, annotation);
      this.saveAnnotations();

      // 清除选择
      selection.removeAllRanges();

      console.log('✅ 高亮创建成功:', annotationId);
      return annotationId;

    } catch (error) {
      console.error('❌ 创建高亮失败:', error);
      return null;
    }
  }

  /**
   * 添加注释
   */
  public addNote(annotationId: string, note: string): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      console.warn('注释不存在:', annotationId);
      return false;
    }

    annotation.note = note;
    this.annotations.set(annotationId, annotation);
    this.saveAnnotations();

    // 更新DOM元素
    const element = document.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (element) {
      element.setAttribute('data-has-note', 'true');
      element.setAttribute('title', note);
    }

    console.log('✅ 注释添加成功:', annotationId);
    return true;
  }

  /**
   * 删除注释
   */
  public deleteAnnotation(annotationId: string): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      console.warn('注释不存在:', annotationId);
      return false;
    }

    // 从DOM中移除高亮
    const element = document.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (element) {
      const parent = element.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(element.textContent || ''), element);
        parent.normalize();
      }
    }

    // 从内存中移除
    this.annotations.delete(annotationId);
    this.saveAnnotations();

    console.log('✅ 注释删除成功:', annotationId);
    return true;
  }

  /**
   * 获取页面的所有注释
   */
  public getPageAnnotations(url?: string): Annotation[] {
    const targetUrl = url || window.location.href;
    return Array.from(this.annotations.values()).filter(
      annotation => annotation.url === targetUrl
    );
  }

  /**
   * 导出注释
   */
  public async exportAnnotations(options: ExportOptions): Promise<string> {
    const pageAnnotations = this.getPageAnnotations();
    
    if (pageAnnotations.length === 0) {
      throw new Error('当前页面没有注释');
    }

    const exportData = {
      metadata: {
        url: window.location.href,
        title: document.title,
        exportDate: new Date().toISOString(),
        totalAnnotations: pageAnnotations.length
      },
      annotations: pageAnnotations
    };

    switch (options.format) {
      case 'markdown':
        return this.exportToMarkdown(exportData, options);
      case 'html':
        return this.exportToHtml(exportData, options);
      case 'json':
        return this.exportToJson(exportData, options);
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  /**
   * 导出为Markdown格式
   */
  private async exportToMarkdown(data: any, options: ExportOptions): Promise<string> {
    let markdown = `# ${data.metadata.title}\n\n`;
    
    if (options.includeMetadata) {
      markdown += `**来源:** ${data.metadata.url}\n`;
      markdown += `**导出时间:** ${data.metadata.exportDate}\n`;
      markdown += `**注释数量:** ${data.metadata.totalAnnotations}\n\n`;
      markdown += `---\n\n`;
    }

    markdown += `## 注释列表\n\n`;

    data.annotations.forEach((annotation: Annotation, index: number) => {
      markdown += `### 注释 ${index + 1}\n\n`;
      
      if (options.includeHighlights) {
        markdown += `**高亮文本:** ${annotation.text}\n\n`;
      }
      
      if (options.includeNotes && annotation.note) {
        markdown += `**注释内容:** ${annotation.note}\n\n`;
      }
      
      markdown += `**颜色:** ${annotation.color}\n`;
      markdown += `**时间:** ${new Date(annotation.timestamp).toLocaleString()}\n\n`;
      markdown += `---\n\n`;
    });

    return markdown;
  }

  /**
   * 导出为HTML格式
   */
  private async exportToHtml(data: any, options: ExportOptions): Promise<string> {
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.metadata.title} - 注释导出</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .annotation { border-left: 4px solid #007acc; padding-left: 16px; margin: 16px 0; }
        .highlight { background-color: #ffeb3b40; padding: 2px 4px; border-radius: 2px; }
        .metadata { background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    </style>
</head>
<body>
    <h1>${data.metadata.title}</h1>`;

    if (options.includeMetadata) {
      html += `
    <div class="metadata">
        <p><strong>来源:</strong> <a href="${data.metadata.url}">${data.metadata.url}</a></p>
        <p><strong>导出时间:</strong> ${data.metadata.exportDate}</p>
        <p><strong>注释数量:</strong> ${data.metadata.totalAnnotations}</p>
    </div>`;
    }

    html += `\n    <h2>注释列表</h2>\n`;

    data.annotations.forEach((annotation: Annotation, index: number) => {
      html += `\n    <div class="annotation">
        <h3>注释 ${index + 1}</h3>`;
      
      if (options.includeHighlights) {
        html += `\n        <p><strong>高亮文本:</strong> <span class="highlight" style="background-color: ${annotation.color}40">${annotation.text}</span></p>`;
      }
      
      if (options.includeNotes && annotation.note) {
        html += `\n        <p><strong>注释内容:</strong> ${annotation.note}</p>`;
      }
      
      html += `\n        <p><strong>时间:</strong> ${new Date(annotation.timestamp).toLocaleString()}</p>
    </div>`;
    });

    html += `\n</body>\n</html>`;
    return html;
  }

  /**
   * 导出为JSON格式
   */
  private async exportToJson(data: any, options: ExportOptions): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  /**
   * 下载文件
   */
  public downloadFile(content: string, filename: string, mimeType: string): void {
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
   * 获取注释统计信息
   */
  public getStats(): AnnotationStats {
    const annotations = Array.from(this.annotations.values());
    const pageAnnotations = this.getPageAnnotations();
    
    const stats: AnnotationStats = {
      totalAnnotations: annotations.length,
      totalHighlights: pageAnnotations.length,
      totalNotes: pageAnnotations.filter(a => a.note).length,
      byColor: {},
      byDate: {}
    };

    // 按颜色统计
    pageAnnotations.forEach(annotation => {
      stats.byColor[annotation.color] = (stats.byColor[annotation.color] || 0) + 1;
    });

    // 按日期统计
    pageAnnotations.forEach(annotation => {
      const date = new Date(annotation.timestamp).toDateString();
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    });

    return stats;
  }

  /**
   * 生成注释ID
   */
  private generateAnnotationId(): string {
    return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取文本位置（简化版）
   */
  private getTextPosition(text: string): number {
    // 简化实现，实际应该根据DOM位置计算
    return document.body.innerText.indexOf(text);
  }

  /**
   * 保存注释到本地存储
   */
  private async saveAnnotations(): Promise<void> {
    try {
      const data = Array.from(this.annotations.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('保存注释失败:', error);
    }
  }

  /**
   * 从本地存储加载注释
   */
  private async loadAnnotations(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.annotations = new Map(data);
        console.log(`📚 加载了 ${this.annotations.size} 个注释`);
      }
    } catch (error) {
      console.error('加载注释失败:', error);
    }
  }

  /**
   * 恢复当前页面的高亮
   */
  private restoreHighlights(): void {
    const pageAnnotations = this.getPageAnnotations();
    
    pageAnnotations.forEach(annotation => {
      // 这里应该根据position信息恢复高亮
      // 简化实现，实际需要更复杂的DOM操作
      console.log('恢复高亮:', annotation.id);
    });
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.annotations.clear();
    this.isInitialized = false;
  }
}

// 导出单例实例
export const annotationManager = AnnotationManager.getInstance();
