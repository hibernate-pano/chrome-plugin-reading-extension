import { Defuddle } from 'defuddle';
import { performanceMonitor } from '../../utils/performance';
import { extractionCache } from '../../utils/cache';
import { sanitizeHtml } from '../../utils/sanitizer';

// 定义提取器配置选项
export interface DefuddleExtractorOptions {
  // Defuddle 配置选项
  defuddleOptions?: {
    debug?: boolean;
    url?: string;
  };
  // 净化选项
  sanitizeOptions?: {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    ADD_TAGS?: string[];
    KEEP_CONTENT?: boolean;
    ALLOW_DATA_ATTR?: boolean;
  };
  // 特殊站点处理
  specialSites?: {
    [domain: string]: (doc: Document) => void;
  };
}

// 默认配置
const defaultOptions: DefuddleExtractorOptions = {
  defuddleOptions: {
    debug: false,
  },
  sanitizeOptions: {
    // 使用默认的净化选项
  },
  specialSites: {
    // 特殊站点处理将在后续添加
  }
};

// 内容提取结果接口
export interface ExtractedContent {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string | null;
  dir: string | null;
  siteName: string | null;
  lang: string | null;
  publishedTime: string | null;
  success: boolean;
  error?: string;
}

/**
 * 基于 Defuddle 的增强型内容提取器
 * 使用 Defuddle 提取内容，并进行额外的预处理和后处理
 */
export class DefuddleExtractor {
  private options: DefuddleExtractorOptions;

  constructor(options: Partial<DefuddleExtractorOptions> = {}) {
    this.options = this.mergeOptions(defaultOptions, options);
  }

  /**
   * 合并默认选项和用户选项
   */
  private mergeOptions(defaults: DefuddleExtractorOptions, userOptions: Partial<DefuddleExtractorOptions>): DefuddleExtractorOptions {
    return {
      defuddleOptions: {
        ...defaults.defuddleOptions,
        ...userOptions.defuddleOptions,
      },
      sanitizeOptions: {
        ...defaults.sanitizeOptions,
        ...userOptions.sanitizeOptions,
      },
      specialSites: {
        ...defaults.specialSites,
        ...userOptions.specialSites,
      },
    };
  }

  /**
   * 从当前页面提取内容
   */
  public extract(): Promise<ExtractedContent> {
    // 使用性能监控器测量提取性能
    return performanceMonitor.measure('extract', async () => {
      // 尝试从缓存获取
      const cacheKey = `page_${document.location.href}`;
      const cachedContent = extractionCache.get(cacheKey);

      if (cachedContent) {
        console.debug('从缓存获取内容');
        return cachedContent;
      }

      // 从页面提取内容
      const result = await this.extractFromHTML(document.documentElement.outerHTML, document.location.href);

      // 缓存结果
      if (result.success) {
        extractionCache.set(cacheKey, result);
      }

      return result;
    });
  }

  /**
   * 从 HTML 字符串提取内容
   */
  public async extractFromHTML(html: string, url?: string): Promise<ExtractedContent> {
    return performanceMonitor.measure('extractFromHTML', async () => {
      try {
        // 尝试从缓存获取
        const cacheKey = `html_${this.generateCacheKey(html)}`;
        const cachedContent = extractionCache.get(cacheKey);

        if (cachedContent) {
          console.debug('从缓存获取内容');
          return cachedContent;
        }

        // 创建文档克隆
        const doc = document.implementation.createHTMLDocument();
        doc.documentElement.innerHTML = html;

        // 应用特殊站点处理
        if (url && this.options.specialSites) {
          const domain = this.extractDomain(url);
          const specialHandler = this.options.specialSites[domain];
          if (specialHandler) {
            specialHandler(doc);
          }
        }

        // 使用 Defuddle 提取内容
        const defuddleOptions = {
          ...this.options.defuddleOptions,
          url: url || window.location.href
        };

        const defuddle = new Defuddle(doc, defuddleOptions);
        const result = defuddle.parse();

        if (!result) {
          return this.createErrorResult('无法提取内容');
        }

        // 净化内容
        const sanitizedContent = sanitizeHtml(result.content, this.options.sanitizeOptions);

        // 创建临时元素进行后处理
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizedContent;

        // 后处理内容
        this.postProcessContent(tempDiv);

        // 创建结果对象
        const extractedContent: ExtractedContent = {
          title: result.title || document.title,
          content: tempDiv.innerHTML,
          textContent: tempDiv.textContent || '',
          length: tempDiv.textContent?.length || 0,
          excerpt: result.excerpt || '',
          byline: result.author || null,
          dir: result.dir || null,
          siteName: result.site || null,
          lang: result.lang || null,
          publishedTime: result.published || null,
          success: true,
        };

        // 缓存结果
        extractionCache.set(cacheKey, extractedContent);

        return extractedContent;
      } catch (error) {
        return this.createErrorResult(error instanceof Error ? error.message : '未知错误');
      }
    });
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(html: string): string {
    // 简单的哈希函数，用于生成缓存键
    let hash = 0;
    for (let i = 0; i < html.length; i++) {
      const char = html.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 从 URL 中提取域名
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return '';
    }
  }

  /**
   * 后处理内容
   */
  private postProcessContent(container: HTMLElement): void {
    // 修复链接
    this.fixLinks(container);

    // 修复标题层级
    this.fixHeadings(container);

    // 其他后处理逻辑可以在这里添加
  }

  /**
   * 修复链接
   */
  private fixLinks(container: HTMLElement): void {
    const links = container.querySelectorAll('a');
    links.forEach(link => {
      // 确保链接是绝对路径
      if (link.href && link.href.startsWith('/')) {
        try {
          const baseUrl = new URL(window.location.href).origin;
          link.href = baseUrl + link.href;
        } catch (error) {
          // 忽略无效的 URL
        }
      }

      // 添加 target="_blank" 和 rel="noopener noreferrer"
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  }

  /**
   * 修复标题层级
   */
  private fixHeadings(container: HTMLElement): void {
    // 获取所有标题元素
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    // 如果没有标题，直接返回
    if (headings.length === 0) return;

    // 找到最小的标题级别
    const minLevel = Math.min(...headings.map(h => parseInt(h.tagName.substring(1))));

    // 如果最小级别不是 1，则需要调整
    if (minLevel > 1) {
      const adjustment = minLevel - 1;
      headings.forEach(heading => {
        const currentLevel = parseInt(heading.tagName.substring(1));
        const newLevel = Math.max(currentLevel - adjustment, 1);

        // 创建新标题元素
        const newHeading = document.createElement(`h${newLevel}`);
        newHeading.innerHTML = heading.innerHTML;
        newHeading.className = heading.className;

        // 替换原标题
        heading.parentNode?.replaceChild(newHeading, heading);
      });
    }
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(errorMessage: string): ExtractedContent {
    console.error('内容提取失败:', errorMessage);
    return {
      title: document.title,
      content: '',
      textContent: '',
      length: 0,
      excerpt: '',
      byline: null,
      dir: null,
      siteName: null,
      lang: null,
      publishedTime: null,
      success: false,
      error: errorMessage,
    };
  }
}

// 导出默认实例
export const defuddleExtractor = new DefuddleExtractor();
