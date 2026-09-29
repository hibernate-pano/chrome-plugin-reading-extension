# PDF 导出（A4 排版）设计文档

- 日期：2026-09-29
- 目标版本：v3.4.0
- 状态：已确认

## 1. 目标与范围

在阅读模式中增加「一键导出 PDF」：把当前文章以 A4 纸张排版输出，产出适合本地打印的文件。

**范围外**（明确不做）：

- Markdown / HTML 导出
- 批量导出多篇文章
- 自定义页眉页脚、纸张尺寸选择
- 深色主题导出（深色打印费墨且对比度差）
- 分页预览（见 §6）

## 2. 关键决策

| 决策 | 选择 | 理由 |
|---|---|---|
| PDF 生成方式 | 借用 Chrome 打印引擎 | 自建方案（jsPDF/html2canvas）会把文字栅格化：5 万字文章体积从 300KB 涨到 15-40MB，文字不可选中，中文渲染有风险，跨域图片直接失败。借用引擎零依赖且质量最好。 |
| 排版样式 | 全新 `print.css`，不复用 `styles.css` | 现有 985 行样式是屏幕专用（px 单位、固定定位覆盖层、悬浮工具栏）。硬复用需要大量 `@media print` 补丁。打印用 pt（印刷单位）。 |
| 主题 | 浅色 / 护眼两档，默认浅色 | 排除深色。复用 `readerThemes.ts` 已有配色，保持产品一致性。 |
| 预览形态 | 连续滚动，标注「A4 宽度」 | 见 §6。 |
| 阅读模式触发 | 保持手动触发 | 已在 v3.3.0 确定。阅读模式有损，自动启用会碍事。 |

## 3. 架构

```
用户点「导出 PDF」
   │
   ├─ Content Script (ReaderView 工具栏)
   │     chrome.runtime.sendMessage({ type: 'EXPORT_PDF', payload: content })
   │
   ├─ Background Service Worker
   │     1. storage.session.set({ [token]: payload })   ← 必须落盘
   │     2. chrome.tabs.create({ url: `print.html?token=${token}` })
   │
   └─ Print Page (扩展页面, chrome-extension://)
         1. 读 storage.session[token] → 立即删除（防残留）
         2. buildDocument() → 渲染 DOM
         3. prepareImages() → 等待图片解码
         4. 用户调主题/字号 → 点「打印」→ window.print()
```

### 为什么数据必须经过 Background

Service Worker 随时可能被 Chrome 回收。若 Content Script 直接写 storage 再开标签页，存在 SW 已死、数据丢失的竞态。由 Background 统一写入可保证写入与建标签页在同一个事件循环内完成。

### 为什么用 `storage.session` 而非 `local`

- 内存态，随浏览器关闭自动清空，不留痕
- 容量 10MB，足够单篇文章
- 写入方是 Background（可信上下文），无需 `setAccessLevel`

## 4. 文件结构

```
src/
├── print/                        # 新增
│   ├── index.html                # 扩展页面骨架
│   ├── main.ts                   # 入口：读数据 → 渲染 → 接线
│   ├── print.css                 # @page A4 + pt 排版（打印生效）
│   ├── preview.css               # 屏幕预览：工具条 + A4 宽度提示（打印时不生效）
│   ├── buildDocument.ts          # ExtractedContent → DOM 节点
│   └── prepareImages.ts          # 懒加载图片修复 + 就绪等待
├── shared/
│   ├── codeHighlight.ts          # 从 CodeBlock.tsx 抽出的 tokenizer
│   ├── types.ts                  # + PrintSettings / PrintPayload
│   ├── constants.ts              # + EXPORT_PDF / STORAGE_KEYS.PRINT_PAYLOAD
│   └── printSettings.ts          # 打印设置的读写与默认值
└── content/
    ├── index.ts                  # + EXPORT_PDF 处理
    └── ReaderView.tsx            # + 工具栏按钮

print.html                        # 根目录，vite 多入口
```

构建：`vite.config.ts` 增加 `print` 入口（HTML 页面，ES module，React 插件）。
`package.json` 的 `build` 脚本串联三个 config。
`manifest.json` 的 `web_accessible_resources` 增加 `print.html`。

## 5. A4 排版规范

### 页面

```css
@page {
  size: A4 portrait;
  margin: 20mm 18mm;
}
```

正文区 174mm × 257mm。基准字号 11pt / 行高 1.75 / 每行约 44 汉字 / 每页约 1600 汉字。

### 分页控制

