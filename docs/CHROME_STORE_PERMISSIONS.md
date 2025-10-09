# Chrome 商店权限说明

## Tabs 权限使用说明

### 英文版 (Chrome Web Store)

**Why we need the "tabs" permission:**

The Reading Mode Extension requires the "tabs" permission to provide its core functionality:

1. **Detect Active Tab**: We need to identify which tab you're currently viewing to enable reading mode for that specific page.

2. **Content Script Injection**: The extension dynamically injects reading mode scripts only when you activate the feature, avoiding unnecessary resource usage on pages where you don't need it.

3. **State Management**: Track whether reading mode is active in each tab to maintain consistency when you switch between tabs.

4. **Page Refresh Handling**: Properly restore reading mode state after page refreshes or navigation.

**Privacy Commitment:**
- We ONLY access the current active tab when you click the extension
- We do NOT collect or transmit any browsing data
- We do NOT track your browsing history
- All processing happens locally on your device

---

### 中文版（用于说明）

**为什么需要"标签页"权限：**

阅读模式扩展需要"tabs"权限来提供核心功能：

1. **检测当前标签页**：识别您当前正在浏览的标签页，以便为该特定页面启用阅读模式。

2. **动态注入脚本**：仅在您激活功能时动态注入阅读模式脚本，避免在不需要的页面上浪费资源。

3. **状态管理**：跟踪每个标签页中的阅读模式状态，确保在标签页切换时保持一致性。

4. **页面刷新处理**：在页面刷新或导航后正确恢复阅读模式状态。

**隐私承诺：**
- 我们仅在您点击扩展时访问当前活动标签页
- 我们不收集或传输任何浏览数据
- 我们不跟踪您的浏览历史
- 所有处理都在您的设备本地完成

---

## Chrome 商店描述建议

### Short Description (简短描述 - 132字符以内)

```
Transform any webpage into a clean, distraction-free reading experience. Local-first, privacy-focused, no data collection.
```

### Detailed Description (详细描述)

```
📚 Chrome Reading Assistant - Your Personal Reading Mode

Transform any webpage into a clean, focused reading experience with just one click.

✨ KEY FEATURES:
• One-Click Activation - Simple toggle to enter/exit reading mode
• Smart Content Extraction - Automatically identifies and extracts main content
• Customizable Reading Experience - Adjust font, size, line height, and themes
• Multiple Themes - Light, Dark, and Eye-protection modes
• Distraction-Free - Removes ads, popups, and unnecessary elements
• Code Highlighting - Perfect for technical articles

🔒 PRIVACY FIRST:
• 100% Local Processing - All operations happen on your device
• No Data Collection - We don't track or store your browsing data  
• No Cloud Services - Works completely offline
• Open Source - Transparent and auditable code

🎯 WHY TABS PERMISSION?
We need tabs permission to:
- Detect which page you want to read
- Inject reading mode only when activated
- Maintain reading state across page refreshes
- Ensure smooth tab switching

⚡ PERFORMANCE:
• Lightweight - Minimal resource usage
• On-Demand Loading - Scripts load only when needed
• Fast & Responsive - Instant mode switching

🌍 PERFECT FOR:
• Long articles and blog posts
• Technical documentation
• News articles
• Research papers
• Any text-heavy content

💡 SIMPLE TO USE:
1. Click the extension icon
2. Toggle reading mode on/off
3. Adjust settings to your preference
4. Enjoy distraction-free reading

🆓 COMPLETELY FREE:
No subscriptions, no ads, no hidden costs. Just pure reading enjoyment.

---

Version: 1.8.12
Last Updated: October 2024
Support: [GitHub Issues]
```

---

## 权限清单说明

### manifest.json 中的权限

```json
{
  "permissions": [
    "storage",     // 保存用户设置和阅读进度
    "scripting",   // 动态注入阅读模式脚本
    "tabs"         // 检测和管理标签页状态
  ]
}
```

### 各权限用途

| 权限 | 用途 | 必要性 |
|------|------|--------|
| storage | 保存用户偏好设置（主题、字体等） | 必需 |
| scripting | 向网页注入阅读模式功能 | 必需 |
| tabs | 识别当前页面并管理阅读状态 | 必需 |

---

## 审核注意事项

1. **单一用途原则**：扩展专注于提供阅读模式功能，没有其他隐藏功能。

2. **最小权限原则**：只请求实现功能所必需的权限。

3. **透明度**：清晰说明每个权限的用途。

4. **隐私保护**：强调本地处理，无数据收集。

5. **用户控制**：用户完全控制何时启用/禁用功能。

---

## 常见审核问题回答

**Q: Why do you need tabs permission instead of activeTab?**

A: We need to maintain reading mode state across page refreshes and tab switches. The tabs permission allows us to:
- Detect when a tab is refreshed to restore reading mode
- Manage multiple tabs with different reading states
- Ensure consistent behavior when switching between tabs

**Q: What data do you collect?**

A: We collect NO data. All settings are stored locally using Chrome's storage API. The extension works completely offline and never communicates with external servers.

**Q: Is the extension open source?**

A: Yes, the complete source code is available on GitHub for transparency and security auditing.

---

## 提交清单

- [x] 权限说明清晰
- [x] 隐私政策明确
- [x] 功能描述准确
- [x] 截图准备（建议5张）
- [x] 图标准备（128x128, 48x48, 16x16）
- [x] 版本号更新
- [x] 测试完成

---

*最后更新：2024年10月*
