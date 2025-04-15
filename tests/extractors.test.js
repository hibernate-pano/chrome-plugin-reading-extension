// 提取器测试脚本
// 在浏览器控制台中运行此脚本来测试提取器功能

// 导入提取器
import { 
  contentExtractor,
  tableExtractor,
  mediaExtractor,
  codeExtractor,
  listExtractor
} from '../src/content/extractors';

// 测试内容提取
async function testContentExtraction() {
  console.group('测试内容提取');
  
  try {
    const html = document.documentElement.outerHTML;
    const url = window.location.href;
    
    console.log('开始提取内容...');
    const extractedContent = await contentExtractor.extractFromHTML(html, url);
    
    console.log('提取结果:', extractedContent);
    console.log('提取成功:', extractedContent.success);
    console.log('提取标题:', extractedContent.title);
    console.log('内容长度:', extractedContent.length);
    
    // 创建一个临时元素来显示提取的内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = extractedContent.content;
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);
    
    // 测试表格提取
    const tables = tempDiv.querySelectorAll('table');
    console.log(`找到 ${tables.length} 个表格`);
    
    // 测试代码块提取
    const codeBlocks = tempDiv.querySelectorAll('pre');
    console.log(`找到 ${codeBlocks.length} 个代码块`);
    
    // 测试列表提取
    const lists = tempDiv.querySelectorAll('ul, ol');
    console.log(`找到 ${lists.length} 个列表`);
    
    // 测试图片提取
    const images = tempDiv.querySelectorAll('img');
    console.log(`找到 ${images.length} 张图片`);
    
    // 清理临时元素
    document.body.removeChild(tempDiv);
  } catch (error) {
    console.error('内容提取测试失败:', error);
  }
  
  console.groupEnd();
}

// 测试表格增强
function testTableEnhancement() {
  console.group('测试表格增强');
  
  try {
    const tables = document.querySelectorAll('table');
    console.log(`找到 ${tables.length} 个表格`);
    
    // 创建一个临时容器
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);
    
    // 复制表格到临时容器
    tables.forEach((table, index) => {
      const clone = table.cloneNode(true);
      container.appendChild(clone);
      console.log(`处理表格 ${index + 1}...`);
    });
    
    // 应用表格增强
    tableExtractor.enhanceAllTables(container);
    tableExtractor.fixTableStructure(container);
    
    // 检查结果
    const enhancedTables = container.querySelectorAll('.enhanced-table');
    console.log(`增强后的表格数量: ${enhancedTables.length}`);
    
    // 检查表头修复
    const theadCount = container.querySelectorAll('thead').length;
    console.log(`表头数量: ${theadCount}`);
    
    // 检查表体修复
    const tbodyCount = container.querySelectorAll('tbody').length;
    console.log(`表体数量: ${tbodyCount}`);
    
    // 清理临时容器
    document.body.removeChild(container);
  } catch (error) {
    console.error('表格增强测试失败:', error);
  }
  
  console.groupEnd();
}

// 测试媒体增强
function testMediaEnhancement() {
  console.group('测试媒体增强');
  
  try {
    const images = document.querySelectorAll('img');
    const videos = document.querySelectorAll('video');
    const iframes = document.querySelectorAll('iframe');
    
    console.log(`找到 ${images.length} 张图片, ${videos.length} 个视频, ${iframes.length} 个 iframe`);
    
    // 创建一个临时容器
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);
    
    // 复制媒体元素到临时容器
    images.forEach((img, index) => {
      const clone = img.cloneNode(true);
      container.appendChild(clone);
      console.log(`处理图片 ${index + 1}...`);
    });
    
    videos.forEach((video, index) => {
      const clone = video.cloneNode(true);
      container.appendChild(clone);
      console.log(`处理视频 ${index + 1}...`);
    });
    
    iframes.forEach((iframe, index) => {
      const clone = iframe.cloneNode(true);
      container.appendChild(clone);
      console.log(`处理 iframe ${index + 1}...`);
    });
    
    // 应用媒体增强
    mediaExtractor.enhanceAllImages(container);
    mediaExtractor.enhanceVideos(container);
    mediaExtractor.enhanceIframes(container);
    
    // 检查结果
    const enhancedImages = container.querySelectorAll('.enhanced-image-container');
    console.log(`增强后的图片容器数量: ${enhancedImages.length}`);
    
    const enhancedVideos = container.querySelectorAll('.enhanced-video-container');
    console.log(`增强后的视频容器数量: ${enhancedVideos.length}`);
    
    const enhancedIframes = container.querySelectorAll('.enhanced-iframe-container, .enhanced-video-embed');
    console.log(`增强后的 iframe 容器数量: ${enhancedIframes.length}`);
    
    // 清理临时容器
    document.body.removeChild(container);
  } catch (error) {
    console.error('媒体增强测试失败:', error);
  }
  
  console.groupEnd();
}

