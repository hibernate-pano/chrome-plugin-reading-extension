# 打印末尾裁剪设计文档

- 日期：2026-10-26
- 目标版本：v3.9.0
- 状态：已通过 builder-check，交互与默认值已确认，待开工
- 交互决策：**段落级截断 + 页级快捷**（已由产品负责人确认）
- 排版默认：**行高 1.6 / 段距 0.5em**（已由产品负责人确认）

## 1. 目标与范围

在打印预览页增加两件减少纸张浪费的事：

1. **末尾裁剪**：用户点选第一段不该打印的内容，它和它之后的所有正文都不再进入分页与打印。裁剪结果必须实时反映在预览页数和最终 PDF 上，并且可以随时撤销。
2. **排版密度可调**：行高和段距都能在打印页直接调整，避免默认行距过大导致版面松散、页数虚高。设置持久化，下次导出沿用。

**范围外**（明确不做）：

- 段落中间裁切（只能整块截断）
- 删除正文中间的广告/推荐块（只处理连续尾段）
- 自动识别并删除（v3.10 只做“建议”，仍由人确认）
- 按站点记忆裁剪规则
- 阅读器内的裁剪（裁剪只发生在打印页）
- 删除页脚来源链接
- 跨会话保存裁剪结果（打印页本身是一次性的）

**反目标**（这样做就算失败）：

- 用 CSS 隐藏尾部内容，让预览看起来对了但打印仍包含它
- 用页码记录截断点，改字号后截断位置漂移
- 自动删除任何内容
- 做成全文 WYSIWYG 编辑器

## 2. 前置修复（v3.9 必须一起做）

裁剪后的页数只有在“打印内容完整、测量列宽正确、打印时机正确”时才有意义。以下问题必须先修：

| 问题                      | 位置                                                     | 为什么是裁剪的前置条件                                                                                                                           |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 打印页丢图注/段内文字     | `src/print/buildDocument.ts:114-128`                     | 裁剪后用户会以预览为准；预览本身已经在静默丢内容，裁剪就是在一个错误文档上做决定                                                                 |
| 无图→有图等待期间仍可打印 | `src/print/main.ts:186-203`、`:293-300`                  | 裁剪后用户更依赖页数；图片未就绪时打印会得到空白图和错误分页。等待期间必须同时禁用打印和裁剪，并用 generation token 让后一次切换使前一次等待失效 |
| 窄窗下测量列被压缩        | `src/print/preview.css:329-338`                          | 测量列与实际 174mm 纸面不一致，裁剪后的页数不可信                                                                                                |
| 护眼主题 token 半套生效   | `src/print/print.css:76-84`、`src/print/main.ts:127-156` | 裁剪模式会在纸色上叠加高亮/提示，主题不一致会让状态难以辨认                                                                                      |
| 启动异常无兜底            | `src/print/main.ts:391`                                  | 裁剪按钮依赖 boot 成功；异常时不能只停在“加载中…”                                                                                                |

`ReaderView` 的元信息去重（`12 min read` 重复）是独立的小修，放在同一版本收尾即可，不是裁剪的前置条件。

**已知的既有缺口，v3.9 不修**：`measureDocument` 会把裸文本节点（Readability 偶尔留在 `.p-content` 顶层的松散文字）算进高度和分页候选，但 `renderSheets` 只克隆元素，不渲染文本节点，于是这段文字在预览/PDF 里静默消失。它不是裁剪引入的，Readability 通常会把正文包进 `<p>`；如果真实文章命中，在 v3.10 单独立项（在 `buildDocument` 里把松散文本包成 `<p>`，或让 `renderSheets` 支持文本 run），不要塞进本次裁剪改动。

## 3. 交互

### 3.1 进入与退出

- 工具条新增「裁剪」按钮，位于「图片」之后、页数之前。
- 按钮在 boot 完成（首次分页结束）前保持 disabled，避免在未测量/图片未就绪时进入。
- 点击进入裁剪模式：
  - body 增加 `is-trimming`。
  - 工具条下方出现提示条：**「点击第一段不要的内容，它之后都不会打印。Esc 退出。」**
  - 页数旁出现「已裁剪」徽标（仅当存在截断点时）。
