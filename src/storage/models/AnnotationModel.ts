import { STORAGE_KEYS } from '../../constants';
import { Annotation } from '../../types';
import { StorageError } from '../../types/errors';
import { storage } from '../index';

/**
 * 注释管理
 */
export class AnnotationModel {
  /**
   * 保存注释
   */
  public async saveAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Annotation> {
    try {
      const now = Date.now();
      const id = `annotation_${now}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newAnnotation: Annotation = {
        id,
        ...annotation,
        createdAt: now,
        updatedAt: now
      };
      
      await storage.add(STORAGE_KEYS.ANNOTATIONS, newAnnotation);
      
      return newAnnotation;
    } catch (error) {
      throw new StorageError('保存注释失败', {
        annotation,
        error
      });
    }
  }

  /**
   * 更新注释
   */
  public async updateAnnotation(id: string, updates: Partial<Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Annotation> {
    try {
      const annotation = await this.getAnnotation(id);
      
      if (!annotation) {
        throw new StorageError('注释不存在', { id });
      }
      
      const updatedAnnotation: Annotation = {
        ...annotation,
        ...updates,
        updatedAt: Date.now()
      };
      
      await storage.update(STORAGE_KEYS.ANNOTATIONS, updatedAnnotation);
      
      return updatedAnnotation;
    } catch (error) {
      throw new StorageError('更新注释失败', {
        id,
        updates,
        error
      });
    }
  }

  /**
   * 获取单个注释
   */
  public async getAnnotation(id: string): Promise<Annotation | null> {
    try {
      return await storage.get<Annotation>(STORAGE_KEYS.ANNOTATIONS, id);
    } catch (error) {
      throw new StorageError('获取注释失败', {
        id,
        error
      });
    }
  }

  /**
   * 获取页面所有注释
   */
  public async getAnnotationsByUrl(url: string): Promise<Annotation[]> {
    try {
      const annotations = await storage.getByIndex<Annotation>(STORAGE_KEYS.ANNOTATIONS, 'url', url);
      
      // 按创建时间排序（最新的在前）
      return annotations.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new StorageError('获取页面注释失败', {
        url,
        error
      });
    }
  }

  /**
   * 删除注释
   */
  public async deleteAnnotation(id: string): Promise<void> {
    try {
      await storage.delete(STORAGE_KEYS.ANNOTATIONS, id);
    } catch (error) {
      throw new StorageError('删除注释失败', {
        id,
        error
      });
    }
  }

  /**
   * 删除页面所有注释
   */
  public async deleteAnnotationsByUrl(url: string): Promise<void> {
    try {
      const annotations = await this.getAnnotationsByUrl(url);
      
      const deletePromises = annotations.map(annotation => 
        storage.delete(STORAGE_KEYS.ANNOTATIONS, annotation.id)
      );
      
      await Promise.all(deletePromises);
    } catch (error) {
      throw new StorageError('删除页面注释失败', {
        url,
        error
      });
    }
  }

  /**
   * 获取所有注释
   */
  public async getAllAnnotations(): Promise<Annotation[]> {
    try {
      const annotations = await storage.getAll<Annotation>(STORAGE_KEYS.ANNOTATIONS);
      
      // 按创建时间排序（最新的在前）
      return annotations.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new StorageError('获取所有注释失败', error);
    }
  }

  /**
   * 清空所有注释
   */
  public async clearAllAnnotations(): Promise<void> {
    try {
      await storage.clear(STORAGE_KEYS.ANNOTATIONS);
    } catch (error) {
      throw new StorageError('清空所有注释失败', error);
    }
  }
}

// 创建并导出单例
export const annotationModel = new AnnotationModel(); 