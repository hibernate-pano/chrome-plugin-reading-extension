import { ContentProcessor } from './ContentProcessorManager';
import { ReadingModeSettings } from '../types';

/**
 * 表格处理器选项
 */
export interface TableProcessorOptions {
  enableResponsive?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
  maxRowsPerPage?: number;
  enableStickyHeader?: boolean;
  enableColumnResize?: boolean;
  enableRowSelection?: boolean;
}

/**
 * 增强的表格处理器
 * 提供响应式表格、排序、过滤等高级功能
 */
export class EnhancedTableProcessor implements ContentProcessor {
  public readonly name = 'EnhancedTableProcessor';
  public readonly priority = 70; // 中等优先级

  private options: TableProcessorOptions;
  private processedTables: Set<string> = new Set();

  constructor(options: Partial<TableProcessorOptions> = {}) {
    this.options = {
      enableResponsive: true,
      enableSorting: true,
      enableFiltering: true,
      enablePagination: true,
      enableSearch: true,
      enableExport: true,
      maxRowsPerPage: 50,
      enableStickyHeader: true,
      enableColumnResize: true,
      enableRowSelection: true,
      ...options
    };
  }

  /**
   * 检查是否可以处理此内容
   */
  public canProcess(content: string): boolean {
    return content.includes('<table') || content.includes('<thead') || content.includes('<tbody');
  }

  /**
   * 处理HTML内容
   */
  public async process(content: string, settings?: ReadingModeSettings): Promise<string> {
    try {
      let processedContent = content;

      // 处理表格标签
      processedContent = this.processTableTags(processedContent);

      // 处理表格容器
      processedContent = this.processTableContainers(processedContent);

      return processedContent;
    } catch (error) {
      console.error('Table processing failed:', error);
      return content; // 返回原始内容
    }
  }

  /**
   * 处理表格标签
   */
  private processTableTags(content: string): string {
    const tableRegex = /<table([^>]*)>([\s\S]*?)<\/table>/gi;
    
    return content.replace(tableRegex, (match, attributes, tableContent) => {
      // 检查是否已经处理过
      if (attributes.includes('data-processed')) {
        return match;
      }

      const tableId = this.generateTableId();
      const enhancedTable = this.enhanceTableElement(attributes, tableContent, tableId);
      
      return enhancedTable;
    });
  }

  /**
   * 处理表格容器
   */
  private processTableContainers(content: string): string {
    // 查找表格容器
    const containerRegex = /<div([^>]*class="[^"]*table-container[^"]*"[^>]*)>([\s\S]*?)<\/div>/gi;
    
    return content.replace(containerRegex, (match, attributes, content) => {
      if (attributes.includes('data-processed')) {
        return match;
      }

      const enhancedContainer = this.enhanceTableContainer(attributes, content);
      return enhancedContainer;
    });
  }

  /**
   * 增强表格元素
   */
  private enhanceTableElement(attributes: string, tableContent: string, tableId: string): string {
    let enhancedAttributes = attributes;

    // 添加CSS类
    if (!enhancedAttributes.includes('class=')) {
      enhancedAttributes += ' class="enhanced-table"';
    } else {
      enhancedAttributes = enhancedAttributes.replace(/class="([^"]*)"/, 'class="$1 enhanced-table"');
    }

    // 添加data属性
    enhancedAttributes += ` data-processed="true" data-table-id="${tableId}"`;

    // 处理表格内容
    let enhancedContent = tableContent;

    // 处理表头
    enhancedContent = this.processTableHeader(enhancedContent, tableId);

    // 处理表体
    enhancedContent = this.processTableBody(enhancedContent, tableId);

    // 处理表脚
    enhancedContent = this.processTableFooter(enhancedContent, tableId);

