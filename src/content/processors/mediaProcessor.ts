function handleMediaElements(container: HTMLElement | null, showImages: boolean) {
  if (!container) return;

  // 首先处理所有图片容器
  const imageContainers = container.querySelectorAll('.enhanced-image-container, .background-image-container, figure');
  imageContainers.forEach(container => {
    const containerElement = container as HTMLElement;
    containerElement.style.display = showImages ? 'block' : 'none';
  });

  // 处理所有图片标题
  const imageCaptions = container.querySelectorAll('.image-caption, figcaption');
  imageCaptions.forEach(caption => {
    const captionElement = caption as HTMLElement;
    captionElement.style.display = showImages ? 'block' : 'none';
  });

  const mediaSelectors = [
    'img', 'svg', 'video', 'audio', 'iframe',
    'canvas', 'object', 'embed', 'picture', 'source'
  ];
  mediaSelectors.forEach(selector => {
    const elements = container.getElementsByTagName(selector);
    for (const element of elements) {
      const htmlElement = element as HTMLElement;
      htmlElement.style.display = showImages ? 'block' : 'none';

      if (showImages && element instanceof HTMLImageElement) {
        // 处理懒加载图片
        const lazyAttributes = [
          'data-src', 'data-srcset', 'data-original', 'data-lazy-src',
          'data-lazy', 'data-src-lazy', 'data-original-src', 'data-load-src',
          'data-img-src', 'data-origin', 'data-lazyload', 'data-srcset-lazy',
          'data-lazy-srcset', 'data-lazy-original'
        ];

        // 如果图片没有 src，尝试从懒加载属性中获取
        if (!element.src || element.src.trim() === '' || element.src.includes('data:image/gif;base64')) {
          for (const attr of lazyAttributes) {
            const value = element.getAttribute(attr);
            if (value) {
              element.src = value;
              break;
            }
          }
        }

        // 确保图片可见
        element.removeAttribute('loading');
        element.removeAttribute('decoding');
        element.removeAttribute('importance');
        element.removeAttribute('loading-strategy');
        element.removeAttribute('fetchpriority');
        htmlElement.style.visibility = 'visible';
        htmlElement.style.opacity = '1';

        // 如果图片在增强容器中，确保容器可见
        const container = element.closest('.enhanced-image-container');
        if (container) {
          (container as HTMLElement).style.display = 'block';
        }

        // 如果图片有 srcset，确保它被正确加载
        if (element.srcset === '' && element.getAttribute('data-srcset')) {
          element.srcset = element.getAttribute('data-srcset')!;
        }

        // 触发图片加载
        if (element.complete) {
          const event = new Event('load');
          element.dispatchEvent(event);
        }
      }
    }
  });

  // 处理背景图片
  const elementsWithBgImage = container.querySelectorAll('[style*="background-image"]');
  elementsWithBgImage.forEach(element => {
    if (!showImages) {
      (element as HTMLElement).style.backgroundImage = 'none';
    } else {
      // 检查是否有懒加载的背景图片
      const lazyAttributes = [
        'data-background', 'data-bg', 'data-background-image',
        'data-lazy-background', 'data-background-src'
      ];

      for (const attr of lazyAttributes) {
        const value = element.getAttribute(attr);
        if (value && element instanceof HTMLElement) {
          element.style.backgroundImage = `url(${value})`;
          break;
        }
      }
    }
  });

  // 处理图片占位符
  const placeholders = container.querySelectorAll('.image-placeholder');
  placeholders.forEach(placeholder => {
    const placeholderElement = placeholder as HTMLElement;
    placeholderElement.style.display = showImages ? 'flex' : 'none';
  });
}

export { handleMediaElements }; 