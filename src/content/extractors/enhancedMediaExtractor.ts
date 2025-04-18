/**
 * 增强型媒体提取器
 * 基于原有的媒体提取器，增强图片处理能力，特别是懒加载图片的检测和处理
 */

import { MediaExtractor, MediaInfo } from './mediaExtractor';
import { sanitizeHtml } from '../../utils/sanitizer';

export class EnhancedMediaExtractor extends MediaExtractor {
  // 扩展的懒加载属性列表
  private readonly EXTENDED_LAZY_ATTRIBUTES = [
    // 基础懒加载属性
    'data-src', 'data-srcset', 'data-original', 'data-lazy-src',
    'data-lazy', 'data-lazy-src', 'data-src-lazy',
    'data-original-src', 'data-load-src', 'data-img-src',
    'data-origin', 'data-lazyload', 'data-srcset-lazy',
    'data-lazy-srcset', 'data-lazy-original',

    // 扩展懒加载属性
    'data-echo', 'data-lazy-img', 'data-url', 'data-original-image',
    'data-src-retina', 'data-lazy-original', 'data-lazy-load',
    'data-src-mobile', 'data-src-desktop', 'data-src-tablet',
    'data-thumb', 'data-bg-src', 'data-full-src', 'data-image-src',
    'data-link', 'data-image', 'data-original-file', 'data-large-file',
    'data-medium-file', 'data-source-url', 'data-high-res-src',
    'data-low-res-src', 'data-normal-src', 'data-full-image',
    'data-zoom-image', 'data-large-image', 'data-main-image',
    'data-super-size-src', 'data-super-size', 'data-hd-src',
    'data-retina-src', 'data-raw-src', 'data-actualsrc',
    'data-original-image-src', 'data-original-image-url',
    'data-fullsize-src', 'data-fullsize-url', 'data-big',
    'data-big-src', 'data-big-url', 'data-src-large',
    'data-full', 'data-full-url', 'data-hires',
    'data-hires-src', 'data-hires-url', 'data-2x',
    'data-2x-src', 'data-2x-url', 'data-desktop',
    'data-desktop-src', 'data-desktop-url',

    // 背景图片属性
    'data-background', 'data-bg', 'data-background-image', 'data-background-src',
    
    // 新增的懒加载属性
    'loading-src', 'data-lazy-srcset', 'original',
    'data-ll-status', 'data-was-processed', 'data-lazy-loaded',
    'data-sizes', 'data-srcset-base', 'data-srcset-ext',
    'data-opt-src', 'data-opt-srcset', 'data-wood-src',
    'data-wms-src', 'data-splide-lazy', 'data-flickity-lazyload',
    'data-flickity-lazyload-src', 'data-flickity-lazyload-srcset',
    'data-ls-src', 'data-ls-srcset', 'data-ls-sizes',
    'data-jp-lazy', 'data-jp-lazy-src', 'data-jp-lazy-srcset',
    'data-lazy-original-src', 'data-lazy-original-srcset',
    'data-iesrc', 'data-alt', 'data-src-mobile-width',
    'data-src-desktop-width', 'data-src-tablet-width'
  ];

  // 扩展的背景图片属性
  private readonly EXTENDED_BG_ATTRIBUTES = [
    'data-background', 'data-bg', 'data-background-image', 'data-background-src',
    'data-parallax-image', 'data-bg-img', 'data-bg-image',
    'data-bg-url', 'data-bg-src-2x', 'data-bg-src-mobile',
    'data-bg-src-desktop', 'data-bg-src-tablet', 'data-bg-srcset',
    'data-bgset', 'data-background-desktop', 'data-background-mobile',
    'data-background-tablet', 'data-background-pattern', 'data-background-overlay',
    'data-bg-webp', 'data-bg-responsive', 'data-bg-multi',
    'data-bg-multi-screen', 'data-bg-featured', 'data-bg-header',
    'data-bg-footer', 'data-bg-section'
  ];

