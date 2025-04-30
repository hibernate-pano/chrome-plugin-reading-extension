import Defuddle from 'defuddle';
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
    // 特殊站点处理
    'juejin.cn': (doc: Document) => {
      // 掘金网特殊处理
      console.log('应用掘金网特殊处理');

      // 移除广告和干扰元素
      const selectors = [
        '.article-suspended-panel', // 悬浮面板
        '.recommend-box', // 推荐框
        '.comment-box', // 评论框
        '.author-info-block', // 作者信息
        '.article-banner', // 文章横幅
        '.article-end', // 文章结尾
        '.column-container', // 专栏容器
        '.markdown-body > .copy-code-btn', // 复制代码按钮
        '.markdown-body > .code-block-header' // 代码块头部
      ];

      selectors.forEach(selector => {
        const elements = doc.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });

      // 处理文章内容区域
      const articleContent = doc.querySelector('.article-content');
      if (articleContent) {
        // 移除文章内的广告
        const ads = articleContent.querySelectorAll('[data-ad]');
        ads.forEach(ad => ad.remove());

        // 移除标题下的大空白
        const markdownBody = articleContent.querySelector('.markdown-body');
        if (markdownBody) {
          // 移除所有空白段落
          const emptyParagraphs = markdownBody.querySelectorAll('p:empty, p:only-child:not(:has(*)):not([style]):not([class])');
          emptyParagraphs.forEach(p => {
            if (p.textContent?.trim() === '') {
              p.remove();
            }
          });

          // 处理代码块
          const codeBlocks = markdownBody.querySelectorAll('pre[data-lang]');
          codeBlocks.forEach(pre => {
            // 移除掘金的代码块头部
            const codeBlockHeader = pre.previousElementSibling;
            if (codeBlockHeader && codeBlockHeader.classList.contains('code-block-header')) {
              codeBlockHeader.remove();
            }

            // 移除复制按钮
            const copyButton = pre.nextElementSibling;
            if (copyButton && copyButton.classList.contains('copy-code-btn')) {
              copyButton.remove();
            }

            // 确保代码块有正确的语言标记
            const lang = pre.getAttribute('data-lang');
            if (lang) {
              pre.classList.add(`language-${lang}`);
              const code = pre.querySelector('code');
              if (code) {
                code.classList.add(`language-${lang}`);
              }
            }
          });
        }
      }
    }
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
   * 从当前页面或指定文档提取内容
   * @param document 可选的文档对象
   * @param options 可选的提取选项
   */
  public extract(): Promise<ExtractedContent>;
  public extract(document: Document, options?: Partial<DefuddleExtractorOptions>): Promise<ExtractedContent>;
  public extract(document?: Document, options?: Partial<DefuddleExtractorOptions>): Promise<ExtractedContent> {
    // 使用性能监控器测量提取性能
    return performanceMonitor.measure('extract', async () => {
      // 如果没有传入文档，则从当前页面提取
      if (!document) {
        // 尝试从缓存获取
        const cacheKey = `page_${window.location.href}`;
        const cachedContent = extractionCache.get(cacheKey);

        if (cachedContent) {
          console.debug('从缓存获取内容');
          return cachedContent;
        }

        // 从页面提取内容
        const result = await this.extractFromHTML(document.documentElement.outerHTML, window.location.href);

        // 缓存结果
        if (result.success) {
          extractionCache.set(cacheKey, result);
        }

        return result;
      }

      // 如果传入了文档，则从指定文档提取
      try {
        // 合并选项
        if (options) {
          this.options = this.mergeOptions(this.options, options);
        }

        // 获取文档的HTML
        const html = document.documentElement.outerHTML;
        const url = document.URL || window.location.href;

        // 使用现有的HTML提取方法
        return await this.extractFromHTML(html, url);
      } catch (error) {
        return this.createErrorResult(error instanceof Error ? error.message : '未知错误');
      }
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
      // 验证 URL 是否有效
      if (!url || typeof url !== 'string') {
        console.warn('无效的 URL:', url);
        return '';
      }

      // 特殊处理掘金网的 URL
      if (url.includes('juejin.cn')) {
        return 'juejin.cn';
      }

      // 特殊处理 about:blank 和其他无效 URL
      if (url === 'about:blank' || url.startsWith('about:') || url.startsWith('chrome:') || url.startsWith('data:')) {
        console.warn('跳过特殊 URL:', url);
        return '';
      }

      // 确保 URL 有协议前缀
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // 尝试修复 URL
        if (url.startsWith('//')) {
          url = 'https:' + url;
        } else if (!url.includes('://')) {
          url = 'https://' + url;
        }
      }

      // 验证 URL 格式
      if (!url.match(/^https?:\/\/[^/]+/)) {
        console.warn('URL 格式无效:', url);
        return '';
      }

      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.error('解析 URL 时出错:', error, 'URL:', url);

      // 如果解析失败，尝试使用正则表达式提取域名
      const domainMatch = url.match(/https?:\/\/([^/]+)/);
      if (domainMatch && domainMatch[1]) {
        return domainMatch[1];
      }

      // 如果 URL 包含特定域名，直接返回
      if (url.includes('juejin.cn')) {
        return 'juejin.cn';
      }

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
      // 获取 href 值
      const href = link.getAttribute('href') || '';

      // 如果没有 href 属性或为空，跳过
      if (!href) return;

      // 处理相对路径
      if (href.startsWith('/')) {
        try {
          // 确保基础 URL 有效
          const baseUrl = new URL(window.location.href).origin;
          link.setAttribute('href', baseUrl + href);
        } catch (error) {
          console.warn('无法处理相对链接:', href, error);
        }
      }
      // 处理协议相对路径
      else if (href.startsWith('//')) {
        link.setAttribute('href', 'https:' + href);
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
