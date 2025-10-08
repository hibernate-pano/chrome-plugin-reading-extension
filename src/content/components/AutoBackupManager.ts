/**
 * 自动备份管理器
 * 提供数据自动备份、恢复和版本管理功能
 */

export interface BackupData {
  id: string;
  timestamp: number;
  version: string;
  data: {
    settings: any;
    readingProgress: any[];
    annotations: any[];
    metadata: any[];
  };
  size: number;
  checksum: string;
}

export interface BackupConfig {
  enabled: boolean;
  interval: number; // 备份间隔（毫秒）
  maxBackups: number; // 最大备份数量
  autoCleanup: boolean; // 自动清理旧备份
  compression: boolean; // 是否压缩备份数据
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackupTime: number;
  nextBackupTime: number;
  oldestBackup: number;
  newestBackup: number;
}

/**
 * 自动备份管理器
 */
export class AutoBackupManager {
  private static instance: AutoBackupManager;
  private config: BackupConfig;
  private backupTimer: number | null = null;
  private isBackingUp = false;
  private backups: BackupData[] = [];

  private constructor() {
    this.config = {
      enabled: true,
      interval: 24 * 60 * 60 * 1000, // 24小时
      maxBackups: 10,
      autoCleanup: true,
      compression: true
    };
    
    this.loadBackups();
    this.startAutoBackup();
  }

  public static getInstance(): AutoBackupManager {
    if (!AutoBackupManager.instance) {
      AutoBackupManager.instance = new AutoBackupManager();
    }
    return AutoBackupManager.instance;
  }

  /**
   * 启动自动备份
   */
  private startAutoBackup(): void {
    if (!this.config.enabled) return;

    this.backupTimer = window.setInterval(() => {
      this.performBackup();
    }, this.config.interval);

    console.log('🔄 自动备份已启动，间隔:', this.config.interval / (60 * 60 * 1000), '小时');
  }

