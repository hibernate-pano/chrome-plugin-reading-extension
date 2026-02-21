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
