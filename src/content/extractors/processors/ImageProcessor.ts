import { ContentProcessor } from './CodeBlockProcessor';

/**
 * 图片处理器
 * 用于增强图片的显示
 */
export class ImageProcessor implements ContentProcessor {
  /**
   * 处理HTML内容，增强图片的显示
   * @param content HTML内容
   * @returns 处理后的HTML内容
   */
  public process(content: string): string {
    // 查找所有图片
    const imgRegex = /<img([^>]*)>/g;
    
    // 替换为增强的图片
    return content.replace(imgRegex, (match, attributes) => {
      // 添加懒加载
      if (!attributes.includes('loading=')) {
        attributes += ' loading="lazy"';
      }
      
      // 添加点击放大功能
      if (!attributes.includes('class=')) {
        attributes += ' class="reader-image"';
      } else {
        attributes = attributes.replace(/class="([^"]*)"/, 'class="$1 reader-image"');
      }
      
      // 添加错误处理
      if (!attributes.includes('onerror=')) {
        attributes += ' onerror="this.onerror=null;this.style.opacity=0.5;this.style.border=\'1px solid #ddd\'"';
      }
      
      // 构建增强的图片HTML
      return `<figure class="reader-figure"><img${attributes}></figure>`;
    });
  }
}

// 导出默认实例
export const imageProcessor = new ImageProcessor(); 