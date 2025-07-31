/// <reference types="chrome"/>
/// <reference types="@types/chrome"/>

declare module '@mozilla/readability' {
  export class Readability {
    constructor(doc: Document);
    parse(): {
      title: string;
      content: string;
      byline: string;
      // textContent: string;
      // length: number;
      // excerpt: string;
      // dir: string;
      // siteName: string;
      // lang: string;
    } | null;
  }
}

/**
 * 全局类型定义
 * 包含浏览器API的类型声明补充
 */

// requestIdleCallback API定义
interface Window {
  /**
   * 请求在浏览器空闲时执行的回调函数
   * @param callback 在浏览器空闲时执行的回调函数
   * @param options 配置选项
   * @returns 请求ID，可用于取消请求
   */
  requestIdleCallback(
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ): number;

  /**
   * 取消之前的requestIdleCallback请求
   * @param handle 请求ID
   */
  cancelIdleCallback(handle: number): void;
}

/**
 * 空闲回调函数签名
 */
interface IdleRequestCallback {
  (deadline: IdleDeadline): void;
}

/**
 * 空闲请求选项
 */
interface IdleRequestOptions {
  /**
   * 超时时间(毫秒)，超过此时间强制执行回调
   */
  timeout?: number;
}

/**
 * 空闲截止线信息
 */
interface IdleDeadline {
  /**
   * 当前帧是否还有剩余时间
   * @returns 是否还有剩余时间
   */
  didTimeout: boolean;
  
  /**
   * 获取当前帧的剩余时间(毫秒)
   * @returns 剩余时间
   */
  timeRemaining(): number;
}

/**
 * Network Information API
 */
interface NetworkInformation {
  /**
   * 网络连接类型
   */
  type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  
  /**
   * 有效连接类型
   */
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi';
  
  /**
   * 下行带宽估计(MB/s)
   */
  downlink: number;
  
  /**
   * 往返延迟估计(ms)
   */
  rtt: number;
  
  /**
   * 是否启用数据保护模式
   */
  saveData: boolean;
  
  /**
   * 连接变化事件
   */
  onchange: ((this: NetworkInformation, ev: Event) => any) | null;
}

/**
 * 扩展Navigator接口
 */
interface Navigator {
  /**
   * 网络连接信息
   */
  connection?: NetworkInformation;
}

/**
 * Highlight.js类型定义
 */
interface HighlightJS {
  /**
   * 高亮显示HTML元素中的代码
   * @param element 包含代码的DOM元素
   */
  highlightElement(element: Element): void;
  
  /**
   * 对给定代码字符串进行语法高亮
   * @param code 代码字符串
   * @param languageName 编程语言名称
   */
  highlight(code: string, languageName: string): { value: string };
}

/**
 * 扩展Window接口
 */
interface Window {
  /**
   * Highlight.js实例
   */
  hljs?: HighlightJS;
} 