  /**
   * 获取图片的真实 URL（处理懒加载）
   * 重写父类方法，增强懒加载检测能力
   */
  protected getRealImageSrc(img: HTMLImageElement): string {
    // 检查常见的懒加载属性
    for (const attr of this.EXTENDED_LAZY_ATTRIBUTES) {
      const value = img.getAttribute(attr);
      if (value && this.isValidImageUrl(value)) {
        return value;
      }
    }

    // 检查 srcset 属性
    const srcset = img.getAttribute('srcset');
    if (srcset) {
      const firstSrc = srcset.split(',')[0].trim().split(' ')[0];
      if (firstSrc && this.isValidImageUrl(firstSrc)) {
        return firstSrc;
      }
    }

    // 检查父元素的懒加载属性
    if (img.parentElement) {
      for (const attr of this.EXTENDED_LAZY_ATTRIBUTES) {
        const value = img.parentElement.getAttribute(attr);
        if (value && this.isValidImageUrl(value)) {
          return value;
        }
      }

      // 检查父元素的 background-image
      if (img.parentElement.style.backgroundImage) {
        const match = img.parentElement.style.backgroundImage.match(/url\(['"](.*?)['"]\)/);
        if (match && match[1] && this.isValidImageUrl(match[1])) {
          return match[1];
        }
      }

      // 检查父元素的背景图片属性
      for (const attr of this.EXTENDED_BG_ATTRIBUTES) {
        const value = img.parentElement.getAttribute(attr);
        if (value && this.isValidImageUrl(value)) {
          return value;
        }
      }
    }

    // 检查 noscript 标签中的图片
    this.checkNoscriptImages(img);

    // 如果没有找到懒加载属性，返回原始 src
    return img.src;
  }

  /**
   * 检查 noscript 标签中的图片
   */
  private checkNoscriptImages(img: HTMLImageElement): string | null {
    // 检查相邻的 noscript 标签
    const siblings = [
      img.previousElementSibling,
      img.nextElementSibling,
      img.parentElement?.previousElementSibling,
      img.parentElement?.nextElementSibling
    ];

    for (const sibling of siblings) {
      if (sibling && sibling.tagName === 'NOSCRIPT') {
        const noscriptContent = sibling.textContent || sibling.innerHTML;
        
        // 净化 noscript 内容，防止 XSS
        const sanitizedContent = sanitizeHtml(noscriptContent);
        
        // 创建临时元素解析 noscript 内容
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizedContent;
        
        // 查找 noscript 中的图片
        const noscriptImg = tempDiv.querySelector('img');
        if (noscriptImg && noscriptImg instanceof HTMLImageElement && noscriptImg.src) {
          if (this.isValidImageUrl(noscriptImg.src)) {
            return noscriptImg.src;
          }
        }
        
        // 查找 noscript 中的 src 属性
        const imgMatch = sanitizedContent.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/i);
        if (imgMatch && imgMatch[1] && this.isValidImageUrl(imgMatch[1])) {
          return imgMatch[1];
        }
      }
    }

    return null;
  }

  /**
   * 检查 URL 是否是有效的图片 URL
   */
  private isValidImageUrl(url: string): boolean {
    // 跳过 data: URLs，除非是小图片
    if (url.startsWith('data:') && url.length > 1000) {
      return false;
    }

    // 检查是否是图片扩展名
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|avif|heic|heif|tiff|bmp)($|\?)/i;
    if (imageExtensions.test(url)) {
      return true;
    }

    // 检查是否包含图片相关路径
    const imagePathIndicators = /(images|img|photos|pictures|assets\/img|media\/img|uploads|gallery)/i;
    if (imagePathIndicators.test(url)) {
      return true;
    }

    // 检查是否是完整的 URL
    try {
      new URL(url);
      return true;
    } catch (e) {
      // 如果不是完整的 URL，检查是否是相对路径
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
  }

  /**
   * 处理懒加载属性的图片
   * 重写父类方法，增强懒加载图片处理
   */
  public processLazyLoadImages(container: HTMLElement): void {
    // 构建选择器
    const selector = this.EXTENDED_LAZY_ATTRIBUTES.map(attr => `[${attr}]`).join(', ');

    // 查找元素
    const lazyElements = container.querySelectorAll(selector);
    console.log(`找到 ${lazyElements.length} 个懒加载元素`);

    lazyElements.forEach((element, index) => {
      try {
        // 如果是图片元素
        if (element instanceof HTMLImageElement) {
          // 如果已经处理过，跳过
          if (element.closest('.enhanced-image-container')) return;

          // 提取真实 URL
          const realSrc = this.getRealImageSrc(element);
          if (!realSrc || !this.isValidImageUrl(realSrc)) {
            console.log(`跳过无效图片 URL: ${realSrc}`);
            return;
          }

          // 创建图片信息
          let caption = this.getImageCaption(element);
          // 跳过"图片"等通用词
          if (caption && ['图片', 'image', 'picture', 'photo'].includes(caption.trim())) {
            caption = undefined;
          }

          const imageInfo: MediaInfo = {
            src: realSrc,
            type: 'image',
            alt: element.alt || undefined,
            title: element.title || undefined,
            width: element.naturalWidth || undefined,
            height: element.naturalHeight || undefined,
            caption: caption,
            lazyLoaded: true
          };

          // 创建增强的图片元素
          const enhancedImage = this.createEnhancedImage(imageInfo);

          // 替换原始元素
          if (element.parentElement?.tagName === 'FIGURE') {
            element.parentElement.replaceWith(enhancedImage);
          } else {
            element.replaceWith(enhancedImage);
          }

          console.log(`处理懒加载图片 ${index + 1}: ${realSrc.substring(0, 50)}...`);
        }
        // 如果是其他元素，可能是包含背景图片的元素
        else if (element instanceof HTMLElement) {
          this.processBackgroundElement(element, index);
        }
      } catch (error) {
        console.warn(`处理懒加载元素 ${index + 1} 时出错:`, error);
      }
    });

    // 处理 noscript 标签
    this.processNoscriptTags(container);
  }

  /**
   * 处理包含背景图片的元素
   */
  private processBackgroundElement(element: HTMLElement, index: number): void {
    // 检查是否有背景图片
    for (const attr of this.EXTENDED_BG_ATTRIBUTES) {
      const value = element.getAttribute(attr);
      if (value && this.isValidImageUrl(value)) {
        // 创建图片元素
        const img = document.createElement('img');
        img.alt = element.getAttribute('aria-label') || element.title || '';
        img.className = 'extracted-background-image';

        // 设置懒加载
        this.setupLazyLoading(img, value);

        // 创建容器
        const figure = document.createElement('figure');
        figure.className = 'enhanced-image-container background-image-container';
        figure.appendChild(img);

        // 在元素后插入图片
        element.parentNode?.insertBefore(figure, element.nextSibling);
        console.log(`处理背景图片 ${index + 1}: ${value.substring(0, 50)}...`);
        break;
      }
    }

    // 检查计算样式中的背景图片
    const style = window.getComputedStyle(element);
    if (style.backgroundImage && style.backgroundImage !== 'none') {
      const match = style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match && match[1] && this.isValidImageUrl(match[1])) {
        // 检查元素大小，跳过小元素
        const rect = element.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 100) return;

        // 创建图片元素
        const img = document.createElement('img');
        img.alt = element.getAttribute('aria-label') || element.title || '';
        img.className = 'extracted-background-image';

        // 设置懒加载
        this.setupLazyLoading(img, match[1]);

        // 创建容器
        const figure = document.createElement('figure');
        figure.className = 'enhanced-image-container background-image-container';
        figure.appendChild(img);

        // 在元素后插入图片
        element.parentNode?.insertBefore(figure, element.nextSibling);
        console.log(`处理计算样式背景图片 ${index + 1}: ${match[1].substring(0, 50)}...`);
      }
    }
  }