- 再次点击「裁剪」或按 Esc 退出模式；**退出不撤销裁剪**。退出后「已裁剪」徽标仍在，点击它重新进入裁剪模式并可撤销。

### 3.2 段落级截断

- 裁剪模式下，悬停**在本页开始**的正文块（段落、标题、代码块、表格、图片）显示高亮和浮层标签：
  **「从这里截断（含此段）」**
- **跨页续接克隆不可点**：一个段落/长代码块可能从上一页开始，当前页显示的是同一块的续接部分。点击它会把上一页已经显示的前半部分一起删掉，用户看不到自己删了什么。因此只有 `docTop >= pageStart - 0.5` 的克隆可作为截断目标；续接克隆不响应、不显示截断标签、鼠标保持默认箭头。要截断它，请到它开始的那一页操作。
- 点击后：
  1. 该块及其之后的所有正文立即从文档中移除。
  2. 重新测量、重新分页、重新渲染。
  3. 页数更新；状态条显示：**「已裁剪至 6 页 · 撤销」**
  4. 被移除的第一块文本片段（截断到 24 字）显示在状态条里，帮助用户确认自己切对了地方。
- 只有 `.p-content` 内的正文块可被截断；标题区、页脚来源链接不响应点击。

### 3.3 页级快捷

- 裁剪模式下，每张纸的右上角（页边距内，不在 174mm 正文列里）显示真实 `<button>`：
  **「删除本页及之后」**
- 点击后等价于截断「本页开始的第一个正文块」。
- 目标块必须同时满足：带 `data-p-block`、`dataset.docTop >= pageStart - 0.5`。页脚没有 `data-p-block`，因此永远不会被选中。
- 如果整页都是上一页延续下来的长块（例如超长代码块），或本页只剩页脚，该按钮禁用，并给出 title：
  「本页由上一页的长内容延续，请用段落级截断」。

### 3.4 撤销

- 状态条的「撤销」恢复全部被移除内容，重新分页，回到裁剪前的页数。
- **状态条在裁剪存在期间始终可见**，包括改字号/图片大小之后。它随每次重排更新为「已裁剪至 {当前页数} 页 · 撤销」；不会因为设置变化而消失，否则唯一的撤销入口会被藏掉。
- 「已裁剪」徽标只表示状态，点击可重新进入裁剪模式；撤销入口以状态条为准。
- 只保留一个截断点：用户再次点击另一块时，先恢复全部，再应用新截断点。
- 不需要多级撤销栈；一次裁剪只有一个决策。

### 3.5 与现有控件的关系

- 字号/图片大小变化后，裁剪继续生效；重新测量的是**已裁剪后的文档**。
- 切换到「无图」或切回有图，裁剪不变。
- 打印按钮始终按当前裁剪后的文档输出；进入裁剪模式不改变打印按钮的含义。
- 关闭标签页即丢弃裁剪；不写 storage。

### 3.6 排版密度：行高 / 段距

工具条在「字号」之后增加两个 stepper：

| 控件 | 取值                                | 默认      | 作用                                             |
| ---- | ----------------------------------- | --------- | ------------------------------------------------ |
| 行高 | 1.4 / 1.5 / 1.6 / 1.7 / 1.8 / 1.9   | **1.6**   | 正文行与行之间的距离；标题、代码块保留自己的行高 |
| 段距 | 0 / 0.25 / 0.5 / 0.75 / 1 / 1.25 em | **0.5em** | 段落之间、列表项之间的留白（列表项取一半）       |

- 每次点击立即重排：页数实时变化，预览和 PDF 同步。
- 设置写入 `print_settings`，下次导出沿用；这是全局偏好，不按文章区分。
- 与裁剪的关系：裁剪后调行高/段距，裁剪保持；页数按裁剪后的文档重新计算，状态条同步更新。
- 窄窗下工具栏允许换行；两个 stepper 与现有字号 stepper 使用同一套视觉规格。
- 语义说明放进按钮的 `title` / `aria-label`，避免“行高”和“段距”被误解成同一个东西。

## 4. 技术设计

### 4.1 唯一事实来源

