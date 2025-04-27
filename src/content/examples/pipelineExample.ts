/**
 * 内容处理管道示例
 * 展示如何使用新的内容处理管道架构处理网页内容
 */
import { contentPipeline } from '../pipeline';
import { StorageKeys, getStorage } from '../../storage/storage';

/**
 * 示例：使用内容处理管道处理当前页面
 * 这个函数展示了如何使用新的内容处理管道架构
 */
export async function processPageWithPipeline() {
  try {
    console.log('开始使用内容处理管道处理页面...');
    
    // 获取用户设置
    const settings = await getStorage(StorageKeys.SETTINGS);
    
    // 配置内容处理管道选项
    const pipelineOptions = {
      extractorOptions: {
        defuddleOptions: {
          debug: false,
          url: window.location.href
        }
      },
      converterOptions: {
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-'
      },
      rendererOptions: {
        html: true,
        linkify: true,
        typographer: true,
        breaks: settings?.paragraphBreaks || false,
        plugins: {
          anchor: true,
          toc: settings?.showToc || true,
          highlightjs: true,
          taskLists: true
        }
      }
    };
    
    // 克隆当前文档以避免修改原始DOM
    const docClone = document.cloneNode(true) as Document;
    
    // 使用内容处理管道
    const result = await contentPipeline.process(docClone);
    
    console.log('内容处理完成');
    console.log('标题:', result.title);
    console.log('元数据:', result.metadata);
    
    // 创建阅读模式容器
    const container = document.createElement('div');
    container.id = 'reading-mode-container';
    container.className = 'reading-mode';
    container.innerHTML = result.html;
    
    // 清空页面内容并添加处理后的内容
    document.body.innerHTML = '';
    document.body.appendChild(container);
    
    // 更新页面标题
    document.title = result.title;
    
    // 应用阅读模式样式
    applyReadingModeStyles(settings);
    
    console.log('阅读模式已启用');
    
    // 返回处理结果，以便进一步处理
    return result;
  } catch (error) {
    console.error('处理页面时发生错误:', error);
    throw error;
  }
}

/**
 * 应用阅读模式样式
 * @param settings 用户设置
 */
function applyReadingModeStyles(settings: any) {
  // 创建样式元素
  const style = document.createElement('style');
  style.id = 'reading-mode-styles';
  
  // 根据用户设置生成样式
  style.textContent = `
    body {
      margin: 0;
      padding: 0;
      background-color: ${settings?.backgroundColor || '#ffffff'};
      color: ${settings?.textColor || '#333333'};
      font-family: ${settings?.fontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'};
      font-size: ${settings?.fontSize || '18px'};
      line-height: ${settings?.lineHeight || 1.6};
    }
    
    #reading-mode-container {
      max-width: ${settings?.contentWidth || '800px'};
      margin: 0 auto;
      padding: 2rem;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.25;
    }
    
    p {
      margin-bottom: 1.5em;
    }
    
    a {
      color: ${settings?.linkColor || '#0366d6'};
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1.5em auto;
    }
    
    pre {
      background-color: ${settings?.codeBackgroundColor || '#f6f8fa'};
      border-radius: 3px;
      padding: 1em;
      overflow: auto;
    }
    
    code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.9em;
    }
    
    blockquote {
      border-left: 4px solid ${settings?.blockquoteBorderColor || '#dfe2e5'};
      padding-left: 1em;
      color: ${settings?.blockquoteTextColor || '#6a737d'};
      margin-left: 0;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 1.5em;
    }
    
    table th, table td {
      border: 1px solid ${settings?.tableBorderColor || '#dfe2e5'};
      padding: 0.5em 1em;
    }
    
    table th {
      background-color: ${settings?.tableHeaderBackgroundColor || '#f6f8fa'};
    }
  `;
  
  // 添加样式到文档
  document.head.appendChild(style);
}