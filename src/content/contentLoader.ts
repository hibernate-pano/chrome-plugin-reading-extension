/**
 * 内容脚本加载器
 * 实现最小化注入，按需加载功能模块
 */

import { MESSAGE_TYPES } from '../constants';
import { createFloatingButton, updateButtonState } from './ui/readerFloatingButton';

// 记录加载状态
let isReaderInitialized = false;
let isReaderActive = false;

/**
 * 初始化内容脚本
 * 只加载最基本的消息监听器，其他功能按需加载
 */
function initialize() {
  console.log('内容脚本加载器初始化');
  
  // 设置消息监听
  setupMessageListeners();
  
  // 添加浮动按钮（如果需要）
  // 注意：这里可以根据用户设置决定是否显示浮动按钮
  createFloatingButton();
}

/**
 * 设置消息监听器
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let asyncResponse = false;
    
    switch (message.action) {
      case MESSAGE_TYPES.TOGGLE_READER_MODE:
        asyncResponse = true;
        handleToggleReaderMode()
          .then(result => {
            sendResponse({ success: true, isReaderMode: result });
          })
          .catch(error => {
            console.error('切换阅读模式失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;
        
      case MESSAGE_TYPES.EXTRACT_CONTENT:
        asyncResponse = true;
        handleExtractContent()
          .then(content => {
            sendResponse({ success: true, content });
          })
          .catch(error => {
            console.error('提取内容失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;
        
      case MESSAGE_TYPES.SAVE_READING_PROGRESS:
        asyncResponse = true;
        handleSaveReadingProgress(message)
          .then(response => {
            sendResponse(response);
          })
          .catch(error => {
            console.error('保存阅读进度失败:', error);
            sendResponse({ success: false, error: error.message });
          });
        break;
        
      case 'GET_READING_MODE_STATE':
        // 同步响应，不需要异步处理
        sendResponse({
          isReaderMode: isReaderActive,
          buttonText: isReaderActive ? '退出阅读模式' : '进入阅读模式'
        });
        break;
        
      default:
        console.warn('收到未知消息动作:', message.action);
        sendResponse({ success: false, error: '未知消息动作' });
    }
    
    // 返回true表示会异步调用sendResponse
    return asyncResponse;
  });
}

/**
 * 处理切换阅读模式的消息
 */
async function handleToggleReaderMode(): Promise<boolean> {
  // 按需加载阅读模式模块
  if (!isReaderInitialized) {
    await loadReaderModule();
    isReaderInitialized = true;
  }
  
  // 动态导入阅读模式模块
  const { toggleReadingMode } = await import('./features/readingMode');
  const result = await toggleReadingMode();
  isReaderActive = result;
  
  // 更新浮动按钮状态
  updateButtonState(isReaderActive);
  
  return result;
}

/**
 * 处理提取内容的消息
 */
async function handleExtractContent(): Promise<any> {
  // 按需加载内容提取模块
  const { extractContent } = await import('./features/contentExtraction');
  return extractContent();
}

/**
 * 处理保存阅读进度的消息
 */
async function handleSaveReadingProgress(message: any): Promise<any> {
  const { url, scrollPosition, title } = message;
  
  // 发送消息到background.js保存阅读进度
  return chrome.runtime.sendMessage({
    action: MESSAGE_TYPES.SAVE_READING_PROGRESS,
    progress: {
      url,
      scrollPosition,
      lastRead: Date.now(),
      title
    }
  });
}

/**
 * 加载阅读模式模块
 * 包括样式、组件和功能
 */
async function loadReaderModule(): Promise<void> {
  try {
    console.log('加载阅读模式模块...');
    
    // 加载基础样式
    await loadStyles();
    
    // 预加载其他可能需要的模块
    import('./features/readingMode');
    import('./features/contentExtraction');
    
    console.log('阅读模式模块加载完成');
  } catch (error) {
    console.error('加载阅读模式模块失败:', error);
    throw error;
  }
}

/**
 * 加载基础样式
 */
async function loadStyles(): Promise<void> {
  // 加载基础变量样式
  const variablesLink = document.createElement('link');
  variablesLink.rel = 'stylesheet';
  variablesLink.href = chrome.runtime.getURL('content/styles/variables.css');
  document.head.appendChild(variablesLink);
  
  // 预加载内容样式
  const contentLink = document.createElement('link');
  contentLink.rel = 'preload';
  contentLink.href = chrome.runtime.getURL('content/content.css');
  contentLink.as = 'style';
  document.head.appendChild(contentLink);
}

// 初始化内容脚本
initialize(); 