`contentDoc`（`.p-doc`）仍是测量源。裁剪只操作其中的 `.p-content`：

- `.p-header` 在 `.p-content` 之前，永远保留。
- `.p-footer` 是 `.p-content` 的兄弟，**永远保留**，裁剪后自然落到新的末页。
- 所有裁剪目标必须匹配 `.p-content [data-p-block]`。

### 4.2 稳定块 ID

`buildDocument` 之后、首次 `measureDocument` 之前，在 `main.ts` 里给 `.p-content` 内每个 **flow block** 写入：

```html
data-p-block="b12"
```

- “flow block”就是 `measureDocument` 会测量的那些单元。`paginate.ts` 导出 `collectFlowBlocks(content)`，复用现有的 `collectFlowNodes` 遍历，避免 `trim.ts` 重写一套 wrapper/unit 规则而慢慢漂移。
- 不给 `.p-content` 里所有元素分配：段落内的 `<a>`、`<em>` 也会拿到 ID，点击时 `closest()` 会命中内联元素并按它的 ID 去截断，位置是错的。只给测量单元分配，点击路径就只有一个答案。
- ID 只分配一次，之后不重排、不复用。
- `renderSheets` 克隆块时原样携带该属性，所以页面上的点击可以直接映射回测量源。
- 裁剪状态只存 `string | null`（被截断块的 ID），不存页码、不存 DOM 引用。

### 4.3 截断与恢复

新增 `src/print/trim.ts`，纯 DOM、无布局依赖：

```ts
interface RemovedNode {
  parent: Node;
  next: Node | null;
  node: Node;
}

export function cutTrailingFrom(root: HTMLElement, target: Node): RemovedNode[];
export function restoreRemoved(removed: RemovedNode[]): void;
```

`cutTrailingFrom` 的算法：

1. 从 `target` 向上收集到 `root` 的路径（不包含 `root`）。
2. 第 0 层从 `target` 开始，删除它和它之后的所有兄弟节点。
3. 第 k 层（k > 0）从 `path[k].nextSibling` 开始删除，**保留祖先节点本身**——祖先里可能有目标之前的内容。
4. 每条记录保存 `parent` / `nextSibling`，恢复时逆序插入。

这比“克隆整个 `.p-content` 再替换”更好：图片元素不会被重建，懒加载属性和失败状态保留，恢复时通常直接命中缓存；恢复后仍按 §4.4 检查 `complete`。

### 4.4 重新分页

裁剪/恢复后走同一条路径：

```ts
clearBreakMarks(elements.sheet);
markOversizedBlocks(elements.sheet);
const layout = measureDocument(contentDoc);
const starts = paginate(layout.candidates, PAGE_CONTENT_HEIGHT_PX, layout.height);
const sheets = renderSheets(layout.blocks, starts, elements.pages, layout.height);
applySheetClasses(sheets);
```

- 不等待图片（裁剪方向）：被移除的是尾部节点，保留的图片在 boot 时已经就绪。
- **恢复方向要检查图片**：撤销/更换截断点时，被恢复的 `<img>` 可能已被浏览器丢弃位图；如果 boot 是从「无图」启动的，这些图片可能从未等待过。只要存在 `!img.complete` 的图片：
  1. 禁用打印和裁剪按钮，状态显示「正在恢复图片…」；
  2. `await waitForImages(elements.sheet, 5000)`，沿用 boot 的失败/挂起播报；
  3. 再测量、分页、恢复按钮。
     全部 complete 时该调用立即返回，不增加可感知延迟。
- 用与 `setImageSize` 相同的 generation token 取消过期的图片等待：快速撤销/再裁剪时，旧等待的结果不能提前打开打印按钮。
- 同步测量，不用 `requestAnimationFrame`：`getBoundingClientRect()` 会强制刷新布局，rAF 只会让测试和交互多一层异步。
- 复用 `remarkOversizedBlocks` 的清理/标记逻辑，新增一个 `applyTrimAndRepaginate()` 包住它，避免两套重排代码漂移。
- 测量面固定 210mm：删除 `preview.css` 里 `.sheet` 的 `max-width: 100%`，窄屏改为横向滚动。否则裁剪后的页数会随窗口宽度变化，而纸面不会。