// 测试代码块增强
function testCodeEnhancement() {
  console.group('测试代码块增强');
  
  try {
    const preElements = document.querySelectorAll('pre');
    console.log(`找到 ${preElements.length} 个代码块`);
    
    // 创建一个临时容器
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);
    
    // 复制代码块到临时容器
    preElements.forEach((pre, index) => {
      const clone = pre.cloneNode(true);
      container.appendChild(clone);
      console.log(`处理代码块 ${index + 1}...`);
    });
    
    // 应用代码块增强
    codeExtractor.enhanceAllCodeBlocks(container);
    codeExtractor.enhanceInlineCode(container);
    
    // 检查结果
    const enhancedCodeBlocks = container.querySelectorAll('.enhanced-code-container');
    console.log(`增强后的代码块容器数量: ${enhancedCodeBlocks.length}`);
    
    const inlineCodeElements = container.querySelectorAll('.enhanced-inline-code');
    console.log(`增强后的内联代码数量: ${inlineCodeElements.length}`);
    
    // 检查语言检测
    enhancedCodeBlocks.forEach((block, index) => {
      const languageLabel = block.querySelector('.code-language');
      if (languageLabel) {
        console.log(`代码块 ${index + 1} 检测到的语言: ${languageLabel.textContent}`);
      }
    });
    
    // 清理临时容器
    document.body.removeChild(container);
  } catch (error) {
    console.error('代码块增强测试失败:', error);
  }
  
  console.groupEnd();
}

// 测试列表增强
function testListEnhancement() {
  console.group('测试列表增强');
  
  try {
    const lists = document.querySelectorAll('ul, ol');
    console.log(`找到 ${lists.length} 个列表`);
    
    // 创建一个临时容器
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);
    
    // 复制列表到临时容器
    lists.forEach((list, index) => {
      const clone = list.cloneNode(true);
      container.appendChild(clone);
      console.log(`处理列表 ${index + 1}...`);
    });
    
    // 应用列表增强
    listExtractor.fixListStructure(container);
    listExtractor.enhanceAllLists(container);
    
    // 检查结果
    const enhancedLists = container.querySelectorAll('.enhanced-list');
    console.log(`增强后的列表数量: ${enhancedLists.length}`);
    
    const orderedLists = container.querySelectorAll('.enhanced-ordered-list');
    console.log(`增强后的有序列表数量: ${orderedLists.length}`);
    
    const unorderedLists = container.querySelectorAll('.enhanced-unordered-list');
    console.log(`增强后的无序列表数量: ${unorderedLists.length}`);
    
    const nestedLists = container.querySelectorAll('.has-nested-list');
    console.log(`包含嵌套列表的列表项数量: ${nestedLists.length}`);
    
    // 清理临时容器
    document.body.removeChild(container);
  } catch (error) {
    console.error('列表增强测试失败:', error);
  }
  
  console.groupEnd();
}

// 运行所有测试
async function runAllTests() {
  console.log('开始测试提取器功能...');
  
  await testContentExtraction();
  testTableEnhancement();
  testMediaEnhancement();
  testCodeEnhancement();
  testListEnhancement();
  
  console.log('所有测试完成!');
}

// 导出测试函数
export {
  runAllTests,
  testContentExtraction,
  testTableEnhancement,
  testMediaEnhancement,
  testCodeEnhancement,
  testListEnhancement
};

// 自动运行测试
runAllTests();
