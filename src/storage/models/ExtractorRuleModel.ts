import { STORAGE_KEYS } from '../../constants';
import { ExtractorRule } from '../../types';
import { StorageError } from '../../types/errors';
import { storage } from '../index';

/**
 * 提取规则管理
 */
export class ExtractorRuleModel {
  private rulesCache: Map<string, ExtractorRule> = new Map();
  private initialized = false;

  /**
   * 获取指定域名的提取规则
   */
  public async getRuleForDomain(domain: string): Promise<ExtractorRule | null> {
    try {
      // 检查缓存
      if (this.rulesCache.has(domain)) {
        return this.rulesCache.get(domain) || null;
      }
      
      // 从存储获取
      const rule = await storage.get<ExtractorRule>(STORAGE_KEYS.EXTRACTOR_RULES, domain);
      
      if (rule) {
        this.rulesCache.set(domain, rule);
      }
      
      return rule;
    } catch (error) {
      throw new StorageError('获取域名提取规则失败', {
        domain,
        error
      });
    }
  }

  /**
   * 保存提取规则
   */
  public async saveRule(rule: ExtractorRule): Promise<void> {
    try {
      // 确保规则包含域名
      if (!rule.domain) {
        throw new StorageError('提取规则必须包含域名', { rule });
      }
      
      // 检查是否已存在
      const existingRule = await this.getRuleForDomain(rule.domain);
      
      if (existingRule) {
        // 更新
        await storage.update(STORAGE_KEYS.EXTRACTOR_RULES, rule);
      } else {
        // 添加
        await storage.add(STORAGE_KEYS.EXTRACTOR_RULES, rule);
      }
      
      // 更新缓存
      this.rulesCache.set(rule.domain, rule);
    } catch (error) {
      throw new StorageError('保存提取规则失败', {
        rule,
        error
      });
    }
  }

  /**
   * 删除提取规则
   */
  public async deleteRule(domain: string): Promise<void> {
    try {
      await storage.delete(STORAGE_KEYS.EXTRACTOR_RULES, domain);
      
      // 从缓存中删除
      this.rulesCache.delete(domain);
    } catch (error) {
      throw new StorageError('删除提取规则失败', {
        domain,
        error
      });
    }
  }

  /**
   * 获取所有提取规则
   */
  public async getAllRules(): Promise<ExtractorRule[]> {
    try {
      // 如果未初始化缓存，先加载所有规则
      if (!this.initialized) {
        await this.initializeCache();
      }
      
      return Array.from(this.rulesCache.values());
    } catch (error) {
      throw new StorageError('获取所有提取规则失败', error);
    }
  }

  /**
   * 初始化规则缓存
   */
  private async initializeCache(): Promise<void> {
    try {
      const rules = await storage.getAll<ExtractorRule>(STORAGE_KEYS.EXTRACTOR_RULES);
      
      // 清空并重建缓存
      this.rulesCache.clear();
      
      rules.forEach(rule => {
        if (rule.domain) {
          this.rulesCache.set(rule.domain, rule);
        }
      });
      
      this.initialized = true;
    } catch (error) {
      throw new StorageError('初始化提取规则缓存失败', error);
    }
  }

  /**
   * 导出所有规则
   */
  public async exportRules(): Promise<string> {
    try {
      const rules = await this.getAllRules();
      return JSON.stringify(rules, null, 2);
    } catch (error) {
      throw new StorageError('导出提取规则失败', error);
    }
  }

  /**
   * 导入规则
   */
  public async importRules(rulesJson: string): Promise<number> {
    try {
      const rules = JSON.parse(rulesJson) as ExtractorRule[];
      
      if (!Array.isArray(rules)) {
        throw new StorageError('无效的规则格式', { rulesJson });
      }
      
      // 验证规则格式
      const validRules = rules.filter(rule => rule && rule.domain && typeof rule.domain === 'string');
      
      // 批量保存
      const savePromises = validRules.map(rule => this.saveRule(rule));
      
      await Promise.all(savePromises);
      
      return validRules.length;
    } catch (error) {
      throw new StorageError('导入提取规则失败', {
        error
      });
    }
  }

  /**
   * 根据URL获取匹配的规则
   */
  public async getRuleForUrl(url: string): Promise<ExtractorRule | null> {
    try {
      if (!url) return null;
      
      // 解析URL获取域名
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // 尝试完全匹配
      const rule = await this.getRuleForDomain(domain);
      if (rule) return rule;
      
      // 尝试子域名匹配
      const domainParts = domain.split('.');
      
      if (domainParts.length > 2) {
        // 尝试匹配主域名（例如从blog.example.com匹配example.com）
        const mainDomain = domainParts.slice(domainParts.length - 2).join('.');
        const mainDomainRule = await this.getRuleForDomain(mainDomain);
        
        if (mainDomainRule) return mainDomainRule;
      }
      
      return null;
    } catch (error) {
      console.error('获取URL规则失败', error);
      return null; // 出错时返回null而不是抛出异常
    }
  }
}

// 创建并导出单例
export const extractorRuleModel = new ExtractorRuleModel(); 