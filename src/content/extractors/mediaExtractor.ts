/**
 * 媒体提取器
 * 用于增强图片和其他媒体元素的提取和显示
 */

export interface MediaInfo {
  src: string;
  type: 'image' | 'video' | 'audio' | 'iframe' | 'other';
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  caption?: string;
  lazyLoaded: boolean;
}

export class MediaExtractor {
  /**
   * 从图片元素提取信息
   */
  public extractImageInfo(img: HTMLImageElement): MediaInfo {
    // 尝试获取真实的图片 URL（处理懒加载）
    const realSrc = this.getRealImageSrc(img);

    // 尝试获取图片标题
    const caption = this.getImageCaption(img);

    return {
      src: realSrc,
      type: 'image',
      alt: img.alt || undefined,
      title: img.title || undefined,
      width: img.naturalWidth || undefined,
      height: img.naturalHeight || undefined,
      caption: caption,
      lazyLoaded: realSrc !== img.src
    };
  }

  /**
   * 获取图片的真实 URL（处理懒加载）
   */
  private getRealImageSrc(img: HTMLImageElement): string {
    // 检查常见的懒加载属性
    const dataSrc = img.getAttribute('data-src');
    if (dataSrc) return dataSrc;

    const dataSrcset = img.getAttribute('data-srcset');
    if (dataSrcset) {
      const firstSrc = dataSrcset.split(',')[0].trim().split(' ')[0];
      if (firstSrc) return firstSrc;
    }

    const dataOriginal = img.getAttribute('data-original');
    if (dataOriginal) return dataOriginal;

    const dataLazySrc = img.getAttribute('data-lazy-src');
    if (dataLazySrc) return dataLazySrc;

    // 检查其他常见的懒加载属性
    const lazyAttributes = [
      'data-lazy', 'data-lazy-src', 'data-src-lazy',
      'data-original-src', 'data-load-src', 'data-img-src',
      'data-origin', 'data-lazyload', 'data-srcset-lazy',
      'data-lazy-srcset', 'data-lazy-original'
    ];

    for (const attr of lazyAttributes) {
      const value = img.getAttribute(attr);
      if (value) return value;
    }

    // 检查父元素的懒加载属性
    if (img.parentElement) {
      for (const attr of lazyAttributes) {
        const value = img.parentElement.getAttribute(attr);
        if (value) return value;
      }

      // 检查父元素的 background-image
      if (img.parentElement.style.backgroundImage) {
        const match = img.parentElement.style.backgroundImage.match(/url\(['"](.*?)['"]\)/);
        if (match && match[1]) return match[1];
      }
    }

    // 如果没有找到懒加载属性，返回原始 src
    return img.src;
  }

  /**
   * 尝试获取图片标题
   */
  private getImageCaption(img: HTMLImageElement): string | undefined {
    // 检查图片是否在 figure 元素内
    const figure = img.closest('figure');
    if (figure) {
      const figcaption = figure.querySelector('figcaption');
      if (figcaption && figcaption.textContent) {
        return figcaption.textContent.trim();
      }
    }

    // 检查图片下方是否有标题元素
    const nextElement = img.nextElementSibling;
    if (nextElement) {
      // 检查是否是常见的标题元素
      if (
        nextElement.tagName === 'FIGCAPTION' ||
        nextElement.classList.contains('caption') ||
        nextElement.classList.contains('image-caption') ||
        nextElement.classList.contains('img-caption')
      ) {
        return nextElement.textContent?.trim();
      }

      // 检查是否是小字体的段落（可能是标题）
      if (
        nextElement.tagName === 'P' &&
        (
          nextElement.classList.contains('small') ||
          (nextElement instanceof HTMLElement && nextElement.style.fontSize === 'smaller') ||
          (nextElement instanceof HTMLElement && nextElement.style.fontSize === 'small')
        )
      ) {
        return nextElement.textContent?.trim();
      }
    }

    // 如果没有找到标题，使用 alt 文本作为标题
    if (img.alt && img.alt.trim() !== '') {
      return img.alt;
    }

    return undefined;
  }

  /**
   * 创建增强的图片元素
   */
  public createEnhancedImage(imageInfo: MediaInfo): HTMLElement {
    const figure = document.createElement('figure');
    figure.className = 'enhanced-image-container';

    const img = document.createElement('img');
    img.className = 'enhanced-image';

    // 使用 IntersectionObserver 实现更好的懒加载
    this.setupLazyLoading(img, imageInfo.src);

    if (imageInfo.alt) {
      img.alt = imageInfo.alt;
    }

    if (imageInfo.title) {
      img.title = imageInfo.title;
    }

    if (imageInfo.width) {
      img.width = imageInfo.width;
    }

    if (imageInfo.height) {
      img.height = imageInfo.height;
    }

    // 添加占位图片
    this.addPlaceholder(img, imageInfo);

    figure.appendChild(img);

    // 添加图片标题
    if (imageInfo.caption) {
      const figcaption = document.createElement('figcaption');
      figcaption.textContent = imageInfo.caption;
      figcaption.className = 'image-caption';
      figure.appendChild(figcaption);
    }

    // 添加图片控件
    this.addImageControls(figure, imageInfo);

    return figure;
  }

  /**
   * 设置懒加载
   */
  private setupLazyLoading(img: HTMLImageElement, src: string): void {
    // 创建交叉观察器
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 当图片进入视口时加载
            const imgElement = entry.target as HTMLImageElement;
            imgElement.src = src;
            imgElement.classList.add('loaded');

            // 图片加载完成后移除占位图
            imgElement.onload = () => {
              const placeholder = imgElement.parentElement?.querySelector('.image-placeholder');
              if (placeholder) {
                placeholder.remove();
              }
            };

            // 停止观察该图片
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '200px 0px', // 提前 200px 加载
        threshold: 0.01 // 当 1% 的图片可见时开始加载
      }
    );

    // 开始观察图片
    observer.observe(img);
  }

  /**
   * 添加占位图
   */
  private addPlaceholder(img: HTMLImageElement, imageInfo: MediaInfo): void {
    // 创建占位图
    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';

    // 设置占位图尺寸
    if (imageInfo.width && imageInfo.height) {
      const ratio = (imageInfo.height / imageInfo.width) * 100;
      placeholder.style.paddingBottom = `${ratio}%`;
    } else {
      placeholder.style.paddingBottom = '56.25%'; // 16:9 的默认比例
    }

    // 添加加载动画
    const spinner = document.createElement('div');
    spinner.className = 'image-loading-spinner';
    placeholder.appendChild(spinner);

    // 将占位图添加到图片前面
    img.parentElement?.insertBefore(placeholder, img);
  }

  /**
   * 添加图片控件
   * 注意：放大和下载功能已移除
   */
  private addImageControls(_figure: HTMLElement, _imageInfo: MediaInfo): void {
    // 放大和下载功能已移除
    // 不添加任何控件
    return;
  }

  /**
   * 增强页面中的所有图片
   */
  public enhanceAllImages(container: HTMLElement): void {
    // 添加懒加载样式
    this.addLazyLoadingStyles();

    const images = container.querySelectorAll('img');
    images.forEach(img => {
      if (!(img instanceof HTMLImageElement)) return;

      // 跳过已经处理过的图片
      if (img.closest('.enhanced-image-container')) return;

      // 跳过小图标
      if (img.width < 50 || img.height < 50) return;

      // 提取图片信息
      const imageInfo = this.extractImageInfo(img);

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
    });

    // 处理懒加载属性的图片
    this.processLazyLoadImages(container);
  }

  /**
   * 添加懒加载样式
   */
  private addLazyLoadingStyles(): void {
    // 检查是否已经添加了样式
    if (document.getElementById('lazy-loading-styles')) return;

    const style = document.createElement('style');
    style.id = 'lazy-loading-styles';
    style.textContent = `
      .enhanced-image-container {
        position: relative;
        overflow: hidden;
        margin: 1em 0;
        border-radius: 4px;
        background-color: #f5f5f5;
      }

      .dark .enhanced-image-container {
        background-color: #333;
      }

      .enhanced-image {
        display: block;
        width: 100%;
        height: auto;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .enhanced-image.loaded {
        opacity: 1;
      }

      .image-placeholder {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        background-color: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .dark .image-placeholder {
        background-color: #444;
      }

      .image-loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top-color: #3498db;
        animation: spin 1s ease-in-out infinite;
      }

      .dark .image-loading-spinner {
        border-color: rgba(255, 255, 255, 0.1);
        border-top-color: #3498db;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 处理具有懒加载属性的图片
   */
  private processLazyLoadImages(container: HTMLElement): void {
    // 查找所有具有懒加载属性的元素
    const lazyAttributes = [
      'data-src', 'data-srcset', 'data-original', 'data-lazy-src',
      'data-lazy', 'data-lazy-src', 'data-src-lazy',
      'data-original-src', 'data-load-src', 'data-img-src',
      'data-origin', 'data-lazyload', 'data-srcset-lazy',
      'data-lazy-srcset', 'data-lazy-original'
    ];

    // 构建选择器
    const selector = lazyAttributes.map(attr => `[${attr}]`).join(', ');

    // 查找元素
    const lazyElements = container.querySelectorAll(selector);

    lazyElements.forEach(element => {
      // 如果是图片元素
      if (element instanceof HTMLImageElement) {
        // 如果已经处理过，跳过
        if (element.closest('.enhanced-image-container')) return;

        // 提取真实 URL
        const realSrc = this.getRealImageSrc(element);

        // 创建图片信息
        const imageInfo: MediaInfo = {
          src: realSrc,
          type: 'image',
          alt: element.alt || undefined,
          title: element.title || undefined,
          width: element.naturalWidth || undefined,
          height: element.naturalHeight || undefined,
          caption: this.getImageCaption(element),
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
      }
      // 如果是其他元素，可能是包含背景图片的元素
      else if (element instanceof HTMLElement) {
        // 检查是否有背景图片
        for (const attr of lazyAttributes) {
          const value = element.getAttribute(attr);
          if (value && value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            // 创建图片元素
            const img = document.createElement('img');
            img.alt = '';
            img.className = 'extracted-background-image';

            // 设置懒加载
            this.setupLazyLoading(img, value);

            // 创建容器
            const figure = document.createElement('figure');
            figure.className = 'enhanced-image-container background-image-container';
            figure.appendChild(img);

            // 在元素后插入图片
            element.parentNode?.insertBefore(figure, element.nextSibling);
            break;
          }
        }
      }
    });
  }

  /**
   * 处理背景图片
   */
  public processBackgroundImages(container: HTMLElement): void {
    // 查找具有背景图片的元素
    const elementsWithBgImage = Array.from(container.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.backgroundImage && style.backgroundImage !== 'none';
    });

    elementsWithBgImage.forEach(el => {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;

      // 提取 URL
      const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (!match) return;

      const imageUrl = match[1];

      // 检查元素大小，跳过小元素
      const rect = el.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 100) return;

      // 创建图片元素
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = '';
      img.className = 'extracted-background-image';
      img.loading = 'lazy';

      // 创建容器
      const figure = document.createElement('figure');
      figure.className = 'enhanced-image-container background-image-container';
      figure.appendChild(img);

      // 在元素后插入图片
      el.parentNode?.insertBefore(figure, el.nextSibling);

      // 移除原始背景图片
      (el as HTMLElement).style.backgroundImage = 'none';
    });
  }

  /**
   * 处理视频元素
   */
  public enhanceVideos(container: HTMLElement): void {
    const videos = container.querySelectorAll('video');
    videos.forEach(video => {
      // 添加增强类
      video.classList.add('enhanced-video');

      // 添加控件
      video.controls = true;

      // 设置预加载策略
      video.preload = 'metadata';

      // 添加海报图（如果没有）
      if (!video.poster) {
        // 尝试从第一个源获取缩略图
        const source = video.querySelector('source');
        if (source && source.src) {
          // 这里可以添加生成缩略图的逻辑
          // 或者使用默认海报图
          video.poster = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48cG9seWdvbiBwb2ludHM9IjEwIDggMTYgMTIgMTAgMTYgMTAgOCI+PC9wb2x5Z29uPjwvc3ZnPg==';
        }
      }

      // 如果视频不在 figure 中，添加 figure 容器
      if (video.parentElement?.tagName !== 'FIGURE') {
        const figure = document.createElement('figure');
        figure.className = 'enhanced-video-container';
        video.parentNode?.insertBefore(figure, video);
        figure.appendChild(video);

        // 添加标题（如果有）
        if (video.title) {
          const figcaption = document.createElement('figcaption');
          figcaption.textContent = video.title;
          figcaption.className = 'video-caption';
          figure.appendChild(figcaption);
        }
      }
    });
  }

  /**
   * 处理 iframe 元素（嵌入视频等）
   */
  public enhanceIframes(container: HTMLElement): void {
    const iframes = container.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      // 检查是否是视频嵌入
      const isVideo = this.isVideoEmbed(iframe);

      // 添加响应式容器
      const wrapper = document.createElement('div');
      wrapper.className = isVideo ? 'enhanced-video-embed' : 'enhanced-iframe-container';
      iframe.parentNode?.insertBefore(wrapper, iframe);
      wrapper.appendChild(iframe);

      // 添加加载指示器
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'iframe-loading-indicator';
      loadingIndicator.innerHTML = '<div class="loading-spinner"></div>';
      wrapper.appendChild(loadingIndicator);

      // 设置 iframe 加载事件
      iframe.addEventListener('load', () => {
        loadingIndicator.style.display = 'none';
      });

      // 设置懒加载
      iframe.loading = 'lazy';
    });
  }

  /**
   * 检查 iframe 是否是视频嵌入
   */
  private isVideoEmbed(iframe: HTMLIFrameElement): boolean {
    const src = iframe.src.toLowerCase();
    return (
      src.includes('youtube.com') ||
      src.includes('youtu.be') ||
      src.includes('vimeo.com') ||
      src.includes('dailymotion.com') ||
      src.includes('bilibili.com') ||
      src.includes('player.twitch.tv')
    );
  }

  // 放大和下载功能已移除
}

// 导出默认实例
export const mediaExtractor = new MediaExtractor();
