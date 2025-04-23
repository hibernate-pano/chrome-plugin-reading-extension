import { ExtractedContent, ExtractorRule, ImageInfo } from '../../types';
import { ContentExtractionError } from '../../types/errors';
import { getCleanTextContent } from '../../utils/dom';

/**
 * 内容提取器基类
 */
export abstract class BaseExtractor {
  /**
   * 提取内容的方法，子类必须实现
   */
  public abstract extract(document: Document, url: string): Promise<ExtractedContent>;

  /**
   * 估计阅读时间
   * 假设平均阅读速度为每分钟250个单词
   */
  protected estimateReadingTime(text: string): number {
    const words = text.trim().split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(words / 250);
    return Math.max(1, readingTimeMinutes);
  }

  /**
   * 从文档中提取图片信息
   */
  protected extractImages(document: Document): ImageInfo[] {
    const images: ImageInfo[] = [];
    
    try {
      const imgElements = document.querySelectorAll('img');
      
      imgElements.forEach(img => {
        const src = img.getAttribute('src');
        if (!src) return;
        
        // 忽略小图片（可能是图标或像素跟踪）
        const width = img.getAttribute('width');
        const height = img.getAttribute('height');
        
        if (width && height && parseInt(width) < 50 && parseInt(height) < 50) {
          return;
        }
        
        images.push({
          src,
          alt: img.getAttribute('alt') || undefined,
          title: img.getAttribute('title') || undefined,
          width: img.naturalWidth || undefined,
          height: img.naturalHeight || undefined
        });
      });
    } catch (error) {
      console.error('提取图片错误', error);
    }
    
    return images;
  }

  /**
   * 从元素中提取纯文本内容
   */
  protected getTextContent(element: Element | null): string {
    if (!element) return '';
    return getCleanTextContent(element);
  }

  /**
   * 从文档中提取标题
   */
  protected extractTitle(document: Document): string {
    const selectors = [
      'h1.article-title',
      'h1.entry-title',
      'h1.post-title',
      'h1.title',
      'h1',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      
      if (element) {
        if (element.tagName.toLowerCase() === 'meta') {
          return element.getAttribute('content') || document.title;
        }
        
        const text = this.getTextContent(element);
        if (text.length > 0) return text;
      }
    }
    
    return document.title;
  }

  /**
   * 从文档中提取作者
   */
  protected extractAuthor(document: Document): string | undefined {
    const selectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      'a[rel="author"]',
      '.author-name',
      '.author',
      '.byline'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      
      if (element) {
        if (element.tagName.toLowerCase() === 'meta') {
          return element.getAttribute('content') || undefined;
        }
        
        const text = this.getTextContent(element);
        if (text.length > 0) return text;
      }
    }
    
    return undefined;
  }

  /**
   * 从文档中提取发布日期
   */
  protected extractPublishDate(document: Document): string | undefined {
    const selectors = [
      'meta[property="article:published_time"]',
      'meta[name="publication-date"]',
      'time',
      '.published-date',
      '.post-date',
      '.date'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      
      if (element) {
        if (element.tagName.toLowerCase() === 'meta') {
          return element.getAttribute('content') || undefined;
        }
        
        if (element.tagName.toLowerCase() === 'time') {
          return element.getAttribute('datetime') || this.getTextContent(element);
        }
        
        const text = this.getTextContent(element);
        if (text.length > 0) return text;
      }
    }
    
    return undefined;
  }

  /**
   * 计算单词数
   */
  protected countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * 从URL中获取域名
   */
  protected getDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      throw new ContentExtractionError('无效的URL', { url, error });
    }
  }

  /**
   * 提取网站图标
   */
  protected extractFavicon(document: Document, url: string): string | undefined {
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      
      if (element && element.getAttribute('href')) {
        const href = element.getAttribute('href') || '';
        
        // 处理相对URL
        if (href.startsWith('/')) {
          try {
            const urlObj = new URL(url);
            return `${urlObj.origin}${href}`;
          } catch {
            return href;
          }
        }
        
        return href;
      }
    }
    
    // 如果找不到，返回默认网站图标路径
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}/favicon.ico`;
    } catch {
      return undefined;
    }
  }

  /**
   * 应用自定义提取规则
   */
  protected applyExtractionRule(document: Document, rule: ExtractorRule | null): {
    content: Element | null;
    title: string | null;
    author: string | null;
    date: string | null;
  } {
    if (!rule) {
      return {
        content: null,
        title: null,
        author: null,
        date: null
      };
    }
    
    const content = rule.selectors.content ? document.querySelector(rule.selectors.content) : null;
    const title = rule.selectors.title ? this.getTextContent(document.querySelector(rule.selectors.title)) : null;
    const author = rule.selectors.author ? this.getTextContent(document.querySelector(rule.selectors.author)) : null;
    const date = rule.selectors.date ? this.getTextContent(document.querySelector(rule.selectors.date)) : null;
    
    // 移除不需要的元素
    if (content && rule.remove && rule.remove.length > 0) {
      rule.remove.forEach(selector => {
        content.querySelectorAll(selector).forEach(el => el.remove());
      });
    }
    
    return { content, title, author, date };
  }

  /**
   * 提取页面语言
   */
  protected extractLanguage(document: Document): string | undefined {
    // 尝试从html标签获取
    const htmlLang = document.documentElement.getAttribute('lang');
    if (htmlLang) return htmlLang;
    
    // 尝试从meta标签获取
    const metaLang = document.querySelector('meta[property="og:locale"]')?.getAttribute('content');
    if (metaLang) return metaLang;
    
    return undefined;
  }

  /**
   * 生成摘要
   */
  protected generateExcerpt(content: string, maxLength = 200): string {
    if (!content) return '';
    
    // 清理内容
    const cleanText = content
      .replace(/<[^>]+>/g, ' ') // 移除HTML标签
      .replace(/\s+/g, ' ') // 合并空白
      .trim();
    
    if (cleanText.length <= maxLength) {
      return cleanText;
    }
    
    // 截取适当长度并确保不截断单词
    const truncated = cleanText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return truncated.substring(0, lastSpace) + '...';
  }
} 