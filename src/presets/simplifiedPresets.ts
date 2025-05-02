import { ReadingPreset } from '../storage/storage';
import { DEFAULT_SETTINGS, getCompleteSettings } from '../constants/defaultSettings';

/**
 * 精心设计的核心预设列表
 * 每个预设都针对特定的阅读场景进行了优化
 */
export const simplifiedPresets: ReadingPreset[] = [
  {
    id: 'paper',
    name: '纸质书',
    description: '模拟传统纸质书籍的阅读体验',
    isBuiltIn: true,
    settings: getCompleteSettings({
      theme: 'light',
      fontSize: 18,
      lineHeight: 1.7,
      lineSpacing: 1.8,
      letterSpacing: 0.2,
      pageWidth: 700,
      textAlign: 'justify',
      firstLineIndent: true,
      showImages: true,
      fontFamily: 'songti',
      backgroundColor: 'cream',
      paragraphSpacing: 1.2,
      codeTheme: 'github',
      codeFontSize: 15,
    })
  },
  {
    id: 'night-reading',
    name: '夜间阅读',
    description: '深色护眼模式，减少蓝光伤害',
    isBuiltIn: true,
    settings: getCompleteSettings({
      theme: 'dark',
      fontSize: 18,
      lineHeight: 1.8,
      lineSpacing: 1.9,
      letterSpacing: 0.3,
      pageWidth: 720,
      textAlign: 'left',
      firstLineIndent: true,
      showImages: true,
      fontFamily: 'heiti',
      backgroundColor: 'cool',
      paragraphSpacing: 1.4,
      codeTheme: 'dracula',
      codeFontSize: 15,
    })
  },
  {
    id: 'tech-doc',
    name: '技术文档',
    description: '优化代码显示和技术内容阅读',
    isBuiltIn: true,
    settings: getCompleteSettings({
      theme: 'light',
      fontSize: 16,
      lineHeight: 1.6,
      lineSpacing: 1.7,
      letterSpacing: 0.1,
      pageWidth: 800,
      textAlign: 'left',
      firstLineIndent: false,
      showImages: true,
      showDirectory: true,
      fontFamily: 'default',
      backgroundColor: 'white',
      paragraphSpacing: 1.0,
      codeTheme: 'one-dark',
      codeFontSize: 15,
    })
  },
  {
    id: 'focus',
    name: '专注模式',
    description: '无干扰阅读，专注于文字内容',
    isBuiltIn: true,
    settings: getCompleteSettings({
      theme: 'light',
      fontSize: 17,
      lineHeight: 1.7,
      lineSpacing: 1.8,
      letterSpacing: 0.2,
      pageWidth: 650,
      textAlign: 'left',
      firstLineIndent: true,
      showImages: false,
      showDirectory: false,
      fontFamily: 'default',
      backgroundColor: 'gray',
      paragraphSpacing: 1.3,
      codeTheme: 'github',
      codeFontSize: 14,
    })
  }
];

export default simplifiedPresets;
