# Technology Stack

## Project Type
Chrome浏览器扩展（Browser Extension），采用现代Web技术栈构建，支持内容脚本、后台脚本和弹出页面等多种扩展组件。

## Core Technologies

### Primary Language(s)
- **Language**: TypeScript 5.2.2
- **Runtime/Compiler**: Node.js 18+ (开发环境), Chrome V8引擎 (运行环境)
- **Language-specific tools**: pnpm包管理器, ESLint代码检查, TypeScript编译器

### Key Dependencies/Libraries
- **React 18.2.0**: 现代化UI框架，提供组件化开发能力
- **Vite 5.1.6**: 快速构建工具，支持热重载和代码分割
- **Tailwind CSS 4.x**: 原子化CSS框架，提供现代化样式系统
- **Shadcn/UI**: 基于Radix UI的高质量React组件库
- **Zustand 4.5.2**: 轻量级状态管理库，替代Redux
- **@mozilla/readability 0.5.0**: Mozilla官方内容提取库
- **Radix UI**: 无障碍UI基础组件库
- **Lucide React**: 现代图标库，提供丰富的图标资源

### Application Architecture
**模块化架构**：采用分层架构设计，包含表现层、业务逻辑层、数据层和基础设施层
- **表现层**: React组件、UI组件库、样式系统
- **业务逻辑层**: 功能模块、状态管理、业务服务
- **数据层**: 本地存储、类型定义、常量管理
- **基础设施层**: 工具函数、第三方库封装、后台脚本

### Data Storage
- **Primary storage**: Chrome Storage API (chrome.storage.local/sync)
- **Caching**: 内存缓存 + 本地存储缓存
- **Data formats**: JSON (配置、用户数据), 二进制 (图标、资源文件)

### External Integrations
- **APIs**: Chrome Extensions API, DOM API, Web APIs
- **Protocols**: Chrome消息传递协议, DOM事件系统
- **Authentication**: Chrome身份验证系统 (可选)

### Monitoring & Dashboard Technologies
- **Dashboard Framework**: React + TypeScript
- **Real-time Communication**: Chrome消息传递API
- **Visualization Libraries**: 内置图表组件 (基于CSS)
- **State Management**: Zustand + Chrome存储中间件

## Development Environment

### Build & Development Tools
- **Build System**: Vite多配置构建系统
- **Package Management**: pnpm (首选包管理工具)
- **Development workflow**: 热重载、文件监听、开发服务器

### Code Quality Tools
- **Static Analysis**: ESLint + TypeScript ESLint
- **Formatting**: Prettier (通过ESLint集成)
- **Testing Framework**: Jest + Testing Library (计划中)
- **Documentation**: TypeDoc + Markdown文档

### Version Control & Collaboration
- **VCS**: Git
- **Branching Strategy**: 功能分支 + 主分支
- **Code Review Process**: Pull Request + 代码审查

### Dashboard Development
- **Live Reload**: Vite热模块替换
- **Port Management**: 可配置开发端口
- **Multi-Instance Support**: 支持多个扩展实例开发

## Deployment & Distribution
- **Target Platform(s**: Chrome浏览器 (支持Chromium内核浏览器)
- **Distribution Method**: Chrome Web Store + 开发者模式加载
- **Installation Requirements**: Chrome 88+, 支持Manifest V3
- **Update Mechanism**: Chrome自动更新 + 手动更新

## Technical Requirements & Constraints

### Performance Requirements
- **启动时间**: 扩展激活时间 < 100ms
- **内存占用**: 扩展内存使用 < 50MB
- **页面影响**: 对网页性能影响 < 5%
- **响应时间**: 用户交互响应 < 200ms

### Compatibility Requirements
- **Platform Support**: Chrome 88+, Edge 88+, 其他Chromium内核浏览器
- **Dependency Versions**: 遵循语义化版本控制
- **Standards Compliance**: Manifest V3规范, Chrome扩展最佳实践

### Security & Compliance
- **Security Requirements**: 本地优先、最小权限原则、内容安全策略
- **Compliance Standards**: Chrome扩展安全政策
- **Threat Model**: XSS防护、权限最小化、数据本地化

### Scalability & Reliability
- **Expected Load**: 单用户使用，支持多标签页
- **Availability Requirements**: 99.9%可用性，优雅降级
- **Growth Projections**: 支持功能扩展、主题定制、插件系统

## Technical Decisions & Rationale

### Decision Log
1. **TypeScript选择**: 提供类型安全、更好的开发体验、减少运行时错误
2. **React + Vite架构**: 现代化开发体验、快速构建、热重载支持
3. **Tailwind CSS + Shadcn/UI**: 快速UI开发、一致的设计系统、可维护性
4. **Zustand状态管理**: 轻量级、TypeScript友好、替代Redux的复杂性
5. **Chrome Storage API**: 原生支持、数据持久化、跨标签页同步
6. **模块化架构**: 代码可维护性、功能解耦、便于测试和扩展

## Known Limitations

- **浏览器兼容性**: 仅支持Chromium内核浏览器，不支持Firefox/Safari
- **性能影响**: 内容脚本可能对某些网页造成轻微性能影响
- **存储限制**: Chrome存储API有容量限制，大文件处理需要优化
- **权限模型**: Manifest V3的权限模型相对严格，某些功能需要用户授权
- **调试复杂性**: Chrome扩展调试相对复杂，需要特殊工具和流程