  /**
   * 处理 noscript 标签
   */
  private processNoscriptTags(container: HTMLElement): void {
    const noscriptTags = container.querySelectorAll('noscript');
    console.log(`找到 ${noscriptTags.length} 个 noscript 标签`);

    noscriptTags.forEach((noscript, index) => {
      try {
        const content = noscript.textContent || noscript.innerHTML;
        if (!content || !content.includes('<img')) return;

        // 净化 noscript 内容，防止 XSS
        const sanitizedContent = sanitizeHtml(content);
        
        // 创建临时元素解析 noscript 内容
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizedContent;
        
        // 查找 noscript 中的图片
        const noscriptImg = tempDiv.querySelector('img');
        if (noscriptImg && noscriptImg instanceof HTMLImageElement && noscriptImg.src) {
          // 检查是否是有效的图片 URL
          if (!this.isValidImageUrl(noscriptImg.src)) return;

          // 创建图片信息
          const imageInfo: MediaInfo = {
            src: noscriptImg.src,
            type: 'image',
            alt: noscriptImg.alt || undefined,
            title: noscriptImg.title || undefined,
            width: noscriptImg.width || undefined,
            height: noscriptImg.height || undefined,
            caption: undefined,
            lazyLoaded: true
          };

          // 创建增强的图片元素
          const enhancedImage = this.createEnhancedImage(imageInfo);

          // 替换 noscript 标签
          noscript.replaceWith(enhancedImage);
          console.log(`处理 noscript 图片 ${index + 1}: ${noscriptImg.src.substring(0, 50)}...`);
        }
      } catch (error) {
        console.warn(`处理 noscript 标签 ${index + 1} 时出错:`, error);
      }
    });
  }

