# 📚 项目文档

## 📁 目录结构

```
docs/
├── releases/      # 发版记录和修复日志
├── technical/     # 技术文档和优化记录
└── debug/         # 调试指南和测试工具
```

## 📋 文档索引

### 🚀 发版记录 (releases/)

#### 正式版本
- [v1.8.9](./releases/RELEASE_v1.8.9.md) - 修复阅读模式刷新问题
- [v1.8.7](./releases/RELEASE_v1.8.7.md) - 图片加载优化
- [v1.8.6](./releases/CHANGELOG_v1.8.6.md) - 预设保存修复

#### Bug 修复
- [v1.8.12](./releases/FIX_v1.8.12.md) - 修复 Popup 无限循环 ✨
- [v1.8.11](./releases/FIX_v1.8.11.md) - 增加调试日志
- [v1.8.10](./releases/FIX_v1.8.10.md) - 状态管理优化
- [v1.8.8](./releases/BUG_FIX_v1.8.8.md) - 紧急修复
- [阅读模式刷新问题](./releases/BUG_FIX_READING_MODE_REFRESH.md)
- [Bug 修复总结](./releases/BUG_FIX_SUMMARY.md)
- [PageWidth 存储修复](./releases/FIX_PAGEWIDTH_STORAGE.md)

### 🔧 技术文档 (technical/)

- [图片加载优化方案](./technical/IMAGE_LOADING_OPTIMIZATION.md) - 详细的优化策略
- [代码审查报告](./technical/CODE_REVIEW_REPORT.md) - v1.8.7 代码审查

### 🐛 调试工具 (debug/)

- [调试指南](./debug/DEBUG_INSTRUCTIONS.md) - v1.8.11 调试步骤
- [阅读模式调试](./debug/DEBUG_READING_MODE.md) - 问题诊断工具

## 📊 版本历史

| 版本 | 日期 | 主要更新 | 状态 |
|------|------|----------|------|
| v1.8.12 | 2024-10-09 | 修复 Popup 无限循环问题 | ✅ 稳定 |
| v1.8.11 | 2024-10-09 | 增加详细调试日志 | 🔍 调试版 |
| v1.8.10 | 2024-10-09 | 优化状态管理 | 🔧 过渡版 |
| v1.8.9 | 2024-10-09 | 修复刷新后无法进入阅读模式 | ⚠️ 有问题 |
| v1.8.8 | 2024-10-09 | 紧急 Bug 修复 | ⚠️ 有问题 |
| v1.8.7 | 2024-10-09 | 图片加载优化 | ✅ 稳定 |
| v1.8.6 | 2024-10-09 | 修复预设保存问题 | ✅ 稳定 |

## 🎯 最新稳定版本

**v1.8.12** - 推荐使用

### 主要修复
- ✅ 解决 Popup 组件无限循环
- ✅ 修复页面刷新后无法进入阅读模式
- ✅ 优化性能和日志输出

## 📝 文档维护

所有新的发版记录请按以下规则创建：

1. **版本发布**: `RELEASE_v{version}.md` → `docs/releases/`
2. **Bug 修复**: `FIX_v{version}.md` 或 `BUG_FIX_{feature}.md` → `docs/releases/`
3. **技术文档**: `{FEATURE}_OPTIMIZATION.md` → `docs/technical/`
4. **调试工具**: `DEBUG_{feature}.md` → `docs/debug/`

## 🔗 快速链接

- [最新版本说明](./releases/FIX_v1.8.12.md)
- [调试测试页面](../DEBUG_TEST.html)
- [图片加载演示](../IMAGE_LOADING_DEMO.html)
- [项目 README](../README.md)
