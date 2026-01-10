# Implementation Plan: Complete Refactor

## Overview

本实现计划将 AI Reading Extension 从 100+ 文件的过度工程化架构重构为约 15 个核心文件的精简架构。采用渐进式重构策略，确保每个阶段都有可工作的代码。

## Tasks

- [x] 1. 项目清理和基础设置
  - [x] 1.1 创建新的目录结构
    - 创建 `src-new/` 目录作为重构目标
    - 设置 `src-new/shared/`, `src-new/content/`, `src-new/popup/`, `src-new/background/` 目录
    - _Requirements: 7.3_
  - [x] 1.2 配置测试框架
    - 安装 Vitest 和 fast-check
    - 创建 `vitest.config.ts` 配置文件
    - 创建 `tests/setup.ts` 测试设置文件
    - _Requirements: 7.1, 7.2_

- [x] 2. 实现共享模块
  - [x] 2.1 实现类型定义 (`src-new/shared/types.ts`)
    - 定义 Settings 接口
    - 定义 ExtractedContent 接口
    - 定义 Message 类型
    - _Requirements: 5.5_
  - [x] 2.2 实现常量和默认值 (`src-new/shared/constants.ts`)
    - 定义 DEFAULT_SETTINGS
    - 定义消息类型常量
    - 定义主题颜色映射
    - _Requirements: 5.4_
  - [x] 2.3 实现存储模块 (`src-new/shared/storage.ts`)
    - 实现 getSettings() 函数
    - 实现 saveSettings() 函数
    - 实现 validateSettings() 验证函数
    - _Requirements: 5.1, 5.3, 5.4_
  - [ ]* 2.4 编写存储模块属性测试
    - **Property 1: Settings Round-Trip Consistency**
    - **Validates: Requirements 3.3, 3.4, 5.3, 5.4**

- [x] 3. Checkpoint - 确保共享模块测试通过
  - 运行所有测试，确保通过
  - 如有问题，询问用户

- [-] 4. 实现内容提取器
  - [x] 4.1 实现内容提取器 (`src-new/content/extractor.ts`)
    - 使用 Mozilla Readability 提取内容
    - 实现 extractContent() 函数
    - 实现简单的内存缓存
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  - [ ]* 4.2 编写内容提取器属性测试
    - **Property 2: Content Extraction Preserves Essential Elements**
    - **Validates: Requirements 2.2, 2.3**
  - [ ]* 4.3 编写内容提取器单元测试
    - 测试提取失败场景
    - 测试缓存行为
    - _Requirements: 2.4, 2.5_

- [x] 5. 实现阅读视图组件
  - [x] 5.1 实现阅读视图样式 (`src-new/content/styles.css`)
    - 实现主题样式（light/dark/sepia）
    - 实现排版样式（字体、行高、宽度）
    - 实现代码块基础样式
    - _Requirements: 3.1, 4.2_
  - [x] 5.2 实现代码块组件 (`src-new/content/CodeBlock.tsx`)
    - 实现语法高亮（使用 Prism.js 或简单的 CSS 类）
    - 实现复制按钮
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 5.3 实现设置面板组件 (`src-new/content/SettingsPanel.tsx`)
    - 实现主题选择器
    - 实现字体大小滑块
    - 实现行高滑块
    - 实现页面宽度滑块
    - _Requirements: 3.1, 3.2_
  - [x] 5.4 实现阅读视图组件 (`src-new/content/ReaderView.tsx`)
    - 整合内容显示
    - 整合设置面板
    - 实现悬浮按钮
    - _Requirements: 3.1, 3.5, 6.2_
  - [ ]* 5.5 编写设置变更属性测试
    - **Property 3: Reading Mode Toggle Restores Original State** (部分)
    - **Validates: Requirements 3.2**

- [x] 6. Checkpoint - 确保组件测试通过
  - 运行所有测试，确保通过
  - 如有问题，询问用户

- [x] 7. 实现内容脚本
  - [x] 7.1 实现内容脚本入口 (`src-new/content/index.ts`)
    - 实现消息监听器
    - 实现 enableReadingMode() 函数
    - 实现 disableReadingMode() 函数
    - 实现状态管理
    - _Requirements: 1.2, 1.3, 7.1, 7.5_
  - [x] 7.2 实现错误处理
    - 实现 handleError() 函数
    - 实现用户友好的错误消息
    - 实现 ErrorBoundary 组件
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 7.3 编写阅读模式切换属性测试
    - **Property 3: Reading Mode Toggle Restores Original State**
    - **Validates: Requirements 1.3, 1.5**
  - [ ]* 7.4 编写资源清理属性测试
    - **Property 6: Resource Cleanup on Disable**
    - **Validates: Requirements 7.4, 7.5**

- [x] 8. 实现弹出窗口
  - [x] 8.1 实现弹出窗口组件 (`src-new/popup/Popup.tsx`)
    - 实现阅读模式开关
    - 实现状态同步
    - _Requirements: 1.1, 1.5, 6.1_
  - [x] 8.2 实现弹出窗口入口 (`src-new/popup/index.tsx`)
    - 设置 React 渲染
    - 添加样式
    - _Requirements: 1.1_

- [x] 9. 实现后台脚本
  - [x] 9.1 实现后台脚本 (`src-new/background/index.ts`)
    - 实现消息路由
    - 实现内容脚本注入
    - _Requirements: 1.2, 7.1_

- [x] 10. Checkpoint - 确保所有模块集成测试通过
  - 运行所有测试，确保通过
  - 如有问题，询问用户

- [x] 11. 构建配置和优化
  - [x] 11.1 更新 Vite 配置
    - 配置新的入口点
    - 优化构建输出
    - 确保 bundle 大小 < 500KB
    - _Requirements: 7.3_
  - [x] 11.2 更新 manifest.json
    - 更新内容脚本路径
    - 更新后台脚本路径
    - _Requirements: 7.1_
  - [ ]* 11.3 编写性能属性测试
    - **Property 5: Initialization Performance**
    - **Validates: Requirements 1.2, 7.2**

- [-] 12. 可访问性和最终优化
  - [x] 12.1 实现键盘导航
    - 确保所有交互元素可通过 Tab 聚焦
    - 确保 Enter/Space 可激活元素
    - _Requirements: 6.5_
  - [ ]* 12.2 编写键盘可访问性属性测试
    - **Property 7: Keyboard Accessibility**
    - **Validates: Requirements 6.5**
  - [ ]* 12.3 编写错误恢复属性测试
    - **Property 8: Error Resilience**
    - **Validates: Requirements 8.3**

- [x] 13. 最终 Checkpoint - 确保所有测试通过
  - 运行完整测试套件
  - 验证 bundle 大小
  - 如有问题，询问用户

- [x] 14. 迁移和清理
  - [x] 14.1 替换旧代码
    - 备份 `src/` 到 `src-old/`
    - 将 `src-new/` 重命名为 `src/`
    - _Requirements: 全部_
  - [x] 14.2 清理旧文件
    - 删除不再需要的文件
    - 更新 .gitignore
    - _Requirements: 7.3_
  - [x] 14.3 更新文档
    - 更新 README.md
    - 更新版本号
    - _Requirements: 全部_

## Notes

- 任务标记 `*` 的是可选的测试任务，可以跳过以加快 MVP 开发
- 每个 Checkpoint 确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界情况
- 采用 `src-new/` 目录进行重构，确保旧代码在迁移完成前仍可工作
