/**
 * 内容提取功能模块
 * 负责处理网页内容的提取和处理
 */

import { ExtractorFactory } from '../extractors/ExtractorFactory';

/**
 * 提取当前页面的内容
 * @returns 提取的内容对象
 */
export async function extractContent(): Promise<any> {
  try {
    const url = window.location.href;
    // 使用ExtractorFactory提取内容
    const content = await ExtractorFactory.extractContent(document, url);
    return content;
  } catch (error) {
    console.error('提取内容失败:', error);
    throw error;
  }
} 