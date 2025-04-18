import DOMPurify from 'dompurify';

// 默认净化配置
const defaultSanitizeConfig = {
  ALLOWED_TAGS: [
    // 基础标签
    'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'hr', 'br',
    // 表格标签
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // 代码标签
    'code', 'pre',
    // 格式化标签
    'b', 'strong', 'i', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
    // 数学公式标签
    'math', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'style',
    'data-lang', 'data-latex', 'xmlns', 'display', 'width', 'height',
    'target', 'rel', 'colspan', 'rowspan'
  ],
  ADD_TAGS: ['math', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac'],
  KEEP_CONTENT: true,
  ALLOW_DATA_ATTR: true
};

/**
 * 净化 HTML 内容，移除潜在的恶意代码
 * @param html HTML 字符串
 * @param config 净化配置（可选）
 * @returns 净化后的 HTML 字符串
 */
export function sanitizeHtml(html: string, config: Partial<DOMPurify.Config> = {}): string {
  // 合并默认配置和用户配置
  const sanitizeConfig = {
    ...defaultSanitizeConfig,
    ...config
  };

  // 净化 HTML
  return DOMPurify.sanitize(html, sanitizeConfig);
}

/**
 * 净化 HTML 元素，移除潜在的恶意代码
 * @param element HTML 元素
 * @param config 净化配置（可选）
 */
export function sanitizeElement(element: HTMLElement, config: Partial<DOMPurify.Config> = {}): void {
  // 合并默认配置和用户配置
  const sanitizeConfig = {
    ...defaultSanitizeConfig,
    ...config
  };

  // 获取元素的 HTML
  const html = element.innerHTML;

  // 净化 HTML
  const sanitizedHtml = DOMPurify.sanitize(html, sanitizeConfig);

  // 更新元素的 HTML
  element.innerHTML = sanitizedHtml;
}

/**
 * 配置 DOMPurify 钩子
 * 可以在这里添加自定义的钩子函数
 */
export function configureDOMPurify(): void {
  // 添加钩子，在净化前修改 HTML
  DOMPurify.addHook('beforeSanitizeElements', (node) => {
    // 例如，处理特殊的懒加载图片
    if (node instanceof HTMLImageElement) {
      const dataSrc = node.getAttribute('data-src');
      if (dataSrc && (!node.src || node.src.includes('data:image'))) {
        node.src = dataSrc;
      }
    }
    return node;
  });

  // 添加钩子，在净化后修改 HTML
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // 例如，为所有链接添加 target="_blank" 和 rel="noopener noreferrer"
    if (node instanceof HTMLAnchorElement && node.href && node.href.startsWith('http')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    return node;
  });
}

// 初始化 DOMPurify 配置
configureDOMPurify();

// 导出 DOMPurify 实例，以便直接使用
export { DOMPurify };
