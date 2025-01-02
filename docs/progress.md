## 阶段一：准备阶段

- [x] 环境搭建
  - [x] 安装必要的开发工具 (Node.js, npm/yarn/pnpm, Git, 代码编辑器等)。
  - [x] 创建项目仓库，配置 Git Flow 工作流。
  - [x] 安装并配置基础的工程化工具, 如 `vite`, `eslint`, `prettier`。
- [x] 技术预研
  - [ ] 调研 OpenAI API 的使用方法、接口限制、费用等。
  - [ ] 调研 Google Translate API 和 DeepL API 的使用方法、接口限制、费用等。
  - [ ] 调研 词典 API (如 Merriam-Webster, Oxford) 的使用方法、接口限制、费用等。
  - [ ] 调研 `chrome.storage` API 的使用方法。
  - [ ] 确定 Tailwind CSS 的定制方案，使其 UI 风格与 Chrome 原生风格一致。
- [ ] 原型设计
  - [ ] 使用工具 (如 Figma, Sketch) 设计插件的 低保真原型，主要关注交互流程。
  - [ ] 进行 初步的用户测试，收集反馈。
  - [ ] 根据反馈修改原型，设计 高保真原型，细化 UI 细节。
- [ ] 技术方案细化
  - [ ] 细化技术方案文档，明确每个模块的实现细节。
  - [ ] 根据原型设计进行 UI 组件拆分。
- [ ] 制定 Sprint 计划
  - [ ] 将 MVP 的功能拆分成多个 Sprint。
  - [ ] 估算每个 Sprint 的工作量。
  - [ ] 分配任务给团队成员 (如果有)。

## 阶段二：MVP 开发

### Sprint 1

- [x] 搭建项目基础框架：
  - [x] 使用 React + TypeScript + Vite 创建项目。
  - [x] 集成 Tailwind CSS，并配置好基础的 UI 样式。
  - [x] 集成 Zustand，并配置好状态管理。
  - [x] 配置好 ESLint 和 Prettier 等代码规范工具。
  - [x] 配置好 Git Hooks (例如 pre-commit 钩子中运行 ESLint)。
- [x] 实现 `storage` 模块：封装对 `chrome.storage.sync` 和 `chrome.storage.local` 的操作。
- [x] 实现 `content` 模块：
  - [x] 实现网页正文提取功能 (基于 Readability.js 或类似库)。
  - [x] 实现基本的阅读模式切换功能，能移除网页中的无关元素。
  - [x] 实现 popup 的基础 UI 框架。
- [x] 实现 `popup` 模块：
  - [x] 设计 `popup` 的 UI 界面 (使用 Tailwind CSS)。
  - [x] 实现主题切换功能 (浅色、深色)，并将设置保存在 `chrome.storage.sync` 中。
  - [x] 实现字体大小调整功能，并将设置保存在 `chrome.storage.sync` 中。
- [ ] 测试: 进行单元测试和集成测试。

### Sprint 2

- [ ] 实现 `ai` 模块：
  - [ ] 封装 OpenAI API 的调用，实现 AI 分段功能。需要注意 API 密钥的安全性，可以考虑让用户自行填入自己的 OpenAI API Key。
  - [ ] 设计 prompt，指导 AI 进行分段。
- [ ] 完善 `content` 模块：
  - [ ] 集成 AI 分段功能，并将 AI 分段后的结果渲染到页面上。
  - [ ] 允许用户手动调整 AI 分段的结果 (合并或拆分段落)。
- [ ] 实现 `background` 模块（可选）：
  - [ ] 如果需要，可以创建一个 `background` 脚本来处理一些后台任务。例如监听用户在 popup 中对功能的开启关闭等。
- [ ] 实现 `options` 模块 (可选)：
  - [ ] 如果 `popup` 中的设置项较多，可以创建一个 `options` 页面来提供更详细的配置选项。
- [ ] 测试: 进行单元测试、集成测试和 E2E 测试。

### Sprint 3

- [ ] 实现 `ai` 模块：
  - [ ] 集成 Google Translate API，实现文本翻译功能（支持选中文字翻译和全文翻译）。
  - [ ] 提供选项让用户选择目标翻译语言。
- [ ] 完善 `popup` 模块：
  - [ ] 添加翻译功能的 UI 控件。
  - [ ] 在 `popup` 中展示翻译结果。
- [ ] 完善 `content` 模块：
  - [ ] 处理翻译结果的展示（例如在原文旁边显示译文，或替换原文）。
- [ ] 测试: 进行单元测试、集成测试和 E2E 测试。

## 阶段三：功能增强与优化

## 阶段四：发布与迭代
