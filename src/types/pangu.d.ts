declare module 'pangu' {
  interface Pangu {
    spacing: (text: string) => string;
    spacingPage: () => void;
    spacingElementById: (elementId: string) => void;
    spacingElementByClassName: (className: string) => void;
    spacingElementByTagName: (tagName: string) => void;
  }

  const pangu: Pangu;
  export default pangu;
} 