import { ReadingPreset } from '../storage/storage';
import { DEFAULT_SETTINGS /*, getCompleteSettings */ } from '../constants/defaultSettings';

/**
 * 内置预设列表
 */
export const builtInPresets: ReadingPreset[] = [
  {
    id: 'default',
    name: '默认',
    description: '默认阅读设置',
    isBuiltIn: true,
    settings: {
      theme: DEFAULT_SETTINGS.theme,
      fontSize: DEFAULT_SETTINGS.fontSize,
      codeFontSize: DEFAULT_SETTINGS.codeFontSize,
      codeTheme: DEFAULT_SETTINGS.codeTheme,
      lineHeight: DEFAULT_SETTINGS.lineHeight,
      paragraphSpacing: DEFAULT_SETTINGS.paragraphSpacing,
      textAlign: DEFAULT_SETTINGS.textAlign,
      showImages: DEFAULT_SETTINGS.showImages,
      fontFamily: DEFAULT_SETTINGS.fontFamily,
      backgroundColor: DEFAULT_SETTINGS.backgroundColor,
    }
  },
  {
    id: 'dark-comfort',
    name: '暗色舒适',
    description: '深色背景配合舒适字体，减少眼睡',
    isBuiltIn: true,
    settings: {
      theme: 'dark',
      fontSize: 19,
      codeFontSize: 15,
      codeTheme: 'one-dark',
      lineHeight: 1.8,
      paragraphSpacing: 1.5,
      textAlign: 'left',
      fontFamily: 'songti',
      backgroundColor: 'cool',
    }
  },
  {
    id: 'comfortable',
    name: '舒适阅读',
    description: '更大的字体和更宽松的间距，适合长时间阅读',
    isBuiltIn: true,
    settings: {
      theme: 'light',
      fontSize: 20,
      lineHeight: 1.8,
      paragraphSpacing: 1.5,
      textAlign: 'left',
      fontFamily: 'songti',
      backgroundColor: 'cream',
    }
  },
  {
    id: 'compact',
    name: '紧凑模式',
    description: '更小的字体和更紧凑的间距，适合信息密集型内容',
    isBuiltIn: true,
    settings: {
      theme: 'light',
      fontSize: 16,
      lineHeight: 1.3,
      paragraphSpacing: 0.8,
      textAlign: 'justify',
      fontFamily: 'heiti',
      backgroundColor: 'white',
    }
  },
  {
    id: 'night',
    name: '夜间模式',
    description: '深色背景，适合夜间阅读',
    isBuiltIn: true,
    settings: {
      theme: 'dark',
      fontSize: 18,
      codeFontSize: 14,
      codeTheme: 'one-dark',
      lineHeight: 1.7,
      paragraphSpacing: 1.4,
      textAlign: 'left',
      fontFamily: 'default',
      backgroundColor: 'cool',
    }
  },
  {
    id: 'focus',
    name: '专注模式',
    description: '简洁的布局，无图片，适合需要专注的阅读',
    isBuiltIn: true,
    settings: {
      theme: 'light',
      fontSize: 19,
      codeFontSize: 15,
      codeTheme: 'github',
      lineHeight: 1.7,
      paragraphSpacing: 1.3,
      textAlign: 'left',
      showImages: false,
      fontFamily: 'default',
      backgroundColor: 'gray',
    }
  },
  {
    id: 'academic',
    name: '学术阅读',
    description: '适合学术论文和技术文档的阅读',
    isBuiltIn: true,
    settings: {
      theme: 'light',
      fontSize: 17,
      codeFontSize: 15,
      codeTheme: 'github',
      lineHeight: 1.6,
      paragraphSpacing: 1.2,
      textAlign: 'justify',
      showImages: true,
      fontFamily: 'default',
      backgroundColor: 'cool',
    }
  },
  {
    id: 'novel',
    name: '小说模式',
    description: '适合小说和长篇文学作品的阅读',
    isBuiltIn: true,
    settings: {
      theme: 'light',
      fontSize: 19,
      lineHeight: 1.8,
      paragraphSpacing: 1.5,
      textAlign: 'justify',
      showImages: true,
      fontFamily: 'songti',
      backgroundColor: 'sepia',
    }
  },
];
