/**
 * DOM 操作相关工具函数
 */

/**
 * 获取元素的 XPath
 * @param element 目标元素
 * @returns XPath 字符串
 */
export function getXPath(element: Element): string {
  if (!element) return '';
  if (element.nodeType !== Node.ELEMENT_NODE) return '';
  
  const paths: string[] = [];
  let current: Element | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let hasFollowingSiblings = false;
    
    for (let sibling = current.previousSibling; sibling; sibling = sibling.previousSibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
    }
    
    for (let sibling = current.nextSibling; sibling && !hasFollowingSiblings; sibling = sibling.nextSibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        hasFollowingSiblings = true;
      }
    }
    
    const tagName = current.nodeName.toLowerCase();
    const pathIndex = index || hasFollowingSiblings ? `[${index + 1}]` : '';
    paths.unshift(tagName + pathIndex);
    
    current = current.parentElement;
  }
  
  return `/${paths.join('/')}`;
}

/**
 * 通过 XPath 获取元素
 * @param xpath XPath 字符串
 * @param context 上下文节点，默认为 document
 * @returns 找到的元素或 null
 */
export function getElementByXPath(xpath: string, context: Document | Element = document): Element | null {
  try {
    const result = document.evaluate(
      xpath,
      context,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue as Element;
  } catch (error) {
    console.error('XPath 解析错误:', error);
    return null;
  }
}

/**
 * 创建文本范围
 * @param startXPath 开始节点的 XPath
 * @param startOffset 开始偏移量
 * @param endXPath 结束节点的 XPath
 * @param endOffset 结束偏移量
 * @returns 文本范围对象或 null
 */
export function createRangeFromPositions(
  startXPath: string,
  startOffset: number,
  endXPath: string,
  endOffset: number
): Range | null {
  try {
    const startNode = getElementByXPath(startXPath)?.firstChild;
    const endNode = getElementByXPath(endXPath)?.firstChild;
    
    if (!startNode || !endNode) return null;
    
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    
    return range;
  } catch (error) {
    console.error('创建范围错误:', error);
    return null;
  }
}

/**
 * 高亮指定范围的文本
 * @param range 文本范围
 * @param color 高亮颜色
 * @param id 高亮 ID
 * @returns 高亮元素
 */
export function highlightRange(range: Range, color: string, id: string): HTMLElement {
  const highlight = document.createElement('mark');
  highlight.style.backgroundColor = color;
  highlight.style.color = 'inherit';
  highlight.dataset.annotationId = id;
  
  try {
    range.surroundContents(highlight);
    return highlight;
  } catch (error) {
    console.error('高亮范围错误:', error);
    // 尝试部分高亮处理复杂情况
    const fragment = range.extractContents();
    highlight.appendChild(fragment);
    range.insertNode(highlight);
    return highlight;
  }
}

/**
 * 获取元素的文本内容（清理后）
 * @param element 目标元素
 * @returns 清理后的文本内容
 */
export function getCleanTextContent(element: Element): string {
  // 克隆元素避免修改原始 DOM
  const clone = element.cloneNode(true) as Element;
  
  // 移除不需要的元素
  const unwantedSelectors = [
    'script', 'style', 'noscript', 'iframe', 'form', 'button',
    '[role="button"]', '[role="banner"]', '[role="navigation"]',
    '[role="complementary"]', '[role="search"]', 'nav', 'footer',
    'header:not(:only-child)', '[aria-hidden="true"]'
  ];
  
  unwantedSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // 获取文本内容
  let text = clone.textContent || '';
  
  // 清理文本
  text = text
    .replace(/\s+/g, ' ') // 合并空白字符
    .replace(/^\s+|\s+$/g, '') // 移除首尾空白
    .replace(/[\r\n]+/g, '\n') // 规范化换行
    .replace(/\n\s+/g, '\n') // 移除行首空白
    .replace(/\s+\n/g, '\n'); // 移除行尾空白
  
  return text;
}

/**
 * 检测元素是否在视口中
 * @param element 目标元素
 * @returns 是否在视口中
 */
export function isElementInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 滚动到元素位置
 * @param element 目标元素
 * @param offset 偏移量，默认为 0
 */
export function scrollToElement(element: Element, offset = 0): void {
  if (!element) return;
  
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  window.scrollTo({
    top: scrollTop + rect.top - offset,
    behavior: 'smooth'
  });
} 