    // 生成完整的增强表格
    return this.generateEnhancedTable(enhancedAttributes, enhancedContent, tableId);
  }

  /**
   * 处理表头
   */
  private processTableHeader(content: string, tableId: string): string {
    const theadRegex = /<thead[^>]*>([\s\S]*?)<\/thead>/gi;
    
    return content.replace(theadRegex, (match, theadContent) => {
      if (theadContent.includes('data-processed')) {
        return match;
      }

      // 处理表头行
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let enhancedTheadContent = theadContent.replace(trRegex, (trMatch, trContent) => {
        // 处理表头单元格
        const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
        const enhancedTrContent = trContent.replace(thRegex, (thMatch, thContent) => {
          return `<th class="sortable-header" data-sortable="true">${thContent}</th>`;
        });

        return `<tr class="table-header-row">${enhancedTrContent}</tr>`;
      });

      return `<thead class="enhanced-thead" data-processed="true">${enhancedTheadContent}</thead>`;
    });
  }

  /**
   * 处理表体
   */
  private processTableBody(content: string, tableId: string): string {
    const tbodyRegex = /<tbody[^>]*>([\s\S]*?)<\/tbody>/gi;
    
    return content.replace(tbodyRegex, (match, tbodyContent) => {
      if (tbodyContent.includes('data-processed')) {
        return match;
      }

      // 处理表体行
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let enhancedTbodyContent = tbodyContent.replace(trRegex, (trMatch, trContent, rowIndex) => {
        // 处理表体单元格
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const enhancedTrContent = trContent.replace(tdRegex, (tdMatch, tdContent) => {
          return `<td class="table-cell">${tdContent}</td>`;
        });

        return `<tr class="table-row" data-row="${rowIndex}">${enhancedTrContent}</tr>`;
      });

      return `<tbody class="enhanced-tbody" data-processed="true">${enhancedTbodyContent}</tbody>`;
    });
  }

  /**
   * 处理表脚
   */
  private processTableFooter(content: string, tableId: string): string {
    const tfootRegex = /<tfoot[^>]*>([\s\S]*?)<\/tfoot>/gi;
    
    return content.replace(tfootRegex, (match, tfootContent) => {
      if (tfootContent.includes('data-processed')) {
        return match;
      }

      return `<tfoot class="enhanced-tfoot" data-processed="true">${tfootContent}</tfoot>`;
    });
  }

  /**
   * 生成增强的表格
   */
  private generateEnhancedTable(attributes: string, tableContent: string, tableId: string): string {
    const tableIdAttr = `data-table-id="${tableId}"`;
    
    // 生成表格工具栏
    const toolbar = this.generateTableToolbar(tableId);
    
    // 生成分页控件
    const pagination = this.options.enablePagination ? this.generatePagination(tableId) : '';
    
    // 生成搜索框
    const searchBox = this.options.enableSearch ? this.generateSearchBox(tableId) : '';
    
    // 生成导出按钮
    const exportButton = this.options.enableExport ? this.generateExportButton(tableId) : '';

    return `
      <div class="enhanced-table-container" ${tableIdAttr}>
        ${toolbar}
        ${searchBox}
        <div class="table-wrapper">
          <table${attributes}>
            ${tableContent}
          </table>
        </div>
        ${pagination}
        ${exportButton}
      </div>
    `;
  }

  /**
   * 生成表格工具栏
   */
  private generateTableToolbar(tableId: string): string {
    const controls = [];

    if (this.options.enableSorting) {
      controls.push(`
        <button class="table-control sort-button" title="排序" onclick="toggleTableSort('${tableId}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M6 12h12M9 18h6"/>
          </svg>
        </button>
      `);
    }

    if (this.options.enableFiltering) {
      controls.push(`
        <button class="table-control filter-button" title="过滤" onclick="toggleTableFilter('${tableId}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
          </svg>
        </button>
      `);
    }

    if (this.options.enableColumnResize) {
      controls.push(`
        <button class="table-control resize-button" title="调整列宽" onclick="toggleColumnResize('${tableId}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8"/>
            <path d="M18 3v6M6 3v6"/>
          </svg>
        </button>
      `);
    }

    if (controls.length === 0) return '';

    return `
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="table-title">表格</span>
        </div>
        <div class="toolbar-right">
          ${controls.join('')}
        </div>
      </div>
    `;
  }

  /**
   * 生成搜索框
   */
  private generateSearchBox(tableId: string): string {
    return `
      <div class="table-search">
        <input type="text" class="search-input" placeholder="搜索表格内容..." 
               onkeyup="filterTable('${tableId}', this.value)">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
    `;
  }

  /**
   * 生成分页控件
   */
  private generatePagination(tableId: string): string {
    return `
      <div class="table-pagination" data-table-id="${tableId}">
        <div class="pagination-info">
          <span class="page-info">第 1 页，共 1 页</span>
          <span class="row-info">显示 1-10 行，共 10 行</span>
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" onclick="goToPage('${tableId}', 'first')" disabled>首页</button>
          <button class="pagination-btn" onclick="goToPage('${tableId}', 'prev')" disabled>上一页</button>
          <span class="page-numbers">
            <span class="page-number active">1</span>
          </span>
          <button class="pagination-btn" onclick="goToPage('${tableId}', 'next')" disabled>下一页</button>
          <button class="pagination-btn" onclick="goToPage('${tableId}', 'last')" disabled>末页</button>
        </div>
        <div class="pagination-size">
          <select class="page-size-select" onchange="changePageSize('${tableId}', this.value)">
            <option value="10">10 行/页</option>
            <option value="25">25 行/页</option>
            <option value="50" selected>50 行/页</option>
            <option value="100">100 行/页</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * 生成导出按钮
   */
  private generateExportButton(tableId: string): string {
    return `
      <div class="table-export">
        <button class="export-button" onclick="exportTable('${tableId}', 'csv')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          导出 CSV
        </button>
        <button class="export-button" onclick="exportTable('${tableId}', 'excel')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          导出 Excel
        </button>
      </div>
    `;
  }

  /**
   * 增强表格容器
   */
  private enhanceTableContainer(attributes: string, content: string): string {
    let enhancedAttributes = attributes;

    // 添加CSS类
    if (!enhancedAttributes.includes('class=')) {
      enhancedAttributes += ' class="enhanced-table-container"';
    } else {
      enhancedAttributes = enhancedAttributes.replace(/class="([^"]*)"/, 'class="$1 enhanced-table-container"');
    }

    // 添加data属性
    enhancedAttributes += ' data-processed="true"';

    return `<div${enhancedAttributes}>${content}</div>`;
  }

  /**
   * 生成表格ID
   */
  private generateTableId(): string {
    return `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取处理器选项
   */
  public getOptions(): TableProcessorOptions {
    return { ...this.options };
  }

  /**
   * 更新处理器选项
   */
  public updateOptions(newOptions: Partial<TableProcessorOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * 检查表格是否已处理
   */
  public isTableProcessed(tableId: string): boolean {
    return this.processedTables.has(tableId);
  }

  /**
   * 标记表格为已处理
   */
  public markTableAsProcessed(tableId: string): void {
    this.processedTables.add(tableId);
  }

  /**
   * 清除处理记录
   */
  public clearProcessedTables(): void {
    this.processedTables.clear();
  }

  /**
   * 获取已处理的表格数量
   */
  public getProcessedTableCount(): number {
    return this.processedTables.size;
  }
}

// 导出默认实例
export const enhancedTableProcessor = new EnhancedTableProcessor();
