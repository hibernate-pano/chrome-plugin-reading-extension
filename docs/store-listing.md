# Chrome Web Store 上架材料

商店条目：**Folio** — <https://chromewebstore.google.com/detail/folio/ipljneddkdomcnolneamheieimblipli>

| 项       | 值                                                                                       |
| -------- | ---------------------------------------------------------------------------------------- |
| item id  | `ipljneddkdomcnolneamheieimblipli`                                                       |
| 出版者   | Jasper Pan（publisher id `19d9e44e-bb97-4040-a498-5e53414b1a49`）                        |
| 分类     | Productivity（生产力）→ Tools                                                            |
| 语言     | 简体中文（zh-CN）· English（en-US）                                                      |
| 官网     | <https://github.com/hibernate-pano/chrome-plugin-reading-extension>                      |
| 支持     | <https://github.com/hibernate-pano/chrome-plugin-reading-extension/issues>               |
| 隐私政策 | <https://github.com/hibernate-pano/chrome-plugin-reading-extension/blob/main/PRIVACY.md> |
| 权限说明 | <https://github.com/hibernate-pano/chrome-plugin-reading-extension#-隐私>                |

> 这份文档是商店条目的**唯一事实源**：改文案先改这里，再同步到商店控制台。
> 商店控制台没有可用的写接口（v1.1 API 只有 `items.get/update/insert/publish` 四个方法），
> 所以文案只能人工同步——文档存在的意义是让「同步」有据可依。

## 待办：商店条目还没跟上（等 3.9.0 过审后再做）

**现状（2026-10-27）**：3.9.0 已提交审核；商店条目上的文案与截图**仍然是 2026-02-25
（v3.0.1 时期）的版本**，最后修改于那时，公开页显示的版本要等 3.9.0 过审才会变成 3.9.0。

**审核通过后**，在开发者信息中心 <https://chrome.google.com/webstore/devconsole> 改这六处：

1. **摘要** — 中文填「Summary · 简体中文」段那句；再把语言加上 **English**，
   填 English 那句。条目原本只声明了「中文（中国）」，英文用户根本搜不到它。
2. **详细描述** — 中文用「详细描述 · 简体中文」段，English 用「详细描述 · English」段。
   旧描述只写了 v3.0.1 的五个卖点，v3.1→v3.9 的能力（导出 PDF、裁剪、阅读历史、
   代码高亮、中英文自动空格、打印排版可调）一条都没有。
3. **截图** — 删掉旧的三张，换上 `docs/store-assets/` 里的五张（顺序照下表）。
4. **官网 / 支持 / 隐私政策** — 按上面那张表填。隐私政策指向仓库里的 `PRIVACY.md`。
5. **版本说明** — 填「版本说明」段那段。
6. **保存并发布** — 这一步要等 3.9.0 不在审核队列中，否则商店会回
   「You may not edit or publish an item that is in review」。

> 改完把公开页的版本号与截图各核一遍：公开页是「线上是哪个版本」的唯一真相。

---

## Summary（≤ 132 字符）

**简体中文**

> 把任意网页变成干净的阅读界面，一键导出 A4 PDF，还能裁掉不想要的尾巴。

**English**

> Turn any page into a clean reading view. Export a paginated A4 PDF — and cut off the tail you don't need.

---

## 详细描述 · 简体中文

> **Folio — 专注阅读，也能打印成真正能用的纸。**
>
> 在充满弹窗、广告、侧边栏的网页上，Folio 一键把正文提炼出来，给它恰到好处的排版。
> 需要留一份纸的时候，它还能把文章排成真实的 A4 页面，交给打印机——
> 而且能裁掉抓下来的文章末尾那段没人想看的推荐。

### 核心功能

**🧹 一键净化**
基于 Mozilla Readability 识别文章主体，滤掉导航、广告与侧栏，只剩正文与图片。

**📖 精心调教的排版**
衬线正文、舒适行高、680px 黄金阅读宽度，接近 Instapaper 的阅读质感。

**🎨 三套主题**
浅色 / 暗色 / 护眼，随时切换。护眼主题适合长时间阅读。

