/**
 * 内容提取工作线程
 * 用于在后台线程中处理耗时的内容提取操作
 */

// 工作线程消息类型
export interface WorkerMessage {
  id: string;
  action: string;
  payload: any;
}

// 工作线程响应类型
export interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

// 导入 Readability
import { Readability } from '@mozilla/readability';

// 处理消息
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, action, payload } = event.data;
  
  try {
    let result;
    
    // 根据不同的操作类型执行不同的处理
    switch (action) {
      case 'extractContent':
        result = await extractContent(payload.html, payload.url);
        break;
      case 'processTable':
        result = processTable(payload.tableHtml);
        break;
      case 'processCodeBlock':
        result = processCodeBlock(payload.codeHtml, payload.language);
        break;
      case 'processList':
        result = processList(payload.listHtml);
        break;
      default:
        throw new Error(`未知操作: ${action}`);
    }
    
    // 发送成功响应
    const response: WorkerResponse = {
      id,
      success: true,
      data: result
    };
    
    self.postMessage(response);
  } catch (error) {
    // 发送错误响应
    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
    
    self.postMessage(response);
  }
};

/**
 * 提取内容
 */
async function extractContent(html: string, url?: string): Promise<any> {
  // 创建文档
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 预处理文档
  preProcessDocument(doc);
  
  // 使用 Readability 提取内容
  const reader = new Readability(doc);
  const article = reader.parse();
  
  if (!article) {
    throw new Error('无法提取内容');
  }
  
  // 后处理内容
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = article.content;
  postProcessContent(tempDiv);
  
  return {
    title: article.title,
    content: tempDiv.innerHTML,
    textContent: article.textContent,
    length: article.length,
    excerpt: article.excerpt,
    byline: article.byline,
    dir: article.dir,
    siteName: article.siteName,
    lang: article.lang,
    publishedTime: article.publishedTime
  };
}

/**
 * 预处理文档
 */
function preProcessDocument(doc: Document): void {
  // 移除脚本标签
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // 移除样式标签
  const styles = doc.querySelectorAll('style');
  styles.forEach(style => style.remove());
  
  // 移除隐藏元素
  const hiddenElements = doc.querySelectorAll('[hidden], [style*="display: none"], [style*="display:none"], [style*="visibility: hidden"], [style*="visibility:hidden"]');
  hiddenElements.forEach(el => {
    // 保留可能包含有用内容的隐藏元素
    const tagName = el.tagName.toLowerCase();
    if (!['div', 'section', 'article', 'main', 'aside'].includes(tagName)) {
      el.remove();
    }
  });
  
  // 修复嵌套错误的列表
  fixNestedLists(doc);
  
  // 修复表格结构
  fixTableStructure(doc);
}

/**
 * 修复嵌套列表
 */
