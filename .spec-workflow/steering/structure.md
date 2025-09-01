# Project Structure

## Directory Organization

```
chrome-plugin-reading-extension/
├── src/                    # 源代码主目录
│   ├── background/         # 后台脚本
│   ├── content/            # 内容脚本
│   │   ├── components/     # 内容脚本UI组件
│   │   ├── extractors/     # 内容提取器
│   │   ├── features/       # 功能模块
│   │   ├── processors/     # 内容处理器
│   │   ├── styles/         # 样式文件
│   │   ├── ui/             # 通用UI组件
│   │   ├── workers/        # Web Workers
│   │   └── types.ts        # 类型定义
│   ├── popup/              # 弹出页面
│   │   ├── components/     # 弹出页面组件
│   │   └── utils/          # 工具函数
│   ├── components/         # 共享UI组件
│   │   └── ui/             # Shadcn/UI组件
│   ├── design-system/      # 设计系统
│   ├── lib/                # 工具库
│   ├── presets/            # 预设配置
│   ├── storage/            # 存储管理
│   │   ├── annotations/    # 注释存储
│   │   └── models/         # 数据模型
│   ├── store/              # 状态管理
│   ├── styles/             # 全局样式
│   ├── types/              # 全局类型定义
│   └── utils/              # 工具函数
├── public/                 # 静态资源
├── dist/                   # 构建输出
├── docs/                   # 项目文档
├── scripts/                # 构建脚本
└── tests/                  # 测试文件
```

## Naming Conventions

### Files
- **Components/Modules**: `PascalCase` (如 `ReaderMode.tsx`, `ContentExtractor.ts`)
- **Services/Handlers**: `camelCase` (如 `storageManager.ts`, `contentLoader.ts`)
- **Utilities/Helpers**: `camelCase` (如 `domUtils.ts`, `logManager.ts`)
- **Tests**: `[filename].test.ts` (如 `extractors.test.ts`)

### Code
- **Classes/Types**: `PascalCase` (如 `BaseExtractor`, `ReadingSettings`)
- **Functions/Methods**: `camelCase` (如 `extractContent`, `updateSettings`)
- **Constants**: `UPPER_SNAKE_CASE` (如 `DEFAULT_FONT_SIZE`, `MAX_CONTENT_LENGTH`)
- **Variables**: `camelCase` (如 `userSettings`, `contentData`)

## Import Patterns

### Import Order
1. **External dependencies**: React, Chrome APIs, 第三方库
2. **Internal modules**: 项目内部模块
3. **Relative imports**: 相对路径导入
4. **Style imports**: CSS/样式文件

### Module/Package Organization
- **绝对导入**: 从项目根目录导入 (`src/components/ui/button`)
- **相对导入**: 模块内部导入 (`./types`, `../utils`)
- **包组织**: 按功能模块组织，避免循环依赖
- **依赖管理**: 使用pnpm管理，支持monorepo结构

## Code Structure Patterns

### Module/Class Organization
```typescript
// 1. 导入和依赖
import React from 'react';
import { Button } from '@/components/ui/button';

// 2. 常量和配置
const DEFAULT_SETTINGS = { /* ... */ };

// 3. 类型/接口定义
interface ComponentProps { /* ... */ }

// 4. 主实现
export function Component(props: ComponentProps) { /* ... */ }

// 5. 辅助/工具函数
function helperFunction() { /* ... */ }

// 6. 导出/公共API
export { Component, helperFunction };
```

### Function/Method Organization
- **输入验证**: 函数开始处进行参数验证
- **核心逻辑**: 主要业务逻辑放在中间
- **错误处理**: 贯穿整个函数，使用try-catch
- **清晰返回**: 明确的返回点和错误处理

### File Organization Principles
- **单一职责**: 每个文件只负责一个明确的功能
- **功能分组**: 相关功能组织在一起
- **公共API**: 在文件顶部或底部明确导出
- **隐藏实现**: 内部实现细节不暴露

## Code Organization Principles

1. **单一职责**: 每个文件、类、函数都有明确的单一目的
2. **模块化**: 代码组织成可重用的模块
3. **可测试性**: 结构代码使其易于测试
4. **一致性**: 遵循代码库中建立的模式

## Module Boundaries

### 核心 vs 插件
- **核心功能**: 内容提取、阅读模式、基础UI
- **插件功能**: 主题系统、预设配置、扩展功能

### 公共API vs 内部实现
- **公共API**: 组件接口、工具函数、类型定义
- **内部实现**: 具体实现细节、私有方法、内部状态

### 平台特定 vs 跨平台
- **Chrome特定**: Chrome API调用、扩展特定功能
- **跨平台**: 通用逻辑、可复用组件、工具函数

### 稳定 vs 实验性
- **稳定功能**: 核心阅读功能、基础UI组件
- **实验性功能**: 新特性、优化尝试、测试功能

### 依赖方向
- **单向依赖**: 避免循环依赖，保持清晰的依赖层次
- **分层架构**: 表现层 → 业务逻辑层 → 数据层

## Code Size Guidelines

- **文件大小**: 最大500行，超过则考虑拆分
- **函数/方法大小**: 最大50行，超过则提取子函数
- **类/模块复杂度**: 最大10个方法，超过则考虑拆分
- **嵌套深度**: 最大4层，超过则提取函数

## Dashboard/Monitoring Structure

### 扩展管理结构
```
src/
└── popup/                  # 自包含的弹出页面子系统
    ├── components/         # 前端组件
    ├── utils/             # 工具函数
    └── PopupShadcn.tsx    # 主入口
```

### 关注点分离
- 弹出页面与核心业务逻辑隔离
- 独立的组件和工具函数
- 最小化对主要功能的依赖
- 可以独立开发和测试

## Documentation Standards

- **公共API**: 所有公共API必须有文档注释
- **复杂逻辑**: 复杂业务逻辑应包含内联注释
- **模块说明**: 主要模块的README文件
- **代码规范**: 遵循TypeScript和React文档约定
- **架构文档**: 维护完整的架构设计文档