**⚙️ 阅读排版可调**
字号 12–32px、行高 1.2–2.0、页宽 600–1200px，改动即时生效并被记住。

**🔤 中英文自动空格**
汉字与半角字母、数字之间自动补一个空格（「使用React18」→「使用 React18」），
屏幕与纸面用的是同一份文本，一致。代码块不受影响——代码里的空格有意义。

**💻 代码高亮**
内置轻量高亮器，支持 15 种语言，一键复制。

**📄 一键导出 A4 PDF**
把文章按 A4 排版输出：上下 20mm、左右 18mm 页边距，正文宽 174mm。
分页由 Folio 自己算——文章在 174mm 正文列里量一次，切成真实的 210×297mm 纸张，
Chrome 只负责把这张张排好的纸渲染成 PDF，不再另作分页。
所以**预览里看到的那一张张纸，就是会被打印出来的那一张张纸**。

**✂️ 打印前手动裁剪**
抓下来的文章末尾常常挂着推荐与广告。点「裁剪」，再点正文里第一段不要的内容，
它之后的一切都不会打印；每页右上角另有「删除本页及之后」，一整页往后都不要时不必逐段找。
状态条常驻「已裁剪至 N 页」，并带一个「撤销」。

**🧷 打印排版可调**
打印页上能调纸张主题（浅色 / 护眼）、字号 9–13pt、行高 1.4–1.9、段距 0–1.25em
与图片大小（大 / 中 / 小 / 无图），改动即时重新分页，偏好被记住。

**📚 阅读历史**
记录最近 200 篇读过的文章（标题、域名、摘要、预计阅读时长），
点工具栏的时钟图标查看，可逐条删除或一次性清空。

**🔒 完全隔离**
样式注入 Shadow DOM，原页面 CSS 不会穿透，扩展样式也不会泄漏到原页面。

### 适合场景

- 读长文、深度报道，尤其是想留一份纸的
- 技术博客、英文资讯（代码带高亮）
- 打印讲义前把文末的推荐裁掉，省纸

### 使用方式

1. 打开任意文章页面
2. 点击工具栏的 Folio 图标进入阅读模式
3. 按 Esc 随时退出，原页面完整保留
4. 需要纸时，点工具栏的下载图标 → 在导出页预览、调整、裁剪 → 「打印 / 存为 PDF」

### 隐私

没有账号，没有统计，没有服务器。设置与阅读历史只存在这台设备的浏览器里，
扩展不发送任何网络请求，不收集任何数据。历史可以逐条删除，也可以一键清空。

---

## 详细描述 · English

> **Folio — pure reading, and a PDF you would actually print.**
>
> Folio turns a cluttered page into a clean, well-typeset reading view with one click.
> When you want a copy on paper, it lays the article out as real A4 pages —
> and lets you cut off the recommendations at the end before they waste your printer.

### What it does

**🧹 One-click clean**
Mozilla Readability finds the article body and drops the navigation, ads and sidebars.

**📖 Refined typography**
Serif body text, comfortable line height, an optimal 680px reading width — inspired by Instapaper.

**🎨 Three themes**
Light, dark and sepia, switchable at any time.

**⚙️ Tunable reading**
Font size 12–32px, line height 1.2–2.0, page width 600–1200px. Changes apply instantly and stick.

**🔤 Automatic CJK spacing**
A space is inserted between CJK characters and Latin letters or digits
(`使用React18` → `使用 React18`). The PDF export uses the same text, so screen and paper agree.
Code blocks are left alone — spaces in code are meaningful.

**💻 Code highlighting**
A small built-in highlighter for 15 languages, with one-click copy.

**📄 One-click A4 PDF export**
The article is laid out on A4: 20mm top and bottom margins, 18mm left and right, a 174mm
text column. Folio does the pagination itself — it measures the article once in a 174mm
column and cuts it into real 210×297mm sheets; Chrome only turns those sheets into a PDF.
**The pages you see in the preview are the pages that get printed.**