### 4.5 页级快捷的映射

`renderSheets` 给每张 sheet 增加：

```html
data-page-start="4509.02"
```

「删除本页及之后」的点击处理：

1. 读取 `data-page-start`。
2. 在本页的 `.p-sheet__content > [data-p-block]` 中找到第一个 `Number(dataset.docTop) >= pageStart - 0.5` 的块。
   - 用 `-0.5` 而不是 `+0.5`：分页正好落在块边界时 `docTop === pageStart`，`+0.5` 会跳过本页第一个块；跨页续接克隆的 `docTop` 严格小于 `pageStart`，`-0.5` 仍能排除它。
   - 必须限定 `[data-p-block]`：`measureDocument` 量的是整个 `.p-doc`，第 1 页的第一个 flow block 是 `.p-meta`（没有 ID）；不过滤会让第 1 页按钮永远找不到目标。
3. 找不到则按钮禁用（整页都是跨页长块的延续，或本页只剩页脚）。
4. 用该块的 `data-p-block` 调用 `cutTrailingFrom`。第 1 页由此截断的是**第一个正文块**，标题区和页脚保留。

**不能直接取本页第一个克隆块**：跨页块在下一页的克隆 `docTop` 小于页起点，取它会把上一页已经显示的内容一起删掉。

### 4.6 页数与状态

- 页数始终是 `starts.length`。
- 新增独立的 `#trim-status`，**不复用图片状态条 `#status`**：裁剪提示与「N 张图片未能加载」可能同时存在，复用会互相覆盖。
- 状态条在裁剪存在期间始终可见；每次重排后更新为「已裁剪至 {starts.length} 页 · 撤销」。不显示“隐藏了几页”，因为字号变化会让这个数字漂移。
- 「已裁剪」徽标同时存在，点击徽标重新进入裁剪模式。
- 撤销后清除徽标和状态条。

### 4.7 文件改动

| 文件                                 | 改动                                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/print/trim.ts`                  | 新增：块 ID、截断、恢复                                                                                                                  |
| `src/print/main.ts`                  | 裁剪模式状态、工具条接线、`applyTrimAndRepaginate`、页级/块级点击；裁剪按钮 boot 前 disabled；前置修复：图片等待期间禁用打印、boot catch |
| `src/print/renderSheets.ts`          | 克隆携带 `data-p-block`；sheet 携带 `data-page-start`                                                                                    |
| `src/print/paginate.ts`              | 导出 `collectFlowBlocks`，供块 ID 分配复用同一套 flow 规则                                                                               |
| `print.html`                         | 「裁剪」按钮、提示条、独立的 `#trim-status` 容器                                                                                         |
| `src/print/preview.css`              | 裁剪模式高亮、页边距按钮、提示条、状态条；`@media print` 下全部隐藏；前置修复：测量面固定 210mm，不再 `max-width: 100%`                  |
| `src/print/buildDocument.ts`         | 前置修复：保留图注和段内文字                                                                                                             |
| `src/print/print.css`                | 前置修复：护眼 token 挂载；行高/段距接入 CSS 变量                                                                                        |
| `src/shared/types.ts`                | `PrintSettings` 增加 `lineHeight` / `paragraphSpacing`                                                                                   |
| `src/shared/constants.ts`            | 新增行高/段距档位                                                                                                                        |
| `src/shared/printSettings.ts`        | 默认值、校验、档位吸附                                                                                                                   |
| `tests/print/trim.test.ts`           | 新增                                                                                                                                     |
| `tests/print/renderSheets.test.ts`   | 新增 data 属性断言                                                                                                                       |
| `tests/print/main.test.ts`           | 裁剪流程、撤销、页级映射；行高/段距 stepper 与重排                                                                                       |
| `tests/print/buildDocument.test.ts`  | 图注保留回归测试                                                                                                                         |
| `tests/print/printSettings.test.ts`  | 新字段的校验/吸附                                                                                                                        |
| `tests/shared/printSettings.test.ts` | 新字段的持久化与旧数据兼容                                                                                                               |

无新增运行时依赖。

### 4.8 排版密度的实现

