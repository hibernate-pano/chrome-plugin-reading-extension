import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ReadingSettingsPanel } from '../components/ReadingSettingsPanel';
import { UserSettings } from '../../types';

let settingsPanelRoot: Root | null = null;
let settingsPanelContainer: HTMLElement | null = null;
let currentSettings: UserSettings | null = null;
let currentOnSettingsChange: ((key: keyof UserSettings, value: any) => void) | null = null;

interface MountOptions {
  settings: UserSettings;
  onSettingsChange: (key: keyof UserSettings, value: any) => void;
}

/**
 * 更新设置面板的 settings（不重新挂载整个组件）
 */
export function updateReadingSettingsPanelSettings(settings: UserSettings): void {
  if (!settingsPanelRoot || !currentOnSettingsChange) {
    console.warn('⚠️ [SettingsPanel] 面板未挂载，无法更新 settings');
    return;
  }

  currentSettings = settings;
  
  // 重新渲染，传入新的 settings
  settingsPanelRoot.render(
    <div style={{ pointerEvents: 'auto' }}>
      <ReadingSettingsPanel
        settings={settings}
        onSettingsChange={currentOnSettingsChange}
      />
    </div>
  );
  
  console.log('🔄 [SettingsPanel] Settings 已更新');
}

/**
 * 挂载阅读设置面板
 */
export function mountReadingSettingsPanel(options: MountOptions): () => void {
  console.log('⚙️ [SettingsPanel] 挂载设置面板');
  
  // 保存当前的 settings 和回调
  currentSettings = options.settings;
  currentOnSettingsChange = options.onSettingsChange;
  
  // 如果已存在，先清理
  if (settingsPanelContainer) {
    unmountReadingSettingsPanel();
  }

  // 创建容器
  settingsPanelContainer = document.createElement('div');
  settingsPanelContainer.id = 'reading-settings-panel-root';
  settingsPanelContainer.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;
  `;
  
  // 注意：不要在这里阻止事件冒泡，否则会影响滑块等交互元素的正常工作
  // 子元素的 pointer-events: auto 已经足够处理事件穿透问题

  document.body.appendChild(settingsPanelContainer);
  console.log('⚙️ [SettingsPanel] 容器已添加到页面');

  // 创建 React 根
  try {
    settingsPanelRoot = createRoot(settingsPanelContainer);
    console.log('⚙️ [SettingsPanel] 创建React根节点');

    // 渲染组件
    settingsPanelRoot.render(
      <div style={{ pointerEvents: 'auto' }}>
        <ReadingSettingsPanel
          settings={options.settings}
          onSettingsChange={options.onSettingsChange}
        />
      </div>
    );
    console.log('✅ [SettingsPanel] 设置面板已渲染');
  } catch (error) {
    console.error('❌ [SettingsPanel] 渲染失败:', error);
    unmountReadingSettingsPanel();
    throw error;
  }

  // 返回清理函数
  return unmountReadingSettingsPanel;
}

/**
 * 卸载阅读设置面板
 */
export function unmountReadingSettingsPanel(): void {
  console.log('⚙️ [SettingsPanel] 卸载设置面板');
  
  if (settingsPanelRoot) {
    try {
      settingsPanelRoot.unmount();
      console.log('⚙️ [SettingsPanel] React根节点已卸载');
    } catch (error) {
      console.error('❌ [SettingsPanel] 卸载React根节点失败:', error);
    }
    settingsPanelRoot = null;
  }

  if (settingsPanelContainer && settingsPanelContainer.parentNode) {
    settingsPanelContainer.parentNode.removeChild(settingsPanelContainer);
    console.log('⚙️ [SettingsPanel] 容器已从页面移除');
  }
  settingsPanelContainer = null;
}