| 元素 | 规则 | 原因 |
|---|---|---|
| h1–h4 | `break-after: avoid` | 标题不单独留在页底 |
| p, li | `orphans: 3; widows: 3` | 避免页尾孤行 |
| pre（短，< 30 行） | `break-inside: avoid` | 短代码不拆开 |
| pre（长，≥ 30 行） | 允许跨页 | **超长代码强制避页会溢出丢内容** |
| figure, img | `break-inside: avoid` + `max-height: 150mm` | 不跨页切断；上限约束"整图推下页"造成的留白 |
| table | `width: 100%` + 超半页高允许跨页（渲染后实测） | 宽表格压进 174mm 不横向溢出，长表格不强制整块留白 |

> 代码块按行数分档是本设计中最容易被忽略的细节。绝大多数实现会无脑写 `break-inside: avoid`，遇到 200 行代码块时浏览器会强行挤在一页内，底部内容直接被裁掉。

### 元素处理

- 代码块：去掉复制按钮与语言标签栏（打印时是噪音）
- 链接：去下划线，保持可点（Chrome 导出 PDF 后链接仍可点击）
- 图片：移除 `loading="lazy"`，打印前等待全部解码
- 工具条：`@media print { display: none }`

## 6. 预览形态：连续滚动 + A4 宽度提示

预览页是**一条 174mm 宽的连续内容**，不切页。滚动到底即文章结束。

页面顶部工具条（屏幕专用，打印时隐藏）：

- 主题切换：浅色 / 护眼
- 字号调节：9 / 10.5 / 11 / 12 / 13pt
- 「打印 / 另存为 PDF」按钮
- 图片加载状态提示

**为什么不做分页预览**：浏览器无分页查询 API。要模拟只能测 `offsetTop` 后按 257mm 切割，但浏览器在**行层面**决策断页，我只能在**元素层面**测量。误差不可避免且会累积（一次可达 100mm，长文档可能差一页）。

更糟的是失败模式：它看起来权威但不可靠，用户无法分辨对错。而 Chrome 打印对话框提供**百分之百准确**的预览。

连续滚动仍能回答真问题——字号是否合适、护眼色是否太黄、行宽是否舒适——因为这些不依赖分页。

页面宽度固定 174mm 并居中，两侧留白，视觉上明确「这就是 A4 的行宽」。

## 7. 图片处理

两个真实陷阱：

**陷阱一：懒加载。** Readability 抽出的 HTML 里，图片可能是：
- `src` 为透明占位图（1×1 GIF / base64）
- 真实地址在 `data-src` / `data-original` / `data-lazy-src` / `data-actualsrc`
- 仅 `srcset` 有值

处理：逐个检查，`src` 缺失或为占位图时从上述属性回填。

**陷阱二：打印时未解码。** `loading="lazy"` 的图片在视口外不会加载，直接打印会得到一片空白框。

处理：移除所有 `loading` 属性 → 等待 `img.decode()` 或 `load` 事件 → 最多等 5 秒 → 超时照样打印（不卡死），并在工具条提示「N 张图片未加载」。

跨域说明：`<img>` 渲染不受 CORS 限制，无需 `crossorigin` 属性。仅在需要 canvas 读取像素时才受限——本方案不用 canvas，故不涉及。

## 8. 错误处理

| 情况 | 处理 |
|---|---|
| 图片加载失败 | 工具条提示数量，仍允许打印 |
| 直接打开 print.html（无 token） | 友好空状态 + 「返回文章页」按钮 |
| 同一文章重复导出 | 每次独立 token，互不覆盖 |
| 超长单图（> A4 高） | `max-height: 240mm` 缩放，不裁切 |
| 标题含非法文件名字符 | 清理 `/ : * ? " < > \|`，截断至 80 字符，兜底用 hostname |
| storage 读取失败 | 空状态 + 错误详情 |

## 9. 测试策略

**可自动测**（vitest + jsdom，纯函数）：

- `buildDocument`：HTML 字符串 → 文档结构，标签清洗
- `prepareImages`：`data-src` 回填、占位图识别
- `printSettings`：默认值、范围钳制、持久化
- 文件名清理

**无法自动测**（需真实浏览器）：Chrome 实际分页、图片真实加载、打印对话框。

第二部分提供**手工验收清单**（5 篇真实文章：长文、含代码、含多图、含宽表格、含超长代码块）。不假装自动化覆盖了它。

## 10. 复杂度评估

**中等**。无困难算法，难在细节量：

- A4 排版 CSS 约 300 行，含大量「看起来差不多但实际不对」的取舍
- 图片懒加载回填是真实陷阱
- 长代码块分页分档是真实陷阱
- 估算总量 600–800 行

无新增运行时依赖。不发任何网络请求（图片由浏览器直接加载，不用程序化 fetch——那会引入 CORS 与隐私问题）。

## 11. V2 候选

- 分享卡片长图（非 PDF）
- 批量导出与合并
- 自定义页眉页脚
- EPUB 导出
