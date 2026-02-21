/**
 * Night Mode Auto-Switcher - 夜间模式自动切换
 * 根据时间自动切换到深色/夜间主题
 */

const STORAGE_KEY = 'autoNightMode';

export interface NightModeSettings {
  enabled: boolean;
  startHour: number;  // 开始时间 (0-23)
  endHour: number;    // 结束时间 (0-23)
  theme: string;      // 夜间主题
}

const DEFAULT_NIGHT_SETTINGS: NightModeSettings = {
  enabled: true,
  startHour: 20,     // 晚上8点
  endHour: 7,        // 早上7点
  theme: 'dark'
};

class NightModeAutoSwitcher {
  constructor() {
    this.settings = { ...DEFAULT_NIGHT_SETTINGS };
    this.checkInterval = null;
  }

  async init() {
    try {
      const saved = await this._get(STORAGE_KEY);
      if (saved) this.settings = { ...DEFAULT_NIGHT_SETTINGS, ...saved };
      
      if (this.settings.enabled) {
        this.startMonitoring();
      }
    } catch (e) {
      console.warn('[NightMode] Init failed:', e);
    }
  }

  /**
   * 开始监控时间
   */
  startMonitoring() {
    if (this.checkInterval) return;
    
    // 每分钟检查一次
    this.checkInterval = setInterval(() => {
      this.checkAndSwitch();
    }, 60000);
    
    // 立即检查一次
    this.checkAndSwitch();
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 检查并切换主题
   */
  async checkAndSwitch() {
    if (!this.settings.enabled) return;

    const now = new Date();
    const hour = now.getHours();
    const isNight = this.isNightTime(hour);

    // 通知设置面板需要切换
    if (isNight) {
      this.notifyThemeChange(this.settings.theme);
    }
  }

  /**
   * 判断是否为夜间
   */
  isNightTime(hour: number): boolean {
    const { startHour, endHour } = this.settings;
    
    if (startHour > endHour) {
      // 跨时段（如 20:00 - 07:00）
      return hour >= startHour || hour < endHour;
    } else {
      // 同日内（如 22:00 - 23:00）
      return hour >= startHour && hour < endHour;
    }
  }

  /**
   * 通知主题切换
   */
  notifyThemeChange(theme: string) {
    // 发送消息到 content script
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'AUTO_NIGHT_MODE',
          payload: { theme }
        }).catch(() => {});
      }
    });
  }

  /**
   * 更新设置
   */
  async updateSettings(newSettings: Partial<NightModeSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    await this._set(STORAGE_KEY, this.settings);

    if (this.settings.enabled && !this.checkInterval) {
      this.startMonitoring();
    } else if (!this.settings.enabled && this.checkInterval) {
      this.stopMonitoring();
    }
  }

  /**
   * 获取当前是否为夜间模式
   */
  isCurrentlyNight(): boolean {
    const hour = new Date().getHours();
    return this.isNightTime(hour);
  }

  async _get(key) {
    return new Promise(resolve => {
      chrome.storage.local.get(key, result => resolve(result[key]));
    });
  }

  async _set(key, value) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
}

export const nightModeAutoSwitcher = new NightModeAutoSwitcher();
