import { Readability } from '@mozilla/readability';
import { performanceMonitor } from '../../utils/performance';
import { extractionCache } from '../../utils/cache';
import { getWorkerManager } from '../../workers/workerManager';

// 定义提取器配置选项
export interface ExtractorOptions {
  // Readability 配置选项
  readabilityOptions?: {
    charThreshold?: number;
    classesToPreserve?: string[];
    keepClasses?: boolean;
    disableJSONLD?: boolean;
    serializer?: (node: Node) => string;
  };
  // 预处理选项
  preProcessing?: {
    removeScripts?: boolean;
    removeStyles?: boolean;
    removeHidden?: boolean;
    cleanupHtml?: boolean;
    preserveImages?: boolean;
    preserveTables?: boolean;
  };
  // 后处理选项
  postProcessing?: {
    enhanceTables?: boolean;
    enhanceImages?: boolean;
    enhanceCodeBlocks?: boolean;
    enhanceLists?: boolean;
    fixLinks?: boolean;
    fixHeadings?: boolean;
  };
  // 特殊站点处理
  specialSites?: {
    [domain: string]: (doc: Document) => void;
  };
}

// 默认配置
const defaultOptions: ExtractorOptions = {
  readabilityOptions: {
    charThreshold: 100,
    keepClasses: true,
    disableJSONLD: false,
  },
  preProcessing: {
    removeScripts: true,
    removeStyles: true,
    removeHidden: true,
    cleanupHtml: true,
    preserveImages: true,
    preserveTables: true,
  },
  postProcessing: {
    enhanceTables: true,
    enhanceImages: true,
    enhanceCodeBlocks: true,
    enhanceLists: true,
    fixLinks: true,
    fixHeadings: true,
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
 * 增强型内容提取器
 * 使用 Readability 提取内容，并进行额外的预处理和后处理
 */
export class ContentExtractor {
  private options: ExtractorOptions;

  constructor(options: Partial<ExtractorOptions> = {}) {
    this.options = this.mergeOptions(defaultOptions, options);
  }

  /**
   * 合并默认选项和用户选项
   */
  private mergeOptions(defaults: ExtractorOptions, userOptions: Partial<ExtractorOptions>): ExtractorOptions {
    return {
      readabilityOptions: {
        ...defaults.readabilityOptions,
        ...userOptions.readabilityOptions,
      },
      preProcessing: {
        ...defaults.preProcessing,
        ...userOptions.preProcessing,
      },
      postProcessing: {
        ...defaults.postProcessing,
        ...userOptions.postProcessing,
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

        // 检查是否支持工作线程
        // 注意：由于 Web Worker 不能使用 document，我们直接在主线程中处理
        // 下面的代码保留以便将来可能的改进
        if (false && typeof Worker !== 'undefined' && this.shouldUseWorker(html)) {
          try {
            // 使用工作线程提取内容
            console.debug('使用工作线程提取内容');
            const workerManager = getWorkerManager();

            try {
              const result = await workerManager.extractContent(html, url);

              // 缓存结果
              if (result.success) {
                extractionCache.set(cacheKey, result);
              }

              return result;
            } catch (workerError) {
              console.warn('工作线程提取失败，回退到主线程:', workerError);
              // 如果工作线程失败，回退到主线程处理
              // 继续执行下面的主线程提取代码
            }
          } catch (workerError) {
            console.warn('工作线程提取失败，回退到主线程:', workerError);
            // 如果工作线程失败，回退到主线程处理
          }
        }

        // 主线程提取内容
        console.debug('使用主线程提取内容');

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

        // 预处理文档
        this.preProcessDocument(doc);

        // 使用 Readability 提取内容
        // @ts-ignore - Readability 的类型定义与实际使用有差异
        const reader = new Readability(doc, this.options.readabilityOptions);
        const article = reader.parse();

        if (!article) {
          return this.createErrorResult('无法提取内容');
        }

        // 创建临时元素进行后处理
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = article.content;

        // 后处理内容
        this.postProcessContent(tempDiv);

        // 创建结果对象
        const result: ExtractedContent = {
          title: article.title,
          content: tempDiv.innerHTML,
          textContent: article.textContent,
          length: article.length,
          excerpt: article.excerpt,
          byline: article.byline,
          dir: article.dir,
          siteName: article.siteName,
          lang: article.lang,
          publishedTime: (article as any).publishedTime || null,
          success: true,
        };

        // 缓存结果
        extractionCache.set(cacheKey, result);

        return result;
      } catch (error) {
        return this.createErrorResult(error instanceof Error ? error.message : '未知错误');
      }
    });
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(html: string): string {
    // 使用 HTML 的哈希值作为缓存键
    // 为了性能，只使用 HTML 的前 1000 个字符和后 1000 个字符
    const prefix = html.substring(0, 1000);
    const suffix = html.length > 2000 ? html.substring(html.length - 1000) : '';
    const sample = prefix + suffix;

    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < sample.length; i++) {
      const char = sample.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32 位整数
    }

    return hash.toString(16);
  }

  /**
   * 判断是否应该使用工作线程
   */
  private shouldUseWorker(html: string): boolean {
    // 如果 HTML 太小，不值得使用工作线程
    if (html.length < 50000) {
      return false;
    }

    // 如果设备性能较低，不使用工作线程
    if (navigator.hardwareConcurrency <= 2) {
      return false;
    }

    return true;
  }

  /**
   * 从 URL 提取域名
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return '';
    }
  }

  /**
   * 创建错误结果对象
   */
  private createErrorResult(errorMessage: string): ExtractedContent {
    return {
      title: document.title || '',
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

  /**
   * 预处理文档
   */
  private preProcessDocument(doc: Document): void {
    const options = this.options.preProcessing;
    if (!options) return;

    // 移除脚本标签
    if (options.removeScripts) {
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(script => script.remove());
    }

    // 移除样式标签
    if (options.removeStyles) {
      const styles = doc.querySelectorAll('style');
      styles.forEach(style => style.remove());
    }

    // 移除隐藏元素
    if (options.removeHidden) {
      const hiddenElements = doc.querySelectorAll('[hidden], [style*="display: none"], [style*="display:none"], [style*="visibility: hidden"], [style*="visibility:hidden"]');
      hiddenElements.forEach(el => {
        // 保留可能包含有用内容的隐藏元素
        const tagName = el.tagName.toLowerCase();
        if (!['div', 'section', 'article', 'main', 'aside'].includes(tagName)) {
          el.remove();
        }
      });
    }

    // 清理 HTML
    if (options.cleanupHtml) {
      this.cleanupHtml(doc);
    }

    // 保留图片
    if (options.preserveImages) {
      const images = doc.querySelectorAll('img');
      images.forEach(img => {
        img.setAttribute('data-original-src', img.src);
        img.setAttribute('data-original-srcset', img.srcset);
        img.setAttribute('data-original-sizes', img.sizes);
        img.setAttribute('data-original-alt', img.alt);
        img.setAttribute('data-preserved', 'true');
      });
    }

    // 保留表格
    if (options.preserveTables) {
      const tables = doc.querySelectorAll('table');
      tables.forEach(table => {
        table.setAttribute('data-preserved', 'true');
      });
    }
  }

  /**
   * 清理 HTML
   */
  private cleanupHtml(doc: Document): void {
    // 移除空的段落
    const emptyParagraphs = doc.querySelectorAll('p:empty');
    emptyParagraphs.forEach(p => p.remove());

    // 移除空的列表项
    const emptyListItems = doc.querySelectorAll('li:empty');
    emptyListItems.forEach(li => li.remove());

    // 修复嵌套错误的列表
    this.fixNestedLists(doc);

    // 修复表格结构
    this.fixTableStructure(doc);

    // 修复标题层级
    this.fixHeadingHierarchy(doc);
  }

  /**
   * 修复嵌套列表
   */
  private fixNestedLists(doc: Document): void {
    const lists = doc.querySelectorAll('ul, ol');
    lists.forEach(list => {
      // 确保列表项直接在列表元素下
      const directChildren = Array.from(list.children);
      directChildren.forEach(child => {
        if (child.tagName !== 'LI') {
          // 如果不是列表项，将其包装在列表项中
          const li = doc.createElement('li');
          child.parentNode?.insertBefore(li, child);
          li.appendChild(child);
        }
      });

      // 修复嵌套列表的位置
      const nestedLists = list.querySelectorAll('ul, ol');
      nestedLists.forEach(nestedList => {
        const parent = nestedList.parentElement;
        if (parent && parent.tagName !== 'LI') {
          // 如果嵌套列表不在列表项中，将其移动到前一个列表项中
          const previousLi = nestedList.previousElementSibling;
          if (previousLi && previousLi.tagName === 'LI') {
            previousLi.appendChild(nestedList);
          } else {
            // 如果没有前一个列表项，创建一个新的
            const li = doc.createElement('li');
            nestedList.parentNode?.insertBefore(li, nestedList);
            li.appendChild(nestedList);
          }
        }
      });
    });
  }

  /**
   * 修复表格结构
   */
  private fixTableStructure(doc: Document): void {
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
      // 确保表格有 tbody
      if (!table.querySelector('tbody')) {
        const rows = table.querySelectorAll('tr');
        if (rows.length > 0) {
          const tbody = doc.createElement('tbody');
          rows.forEach(row => {
            if (row.parentElement === table) {
              tbody.appendChild(row);
            }
          });
          table.appendChild(tbody);
        }
      }

      // 确保表格有标题行
      const firstRow = table.querySelector('tr');
      if (firstRow && !table.querySelector('thead')) {
        const cells = firstRow.querySelectorAll('td');
        if (cells.length > 0) {
          // 将第一行的单元格转换为表头单元格
          cells.forEach(cell => {
            const th = doc.createElement('th');
            th.innerHTML = cell.innerHTML;
            cell.parentNode?.replaceChild(th, cell);
          });

          // 创建 thead 并移动第一行
          const thead = doc.createElement('thead');
          thead.appendChild(firstRow);
          table.insertBefore(thead, table.firstChild);
        }
      }
    });
  }

  /**
   * 修复标题层级
   */
  private fixHeadingHierarchy(doc: Document): void {
    // 获取所有标题元素
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    // 如果没有标题，直接返回
    if (headings.length === 0) return;

    // 找到最小的标题级别
    const minLevel = Math.min(...headings.map(h => parseInt(h.tagName.substring(1))));

    // 如果最小级别不是 1，调整所有标题
    if (minLevel > 1) {
      headings.forEach(heading => {
        const currentLevel = parseInt(heading.tagName.substring(1));
        const newLevel = Math.max(1, currentLevel - minLevel + 1);

        // 创建新标题元素
        const newHeading = doc.createElement(`h${newLevel}`);
        newHeading.innerHTML = heading.innerHTML;

        // 复制属性
        Array.from(heading.attributes).forEach(attr => {
          newHeading.setAttribute(attr.name, attr.value);
        });

        // 替换原标题
        heading.parentNode?.replaceChild(newHeading, heading);
      });
    }
  }

  /**
   * 后处理内容
   */
  private postProcessContent(container: HTMLElement): void {
    const options = this.options.postProcessing;
    if (!options) return;

    // 增强表格
    if (options.enhanceTables) {
      this.enhanceTables(container);
    }

    // 增强图片
    if (options.enhanceImages) {
      this.enhanceImages(container);
    }

    // 增强代码块
    if (options.enhanceCodeBlocks) {
      this.enhanceCodeBlocks(container);
    }

    // 增强列表
    if (options.enhanceLists) {
      this.enhanceLists(container);
    }

    // 修复链接
    if (options.fixLinks) {
      this.fixLinks(container);
    }

    // 修复标题
    if (options.fixHeadings) {
      this.fixHeadings(container);
    }
  }

  /**
   * 增强表格
   */
  private enhanceTables(container: HTMLElement): void {
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
      // 添加响应式表格包装器
      const wrapper = document.createElement('div');
      wrapper.className = 'table-responsive';
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);

      // 添加表格样式类
      table.classList.add('enhanced-table');

      // 为表格行添加斑马条纹
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((row, index) => {
        if (index % 2 === 0) {
          row.classList.add('even-row');
        } else {
          row.classList.add('odd-row');
        }
      });

      // 处理表头
      const headerRow = table.querySelector('thead tr');
      if (headerRow) {
        headerRow.classList.add('header-row');
      }
    });
  }

  /**
   * 增强图片
   */
  private enhanceImages(container: HTMLElement): void {
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      // 恢复保存的原始属性
      if (img.hasAttribute('data-original-src')) {
        img.src = img.getAttribute('data-original-src') || '';
      }
      if (img.hasAttribute('data-original-srcset')) {
        img.srcset = img.getAttribute('data-original-srcset') || '';
      }
      if (img.hasAttribute('data-original-sizes')) {
        img.sizes = img.getAttribute('data-original-sizes') || '';
      }
      if (img.hasAttribute('data-original-alt')) {
        img.alt = img.getAttribute('data-original-alt') || '';
      }

      // 添加懒加载支持
      img.setAttribute('loading', 'lazy');

      // 添加图片容器
      if (img.parentElement?.tagName !== 'FIGURE') {
        const figure = document.createElement('figure');
        figure.className = 'image-container';
        img.parentNode?.insertBefore(figure, img);
        figure.appendChild(img);

        // 如果图片有 alt 文本，添加为图片说明
        if (img.alt && img.alt.trim() !== '') {
          const figcaption = document.createElement('figcaption');
          figcaption.textContent = img.alt;
          figure.appendChild(figcaption);
        }
      }
    });
  }

  /**
   * 增强代码块
   */
  private enhanceCodeBlocks(container: HTMLElement): void {
    // 查找所有预格式化文本块
    const preElements = container.querySelectorAll('pre');
    preElements.forEach(pre => {
      // 添加行号类
      pre.classList.add('line-numbers');

      // 确保有 code 元素
      let code = pre.querySelector('code');
      if (!code) {
        code = document.createElement('code');
        code.textContent = pre.textContent;
        pre.textContent = '';
        pre.appendChild(code);
      }

      // 尝试检测语言
      const hasLanguageClass = Array.from(code.classList).some(cls => cls.startsWith('language-'));
      if (!hasLanguageClass) {
        // 尝试从各种属性和类名中检测语言
        const preLanguage = pre.getAttribute('data-lang') ||
          pre.getAttribute('data-language') ||
          pre.className.match(/language-(\w+)/)?.[1] ||
          this.detectCodeLanguage(code.textContent || '');

        code.classList.add(`language-${preLanguage || 'plaintext'}`);
      }
    });

    // 处理内联代码
    const inlineCodeElements = container.querySelectorAll('code:not(pre code)');
    inlineCodeElements.forEach(code => {
      code.classList.add('inline-code');
    });
  }

  /**
   * 尝试检测代码语言
   */
  private detectCodeLanguage(code: string): string {
    // 简单的语言检测逻辑
    if (code.includes('function') && (code.includes('{') || code.includes('=>'))) {
      return 'javascript';
    }
    if (code.includes('def ') && code.includes(':')) {
      return 'python';
    }
    if (code.includes('class ') && code.includes('{') && code.includes('public')) {
      return 'java';
    }
    if (code.includes('<html') || code.includes('<!DOCTYPE')) {
      return 'html';
    }
    if (code.includes('import ') && code.includes('from ')) {
      return 'python';
    }
    if (code.includes('package ') && code.includes('func ')) {
      return 'go';
    }
    if (code.includes('#include') && (code.includes('<iostream>') || code.includes('<stdio.h>'))) {
      return 'cpp';
    }

    return 'plaintext';
  }

  /**
   * 增强列表
   */
  private enhanceLists(container: HTMLElement): void {
    // 处理所有列表
    const lists = container.querySelectorAll('ul, ol');
    lists.forEach(list => {
      // 添加增强类
      list.classList.add('enhanced-list');

      // 处理列表项
      const items = list.querySelectorAll('li');
      items.forEach(item => {
        // 移除可能影响样式的属性
        item.removeAttribute('style');

        // 处理嵌套列表
        const nestedLists = item.querySelectorAll('ul, ol');
        nestedLists.forEach(nestedList => {
          // 确保嵌套列表在 li 的直接子级
          if (nestedList.parentElement !== item) {
            item.appendChild(nestedList);
          }

          // 添加嵌套列表类
          nestedList.classList.add('nested-list');
        });

        // 处理列表项内容的格式
        const textContent = item.textContent?.trim();
        if (textContent) {
          // 移除多余的空白字符
          item.innerHTML = item.innerHTML.replace(/\s+/g, ' ').trim();
        }
      });
    });
  }

  /**
   * 修复链接
   */
  private fixLinks(container: HTMLElement): void {
    const links = container.querySelectorAll('a');
    links.forEach(link => {
      // 确保链接有 href 属性
      if (!link.hasAttribute('href') || link.getAttribute('href') === '#') {
        return;
      }

      // 获取 href 值
      const href = link.getAttribute('href') || '';

      // 如果是相对链接，尝试转换为绝对链接
      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('#')) {
        try {
          const absoluteUrl = new URL(href, window.location.href).href;
          link.setAttribute('href', absoluteUrl);
        } catch (e) {
          // 忽略无效 URL
        }
      }

      // 为外部链接添加属性
      if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.classList.add('external-link');
      }
    });
  }

  /**
   * 修复标题
   */
  private fixHeadings(container: HTMLElement): void {
    // 获取所有标题元素
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    // 如果没有标题，直接返回
    if (headings.length === 0) return;

    // 为每个标题添加 ID，用于目录导航
    headings.forEach((heading, index) => {
      // 如果标题没有 ID，生成一个
      if (!heading.id) {
        const headingText = heading.textContent || `heading-${index}`;
        const headingId = this.generateHeadingId(headingText, index);
        heading.id = headingId;
      }

      // 添加锚点链接
      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = `#${heading.id}`;
      anchor.innerHTML = '<span class="anchor-icon">#</span>';
      anchor.title = '点击复制链接';

      // 添加点击事件（将在实际使用时通过 DOM 事件处理）
      anchor.setAttribute('data-clipboard-action', 'copy');
      anchor.setAttribute('data-clipboard-text', window.location.href.split('#')[0] + '#' + heading.id);

      heading.appendChild(anchor);
    });
  }

  /**
   * 生成标题 ID
   */
  private generateHeadingId(text: string, index: number): string {
    // 移除特殊字符，转换为小写，用连字符替换空格
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // 如果 ID 为空，使用索引
    return id || `heading-${index}`;
  }
}

// 导出默认实例
export const contentExtractor = new ContentExtractor();