function fixNestedLists(doc: Document): void {
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
function fixTableStructure(doc: Document): void {
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
 * 后处理内容
 */
function postProcessContent(container: HTMLElement): void {
  // 处理表格
  const tables = container.querySelectorAll('table');
  tables.forEach(table => {
    table.classList.add('enhanced-table');
    
    // 为表格行添加斑马条纹
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
      row.classList.add(index % 2 === 0 ? 'even-row' : 'odd-row');
    });
  });
  
  // 处理代码块
  const preElements = container.querySelectorAll('pre');
  preElements.forEach(pre => {
    pre.classList.add('line-numbers');
    
    let code = pre.querySelector('code');
    if (!code) {
      code = document.createElement('code');
      code.textContent = pre.textContent;
      pre.textContent = '';
      pre.appendChild(code);
    }
    
    // 确保代码块有语言类名
    const hasLanguageClass = Array.from(code.classList).some(cls => cls.startsWith('language-'));
    if (!hasLanguageClass) {
      const preLanguage = pre.getAttribute('data-lang') ||
        pre.getAttribute('data-language') ||
        pre.className.match(/language-(\\w+)/)?.[1] ||
        detectCodeLanguage(code.textContent || '');
      
      code.classList.add(`language-${preLanguage || 'plaintext'}`);
    }
  });
  
  // 处理列表
  const lists = container.querySelectorAll('ul, ol');
  lists.forEach(list => {
    list.classList.add('enhanced-list');
    
    // 处理列表项
    const items = list.querySelectorAll('li');
    items.forEach(item => {
      // 移除可能影响样式的属性
      item.removeAttribute('style');
    });
  });
  
  // 处理图片
  const images = container.querySelectorAll('img');
  images.forEach(img => {
    // 添加懒加载支持
    img.setAttribute('loading', 'lazy');
    
    // 如果图片不在 figure 中，添加 figure 容器
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
 * 检测代码语言
 */
function detectCodeLanguage(code: string): string {
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
 * 处理表格
 */
function processTable(tableHtml: string): any {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = tableHtml;
  
  const table = tempDiv.querySelector('table');
  if (!table) {
    throw new Error('无效的表格 HTML');
  }
  
  // 修复表格结构
  fixTableStructure(tempDiv);
  
  // 提取表格数据
  const headers: string[] = [];
  const rows: string[][] = [];
  
  // 提取表头
  const thead = table.querySelector('thead');
  if (thead) {
    const headerRow = thead.querySelector('tr');
    if (headerRow) {
      headers.push(...Array.from(headerRow.querySelectorAll('th, td')).map(
        cell => cell.textContent?.trim() || ''
      ));
    }
  }
  
  // 提取数据行
  const tbody = table.querySelector('tbody');
  if (tbody) {
    const tableRows = tbody.querySelectorAll('tr');
    tableRows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      rows.push(Array.from(cells).map(cell => cell.textContent?.trim() || ''));
    });
  }
  
  return {
    headers,
    rows,
    hasHeader: headers.length > 0,
    caption: table.querySelector('caption')?.textContent?.trim()
  };
}

/**
 * 处理代码块
 */
function processCodeBlock(codeHtml: string, language?: string): any {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = codeHtml;
  
  const pre = tempDiv.querySelector('pre');
  if (!pre) {
    throw new Error('无效的代码块 HTML');
  }
  
  let code = pre.querySelector('code');
  if (!code) {
    code = document.createElement('code');
    code.textContent = pre.textContent;
    pre.textContent = '';
    pre.appendChild(code);
  }
  
  // 确保代码块有语言类名
  if (language) {
    code.className = `language-${language}`;
  } else {
    const hasLanguageClass = Array.from(code.classList).some(cls => cls.startsWith('language-'));
    if (!hasLanguageClass) {
      const detectedLanguage = detectCodeLanguage(code.textContent || '');
      code.classList.add(`language-${detectedLanguage}`);
    }
  }
  
  return {
    code: code.textContent || '',
    language: language || code.className.replace('language-', '') || 'plaintext',
    lineCount: (code.textContent || '').split('\n').length
  };
}

/**
 * 处理列表
 */
function processList(listHtml: string): any {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = listHtml;
  
  const list = tempDiv.querySelector('ul, ol');
  if (!list) {
    throw new Error('无效的列表 HTML');
  }
  
  // 修复列表结构
  fixNestedLists(tempDiv);
  
  // 提取列表类型
  const type = list.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered';
  
  // 提取列表项
  const items: any[] = [];
  const listItems = list.querySelectorAll(':scope > li');
  listItems.forEach(item => {
    const nestedLists: any[] = [];
    
    // 查找嵌套列表
    const nestedListElements = item.querySelectorAll(':scope > ul, :scope > ol');
    nestedListElements.forEach(nestedList => {
      if (nestedList instanceof HTMLElement) {
        const nestedType = nestedList.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered';
        nestedLists.push({
          type: nestedType,
          items: Array.from(nestedList.querySelectorAll(':scope > li')).map(li => li.textContent?.trim() || '')
        });
      }
    });
    
    // 提取列表项文本（排除嵌套列表的文本）
    let text = item.textContent || '';
    nestedListElements.forEach(nestedList => {
      text = text.replace(nestedList.textContent || '', '');
    });
    
    items.push({
      text: text.trim(),
      hasNestedList: nestedLists.length > 0,
      nestedLists
    });
  });
  
  return {
    type,
    items,
    nested: items.some(item => item.hasNestedList)
  };
}

// 通知主线程工作线程已准备好
self.postMessage({ id: 'init', success: true, data: 'Worker initialized' });