**✂️ Trim the tail before printing**
Scraped articles usually end with recommendations and ads. Click 「裁剪」, then click the
first paragraph you do not want: everything after it stops printing. Every page also has
「删除本页及之后」 for dropping a whole page and everything after it. The status bar keeps
「已裁剪至 N 页」 on screen, with an undo.

**🧷 Tunable print layout**
Paper theme (light / sepia), font size 9–13pt, line height 1.4–1.9, paragraph spacing 0–1.25em
and image size (large / medium / small / none). Repagination is instant, and the settings stick.

**📚 Reading history**
The last 200 articles you read, with title, domain, summary and estimated reading time.
Open it from the clock icon in the toolbar; delete entries one by one or clear them all.

**🔒 Fully isolated**
Styles live in a Shadow DOM: the page cannot reach into the reader, and the reader cannot
leak into the page.

### Good for

- Long reads and long-form reporting — especially when you want a copy on paper
- Technical blogs and English-language sites, with highlighted code
- Printing handouts: cut the recommendations off the end and save the paper

### How to use

1. Open any article
2. Click the Folio icon in the toolbar to enter reading mode
3. Press Esc to leave at any time — the original page is untouched
4. For paper, click the download icon, then preview, adjust and trim on the export page,
   and hit 「打印 / 存为 PDF」

### Privacy

No account, no analytics, no server. Your settings and reading history stay in your own
browser, the extension makes no network requests and collects nothing. Delete history
entry by entry, or clear it all at once.

---

## 截图

尺寸 **1280×800**（商店要求），取自真实构建与真实产品路径，文件在 `docs/store-assets/`。

| 文件                   | 画面          | 讲的是哪一条                                                |
| ---------------------- | ------------- | ----------------------------------------------------------- |
| `01-reader-light.png`  | 阅读器·浅色   | 一键净化、排版、代码高亮                                    |
| `02-reader-sepia.png`  | 阅读器·护眼   | 三套主题                                                    |
| `03-reader-dark.png`   | 阅读器·暗色   | 三套主题                                                    |
| `04-print-preview.png` | 导出页预览    | A4 分页、打印排版可调（主题/字号/行高/段距/图片）、打印按钮 |
| `05-print-trimmed.png` | 导出页·裁剪后 | 打印前手动裁剪、状态条、「删除本页及之后」、「撤销」        |

> 旧版商店截图（2026-02 上架时）三张全是同一篇文章的阅读器三主题，
> 没有一张展示导出 PDF——那是产品一半的价值。v3.9 起换成本套。

## 版本说明（提审时填进控制台的「版本说明」字段）

**3.9.0**

- 打印前手动裁剪：点「裁剪」再点正文里第一段不要的内容，它之后的一切都不再打印；
  每页另有「删除本页及之后」，状态条常驻「已裁剪至 N 页」并带「撤销」
- 裁剪过的导出文件名带「（已裁剪）」后缀，撤销后恢复原名
- 打印页新增行高（1.4–1.9）与段距（0–1.25em）两个步进器，改动即时重新分页且记住偏好
- 修复：图注与段内文字在打印时丢失
- 修复：图片未就绪时也能打印（此前会印出空白框）
- 修复：窄窗口下正文列被压扁（恒为 174mm，窄窗改为横向滚动）
- 修复：护眼主题的标题、链接与代码块配色不完整
- 修复：阅读器元信息里读时重复

## 发布记录

| 日期       | 版本  | 包                              | sha256                                                             | 状态                                            |
| ---------- | ----- | ------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| 2026-10-27 | 3.9.0 | `out/extension.zip`（98,495 B） | `e2588d03d8c5c1a5c44bb01542d46c83b39821da142d0adaa3c16996c8c27974` | 已上传 → 已提交审核（商店回包 `status:["OK"]`） |

自证：再发一次 publish，商店回 400「You may not edit or publish an item that is in review」
⇒ 确实进了审核队列。**公开页在审核通过前仍显示 3.8.1**——那是「线上是哪个版本」的唯一真相。

上一版 **3.8.1**：2026-10-04 上架。商店条目的文案与截图自 **2026-02-25**（v3.0.1 时期）
起没有再改过，v3.1 → v3.9 的所有能力都没写进去——本次一并补齐。
