/**
 * ReadFlow Pro - 自定义主题
 * 更多主题选项
 */

export interface CustomTheme {
  id: string;
  name: string;
  name_en: string;
  background: string;
  text: string;
  accent: string;
  border: string;
  codeBg?: string;
}

export const EXTRA_THEMES: CustomTheme[] = [
  // 彩色主题
  {
    id: 'ocean',
    name: '海洋',
    name_en: 'Ocean',
    background: '#e8f4f8',
    text: '#1a3a4a',
    accent: '#0077b6',
    border: '#90e0ef',
    codeBg: '#d0e8f2'
  },
  {
    id: 'forest',
    name: '森林',
    name_en: 'Forest',
    background: '#f0f7f4',
    text: '#1d3a2a',
    accent: '#2d6a4f',
    border: '#95d5b2',
    codeBg: '#e8f5ed'
  },
  {
    id: 'sunset',
    name: '日落',
    name_en: 'Sunset',
    background: '#fff5f0',
    text: '#4a2c2a',
    accent: '#e85d04',
    border: '#ffccbc',
    codeBg: '#fff0eb'
  },
  {
    id: 'galaxy',
    name: '星河',
    name_en: 'Galaxy',
    background: '#1a1a2e',
    text: '#e8e8e8',
    accent: '#7b2cbf',
    border: '#3c096c',
    codeBg: '#2d2d4a'
  },
  {
    id: 'mint',
    name: '薄荷',
    name_en: 'Mint',
    background: '#f0fff4',
    text: '#1a3a2a',
    accent: '#10b981',
    border: '#a7f3d0',
    codeBg: '#ecfdf5'
  },
  {
    id: 'lavender',
    name: '薰衣草',
    name_en: 'Lavender',
    background: '#f5f3ff',
    text: '#2e1065',
    accent: '#8b5cf6',
    border: '#ddd6fe',
    codeBg: '#ede9fe'
  },
  // 纸张主题
  {
    id: 'old-newsprint',
    name: '旧报纸',
    name_en: 'Old Newspaper',
    background: '#f4e4bc',
    text: '#3d3322',
    accent: '#8b7355',
    border: '#c9b896',
    codeBg: '#e8d8a8'
  },
  {
    id: 'rice-paper',
    name: '宣纸',
    name_en: 'Rice Paper',
    background: '#faf8f5',
    text: '#4a4a4a',
    accent: '#b8860b',
    border: '#e8e4dc',
    codeBg: '#f0ede6'
  },
  {
    id: 'parchment',
    name: '羊皮纸',
    name_en: 'Parchment',
    background: '#f5e6c8',
    text: '#4a3c2a',
    accent: '#8b4513',
    border: '#d4c4a8',
    codeBg: '#ebe0c8'
  },
  {
    id: 'sticky-note',
    name: '便签纸',
    name_en: 'Sticky Note',
    background: '#fff9c4',
    text: '#5d4037',
    accent: '#ff8f00',
    border: '#ffe082',
    codeBg: '#fff59d'
  },
  {
    id: 'book-page',
    name: '书籍纸张',
    name_en: 'Book Page',
    background: '#fdf8f0',
    text: '#2c2c2c',
    accent: '#8b0000',
    border: '#e0d5c5',
    codeBg: '#f5efe6'
  },
  {
    id: 'coffee-stain',
    name: '咖啡渍',
    name_en: 'Coffee Stain',
    background: '#f0e6d8',
    text: '#4a3c34',
    accent: '#6f4e37',
    border: '#c9b8a8',
    codeBg: '#e8ddd0'
  },
  // 宇宙/自然主题
  {
    id: 'starry-night',
    name: '星空',
    name_en: 'Starry Night',
    background: '#0a0a1a',
    text: '#c9d1e8',
    accent: '#ffd700',
    border: '#1a1a3a',
    codeBg: '#151530'
  },
  {
    id: 'aurora',
    name: '极光',
    name_en: 'Aurora',
    background: '#0d1b2a',
    text: '#b8d4e3',
    accent: '#00ff87',
    border: '#1b3a4b',
    codeBg: '#152238'
  },
  {
    id: 'dawn',
    name: '晨曦',
    name_en: 'Dawn',
    background: '#fef3e2',
    text: '#4a3728',
    accent: '#ff7b54',
    border: '#f5dcc4',
    codeBg: '#fbe8d4'
  },
  {
    id: 'desert',
    name: '沙漠',
    name_en: 'Desert',
    background: '#f5e6d3',
    text: '#5c4033',
    accent: '#c4956a',
    border: '#dcc8b0',
    codeBg: '#ebe0d0'
  },
  {
    id: 'midnight',
    name: '午夜',
    name_en: 'Midnight',
    background: '#1a1a2e',
    text: '#a8b2d1',
    accent: '#64ffda',
    border: '#2d2d4a',
    codeBg: '#252542'
  },
  // 材质主题
  {
    id: 'marble',
    name: '大理石',
    name_en: 'Marble',
    background: '#f8f8f8',
    text: '#2d2d2d',
    accent: '#8e8e8e',
    border: '#e0e0e0',
    codeBg: '#f0f0f0'
  },
  {
    id: 'concrete',
    name: '水泥',
    name_en: 'Concrete',
    background: '#e5e5e5',
    text: '#333333',
    accent: '#6b6b6b',
    border: '#cccccc',
    codeBg: '#d9d9d9'
  },
  {
    id: 'silk',
    name: '丝绸',
    name_en: 'Silk',
    background: '#faf5f0',
    text: '#4a4045',
    accent: '#c9a8b0',
    border: '#e8e0dc',
    codeBg: '#f5efe8'
  },
  // 复古电子主题
  {
    id: 'terminal',
    name: '终端',
    name_en: 'Terminal',
    background: '#0d1117',
    text: '#58a6ff',
    accent: '#3fb950',
    border: '#21262d',
    codeBg: '#161b22'
  },
  {
    id: 'crt',
    name: 'CRT屏幕',
    name_en: 'CRT Screen',
    background: '#1a1a1a',
    text: '#33ff33',
    accent: '#ffaa00',
    border: '#2d2d2d',
    codeBg: '#0f380f'
  },
  {
    id: 'gameboy',
    name: 'GameBoy',
    name_en: 'GameBoy',
    background: '#9bbc0f',
    text: '#0f380f',
    accent: '#306230',
    border: '#8bac0f',
    codeBg: '#0f380f'
  },
  // 艺术风格主题
  {
    id: 'ukiyoe',
    name: '浮世绘',
    name_en: 'Ukiyo-e',
    background: '#f5efe5',
    text: '#2d2d2d',
    accent: '#e63946',
    border: '#d4c4b0',
    codeBg: '#e8e0d5'
  },
  {
    id: 'ink-wash',
    name: '水墨',
    name_en: 'Ink Wash',
    background: '#f4f1eb',
    text: '#1a1a1a',
    accent: '#8b0000',
    border: '#d4cfc5',
    codeBg: '#e8e4db'
  },
  {
    id: 'neon',
    name: '霓虹',
    name_en: 'Neon',
    background: '#0a0a0f',
    text: '#ffffff',
    accent: '#ff00ff',
    border: '#ff00ff',
    codeBg: '#1a0a1a'
  },
  // 功能性主题
  {
    id: 'high-contrast',
    name: '高对比',
    name_en: 'High Contrast',
    background: '#000000',
    text: '#ffff00',
    accent: '#00ffff',
    border: '#ffffff',
    codeBg: '#000000'
  },
  {
    id: 'focus',
    name: '专注模式',
    name_en: 'Focus Mode',
    background: '#fafafa',
    text: '#374151',
    accent: '#9ca3af',
    border: '#e5e7eb',
    codeBg: '#f3f4f6'
  }
];

// 主题CSS变量生成器
export function generateThemeCSS(theme: CustomTheme): string {
  return `
    --reader-bg: ${theme.background};
    --reader-text: ${theme.text};
    --reader-accent: ${theme.accent};
    --reader-border: ${theme.border};
    --reader-code-bg: ${theme.codeBg || theme.background};
  `;
}

// 获取主题预览样式
export function getThemePreviewStyle(theme: CustomTheme): React.CSSProperties {
  return {
    background: theme.background,
    color: theme.text,
    border: `2px solid ${theme.border}`,
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px'
  };
}