- `src/shared/types.ts`：`PrintSettings` 增加 `lineHeight: number` 和 `paragraphSpacing: number`（em）。
- `src/shared/constants.ts`：新增 `PRINT_LINE_HEIGHTS` 和 `PRINT_PARAGRAPH_SPACINGS`，与 `PRINT_FONT_SIZES` 并列。两者都是离散档位，stepper 不会产生任意值。
- `src/shared/printSettings.ts`：
  - `DEFAULT_PRINT_SETTINGS` 增加 `lineHeight: 1.6`、`paragraphSpacing: 0.5`。
  - `validatePrintSettings` 把请求值吸附到最近的档位；缺失/非法值回落到默认值。旧版本存下的设置没有这两个字段，读取时自动补齐。
  - 把字号现有的“最近档位”逻辑抽成一个小 helper，三处共用，避免三份略有差异的吸附代码。
- `src/print/main.ts`：
  - `applySettings()` 在 `document.documentElement` 上设置 `--print-line-height` 和 `--print-para-gap`（后者带 `em` 单位）。
  - 新增 `stepLineHeight` / `stepParagraphSpacing`，结构复制 `stepFontSize`：更新内存 → 应用 → `savePrintSettings` → `scheduleRemarking()`。
  - boot 时先应用存储值，再做第一次 `measureDocument`，页数从第一屏就是对的。
- `src/print/print.css`：
  - `body { line-height: var(--print-line-height, 1.6); }`
  - `.p-content p { margin-bottom: var(--print-para-gap, 0.5em); }`
  - `.p-content li { margin-bottom: calc(var(--print-para-gap, 0.5em) * 0.5); }`
  - 标题的 `line-height: 1.35`、代码块的 `1.55` 保持不变：它们是独立排版单元，跟随正文行高会让标题松散、代码行距失真。
- 因为测量面和纸张克隆都继承同一组变量，行高/段距变化后直接走 `clearBreakMarks → markOversizedBlocks → measureDocument → paginate → renderSheets`，不存在“预览一套、打印一套”的分叉。
- 与裁剪共用同一条重排路径；裁剪状态不因排版变化而丢失。

## 5. 边界情况

| 情况                            | 行为                                                                  |
| ------------------------------- | --------------------------------------------------------------------- |
| 点击标题区/页脚                 | 忽略，不进入裁剪                                                      |
| 截断第一段正文                  | 正文清空，只剩标题+页脚，1 页；可撤销                                 |
| 目标块在嵌套 wrapper 内         | 只删目标及其后内容，保留 wrapper 中目标之前的部分                     |
| 目标后跟着裸文本节点            | 一并删除                                                              |
| 页级快捷落在跨页块上            | 选本页**开始**的第一个块；没有则禁用                                  |
| 裁剪后改字号/行高/段距/图片大小 | 裁剪保持，对裁剪后的文档重新测量；状态条页数更新                      |
| 裁剪后切「无图」/「大图」       | 裁剪保持；图片尺寸影响重排                                            |
| 行高/段距调到档位两端           | 允许；页数实时变化，不做二次确认                                      |
| 段距设为 0                      | 允许；段落之间没有留白，靠行高和首行区分                              |
| 旧版本存下的打印设置缺新字段    | `validatePrintSettings` 用新默认值补齐，不报错                        |
| 标题/代码块                     | 保留自己的行高，不跟随正文行高控件                                    |
| 裁剪后撤销                      | 恢复全部节点；若恢复的图片未 complete，先等图片再分页；页数回到裁剪前 |
| 连续多次裁剪                    | 先恢复全部，再应用新截断点（单截断点模型）                            |
| 打印时处于裁剪模式              | 提示条/页级按钮/高亮/状态条全部不打印；只打印裁剪后的纸张             |
| 打印时不进入裁剪模式            | 行为完全不变                                                          |
| 文章很大（接近 2M 字符）        | 截断是 O(n) DOM 删除；不克隆全文                                      |
| 图注/段内文字                   | 前置修复后完整保留；裁剪不会二次丢失                                  |

**已知限制**：只能整块截断，不能在一段中间切。如果最后一段前半是正文、后半是广告，用户只能整段保留或整段删除。这个限制写进 UI 提示，不在 v3.9 解决。