  /**
   * 停止自动备份
   */
  private stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
      console.log('⏹️ 自动备份已停止');
    }
  }

  /**
   * 执行备份
   */
  public async performBackup(): Promise<BackupData | null> {
    if (this.isBackingUp) {
      console.log('⏳ 备份正在进行中，跳过此次备份');
      return null;
    }

    this.isBackingUp = true;
    console.log('🔄 开始执行自动备份...');

    try {
      const backupData = await this.createBackup();
      
      if (backupData) {
        await this.saveBackup(backupData);
        this.backups.push(backupData);
        
        // 自动清理旧备份
        if (this.config.autoCleanup) {
          await this.cleanupOldBackups();
        }
        
        console.log('✅ 自动备份完成:', backupData.id);
        return backupData;
      }
    } catch (error) {
      console.error('❌ 自动备份失败:', error);
    } finally {
      this.isBackingUp = false;
    }

    return null;
  }

  /**
   * 创建备份数据
   */
  private async createBackup(): Promise<BackupData | null> {
    try {
      const timestamp = Date.now();
      const backupId = `backup_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 收集所有数据
      const [settings, readingProgress, annotations, metadata] = await Promise.all([
        this.collectSettings(),
        this.collectReadingProgress(),
        this.collectAnnotations(),
        this.collectMetadata()
      ]);

      const data = {
        settings,
        readingProgress,
        annotations,
        metadata
      };

      // 计算数据大小和校验和
      const dataString = JSON.stringify(data);
      const size = new Blob([dataString]).size;
      const checksum = await this.calculateChecksum(dataString);

      const backup: BackupData = {
        id: backupId,
        timestamp,
        version: '1.0.0',
        data,
        size,
        checksum
      };

      return backup;
    } catch (error) {
      console.error('❌ 创建备份数据失败:', error);
      return null;
    }
  }

  /**
   * 收集设置数据
   */
  private async collectSettings(): Promise<any> {
    try {
      const settings = await chrome.storage.sync.get();
      return settings;
    } catch (error) {
      console.warn('⚠️ 收集设置数据失败:', error);
      return {};
    }
  }

  /**
   * 收集阅读进度数据
   */
  private async collectReadingProgress(): Promise<any[]> {
    try {
      const progress = await chrome.storage.local.get(['readingProgress']);
      return progress.readingProgress || [];
    } catch (error) {
      console.warn('⚠️ 收集阅读进度数据失败:', error);
      return [];
    }
  }

  /**
   * 收集注释数据
   */
  private async collectAnnotations(): Promise<any[]> {
    try {
      const annotations = await chrome.storage.sync.get(['annotations']);
      return annotations.annotations || [];
    } catch (error) {
      console.warn('⚠️ 收集注释数据失败:', error);
      return [];
    }
  }

  /**
   * 收集元数据
   */
  private async collectMetadata(): Promise<any[]> {
    try {
      const metadata = await chrome.storage.local.get(['documentMetadata']);
      return metadata.documentMetadata || [];
    } catch (error) {
      console.warn('⚠️ 收集元数据失败:', error);
      return [];
    }
  }

  /**
   * 计算校验和
   */
  private async calculateChecksum(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('⚠️ 计算校验和失败:', error);
      return '';
    }
  }

  /**
   * 保存备份
   */
  private async saveBackup(backup: BackupData): Promise<void> {
    try {
      const backupKey = `backup_${backup.id}`;
      await chrome.storage.local.set({ [backupKey]: backup });
      
      // 更新备份列表
      await this.updateBackupList();
    } catch (error) {
      console.error('❌ 保存备份失败:', error);
      throw error;
    }
  }

  /**
   * 更新备份列表
   */
  private async updateBackupList(): Promise<void> {
    try {
      const backupList = this.backups.map(b => ({
        id: b.id,
        timestamp: b.timestamp,
        size: b.size,
        checksum: b.checksum
      }));
      
      await chrome.storage.local.set({ backupList });
    } catch (error) {
      console.error('❌ 更新备份列表失败:', error);
    }
  }

  /**
   * 加载备份列表
   */
  private async loadBackups(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['backupList']);
      const backupList = result.backupList || [];
      
      // 加载备份详情
      for (const backupInfo of backupList) {
        const backupKey = `backup_${backupInfo.id}`;
        const backupResult = await chrome.storage.local.get([backupKey]);
        if (backupResult[backupKey]) {
          this.backups.push(backupResult[backupKey]);
        }
      }
      
      // 按时间排序
      this.backups.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`📦 已加载 ${this.backups.length} 个备份`);
    } catch (error) {
      console.error('❌ 加载备份列表失败:', error);
    }
  }

  /**
   * 清理旧备份
   */
  private async cleanupOldBackups(): Promise<void> {
    if (this.backups.length <= this.config.maxBackups) return;

    const backupsToDelete = this.backups.slice(this.config.maxBackups);
    
    for (const backup of backupsToDelete) {
      try {
        const backupKey = `backup_${backup.id}`;
        await chrome.storage.local.remove([backupKey]);
        console.log(`🗑️ 已删除旧备份: ${backup.id}`);
      } catch (error) {
        console.error(`❌ 删除备份失败: ${backup.id}`, error);
      }
    }
    
    // 更新备份列表
    this.backups = this.backups.slice(0, this.config.maxBackups);
    await this.updateBackupList();
    
    console.log(`🧹 已清理 ${backupsToDelete.length} 个旧备份`);
  }

  /**
   * 恢复备份
   */
  public async restoreBackup(backupId: string): Promise<boolean> {
    try {
      const backupKey = `backup_${backupId}`;
      const result = await chrome.storage.local.get([backupKey]);
      const backup = result[backupKey];
      
      if (!backup) {
        console.error('❌ 备份不存在:', backupId);
        return false;
      }

      console.log('🔄 开始恢复备份:', backupId);

      // 恢复设置
      if (backup.data.settings) {
        await chrome.storage.sync.set(backup.data.settings);
        console.log('✅ 设置已恢复');
      }

      // 恢复阅读进度
      if (backup.data.readingProgress) {
        await chrome.storage.local.set({ readingProgress: backup.data.readingProgress });
        console.log('✅ 阅读进度已恢复');
      }

      // 恢复注释
      if (backup.data.annotations) {
        await chrome.storage.sync.set({ annotations: backup.data.annotations });
        console.log('✅ 注释已恢复');
      }

      // 恢复元数据
      if (backup.data.metadata) {
        await chrome.storage.local.set({ documentMetadata: backup.data.metadata });
        console.log('✅ 元数据已恢复');
      }

      console.log('✅ 备份恢复完成:', backupId);
      return true;
    } catch (error) {
      console.error('❌ 恢复备份失败:', error);
      return false;
    }
  }

  /**
   * 删除备份
   */
  public async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backupKey = `backup_${backupId}`;
      await chrome.storage.local.remove([backupKey]);
      
      // 从列表中移除
      this.backups = this.backups.filter(b => b.id !== backupId);
      await this.updateBackupList();
      
      console.log('🗑️ 备份已删除:', backupId);
      return true;
    } catch (error) {
      console.error('❌ 删除备份失败:', error);
      return false;
    }
  }

  /**
   * 导出备份
   */
  public async exportBackup(backupId: string): Promise<string | null> {
    try {
      const backupKey = `backup_${backupId}`;
      const result = await chrome.storage.local.get([backupKey]);
      const backup = result[backupKey];
      
      if (!backup) {
        console.error('❌ 备份不存在:', backupId);
        return null;
      }

      const exportData = {
        ...backup,
        exportedAt: Date.now(),
        exportedFrom: 'Reading Extension'
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ 导出备份失败:', error);
      return null;
    }
  }

  /**
   * 导入备份
   */
  public async importBackup(backupData: string): Promise<boolean> {
    try {
      const backup = JSON.parse(backupData);
      
      // 验证备份格式
      if (!backup.id || !backup.timestamp || !backup.data) {
        console.error('❌ 无效的备份格式');
        return false;
      }

      // 生成新的备份ID
      const newBackupId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      backup.id = newBackupId;
      backup.timestamp = Date.now();

      // 保存导入的备份
      await this.saveBackup(backup);
      this.backups.push(backup);
      
      console.log('✅ 备份导入成功:', newBackupId);
      return true;
    } catch (error) {
      console.error('❌ 导入备份失败:', error);
      return false;
    }
  }

  /**
   * 获取备份统计
   */
  public getBackupStats(): BackupStats {
    const totalSize = this.backups.reduce((sum, backup) => sum + backup.size, 0);
    const lastBackupTime = this.backups.length > 0 ? this.backups[0].timestamp : 0;
    const nextBackupTime = lastBackupTime + this.config.interval;
    const oldestBackup = this.backups.length > 0 ? this.backups[this.backups.length - 1].timestamp : 0;
    const newestBackup = lastBackupTime;

    return {
      totalBackups: this.backups.length,
      totalSize,
      lastBackupTime,
      nextBackupTime,
      oldestBackup,
      newestBackup
    };
  }

  /**
   * 获取所有备份
   */
  public getAllBackups(): BackupData[] {
    return [...this.backups];
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 重启自动备份
    this.stopAutoBackup();
    this.startAutoBackup();
    
    console.log('⚙️ 备份配置已更新:', this.config);
  }

  /**
   * 获取配置
   */
  public getConfig(): BackupConfig {
    return { ...this.config };
  }

  /**
   * 验证备份完整性
   */
  public async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const backupKey = `backup_${backupId}`;
      const result = await chrome.storage.local.get([backupKey]);
      const backup = result[backupKey];
      
      if (!backup) {
        return false;
      }

      // 重新计算校验和
      const dataString = JSON.stringify(backup.data);
      const currentChecksum = await this.calculateChecksum(dataString);
      
      return currentChecksum === backup.checksum;
    } catch (error) {
      console.error('❌ 验证备份失败:', error);
      return false;
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.stopAutoBackup();
    this.backups = [];
    console.log('🧹 自动备份管理器已清理');
  }
}

// 导出单例实例
export const autoBackupManager = AutoBackupManager.getInstance();
