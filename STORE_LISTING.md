# Folio — Chrome Web Store 上架材料

## 基本信息

- **扩展名称**：Folio
- **版本**：3.0.1
- **类别**：Productivity（生产力）
- **语言**：中文（简体）/ English

---

## 商店简介（Summary）
> 132 字符以内

**中文**：
去掉广告和干扰，让任何网页变成干净的阅读界面。

**English**：
Strip ads and clutter from any webpage. Pure reading, zero distraction.

---

## 详细描述（Description）

### 中文版

**Folio — 专注阅读，去除一切干扰**

在充满弹窗、广告、侧边栏的网页上，Folio 一键为你提炼出纯粹的阅读界面。

**核心功能**

• 🧹 **一键净化** — 点击扩展图标，立刻去除广告、导航栏、侧边栏，只留下文章正文
• 📖 **精心调教的排版** — 衬线字体、舒适行高、680px 黄金阅读宽度，接近 Instapaper 的阅读质感
• 🎨 **三种主题** — 亮色 / 暗色 / 棕褐色，任意切换
• ⚙️ **可调整** — 字号、行高、正文宽度，根据你的习惯微调
• 🔒 **完全隔离** — 采用 Shadow DOM 技术，原页面样式不会污染阅读界面

**适合场景**

- 阅读长文章、深度报道
- 技术博客、英文资讯
- 任何你想专心读完的内容

**使用方式**

1. 打开任意文章页面
2. 点击 Folio 图标
3. 开启「阅读模式」
4. 按 Esc 随时退出，原页面完整保留

---

### English Version

**Folio — Pure reading, zero distraction**

Turn any cluttered webpage into a clean, focused reading experience with one click.

**Features**

• 🧹 **One-click clean** — Strips ads, navbars, and sidebars. Only the article remains.
• 📖 **Refined typography** — Serif fonts, comfortable line height, and an optimal 680px reading width — inspired by Instapaper.
• 🎨 **Three themes** — Light, Dark, and Sepia. Switch anytime.
• ⚙️ **Customizable** — Adjust font size, line height, and page width to your preference.
• 🔒 **Fully isolated** — Built with Shadow DOM. The host page's CSS never bleeds into the reader.

**Perfect for**

- Long articles and in-depth journalism
- Tech blogs and English news
- Anything you want to read without distraction

**How to use**

1. Open any article page
2. Click the Folio icon
3. Toggle Reading Mode on
4. Press Esc anytime to exit — original page is fully preserved

---

## 隐私政策（Privacy Policy）

> Chrome Web Store 要求必须有隐私政策链接，可以放在 GitHub Pages 或任意公开页面上。

**内容如下（可直接发布到 GitHub README 或 GitHub Pages）：**

---

### Privacy Policy for Folio

**Last updated: 2026-02-23**

Folio ("the Extension") is committed to protecting your privacy.

**Data Collection**
Folio does not collect, transmit, or share any personal data. All processing happens locally in your browser.

**Permissions Used**
- `activeTab` — To read the current page's content for extraction. Only accessed when you explicitly activate reading mode.
- `storage` — To save your reading preferences (theme, font size, etc.) locally on your device.
- `scripting` — To inject the reader interface into the current page.
- `tabs` — To communicate between the popup and the current tab.

**Third-Party Services**
Folio does not use any third-party analytics, tracking, or advertising services.

**Data Storage**
Reading preferences are stored locally using Chrome's built-in storage API. They never leave your device.

**Contact**
If you have questions, please open an issue at:
https://github.com/hibernate-pano/chrome-plugin-reading-extension/issues

---

## 上架所需素材清单

| 素材 | 尺寸要求 | 状态 |
|------|---------|------|
| 扩展图标 | 128×128 px | ✅ 已有 icon128.png |
| 商店小图标 | 128×128 px | ✅ 同上 |
| 截图 1（必需） | 1280×800 或 640×400 | ⚠️ 需要你截图 |
| 截图 2（推荐） | 同上 | ⚠️ 需要你截图 |
| 宣传图（可选）| 440×280 px | 可选 |

### 截图建议
1. **截图 1**：在一篇英文博客或新闻文章上开启阅读模式后的效果（亮色主题）
2. **截图 2**：同一页面开启暗色主题，或展示设置面板

---

## 上架步骤

1. 打开 https://chrome.google.com/webstore/devconsole
2. 点击「新建项目」→「上传扩展包」
3. 上传 `folio-v3.0.1.zip`
4. 填写上面的名称和描述
5. 上传截图
6. 填写隐私政策链接（建议放到 GitHub repo 的 README 或 Wiki）
7. 类别选「Productivity」
8. 提交审核（通常 1-3 个工作日）
