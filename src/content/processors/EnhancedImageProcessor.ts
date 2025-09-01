import { ContentProcessor } from './ContentProcessorManager';
import { ReadingModeSettings } from '../types';

/**
 * 图片处理器选项
 */
export interface ImageProcessorOptions {
  enableLazyLoading?: boolean;
  enableResponsiveImages?: boolean;
  enableErrorHandling?: boolean;
  enableImageOptimization?: boolean;
  enableLightbox?: boolean;
  enableCaption?: boolean;
  maxImageWidth?: number;
  defaultImageQuality?: number;
  placeholderColor?: string;
  errorImageUrl?: string;
}

/**
 * 增强的图片处理器
 * 提供懒加载、响应式图片、错误处理等高级功能
 */
export class EnhancedImageProcessor implements ContentProcessor {
  public readonly name = 'EnhancedImageProcessor';
  public readonly priority = 80; // 中等优先级

  private options: ImageProcessorOptions;
  private processedImages: Set<string> = new Set();

  constructor(options: Partial<ImageProcessorOptions> = {}) {
    this.options = {
      enableLazyLoading: true,
      enableResponsiveImages: true,
      enableErrorHandling: true,
      enableImageOptimization: true,
      enableLightbox: true,
      enableCaption: true,
      maxImageWidth: 1200,
      defaultImageQuality: 85,
      placeholderColor: '#f0f0f0',
      errorImageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDE5VjVhMiAyIDAgMCAwLTItMkg1YTIgMiAwIDAgMC0yIDJ2MTRhMiAyIDAgMCAwIDIgMmgxNGEyIDIgMCAwIDAgMi0yWiIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNOC41IDEyLjVMMTIgMTZsMTUuNS0xNS41IiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=',
      ...options
    };
  }

  /**
   * 检查是否可以处理此内容
   */
  public canProcess(content: string): boolean {
    return content.includes('<img') || content.includes('background-image') || content.includes('figure');
  }

  /**
   * 处理HTML内容
   */
  public async process(content: string, settings?: ReadingModeSettings): Promise<string> {
    try {
      let processedContent = content;

      // 处理图片标签
      processedContent = this.processImageTags(processedContent);

      // 处理图片容器
      processedContent = this.processImageContainers(processedContent);

      // 处理背景图片
      processedContent = this.processBackgroundImages(processedContent);

      // 处理图片占位符
      processedContent = this.processImagePlaceholders(processedContent);

      return processedContent;
    } catch (error) {
      console.error('Image processing failed:', error);
      return content; // 返回原始内容
    }
  }

  /**
   * 处理图片标签
   */
  private processImageTags(content: string): string {
    const imgRegex = /<img([^>]*)>/gi;
    
    return content.replace(imgRegex, (match, attributes) => {
      // 检查是否已经处理过
      if (attributes.includes('data-processed')) {
        return match;
      }

      const enhancedAttributes = this.enhanceImageAttributes(attributes);
      
      return `<img${enhancedAttributes} data-processed="true">`;
    });
  }

  /**
   * 增强图片属性
   */
  private enhanceImageAttributes(attributes: string): string {
    let enhanced = attributes;

    // 添加懒加载
    if (this.options.enableLazyLoading && !enhanced.includes('loading=')) {
      enhanced += ' loading="lazy"';
    }

    // 添加错误处理
    if (this.options.enableErrorHandling && !enhanced.includes('onerror=')) {
      enhanced += ` onerror="this.onerror=null;this.src='${this.options.errorImageUrl}';this.classList.add('image-error')"`;
    }

    // 添加响应式支持
    if (this.options.enableResponsiveImages) {
      enhanced = this.addResponsiveAttributes(enhanced);
    }

    // 添加图片优化
    if (this.options.enableImageOptimization) {
      enhanced = this.addOptimizationAttributes(enhanced);
    }

    // 添加CSS类
    if (!enhanced.includes('class=')) {
      enhanced += ' class="enhanced-image"';
    } else {
      enhanced = enhanced.replace(/class="([^"]*)"/, 'class="$1 enhanced-image"');
    }

    // 添加点击放大功能
    if (this.options.enableLightbox && !enhanced.includes('onclick=')) {
      enhanced += ' onclick="openImageLightbox(this)"';
    }

