/**
 * 统一文档模型
 * 基于documentId的文档数据管理
 */

import { 
  unifiedStorageManager, 
  StorageKeys, 
  BaseDocument, 
  DocumentMetadata, 
  DocumentReadingProgress, 
  UserSettings,
  CacheData,
  PerformanceStats
} from '../UnifiedStorageManager';
import { StorageError } from '../../types/errors';

/**
 * 统一文档模型基类
 */
export abstract class UnifiedDocumentModel<T extends BaseDocument> {
  protected abstract readonly storageKey: StorageKeys;

  /**
   * 创建文档
   */
  public async create(data: Omit<T, keyof BaseDocument>, url: string, title?: string): Promise<T> {
    try {
      const documentId = unifiedStorageManager.generateDocumentId(url, title);
      const now = Date.now();

      const document: T = {
        ...data,
        documentId,
        url,
        title: title || '',
        createdAt: now,
        updatedAt: now,
        version: 1
      } as T;

      await unifiedStorageManager.set(this.storageKey, documentId, document);
      return document;

    } catch (error) {
      throw new StorageError(`创建文档失败: ${this.storageKey}`, {
        url,
        title,
        data,
        error
      });
    }
  }

  /**
   * 获取文档
   */
  public async get(documentId: string): Promise<T | null> {
    try {
      return await unifiedStorageManager.get<T>(this.storageKey, documentId);
    } catch (error) {
      throw new StorageError(`获取文档失败: ${this.storageKey}`, {
        documentId,
        error
      });
    }
  }

  /**
   * 根据URL获取文档
   */
  public async getByUrl(url: string): Promise<T | null> {
    try {
      return await unifiedStorageManager.findByUrl<T>(this.storageKey, url);
    } catch (error) {
      throw new StorageError(`根据URL获取文档失败: ${this.storageKey}`, {
        url,
        error
      });
    }
  }

  /**
   * 更新文档
   */
  public async update(documentId: string, updates: Partial<Omit<T, keyof BaseDocument>>): Promise<T> {
    try {
      const existing = await this.get(documentId);
      if (!existing) {
        throw new Error(`文档不存在: ${documentId}`);
      }

      const updated: T = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
        version: existing.version + 1
      };

      await unifiedStorageManager.set(this.storageKey, documentId, updated);
      return updated;

    } catch (error) {
      throw new StorageError(`更新文档失败: ${this.storageKey}`, {
        documentId,
        updates,
        error
      });
    }
  }

  /**
   * 删除文档
   */
  public async delete(documentId: string): Promise<void> {
    try {
      await unifiedStorageManager.delete(this.storageKey, documentId);
    } catch (error) {
      throw new StorageError(`删除文档失败: ${this.storageKey}`, {
        documentId,
        error
      });
    }
  }

  /**
   * 获取所有文档
   */
  public async getAll(): Promise<T[]> {
    try {
      return await unifiedStorageManager.getAll<T>(this.storageKey);
    } catch (error) {
      throw new StorageError(`获取所有文档失败: ${this.storageKey}`, {
        error
      });
    }
  }

  /**
   * 批量操作
   */
  public async batch(operations: Array<{
    type: 'get' | 'update' | 'delete';
    documentId: string;
    updates?: Partial<Omit<T, keyof BaseDocument>>;
  }>): Promise<Array<T | null>> {
    try {
      const storageOperations = operations.map(op => ({
        type: op.type === 'get' ? 'get' as const : 
              op.type === 'update' ? 'set' as const : 'delete' as const,
        key: this.storageKey,
        documentId: op.documentId,
        data: op.type === 'update' && op.updates ? 
          await this.update(op.documentId, op.updates) : undefined
      }));

      return await unifiedStorageManager.batch(storageOperations);

    } catch (error) {
      throw new StorageError(`批量操作失败: ${this.storageKey}`, {
        operations,
        error
      });
    }
  }
}

/**
 * 文档元数据模型
 */
export class DocumentMetadataModel extends UnifiedDocumentModel<DocumentMetadata> {
  protected readonly storageKey = StorageKeys.DOCUMENT_METADATA;

