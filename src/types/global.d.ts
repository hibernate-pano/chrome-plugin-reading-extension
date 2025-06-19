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