    return enhanced;
  }

  /**
   * 添加响应式属性
   */
  private addResponsiveAttributes(attributes: string): string {
    let enhanced = attributes;

    // 检查是否有srcset
    if (!enhanced.includes('srcset=')) {
      const srcMatch = enhanced.match(/src="([^"]*)"/);
      if (srcMatch) {
        const src = srcMatch[1];
        const srcset = this.generateSrcSet(src);
        if (srcset) {
          enhanced += ` srcset="${srcset}"`;
        }
      }
    }

    // 添加sizes属性
    if (!enhanced.includes('sizes=') && enhanced.includes('srcset=')) {
      enhanced += ' sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"';
    }

    return enhanced;
  }

  /**
   * 生成srcset
   */
  private generateSrcSet(src: string): string | null {
    try {
      const url = new URL(src, window.location.href);
      const baseUrl = url.origin + url.pathname;
      const extension = url.pathname.split('.').pop();
      
      if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension.toLowerCase())) {
        return null;
      }

      const sizes = [320, 640, 768, 1024, 1200];
      const srcset = sizes
        .filter(size => size <= (this.options.maxImageWidth || 1200))
        .map(size => `${baseUrl}?w=${size} ${size}w`)
        .join(', ');

      return srcset || null;
    } catch {
      return null;
    }
  }

  /**
   * 添加优化属性
   */
  private addOptimizationAttributes(attributes: string): string {
    let enhanced = attributes;

    // 添加解码属性
    if (!enhanced.includes('decoding=')) {
      enhanced += ' decoding="async"';
    }

    // 添加重要性属性
    if (!enhanced.includes('importance=')) {
      enhanced += ' importance="high"';
    }

    // 添加fetchpriority属性
    if (!enhanced.includes('fetchpriority=')) {
      enhanced += ' fetchpriority="high"';
    }

    return enhanced;
  }

  /**
   * 处理图片容器
   */
  private processImageContainers(content: string): string {
    // 处理figure标签
    const figureRegex = /<figure([^>]*)>([\s\S]*?)<\/figure>/gi;
    
    content = content.replace(figureRegex, (match, attributes, content) => {
      if (attributes.includes('data-processed')) {
        return match;
      }

      const enhancedFigure = this.enhanceFigureElement(attributes, content);
      return enhancedFigure;
    });

    // 处理div图片容器
    const divContainerRegex = /<div([^>]*class="[^"]*image-container[^"]*"[^>]*)>([\s\S]*?)<\/div>/gi;
    
    content = content.replace(divContainerRegex, (match, attributes, content) => {
      if (attributes.includes('data-processed')) {
        return match;
      }

      const enhancedContainer = this.enhanceImageContainer(attributes, content);
      return enhancedContainer;
    });

    return content;
  }

  /**
   * 增强figure元素
   */
  private enhanceFigureElement(attributes: string, content: string): string {
    let enhancedAttributes = attributes;

    // 添加CSS类
    if (!enhancedAttributes.includes('class=')) {
      enhancedAttributes += ' class="enhanced-figure"';
    } else {
      enhancedAttributes = enhancedAttributes.replace(/class="([^"]*)"/, 'class="$1 enhanced-figure"');
    }

    // 添加data属性
    enhancedAttributes += ' data-processed="true"';

    // 处理内容
    let enhancedContent = content;

    // 查找图片标签
    const imgMatch = content.match(/<img([^>]*)>/i);
    if (imgMatch) {
      const imgAttributes = imgMatch[1];
      const enhancedImgAttributes = this.enhanceImageAttributes(imgAttributes);
      enhancedContent = content.replace(/<img([^>]*)>/i, `<img${enhancedImgAttributes}>`);
    }

    // 查找标题
    const captionMatch = content.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    if (captionMatch && this.options.enableCaption) {
      // 标题已存在，保持原样
    } else if (this.options.enableCaption) {
      // 添加默认标题
      enhancedContent += '<figcaption class="image-caption">图片</figcaption>';
    }

    return `<figure${enhancedAttributes}>${enhancedContent}</figure>`;
  }

  /**
   * 增强图片容器
   */
  private enhanceImageContainer(attributes: string, content: string): string {
    let enhancedAttributes = attributes;

    // 添加CSS类
    if (!enhancedAttributes.includes('class=')) {
      enhancedAttributes += ' class="enhanced-image-container"';
    } else {
      enhancedAttributes = enhancedAttributes.replace(/class="([^"]*)"/, 'class="$1 enhanced-image-container"');
    }

    // 添加data属性
    enhancedAttributes += ' data-processed="true"';

    return `<div${enhancedAttributes}>${content}</div>`;
  }

  /**
   * 处理背景图片
   */
  private processBackgroundImages(content: string): string {
    // 查找有背景图片的元素
    const bgImageRegex = /<([a-z][a-z0-9]*)([^>]*style="[^"]*background-image[^"]*"[^>]*)>/gi;
    
    return content.replace(bgImageRegex, (match, tagName, attributes) => {
      if (attributes.includes('data-processed')) {
        return match;
      }

      const enhancedAttributes = this.enhanceBackgroundImageAttributes(attributes);
      return `<${tagName}${enhancedAttributes}>`;
    });
  }

  /**
   * 增强背景图片属性
   */
  private enhanceBackgroundImageAttributes(attributes: string): string {
    let enhanced = attributes;

    // 添加CSS类
    if (!enhanced.includes('class=')) {
      enhanced += ' class="enhanced-bg-image"';
    } else {
      enhanced = enhanced.replace(/class="([^"]*)"/, 'class="$1 enhanced-bg-image"');
    }

    // 添加data属性
    enhanced += ' data-processed="true"';

    // 处理懒加载的背景图片
    if (this.options.enableLazyLoading) {
      enhanced = this.addLazyBackgroundAttributes(enhanced);
    }

    return enhanced;
  }

  /**
   * 添加懒加载背景图片属性
   */
  private addLazyBackgroundAttributes(attributes: string): string {
    let enhanced = attributes;

    // 检查是否有懒加载属性
    const lazyAttributes = [
      'data-background', 'data-bg', 'data-background-image',
      'data-lazy-background', 'data-background-src'
    ];

    for (const attr of lazyAttributes) {
      if (enhanced.includes(`${attr}=`)) {
        // 已经有懒加载属性，添加加载处理
        enhanced += ' data-lazy-bg="true"';
        break;
      }
    }

    return enhanced;
  }

  /**
   * 处理图片占位符
   */
  private processImagePlaceholders(content: string): string {
    // 查找图片占位符
    const placeholderRegex = /<div([^>]*class="[^"]*image-placeholder[^"]*"[^>]*)>([\s\S]*?)<\/div>/gi;
    
    return content.replace(placeholderRegex, (match, attributes, content) => {
      if (attributes.includes('data-processed')) {
        return match;
      }

      let enhancedAttributes = attributes;

      // 添加CSS类
      if (!enhancedAttributes.includes('class=')) {
        enhancedAttributes += ' class="enhanced-image-placeholder"';
      } else {
        enhancedAttributes = enhancedAttributes.replace(/class="([^"]*)"/, 'class="$1 enhanced-image-placeholder"');
      }

      // 添加data属性
      enhancedAttributes += ' data-processed="true"';

      // 添加样式
      if (!enhancedAttributes.includes('style=')) {
        enhancedAttributes += ` style="background-color: ${this.options.placeholderColor}"`;
      }

      return `<div${enhancedAttributes}>${content}</div>`;
    });
  }

  /**
   * 获取处理器选项
   */
  public getOptions(): ImageProcessorOptions {
    return { ...this.options };
  }

  /**
   * 更新处理器选项
   */
  public updateOptions(newOptions: Partial<ImageProcessorOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * 检查图片是否已处理
   */
  public isImageProcessed(imageId: string): boolean {
    return this.processedImages.has(imageId);
  }

  /**
   * 标记图片为已处理
   */
  public markImageAsProcessed(imageId: string): void {
    this.processedImages.add(imageId);
  }

  /**
   * 清除处理记录
   */
  public clearProcessedImages(): void {
    this.processedImages.clear();
  }

  /**
   * 获取已处理的图片数量
   */
  public getProcessedImageCount(): number {
    return this.processedImages.size;
  }
}

// 导出默认实例
export const enhancedImageProcessor = new EnhancedImageProcessor();
