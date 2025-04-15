/**
 * 列表提取器
 * 用于增强列表的提取和显示
 */

export interface ListInfo {
  type: 'ordered' | 'unordered';
  items: ListItemInfo[];
  nested: boolean;
  level: number;
}

export interface ListItemInfo {
  text: string;
  hasNestedList: boolean;
  nestedLists: ListInfo[];
}

export class ListExtractor {
  /**
   * 从列表元素提取信息
   */
  public extractListInfo(list: HTMLElement, level: number = 0): ListInfo {
    const type = list.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered';
    const items: ListItemInfo[] = [];
    let nested = false;
    
    // 处理列表项
    const listItems = list.querySelectorAll(':scope > li');
    listItems.forEach(item => {
      const nestedLists: ListInfo[] = [];
      
      // 查找嵌套列表
      const nestedListElements = item.querySelectorAll(':scope > ul, :scope > ol');
      nestedListElements.forEach(nestedList => {
        if (nestedList instanceof HTMLElement) {
          nested = true;
          nestedLists.push(this.extractListInfo(nestedList, level + 1));
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
      nested,
      level
    };
  }

  /**
   * 创建增强的列表
   */
  public createEnhancedList(listInfo: ListInfo): HTMLElement {
    const list = document.createElement(listInfo.type === 'ordered' ? 'ol' : 'ul');
    list.className = `enhanced-list level-${listInfo.level}`;
    
    if (listInfo.type === 'ordered') {
      list.classList.add('enhanced-ordered-list');
    } else {
      list.classList.add('enhanced-unordered-list');
    }
    
    // 创建列表项
    listInfo.items.forEach(itemInfo => {
      const item = document.createElement('li');
      item.className = 'enhanced-list-item';
      
      // 添加文本
      const textSpan = document.createElement('span');
      textSpan.className = 'list-item-text';
      textSpan.textContent = itemInfo.text;
      item.appendChild(textSpan);
      
      // 添加嵌套列表
      if (itemInfo.hasNestedList) {
        item.classList.add('has-nested-list');
        
        itemInfo.nestedLists.forEach(nestedListInfo => {
          const nestedList = this.createEnhancedList(nestedListInfo);
          item.appendChild(nestedList);
        });
      }
      
      list.appendChild(item);
    });
    
    return list;
  }

  /**
   * 增强页面中的所有列表
   */
  public enhanceAllLists(container: HTMLElement): void {
    // 只处理顶级列表，嵌套列表会在处理顶级列表时一起处理
    const topLevelLists = Array.from(container.querySelectorAll('ul, ol')).filter(list => {
      const parent = list.parentElement;
      return parent && parent.tagName !== 'LI';
    });
    
    topLevelLists.forEach(list => {
      if (!(list instanceof HTMLElement)) return;
      
      // 跳过已经处理过的列表
      if (list.classList.contains('enhanced-list')) return;
      
      // 提取列表信息
      const listInfo = this.extractListInfo(list);
      
      // 创建增强的列表
      const enhancedList = this.createEnhancedList(listInfo);
      
      // 替换原始列表
      list.replaceWith(enhancedList);
    });
  }

  /**
   * 修复列表结构问题
   */
  public fixListStructure(container: HTMLElement): void {
    // 修复嵌套错误的列表
    this.fixNestedLists(container);
    
    // 修复空列表项
    this.fixEmptyListItems(container);
    
    // 修复列表项中的段落
    this.fixListItemParagraphs(container);
  }

  /**
   * 修复嵌套列表
   */
  private fixNestedLists(container: HTMLElement): void {
    const lists = container.querySelectorAll('ul, ol');
    lists.forEach(list => {
      // 确保列表项直接在列表元素下
      const directChildren = Array.from(list.children);
      directChildren.forEach(child => {
        if (child.tagName !== 'LI') {
          // 如果不是列表项，将其包装在列表项中
          const li = document.createElement('li');
          child.parentNode?.insertBefore(li, child);
          li.appendChild(child);
        }
      });
      
      // 修复嵌套列表的位置
      const nestedLists = list.querySelectorAll(':scope > ul, :scope > ol');
      nestedLists.forEach(nestedList => {
        // 如果嵌套列表不在列表项中，将其移动到前一个列表项中
        const previousLi = nestedList.previousElementSibling;
        if (previousLi && previousLi.tagName === 'LI') {
          previousLi.appendChild(nestedList);
        } else {
          // 如果没有前一个列表项，创建一个新的
          const li = document.createElement('li');
          nestedList.parentNode?.insertBefore(li, nestedList);
          li.appendChild(nestedList);
        }
      });
    });
  }

  /**
   * 修复空列表项
   */
  private fixEmptyListItems(container: HTMLElement): void {
    const emptyListItems = container.querySelectorAll('li:empty');
    emptyListItems.forEach(item => {
      // 如果列表项完全为空，添加一个空格
      item.innerHTML = '&nbsp;';
    });
  }

  /**
   * 修复列表项中的段落
   */
  private fixListItemParagraphs(container: HTMLElement): void {
    const listItems = container.querySelectorAll('li');
    listItems.forEach(li => {
      const paragraphs = li.querySelectorAll(':scope > p');
      
      // 如果只有一个段落，去掉段落标签
      if (paragraphs.length === 1 && li.children.length === 1) {
        const p = paragraphs[0];
        li.innerHTML = p.innerHTML;
      }
      
      // 如果有多个段落，为每个段落添加类
      if (paragraphs.length > 1) {
        paragraphs.forEach(p => {
          p.classList.add('list-item-paragraph');
        });
      }
    });
  }

  /**
   * 添加列表交互功能
   */
  public addListInteractions(container: HTMLElement): void {
    // 为有嵌套列表的列表项添加折叠功能
    const listItemsWithNested = container.querySelectorAll('.enhanced-list-item.has-nested-list');
    listItemsWithNested.forEach(item => {
      // 添加折叠指示器
      const indicator = document.createElement('span');
      indicator.className = 'list-collapse-indicator';
      indicator.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
      
      // 插入到列表项文本之前
      const textSpan = item.querySelector('.list-item-text');
      if (textSpan) {
        item.insertBefore(indicator, textSpan);
      } else {
        item.insertBefore(indicator, item.firstChild);
      }
      
      // 添加点击事件
      indicator.addEventListener('click', () => {
        item.classList.toggle('collapsed');
        
        if (item.classList.contains('collapsed')) {
          indicator.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        } else {
          indicator.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
        }
      });
    });
  }
}

// 导出默认实例
export const listExtractor = new ListExtractor();