  /**
   * 创建文档元数据
   */
  public async createMetadata(
    url: string,
    title: string,
    content: string,
    options: {
      type?: DocumentMetadata['type'];
      language?: string;
      author?: string;
      publishDate?: number;
      tags?: string[];
      category?: string;
    } = {}
  ): Promise<DocumentMetadata> {
    const wordCount = this.countWords(content);
    const readingTime = Math.ceil(wordCount / 200); // 假设每分钟200字

    return this.create({
      type: options.type || 'webpage',
      language: options.language || 'zh-CN',
      wordCount,
      readingTime,
      tags: options.tags || [],
      category: options.category || 'uncategorized',
      author: options.author,
      publishDate: options.publishDate,
      lastAccessed: Date.now(),
      accessCount: 1
    }, url, title);
  }

  /**
   * 更新访问记录
   */
  public async updateAccess(documentId: string): Promise<DocumentMetadata> {
    const existing = await this.get(documentId);
    if (!existing) {
      throw new Error(`文档元数据不存在: ${documentId}`);
    }

    return this.update(documentId, {
      lastAccessed: Date.now(),
      accessCount: existing.accessCount + 1
    });
  }

  /**
   * 按类别获取文档
   */
  public async getByCategory(category: string): Promise<DocumentMetadata[]> {
    const allDocs = await this.getAll();
    return allDocs.filter(doc => doc.category === category);
  }

  /**
   * 按标签获取文档
   */
  public async getByTag(tag: string): Promise<DocumentMetadata[]> {
    const allDocs = await this.getAll();
    return allDocs.filter(doc => doc.tags.includes(tag));
  }