## 6. 测试策略

**单元测试（vitest + jsdom）**：

- `trim.ts`
  - 删除目标及其后所有兄弟节点，保留目标之前的正文和 `.p-footer`
  - 目标在嵌套 wrapper 内时，保留 wrapper 的前半部分
  - 目标后有裸文本节点时一并删除
  - `restoreRemoved` 恢复后 DOM 与原始序列化一致
  - 连续 cut/restore 3 次不丢节点
- `renderSheets`
  - 克隆携带 `data-p-block`
  - sheet 携带 `data-page-start`
- `main`
  - 段落级点击 → `cutTrailingFrom` 调用 → 重新分页
  - 页级按钮选择本页开始的块，跳过跨页块
  - `docTop === pageStart` 的块会被选中（不能被 `+0.5` 容差漏掉）
  - 第 1 页跳过 `.p-title`/`.p-meta`，选第一个 `[data-p-block]`
  - 跨页续接克隆不响应点击、不显示截断标签
  - 撤销恢复页数
  - 字号变化后裁剪仍生效，且状态条仍可见、页数已更新
  - 从「无图」启动后撤销，恢复的未 complete 图片会先等待再分页
  - 行高/段距 stepper：点击后 CSS 变量更新、设置持久化、触发重排
  - boot 时先应用存储的行高/段距，再测量
- `buildDocument`
  - `<figure><img><figcaption>` 的图注保留
  - `<p>文字<img></p>` 的文字保留
- `printSettings`（纯校验 + 持久化）
  - 新字段默认值
  - 非法值吸附到最近档位
  - 旧存储缺少新字段时补齐
  - 行高/段距持久化往返

**手工验收**（需要真实浏览器）：

1. 7 页测试文，点「Related stories」→ 页数下降、PDF 页数与预览一致。
2. 撤销 → 页数恢复。
3. 裁剪后改字号 → 截断点仍在同一内容处。
4. 裁剪后切「无图」/「大图」→ 页数更新、无空白图。
5. 窄窗（760px）启动 → 页数与宽窗一致；改字号后仍一致。
6. 页级「删除本页及之后」在跨页长代码块页面禁用；在 `docTop === pageStart` 的页面能选中第一个块。
7. 跨页续接克隆悬停不出截断标签、点击无效；回到块开始的那一页可以截断。
8. 第 1 页「删除本页及之后」只删正文，标题和页脚仍在。
9. 键盘：Tab 能到每页的页级按钮，Enter 生效。
10. 裁剪后改字号/行高/段距/图片大小，状态条仍显示「已裁剪至 N 页 · 撤销」，点击撤销能恢复。
11. 行高 1.75 → 1.6、段距 1em → 0.5em，页数下降；PDF 页数与预览一致。
12. 改完行高/段距后关闭打印页、重新导出，设置仍在。
13. 窄窗下工具栏换行后，行高/段距 stepper 仍可见可点，不遮挡打印按钮。

## 7. 复杂度

**中等**。核心算法（截断/恢复）约 80 行，裁剪 UI 与重排接线约 150 行，行高/段距设置与 stepper 约 100 行，前置修复约 150 行，测试约 400 行。无新增依赖，无网络请求；storage 只增加两个字段，沿用现有 `print_settings` 键。

## 8. 留给实现者的决定

- 状态条的具体措辞与动画时长。
- 裁剪模式下高亮用 outline 还是 box-shadow（不能改变布局）。
- 页级按钮在页边距内的精确位置（不能压到 174mm 正文列）。
- `data-p-block` 只分配给 flow block（已定，见 §4.2）。

## 9. 默认值（已确认）

- 行高默认从 **1.75 收紧到 1.6**，段距默认从 **1em 收紧到 0.5em**。产品负责人已确认。
- 理由：这两个值直接决定每页能放多少正文；当前默认偏松，用户第一次导出就要手动调。
- 影响：没有保存过打印设置的老用户，第一次打开打印页会看到更紧凑的版式。设置一旦手动改过就持久化，不会反复变化。
- 备选（未采用）：保持 1.75 / 1em 只加控件，或只收紧行高；两者都不如直接给一个适合打印的默认。