  /**
   * 增强页面中的所有图片
   * 重写父类方法，增强图片处理
   */
  public enhanceAllImages(container: HTMLElement): void {
    // 添加懒加载样式
    this.addLazyLoadingStyles();

    // 处理常规图片
    const images = container.querySelectorAll('img');
    console.log(`找到 ${images.length} 个常规图片`);

    images.forEach((img, index) => {
      try {
        if (!(img instanceof HTMLImageElement)) return;

        // 跳过已经处理过的图片
        if (img.closest('.enhanced-image-container')) return;

        // 跳过小图标
        if (img.width > 0 && img.height > 0 && (img.width < 50 || img.height < 50)) return;

        // 提取图片信息
        const imageInfo = this.extractImageInfo(img);

        // 检查是否是有效的图片 URL
        if (!this.isValidImageUrl(imageInfo.src)) {
          console.log(`跳过无效图片 URL: ${imageInfo.src}`);
          return;
        }

        // 创建增强的图片元素
        const enhancedImage = this.createEnhancedImage(imageInfo);

        // 替换原始图片
        if (img.parentElement?.tagName === 'FIGURE') {
          // 如果图片已经在 figure 中，替换整个 figure
          img.parentElement.replaceWith(enhancedImage);
        } else {
          // 否则直接替换图片
          img.replaceWith(enhancedImage);
        }

        console.log(`处理常规图片 ${index + 1}: ${imageInfo.src.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`处理常规图片 ${index + 1} 时出错:`, error);
      }
    });

    // 处理懒加载属性的图片
    this.processLazyLoadImages(container);

    // 处理背景图片
    this.processBackgroundImages(container);
  }

  /**
   * 处理背景图片
   * 重写父类方法，增强背景图片处理
   */
  public processBackgroundImages(container: HTMLElement): void {
    // 查找具有背景图片的元素
    const elementsWithBgImage = Array.from(container.querySelectorAll('*')).filter(el => {
      if (!(el instanceof HTMLElement)) return false;
      
      // 跳过已处理的元素
      if (el.classList.contains('enhanced-image-container') || 
          el.classList.contains('image-placeholder') ||
          el.classList.contains('image-loading-spinner')) {
        return false;
      }
      
      // 检查计算样式
      const style = window.getComputedStyle(el);
      if (style.backgroundImage && style.backgroundImage !== 'none') {
        return true;
      }
      
      // 检查背景图片属性
      for (const attr of this.EXTENDED_BG_ATTRIBUTES) {
        if (el.hasAttribute(attr)) {
          return true;
        }
      }
      
      return false;
    });

    console.log(`找到 ${elementsWithBgImage.length} 个背景图片元素`);

    elementsWithBgImage.forEach((el, index) => {
      try {
        if (!(el instanceof HTMLElement)) return;
        
        // 检查元素大小，跳过小元素
        const rect = el.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 100) return;
        
        // 尝试从计算样式中获取背景图片
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        
        // 提取 URL
        let imageUrl = '';
        
        // 从计算样式中提取
        if (bgImage && bgImage !== 'none') {
          const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (match && match[1]) {
            imageUrl = match[1];
          }
        }
        
        // 如果计算样式中没有找到，尝试从属性中提取
        if (!imageUrl) {
          for (const attr of this.EXTENDED_BG_ATTRIBUTES) {
            const value = el.getAttribute(attr);
            if (value) {
              imageUrl = value;
              break;
            }
          }
        }
        
        // 检查是否找到有效的图片 URL
        if (!imageUrl || !this.isValidImageUrl(imageUrl)) return;
        
        // 创建图片元素
        const img = document.createElement('img');
        img.alt = el.getAttribute('aria-label') || el.title || '';
        img.className = 'extracted-background-image';
        
        // 设置懒加载
        this.setupLazyLoading(img, imageUrl);
        
        // 创建容器
        const figure = document.createElement('figure');
        figure.className = 'enhanced-image-container background-image-container';
        figure.appendChild(img);
        
        // 在元素后插入图片
        el.parentNode?.insertBefore(figure, el.nextSibling);
        
        // 移除原始背景图片（可选）
        // el.style.backgroundImage = 'none';
        
        console.log(`处理背景图片元素 ${index + 1}: ${imageUrl.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`处理背景图片元素 ${index + 1} 时出错:`, error);
      }
    });
  }
}

// 导出默认实例
export const enhancedMediaExtractor = new EnhancedMediaExtractor();
