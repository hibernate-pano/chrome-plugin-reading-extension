import { ExtractedContent, ExtractorRule } from '../../types';
import { ContentExtractionError } from '../../types/errors';
import { BaseExtractor } from './BaseExtractor';

/**
 * 默认内容提取器，使用自定义规则和通用算法
 */
export class DefaultExtractor extends BaseExtractor {
  private rule: ExtractorRule | null = null;

  /**
   * 构造函数，可选传入特定提取规则
   */
  constructor(rule: ExtractorRule | null = null) {
    super();
    this.rule = rule;
  }

  /**
   * 实现提取方法
   */
  public async extract(document: Document, url: string): Promise<ExtractedContent> {
    try {
      // 获取文档副本，避免修改原始文档
      const docClone = document.cloneNode(true) as Document;
      
      // 清理文档
      this.cleanDocument(docClone);
      
      // 尝试应用自定义规则
      const { 
        content: ruleContent, 
        title: ruleTitle,
        author: ruleAuthor,
        date: ruleDate 
      } = this.applyExtractionRule(docClone, this.rule);
      
      // 提取主要内容
      const contentElement = ruleContent || this.findMainContent(docClone);
      
      if (!contentElement) {
        throw new ContentExtractionError('无法提取主要内容', { url });
      }
      
      // 获取HTML内容字符串
      const contentHtml = contentElement.innerHTML;
      
      // 提取其他元数据
      const title = ruleTitle || this.extractTitle(docClone);
      const author = ruleAuthor || this.extractAuthor(docClone);
      const publishDate = ruleDate || this.extractPublishDate(docClone);
      const domain = this.getDomainFromUrl(url);
      const images = this.extractImages(docClone);
      const contentText = this.getTextContent(contentElement);
      const wordCount = this.countWords(contentText);
      const readingTime = this.estimateReadingTime(contentText);
      const language = this.extractLanguage(docClone);
      const favicon = this.extractFavicon(docClone, url);
      const excerpt = this.generateExcerpt(contentText);
      
      return {
        title,
        content: contentHtml,
        author,
        publishDate,
        url,
        domain,
        readingTime,
        wordCount,
        imageCount: images.length,
        images,
        favicon,
        language,
        excerpt
      };
    } catch (error) {
      if (error instanceof ContentExtractionError) {
        throw error;
      }
      
      throw new ContentExtractionError('内容提取失败', {
        url,
        error
      });
    }
  }

  /**
   * 清理文档，移除干扰元素
   */
  private cleanDocument(document: Document): void {
    const elementsToRemove = [
      'script', 'style', 'noscript', 'iframe', 'form', 'button',
      'nav:not(article nav)', 'header:not(article header)', 'footer:not(article footer)',
      'aside', '.ad', '.ads', '.advertisement', '.banner', '.social',
      '.comment', '.comments', '.sidebar', '.widget'
    ];
    
    elementsToRemove.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.remove();
      });
    });
  }

  /**
   * 查找主要内容元素
   */
  private findMainContent(document: Document): Element | null {
    // 按可能性顺序尝试各种常见内容选择器
    const contentSelectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.main',
      '#main',
      '.main-content',
      '.article',
      '.post',
      '.entry',
      '[role="main"]'
    ];
    
    // 尝试找到匹配元素
    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector);
      
      // 如果有多个匹配，选择最长的那个
      if (elements.length > 0) {
        if (elements.length === 1) {
          return elements[0];
        }
        
        // 选择内容最多的元素
        let bestElement = elements[0];
        let maxLength = this.getTextContent(elements[0]).length;
        
        for (let i = 1; i < elements.length; i++) {
          const length = this.getTextContent(elements[i]).length;
          if (length > maxLength) {
            maxLength = length;
            bestElement = elements[i];
          }
        }
        
        return bestElement;
      }
    }
    
    // 如果找不到匹配的选择器，尝试启发式方法
    return this.findContentHeuristically(document);
  }

  /**
   * 启发式查找内容
   */
  private findContentHeuristically(document: Document): Element | null {
    // 获取所有段落
    const paragraphs = document.querySelectorAll('p');
    
    if (paragraphs.length === 0) {
      return document.body; // 找不到段落，返回整个body
    }
    
    // 找到最多段落的容器
    const containers = new Map<Element, number>();
    
    paragraphs.forEach(p => {
      // 向上查找可能的容器
      let parent = p.parentElement;
      let depth = 0;
      
      while (parent && depth < 4) {
        const count = containers.get(parent) || 0;
        containers.set(parent, count + 1);
        parent = parent.parentElement;
        depth++;
      }
    });
    
    // 找到包含最多段落的容器
    let bestContainer: Element | null = null;
    let maxParagraphs = 0;
    
    containers.forEach((count, container) => {
      if (count > maxParagraphs) {
        maxParagraphs = count;
        bestContainer = container;
      }
    });
    
    return bestContainer || document.body;
  }
} 