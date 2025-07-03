import { create } from 'zustand';
import { readingProgressModel } from '../storage/models/ReadingProgressModel';
import { ReadingProgress } from '../content/components/ReaderView/types';

// 定义阅读进度状态接口
interface ReadingProgressState {
  // 当前URL的阅读进度
  currentProgress: ReadingProgress | null;
  // 是否正在加载
  isLoading: boolean;
  // 获取当前URL的阅读进度
  getProgress: (url: string) => Promise<ReadingProgress | null>;
  // 保存阅读进度
  saveProgress: (url: string, scrollPosition: number, title: string) => Promise<void>;
  // 删除阅读进度
  deleteProgress: (url: string) => Promise<void>;
  // 获取所有阅读进度
  getAllProgress: () => Promise<ReadingProgress[]>;
}

// 创建阅读进度状态管理器
export const useReadingProgressStore = create<ReadingProgressState>()((set, get) => ({
  // 初始状态
  currentProgress: null,
  isLoading: false,

  // 获取当前URL的阅读进度
  getProgress: async (url: string) => {
    try {
      set({ isLoading: true });
      const progress = await readingProgressModel.getProgress(url);
      set({ currentProgress: progress, isLoading: false });
      return progress;
    } catch (error) {
      console.error('获取阅读进度失败', error);
      set({ isLoading: false });
      return null;
    }
  },

  // 保存阅读进度
  saveProgress: async (url: string, scrollPosition: number, title: string) => {
    try {
      set({ isLoading: true });
      const lastRead = Date.now();
      const progress: ReadingProgress = { 
        url, 
        scrollPosition, 
        lastRead,
        title
      };
      await readingProgressModel.saveProgress(progress);
      set({ currentProgress: progress, isLoading: false });
    } catch (error) {
      console.error('保存阅读进度失败', error);
      set({ isLoading: false });
    }
  },

  // 删除阅读进度
  deleteProgress: async (url: string) => {
    try {
      set({ isLoading: true });
      await readingProgressModel.deleteProgress(url);
      set({ currentProgress: null, isLoading: false });
    } catch (error) {
      console.error('删除阅读进度失败', error);
      set({ isLoading: false });
    }
  },

  // 获取所有阅读进度
  getAllProgress: async () => {
    try {
      set({ isLoading: true });
      const allProgress = await readingProgressModel.getAllProgress();
      set({ isLoading: false });
      return allProgress;
    } catch (error) {
      console.error('获取所有阅读进度失败', error);
      set({ isLoading: false });
      return [];
    }
  }
})); 