# 技术架构

## 总体架构

Chrome 阅读插件采用模块化架构，基于 Manifest V3，前后端分离，所有数据本地存储，保障隐私。

- **内容脚本（Content Script）**：负责网页内容提取、阅读模式渲染。
- **背景脚本（Background Script）**：处理插件生命周期、消息通信、权限管理。
- **弹窗 UI（Popup）**：提供快捷入口与部分设置。
- **设置页（Options Page）**：高级配置与主题自定义。
- **本地存储（IndexedDB）**：存储用户设置、主题、阅读历史。
- **通信机制**：采用 Chrome.runtime 消息机制实现各模块解耦通信。

## 技术选型

- **前端框架**：React 18 + TypeScript 5.0
- **样式方案**：Tailwind CSS 3.0，支持深浅色主题
- **状态管理**：Zustand（轻量）
- **内容提取**：Readability.js + 自研规则
- **动画**：Framer Motion
- **构建工具**：Vite 5.0 + pnpm
- **测试**：Vitest + React Testing Library（单元），Playwright（端到端）
- **代码质量**：ESLint + Prettier + TypeScript 严格模式

## 主要模块结构

```text
src/
  background/      # 背景脚本
    index.ts       # 入口文件
    listeners/     # 事件监听器
    services/      # 后台服务
  content/         # 内容脚本及阅读模式渲染
    index.ts       # 入口文件
    components/    # 阅读模式UI组件
    extractors/    # 内容提取器
    renderers/     # 内容渲染器
  popup/           # 弹窗 UI
    index.tsx      # 入口文件
    components/    # 弹窗组件
  options/         # 设置页面
    index.tsx      # 入口文件
    panels/        # 设置面板
  storage/         # 本地存储封装
    index.ts       # 统一接口
    models/        # 数据模型
    migrations/    # 数据库迁移
  presets/         # 主题与排版预设
    themes/        # 主题配置
    typography/    # 排版配置
  utils/           # 工具函数
    dom.ts         # DOM操作辅助
    format.ts      # 格式化工具
    performance.ts # 性能监控工具
  styles/          # 全局样式
  types/           # 类型定义
  ui/              # 通用 UI 组件
  constants/       # 常量定义
  hooks/           # 自定义钩子
```

## 本地数据存储架构

### IndexedDB 数据库设计

```text
Database: readerExtension
  - stores:
    - settings:     # 用户设置
      - key: string (设置名称)
      - value: any (设置值)

    - themes:       # 主题配置
      - id: string (主题ID)
      - name: string (主题名称)
      - colors: ThemeColors (颜色配置)
      - typography: Typography (排版配置)

    - history:      # 阅读历史
      - url: string (网页URL，主键)
      - title: string (页面标题)
      - lastVisit: number (最后访问时间戳)
      - readingProgress: number (阅读进度百分比)
      - scrollPosition: number (滚动位置)

    - annotations:  # 高亮与笔记
      - id: string (自动生成ID，主键)
      - url: string (网页URL)
      - text: string (高亮的文本)
      - note: string (笔记内容)
      - color: string (高亮颜色)
      - createdAt: number (创建时间戳)
      - updatedAt: number (更新时间戳)

    - extractorRules: # 内容提取规则
      - domain: string (网站域名，主键)
      - selectors: object (CSS选择器配置)
      - rules: object (自定义规则)
```

### 存储优化策略

- **懒加载**：只在需要时加载数据，减少启动时间
- **批量操作**：合并多个写操作，减少事务开销
- **压缩存储**：对大型数据（如页面缓存）进行压缩
- **定期清理**：自动清理过期数据，避免存储膨胀
- **容错机制**：处理存储失败和数据库升级场景

## 内容提取引擎

### 多层次提取策略

1. **基础提取层**：使用改进的 Readability.js 算法
2. **网站特定规则层**：针对常见网站的定制提取规则
3. **用户自定义规则层**：允许用户设置自己的提取规则
4. **AI 辅助层**（可选）：使用本地模型辅助内容识别

### 内容分析流程

1. 网页加载 → 预处理（清理干扰元素）
2. 内容识别（标题、正文、图片等）
3. 结构化（转换为统一内部格式）
4. 渲染（应用用户主题和排版设置）

### 提取优化技术

- **DOM 分析优化**：减少 DOM 遍历次数，优化选择器
- **并行处理**：使用 Web Workers 处理耗时操作
- **增量渲染**：大型内容分段处理和渲染
- **缓存策略**：缓存提取结果，加速重复访问

## 性能优化策略

### 启动性能

- **代码分割**：按需加载各模块代码
- **预编译**：构建时预编译模板
- **资源压缩**：最小化资源体积
- **延迟初始化**：非关键功能延迟加载

### 运行时性能

- **虚拟列表**：处理长内容时使用虚拟滚动
- **高效 DOM 操作**：最小化重绘和回流
- **防抖与节流**：优化频繁事件处理
- **异步处理**：耗时操作放入 Web Worker
- **内存管理**：避免内存泄漏，定期释放资源

### 监控与诊断

- **性能指标收集**：记录关键操作的执行时间
- **内存使用分析**：监控内存占用趋势
- **错误追踪**：捕获并记录运行时错误
- **用户体验指标**：监测实际用户交互性能

## 插件数据流

1. 用户触发（快捷键/按钮/右键菜单）
2. 内容脚本提取正文并渲染阅读模式
3. 用户自定义设置通过消息机制同步到内容脚本
4. 设置变更实时存储于 IndexedDB
5. 退出阅读模式恢复原网页

## 安全与隐私

- 所有数据仅存储于本地 IndexedDB，不上传云端
- 不请求多余权限，最小化插件攻击面
- 严格遵循 Chrome Manifest V3 安全规范
- 内容脚本隔离，避免与页面脚本冲突
- 输入验证和净化，防止 XSS 攻击
- 权限分离，按照最小权限原则设计

## 可扩展性设计

### 插件 API

- 提供标准化的接口，便于扩展和集成
- 事件系统支持自定义监听和触发
- 模块化设计，支持功能的按需加载

### 主题系统

- 主题抽象为可序列化对象
- 提供主题 API，支持动态切换
- 自定义 CSS 变量，便于扩展和自定义

### 内容提取规则

- 规则存储为 JSON 配置
- 支持用户导入/导出规则
- 提供规则编辑器，便于调试和优化

## 测试策略

- **单元测试**：覆盖核心功能和组件
- **集成测试**：测试模块间交互
- **端到端测试**：模拟真实用户场景
- **性能测试**：监控关键操作的性能指标
- **兼容性测试**：跨浏览器和设备测试

## 开发与部署流程

- **开发环境**：Vite 热重载，提高开发效率
- **代码质量**：ESLint + Prettier 保障代码风格统一
- **CI/CD**：自动化测试和构建
- **版本管理**：语义化版本控制
- **打包优化**：代码分割、懒加载、资源压缩
- **发布流程**：自动生成更新日志，一键部署到 Chrome Web Store

---

> 本技术架构专注于本地优先原则，所有功能设计均以用户隐私保护和性能优化为首要考量，打造极致的阅读体验。