  /**
   * 搜索文档
   */
  public async search(query: string): Promise<DocumentMetadata[]> {
    const allDocs = await this.getAll();
    const lowerQuery = query.toLowerCase();
    
    return allDocs.filter(doc => 
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.url.toLowerCase().includes(lowerQuery) ||
      doc.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      doc.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 统计字数
   */
  private countWords(text: string): number {
    return text.replace(/\s+/g, ' ').trim().split(' ').length;
  }
}

/**
 * 阅读进度模型
 */
export class DocumentReadingProgressModel extends UnifiedDocumentModel<DocumentReadingProgress> {
  protected readonly storageKey = StorageKeys.READING_PROGRESS;

  /**
   * 创建阅读进度
   */
  public async createProgress(
    url: string,
    title: string,
    initialPosition: number = 0
  ): Promise<DocumentReadingProgress> {
    return this.create({
      scrollPosition: initialPosition,
      readingPercentage: 0,
      lastReadPosition: initialPosition,
      bookmarks: [],
      highlights: [],
      annotations: [],
      readingSessions: []
    }, url, title);
  }

  /**
   * 更新阅读位置
   */
  public async updatePosition(
    documentId: string,
    scrollPosition: number,
    readingPercentage: number
  ): Promise<DocumentReadingProgress> {
    return this.update(documentId, {
      scrollPosition,
      readingPercentage,
      lastReadPosition: scrollPosition
    });
  }

  /**
   * 添加书签
   */
  public async addBookmark(
    documentId: string,
    position: number,
    title: string
  ): Promise<DocumentReadingProgress> {
    const existing = await this.get(documentId);
    if (!existing) {
      throw new Error(`阅读进度不存在: ${documentId}`);
    }

    const bookmark = {
      id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position,
      title,
      createdAt: Date.now()
    };

    return this.update(documentId, {
      bookmarks: [...existing.bookmarks, bookmark]
    });
  }

  /**
   * 添加高亮
   */
  public async addHighlight(
    documentId: string,
    text: string,
    position: number,
    color: string,
    note?: string
  ): Promise<DocumentReadingProgress> {
    const existing = await this.get(documentId);
    if (!existing) {
      throw new Error(`阅读进度不存在: ${documentId}`);
    }

    const highlight = {
      id: `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      position,
      color,
      note,
      createdAt: Date.now()
    };

    return this.update(documentId, {
      highlights: [...existing.highlights, highlight]
    });
  }

  /**
   * 添加注释
   */
  public async addAnnotation(
    documentId: string,
    text: string,
    position: number,
    content: string
  ): Promise<DocumentReadingProgress> {
    const existing = await this.get(documentId);
    if (!existing) {
      throw new Error(`阅读进度不存在: ${documentId}`);
    }

    const annotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      position,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return this.update(documentId, {
      annotations: [...existing.annotations, annotation]
    });
  }

  /**
   * 开始阅读会话
   */
  public async startReadingSession(documentId: string): Promise<string> {
    const existing = await this.get(documentId);
    if (!existing) {
      throw new Error(`阅读进度不存在: ${documentId}`);
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      progress: 0
    };

    await this.update(documentId, {
      readingSessions: [...existing.readingSessions, session]
    });

    return sessionId;
  }

  /**
   * 结束阅读会话
   */
  public async endReadingSession(
    documentId: string,
    sessionId: string,
    progress: number
  ): Promise<DocumentReadingProgress> {
    const existing = await this.get(documentId);
    if (!existing) {
      throw new Error(`阅读进度不存在: ${documentId}`);
    }

    const now = Date.now();
    const updatedSessions = existing.readingSessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          endTime: now,
          duration: now - session.startTime,
          progress
        };
      }
      return session;
    });

    return this.update(documentId, {
      readingSessions: updatedSessions
    });
  }

  /**
   * 获取阅读统计
   */
  public async getReadingStats(documentId: string): Promise<{
    totalSessions: number;
    totalReadingTime: number;
    averageSessionDuration: number;
    lastReadDate: number;
    progressPercentage: number;
    bookmarkCount: number;
    highlightCount: number;
    annotationCount: number;
  }> {
    const progress = await this.get(documentId);
    if (!progress) {
      throw new Error(`阅读进度不存在: ${documentId}`);
    }

    const completedSessions = progress.readingSessions.filter(s => s.endTime > 0);
    const totalReadingTime = completedSessions.reduce((sum, s) => sum + s.duration, 0);
    const averageSessionDuration = completedSessions.length > 0 ? 
      totalReadingTime / completedSessions.length : 0;

    return {
      totalSessions: progress.readingSessions.length,
      totalReadingTime,
      averageSessionDuration,
      lastReadDate: progress.lastReadPosition,
      progressPercentage: progress.readingPercentage,
      bookmarkCount: progress.bookmarks.length,
      highlightCount: progress.highlights.length,
      annotationCount: progress.annotations.length
    };
  }
}

/**
 * 用户设置模型
 */
export class UserSettingsModel extends UnifiedDocumentModel<UserSettings> {
  protected readonly storageKey = StorageKeys.USER_SETTINGS;

  /**
   * 获取或创建用户设置
   */
  public async getOrCreateSettings(userId: string = 'default'): Promise<UserSettings> {
    const existing = await this.getByUrl(userId);
    if (existing) {
      return existing;
    }

    return this.create({
      theme: 'light',
      fontSize: 16,
      lineHeight: 1.6,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#ffffff',
      textAlign: 'left',
      showImages: true,
      codeFontSize: 14,
      codeTheme: 'github',
      paragraphSpacing: 1.2,
      preferences: {
        autoSave: true,
        syncAcrossDevices: true,
        showReadingTime: true,
        enableAnnotations: true,
        enableHighlights: true,
        enableBookmarks: true
      }
    }, userId, '用户设置');
  }

  /**
   * 更新设置
   */
  public async updateSettings(
    userId: string,
    settings: Partial<Omit<UserSettings, keyof BaseDocument>>
  ): Promise<UserSettings> {
    const existing = await this.getByUrl(userId);
    if (!existing) {
      return this.getOrCreateSettings(userId);
    }

    return this.update(existing.documentId, settings);
  }
}

// 导出模型实例
export const documentMetadataModel = new DocumentMetadataModel();
export const documentReadingProgressModel = new DocumentReadingProgressModel();
export const userSettingsModel = new UserSettingsModel();
