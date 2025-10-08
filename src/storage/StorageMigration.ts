/**
 * 存储迁移工具
 * 从旧存储系统迁移到新的统一存储系统
 */

import { unifiedStorageManager, StorageKeys } from './UnifiedStorageManager';
import { documentMetadataModel, documentReadingProgressModel, userSettingsModel } from './models/UnifiedDocumentModel';
import { StorageError } from '../types/errors';

export interface MigrationResult {
  success: boolean;
  migratedItems: number;
  errors: string[];
  warnings: string[];
}

export interface MigrationOptions {
  backup: boolean;
  dryRun: boolean;
  force: boolean;
}

/**
 * 存储迁移器
 */
export class StorageMigration {
  private static instance: StorageMigration;

  private constructor() {}

  public static getInstance(): StorageMigration {
    if (!StorageMigration.instance) {
      StorageMigration.instance = new StorageMigration();
    }
    return StorageMigration.instance;
  }

  /**
   * 执行完整迁移
   */
  public async migrateAll(options: MigrationOptions = {
    backup: true,
    dryRun: false,
    force: false
  }): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      warnings: []
    };

    try {
      console.log('🚀 开始存储迁移...');

      if (options.backup) {
        await this.createBackup();
        console.log('📦 备份已创建');
      }

      if (options.dryRun) {
        console.log('🔍 执行干运行模式，不会实际修改数据');
      }

      // 迁移用户设置
      const settingsResult = await this.migrateUserSettings(options);
      result.migratedItems += settingsResult.migratedItems;
      result.errors.push(...settingsResult.errors);
      result.warnings.push(...settingsResult.warnings);

      // 迁移阅读进度
      const progressResult = await this.migrateReadingProgress(options);
      result.migratedItems += progressResult.migratedItems;
      result.errors.push(...progressResult.errors);
      result.warnings.push(...progressResult.warnings);

      // 迁移注释数据
      const annotationsResult = await this.migrateAnnotations(options);
      result.migratedItems += annotationsResult.migratedItems;
      result.errors.push(...annotationsResult.errors);
      result.warnings.push(...annotationsResult.warnings);

      // 迁移缓存数据
      const cacheResult = await this.migrateCacheData(options);
      result.migratedItems += cacheResult.migratedItems;
      result.errors.push(...cacheResult.errors);
      result.warnings.push(...cacheResult.warnings);

      result.success = result.errors.length === 0;

      console.log(`✅ 迁移完成 - 成功迁移 ${result.migratedItems} 项数据`);
      if (result.errors.length > 0) {
        console.warn(`⚠️ 迁移过程中出现 ${result.errors.length} 个错误`);
      }

      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      console.error('❌ 迁移失败:', error);
      return result;
    }
  }

  /**
   * 迁移用户设置
   */
  private async migrateUserSettings(options: MigrationOptions): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      warnings: []
    };

    try {
      // 从旧存储系统获取设置
      const oldSettings = await this.getOldSettings();
      
      if (Object.keys(oldSettings).length === 0) {
        result.warnings.push('未找到旧的用户设置数据');
        return result;
      }

      if (!options.dryRun) {
        // 创建新的用户设置
        const newSettings = await userSettingsModel.getOrCreateSettings('default');
        
        // 更新设置
        await userSettingsModel.updateSettings('default', {
          theme: oldSettings.theme || newSettings.theme,
          fontSize: oldSettings.fontSize || newSettings.fontSize,
          lineHeight: oldSettings.lineHeight || newSettings.lineHeight,
          fontFamily: oldSettings.fontFamily || newSettings.fontFamily,
          backgroundColor: oldSettings.backgroundColor || newSettings.backgroundColor,
          textAlign: oldSettings.textAlign || newSettings.textAlign,
          showImages: oldSettings.showImages !== undefined ? oldSettings.showImages : newSettings.showImages,
          codeFontSize: oldSettings.codeFontSize || newSettings.codeFontSize,
          codeTheme: oldSettings.codeTheme || newSettings.codeTheme,
          paragraphSpacing: oldSettings.paragraphSpacing || newSettings.paragraphSpacing
        });

        result.migratedItems++;
        console.log('✅ 用户设置已迁移');
      } else {
        result.migratedItems++;
        console.log('🔍 用户设置迁移（干运行）');
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`用户设置迁移失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 迁移阅读进度
   */
  private async migrateReadingProgress(options: MigrationOptions): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      warnings: []
    };

    try {
      // 从旧存储系统获取阅读进度
      const oldProgress = await this.getOldReadingProgress();
      
      if (oldProgress.length === 0) {
        result.warnings.push('未找到旧的阅读进度数据');
        return result;
      }

      for (const progress of oldProgress) {
        try {
          if (!options.dryRun) {
            // 检查是否已存在
            const existing = await documentReadingProgressModel.getByUrl(progress.url);
            
            if (existing && !options.force) {
              result.warnings.push(`阅读进度已存在，跳过: ${progress.url}`);
              continue;
            }

            if (existing) {
              // 更新现有进度
              await documentReadingProgressModel.updatePosition(
                existing.documentId,
                progress.scrollPosition || 0,
                progress.readingPercentage || 0
              );
            } else {
              // 创建新的阅读进度
              await documentReadingProgressModel.createProgress(
                progress.url,
                progress.title || '未知标题',
                progress.scrollPosition || 0
              );
            }

            result.migratedItems++;
          } else {
            result.migratedItems++;
          }
        } catch (error) {
          result.errors.push(`迁移阅读进度失败 ${progress.url}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`✅ 阅读进度已迁移 ${result.migratedItems} 项`);

    } catch (error) {
      result.success = false;
      result.errors.push(`阅读进度迁移失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 迁移注释数据
   */
  private async migrateAnnotations(options: MigrationOptions): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      warnings: []
    };

    try {
      // 从旧存储系统获取注释数据
      const oldAnnotations = await this.getOldAnnotations();
      
      if (oldAnnotations.length === 0) {
        result.warnings.push('未找到旧的注释数据');
        return result;
      }

      // 按URL分组注释
      const annotationsByUrl = new Map<string, any[]>();
      for (const annotation of oldAnnotations) {
        if (!annotationsByUrl.has(annotation.url)) {
          annotationsByUrl.set(annotation.url, []);
        }
        annotationsByUrl.get(annotation.url)!.push(annotation);
      }

      for (const [url, annotations] of annotationsByUrl) {
        try {
          if (!options.dryRun) {
            // 获取或创建阅读进度
            let progress = await documentReadingProgressModel.getByUrl(url);
            if (!progress) {
              progress = await documentReadingProgressModel.createProgress(url, '迁移的文档');
            }

            // 迁移高亮
            for (const annotation of annotations) {
              if (annotation.type === 'highlight') {
                await documentReadingProgressModel.addHighlight(
                  progress.documentId,
                  annotation.text,
                  annotation.position || 0,
                  annotation.color || '#ffeb3b',
                  annotation.note
                );
              } else if (annotation.type === 'note') {
                await documentReadingProgressModel.addAnnotation(
                  progress.documentId,
                  annotation.text,
                  annotation.position || 0,
                  annotation.content || annotation.note || ''
                );
              }
            }

            result.migratedItems += annotations.length;
          } else {
            result.migratedItems += annotations.length;
          }
        } catch (error) {
          result.errors.push(`迁移注释失败 ${url}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`✅ 注释数据已迁移 ${result.migratedItems} 项`);

    } catch (error) {
      result.success = false;
      result.errors.push(`注释数据迁移失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 迁移缓存数据
   */
  private async migrateCacheData(options: MigrationOptions): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      warnings: []
    };

    try {
      // 从旧存储系统获取缓存数据
      const oldCache = await this.getOldCacheData();
      
      if (oldCache.length === 0) {
        result.warnings.push('未找到旧的缓存数据');
        return result;
      }

      for (const cacheItem of oldCache) {
        try {
          if (!options.dryRun) {
            // 创建新的缓存数据
            const documentId = unifiedStorageManager.generateDocumentId(cacheItem.url || 'cache');
            
            await unifiedStorageManager.set(
              StorageKeys.CACHE_DATA,
              documentId,
              {
                documentId,
                url: cacheItem.url || '',
                title: cacheItem.title || '缓存数据',
                createdAt: cacheItem.createdAt || Date.now(),
                updatedAt: Date.now(),
                version: 1,
                key: cacheItem.key || 'unknown',
                data: cacheItem.data,
                ttl: cacheItem.ttl || 3600000, // 1小时
                size: JSON.stringify(cacheItem.data).length,
                hitCount: cacheItem.hitCount || 0,
                lastAccessed: Date.now(),
                expiresAt: Date.now() + (cacheItem.ttl || 3600000)
              }
            );

            result.migratedItems++;
          } else {
            result.migratedItems++;
          }
        } catch (error) {
          result.errors.push(`迁移缓存数据失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`✅ 缓存数据已迁移 ${result.migratedItems} 项`);

    } catch (error) {
      result.success = false;
      result.errors.push(`缓存数据迁移失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 创建备份
   */
  private async createBackup(): Promise<void> {
    try {
      const backupData = await unifiedStorageManager.exportData();
      const backupKey = `backup_${Date.now()}`;
      
      await chrome.storage.local.set({
        [backupKey]: {
          timestamp: Date.now(),
          data: backupData
        }
      });

      console.log(`📦 备份已创建: ${backupKey}`);
    } catch (error) {
      throw new StorageError('创建备份失败', { error });
    }
  }

  /**
   * 获取旧设置数据
   */
  private async getOldSettings(): Promise<any> {
    try {
      const result = await chrome.storage.local.get(null);
      const settings: any = {};

      // 从旧的存储键中提取设置
      const oldKeys = [
        'theme', 'fontSize', 'lineHeight', 'fontFamily', 'backgroundColor',
        'textAlign', 'showImages', 'codeFontSize', 'codeTheme', 'paragraphSpacing'
      ];

      for (const key of oldKeys) {
        if (result[key] !== undefined) {
          settings[key] = result[key];
        }
      }

      return settings;
    } catch (error) {
      console.warn('获取旧设置失败:', error);
      return {};
    }
  }

  /**
   * 获取旧阅读进度数据
   */
  private async getOldReadingProgress(): Promise<any[]> {
    try {
      const result = await chrome.storage.local.get('readingProgress');
      return result.readingProgress || [];
    } catch (error) {
      console.warn('获取旧阅读进度失败:', error);
      return [];
    }
  }

  /**
   * 获取旧注释数据
   */
  private async getOldAnnotations(): Promise<any[]> {
    try {
      const result = await chrome.storage.local.get(null);
      const annotations: any[] = [];

      // 查找可能的注释数据
      for (const [key, value] of Object.entries(result)) {
        if (key.includes('annotation') || key.includes('highlight') || key.includes('note')) {
          if (Array.isArray(value)) {
            annotations.push(...value);
          } else if (value && typeof value === 'object') {
            annotations.push(value);
          }
        }
      }

      return annotations;
    } catch (error) {
      console.warn('获取旧注释数据失败:', error);
      return [];
    }
  }

  /**
   * 获取旧缓存数据
   */
  private async getOldCacheData(): Promise<any[]> {
    try {
      const result = await chrome.storage.local.get(null);
      const cacheData: any[] = [];

      // 查找可能的缓存数据
      for (const [key, value] of Object.entries(result)) {
        if (key.includes('cache') || key.includes('extracted') || key.includes('processed')) {
          if (value && typeof value === 'object') {
            cacheData.push({
              key,
              data: value,
              url: (value as any).url,
              title: (value as any).title,
              createdAt: (value as any).createdAt || Date.now(),
              ttl: (value as any).ttl || 3600000,
              hitCount: (value as any).hitCount || 0
            });
          }
        }
      }

      return cacheData;
    } catch (error) {
      console.warn('获取旧缓存数据失败:', error);
      return [];
    }
  }

  /**
   * 清理旧数据
   */
  public async cleanupOldData(): Promise<void> {
    try {
      const oldKeys = [
        'theme', 'fontSize', 'lineHeight', 'fontFamily', 'backgroundColor',
        'textAlign', 'showImages', 'codeFontSize', 'codeTheme', 'paragraphSpacing',
        'readingProgress', 'activePreset', 'customPresets'
      ];

      await chrome.storage.local.remove(oldKeys);
      console.log('🧹 旧数据已清理');

    } catch (error) {
      throw new StorageError('清理旧数据失败', { error });
    }
  }

  /**
   * 验证迁移结果
   */
  public async validateMigration(): Promise<{
    success: boolean;
    issues: string[];
    stats: {
      totalDocuments: number;
      totalSize: number;
      byType: Record<string, number>;
    };
  }> {
    try {
      const stats = await unifiedStorageManager.getStorageStats();
      const issues: string[] = [];

      // 检查基本数据完整性
      if (stats.totalDocuments === 0) {
        issues.push('迁移后没有找到任何文档数据');
      }

      if (stats.totalSize === 0) {
        issues.push('迁移后存储大小为0');
      }

      // 检查用户设置
      const settings = await userSettingsModel.getOrCreateSettings('default');
      if (!settings.documentId) {
        issues.push('用户设置未正确迁移');
      }

      return {
        success: issues.length === 0,
        issues,
        stats
      };

    } catch (error) {
      return {
        success: false,
        issues: [`验证失败: ${error instanceof Error ? error.message : String(error)}`],
        stats: {
          totalDocuments: 0,
          totalSize: 0,
          byType: {}
        }
      };
    }
  }
}

// 导出单例实例
export const storageMigration = StorageMigration.getInstance();
