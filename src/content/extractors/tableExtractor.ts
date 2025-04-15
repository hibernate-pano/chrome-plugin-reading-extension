/**
 * 表格提取器
 * 用于增强表格的提取和显示
 */

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
  hasHeader: boolean;
}

export class TableExtractor {
  /**
   * 从 HTML 表格元素提取结构化数据
   */
  public extractTableData(table: HTMLTableElement): TableData {
    const result: TableData = {
      headers: [],
      rows: [],
      hasHeader: false
    };

    // 提取表格标题
    const caption = table.querySelector('caption');
    if (caption) {
      result.caption = caption.textContent?.trim() || undefined;
    }

    // 提取表头
    const thead = table.querySelector('thead');
    if (thead) {
      const headerRow = thead.querySelector('tr');
      if (headerRow) {
        result.headers = Array.from(headerRow.querySelectorAll('th, td')).map(
          cell => cell.textContent?.trim() || ''
        );
        result.hasHeader = true;
      }
    }

    // 如果没有找到表头，尝试使用第一行作为表头
    if (result.headers.length === 0) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const firstRowCells = firstRow.querySelectorAll('th');
        if (firstRowCells.length > 0) {
          result.headers = Array.from(firstRowCells).map(
            cell => cell.textContent?.trim() || ''
          );
          result.hasHeader = true;
        } else {
          // 如果第一行没有 th 元素，检查是否所有单元格都是加粗的
          const cells = firstRow.querySelectorAll('td');
          const allBold = Array.from(cells).every(
            cell => cell.querySelector('strong, b') !== null || 
                   window.getComputedStyle(cell).fontWeight === 'bold' ||
                   window.getComputedStyle(cell).fontWeight === '700'
          );
          
          if (allBold) {
            result.headers = Array.from(cells).map(
              cell => cell.textContent?.trim() || ''
            );
            result.hasHeader = true;
          }
        }
      }
    }

    // 提取表格数据行
    const rows = table.querySelectorAll(result.hasHeader ? 'tbody tr, tr:not(:first-child)' : 'tr');
    result.rows = Array.from(rows).map(row => {
      return Array.from(row.querySelectorAll('td, th')).map(
        cell => cell.textContent?.trim() || ''
      );
    });

    // 如果使用第一行作为表头，从数据行中移除
    if (result.hasHeader && result.headers.length === 0 && result.rows.length > 0) {
      result.headers = result.rows[0];
      result.rows.shift();
    }

    return result;
  }

  /**
   * 创建增强的表格 HTML
   */
  public createEnhancedTable(tableData: TableData): HTMLElement {
    const container = document.createElement('div');
    container.className = 'enhanced-table-container';

    // 创建表格元素
    const table = document.createElement('table');
    table.className = 'enhanced-table';

    // 添加表格标题
    if (tableData.caption) {
      const caption = document.createElement('caption');
      caption.textContent = tableData.caption;
      table.appendChild(caption);
    }

    // 添加表头
    if (tableData.hasHeader && tableData.headers.length > 0) {
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      tableData.headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
    }

    // 添加表格主体
    const tbody = document.createElement('tbody');
    tableData.rows.forEach((rowData, rowIndex) => {
      const row = document.createElement('tr');
      row.className = rowIndex % 2 === 0 ? 'even-row' : 'odd-row';
      
      rowData.forEach((cellData, cellIndex) => {
        const cell = document.createElement('td');
        cell.textContent = cellData;
        
        // 为第一列添加特殊样式
        if (cellIndex === 0) {
          cell.className = 'first-column';
        }
        
        row.appendChild(cell);
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);

    // 添加表格控件
    this.addTableControls(container, tableData);

    return container;
  }

  /**
   * 添加表格控件（排序、过滤等）
   */
  private addTableControls(container: HTMLElement, tableData: TableData): void {
    if (!tableData.hasHeader || tableData.headers.length === 0) {
      return;
    }

    const controls = document.createElement('div');
    controls.className = 'table-controls';

    // 添加搜索框
    const searchContainer = document.createElement('div');
    searchContainer.className = 'table-search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '搜索表格内容...';
    searchInput.className = 'table-search-input';
    searchInput.setAttribute('data-table-id', container.querySelector('table')?.id || '');
    
    searchContainer.appendChild(searchInput);
    controls.appendChild(searchContainer);

    // 添加排序按钮
    if (tableData.rows.length > 1) {
      const sortContainer = document.createElement('div');
      sortContainer.className = 'table-sort-container';
      
      const sortSelect = document.createElement('select');
      sortSelect.className = 'table-sort-select';
      
      // 添加默认选项
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '排序方式...';
      sortSelect.appendChild(defaultOption);
      
      // 为每一列添加排序选项
      tableData.headers.forEach((header, index) => {
        const ascOption = document.createElement('option');
        ascOption.value = `asc-${index}`;
        ascOption.textContent = `${header} (升序)`;
        sortSelect.appendChild(ascOption);
        
        const descOption = document.createElement('option');
        descOption.value = `desc-${index}`;
        descOption.textContent = `${header} (降序)`;
        sortSelect.appendChild(descOption);
      });
      
      sortContainer.appendChild(sortSelect);
      controls.appendChild(sortContainer);
    }

    container.insertBefore(controls, container.firstChild);
  }

  /**
   * 增强页面中的所有表格
   */
  public enhanceAllTables(container: HTMLElement): void {
    const tables = container.querySelectorAll('table');
    tables.forEach((table, index) => {
      if (!(table instanceof HTMLTableElement)) return;
      
      // 为表格添加唯一ID
      table.id = table.id || `table-${index}`;
      
      // 添加响应式容器
      const wrapper = document.createElement('div');
      wrapper.className = 'table-responsive';
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
      
      // 添加表格样式类
      table.classList.add('enhanced-table');
      
      // 处理表头
      const thead = table.querySelector('thead');
      if (thead) {
        const headerRows = thead.querySelectorAll('tr');
        headerRows.forEach(row => {
          row.classList.add('header-row');
        });
      }
      
      // 为表格行添加斑马条纹
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((row, rowIndex) => {
        row.classList.add(rowIndex % 2 === 0 ? 'even-row' : 'odd-row');
      });
      
      // 处理表格单元格
      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        // 处理单元格内的链接
        const links = cell.querySelectorAll('a');
        links.forEach(link => {
          link.classList.add('table-link');
        });
        
        // 处理单元格内的图片
        const images = cell.querySelectorAll('img');
        images.forEach(img => {
          img.classList.add('table-image');
          img.setAttribute('loading', 'lazy');
        });
      });
    });
  }

  /**
   * 检测并修复表格结构问题
   */
  public fixTableStructure(container: HTMLElement): void {
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
      if (!(table instanceof HTMLTableElement)) return;
      
      // 确保表格有 tbody
      if (!table.querySelector('tbody')) {
        const rows = table.querySelectorAll('tr');
        if (rows.length > 0) {
          const tbody = document.createElement('tbody');
          rows.forEach(row => {
            if (row.parentElement === table) {
              tbody.appendChild(row);
            }
          });
          table.appendChild(tbody);
        }
      }
      
      // 确保表格有 thead（如果第一行包含 th 元素）
      const firstRow = table.querySelector('tr');
      if (firstRow && !table.querySelector('thead')) {
        const hasTh = firstRow.querySelector('th') !== null;
        if (hasTh) {
          const thead = document.createElement('thead');
          thead.appendChild(firstRow.cloneNode(true));
          table.insertBefore(thead, table.firstChild);
          
          // 如果第一行在 tbody 中，从 tbody 中移除
          const tbodyFirstRow = table.querySelector('tbody tr:first-child');
          if (tbodyFirstRow && tbodyFirstRow.innerHTML === firstRow.innerHTML) {
            tbodyFirstRow.remove();
          }
        }
      }
      
      // 修复空单元格
      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        if (!cell.textContent?.trim()) {
          cell.innerHTML = '&nbsp;';
        }
      });
    });
  }
}

// 导出默认实例
export const tableExtractor = new TableExtractor();
