# 🔄 样式系统迁移指南

> 从 Material Design 3 自定义CSS系统迁移到 Tailwind CSS 4 + Shadcn/UI

**📚 [返回文档中心](./README.md)** | **📖 [开发指南](./DEVELOPMENT_GUIDE.md)** | **🎨 [设计系统](./design-system-spec.md)** | **📋 [API参考](./API_REFERENCE.md)**

---

## 📋 目录

1. [迁移概述](#1-迁移概述)
2. [环境准备](#2-环境准备)
3. [依赖安装](#3-依赖安装)
4. [配置文件设置](#4-配置文件设置)
5. [组件迁移](#5-组件迁移)
6. [样式迁移](#6-样式迁移)
7. [测试验证](#7-测试验证)
8. [常见问题](#8-常见问题)

---

## 1. 迁移概述

### 1.1 迁移目标

将项目从当前的技术栈迁移到新的现代化技术栈：

| 组件 | 迁移前 | 迁移后 |
|------|--------|--------|
| **CSS框架** | 自定义CSS系统 | Tailwind CSS 4 |
| **组件库** | 自研MD3组件 | Shadcn/UI |
| **设计语言** | Material Design 3 | 现代简约风格 |
| **UI基础** | @headlessui/react | Radix UI |
| **图标库** | 自定义图标 | Lucide React |
| **动画库** | Framer Motion | CSS过渡 + Radix动画 |

### 1.2 迁移策略

采用**渐进式迁移**策略，确保系统稳定性：

1. **阶段1**：环境配置和基础设置
2. **阶段2**：核心组件迁移
3. **阶段3**：样式系统迁移
4. **阶段4**：功能测试和优化

---

## 2. 环境准备

### 2.1 Node.js 版本要求

确保使用兼容的 Node.js 版本：

```bash
# 检查当前版本
node --version  # 需要 >= 18.0.0

# 如果版本过低，请升级
nvm install 18
nvm use 18
```

### 2.2 包管理器

推荐使用 pnpm：

```bash
# 安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

---

## 3. 依赖安装

### 3.1 安装 Tailwind CSS 4

```bash
# 安装 Tailwind CSS 4 (预发布版本)
pnpm add tailwindcss@next @tailwindcss/postcss@next

# 安装 PostCSS 相关依赖
pnpm add -D postcss autoprefixer
```

### 3.2 安装 Shadcn/UI

```bash
# 初始化 Shadcn/UI
npx shadcn@latest init

# 安装核心组件
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add switch
npx shadcn@latest add slider
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tooltip
```

### 3.3 安装图标库

```bash
# 安装 Lucide React
pnpm add lucide-react

# 移除旧的图标依赖（如果有）
pnpm remove @heroicons/react
```

### 3.4 移除旧依赖

```bash
# 移除不再需要的依赖
pnpm remove @headlessui/react framer-motion

# 保留但可能需要更新的依赖
# - React (保持当前版本)
# - TypeScript (保持当前版本)
# - Vite (可能需要更新配置)
```

---

## 4. 配置文件设置

### 4.1 创建 Tailwind 配置

创建 `tailwind.config.js`：

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
```

### 4.2 创建 PostCSS 配置

创建 `postcss.config.js`：

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 4.3 更新 Vite 配置

更新所有 Vite 配置文件以支持 Tailwind CSS：

```javascript
// vite.popup.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  // ... 其他配置
});
```

### 4.4 创建全局样式文件

创建 `src/styles/globals.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## 5. 组件迁移

### 5.1 Button 组件迁移

**迁移前** (`src/design-system/components/Button.tsx`)：
```typescript
interface ButtonProps {
  variant?: 'filled' | 'outlined' | 'text' | 'elevated' | 'tonal';
  size?: 'small' | 'medium' | 'large';
  // ...
}
```

**迁移后**：
```typescript
import { Button } from '@/components/ui/button';

// 新的变体映射
const variantMap = {
  filled: 'default',
  outlined: 'outline', 
  text: 'ghost',
  elevated: 'secondary',
  tonal: 'secondary'
} as const;

// 使用示例
<Button variant={variantMap[oldVariant]} size="default">
  按钮文本
</Button>
```

### 5.2 Card 组件迁移

**迁移前**：
```typescript
<Card elevation={2} padding="medium">
  <h3>标题</h3>
  <p>内容</p>
</Card>
```

**迁移后**：
```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>
    <p>内容</p>
  </CardContent>
</Card>
```

### 5.3 自定义组件迁移

对于 `CustomSlider.tsx` 和 `CustomSwitch.tsx`：

```typescript
// 迁移前
import { CustomSlider } from '@/ui/components/CustomSlider';
import { CustomSwitch } from '@/ui/components/CustomSwitch';

// 迁移后
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

// API 调整
<Slider
  value={[value]}
  onValueChange={(newValue) => setValue(newValue[0])}
  min={min}
  max={max}
  step={step}
/>

<Switch
  checked={checked}
  onCheckedChange={setChecked}
/>
```

---

## 6. 样式迁移

### 6.1 CSS 类名迁移

常见的类名迁移映射：

| 旧类名 | 新类名 |
|--------|--------|
| `bg-primary-40` | `bg-primary` |
| `text-primary-99` | `text-primary-foreground` |
| `bg-surface-container` | `bg-card` |
| `text-on-surface` | `text-card-foreground` |
| `border-outline` | `border-border` |
| `shadow-sm` | `shadow-sm` (保持不变) |

### 6.2 移除旧的 CSS 文件

```bash
# 备份重要的 CSS 文件
cp src/popup/PopupMD3.css src/popup/PopupMD3.css.backup

# 逐步移除旧的样式文件
# 注意：不要一次性删除，建议逐步迁移
```

### 6.3 更新导入语句

在主要入口文件中：

```typescript
// 移除旧的样式导入
// import './PopupMD3.css';

// 添加新的样式导入
import '@/styles/globals.css';
```

---

## 7. 测试验证

### 7.1 功能测试清单

- [ ] **Popup界面**：所有按钮和交互正常
- [ ] **阅读模式**：样式显示正确
- [ ] **主题切换**：明暗主题正常切换
- [ ] **响应式**：不同屏幕尺寸适配
- [ ] **无障碍**：键盘导航和屏幕阅读器支持

### 7.2 视觉回归测试

```bash
# 构建项目
pnpm build

# 在不同浏览器中测试
# - Chrome (主要目标)
# - Firefox
# - Safari
# - Edge
```

### 7.3 性能测试

```bash
# 检查构建产物大小
pnpm build
ls -la dist/

# 对比迁移前后的包大小
# 预期：CSS 文件应该更小，JS 文件可能略有增加
```

---

## 8. 常见问题

### 8.1 样式不生效

**问题**：Tailwind 样式没有应用
**解决**：
1. 检查 `tailwind.config.js` 中的 `content` 配置
2. 确保导入了 `globals.css`
3. 重启开发服务器

### 8.2 组件类型错误

**问题**：TypeScript 类型错误
**解决**：
1. 更新 `@types/react` 到最新版本
2. 检查组件 props 是否正确映射
3. 添加必要的类型声明

### 8.3 构建失败

**问题**：Vite 构建失败
**解决**：
1. 检查 PostCSS 配置
2. 更新 Vite 配置文件
3. 清除缓存：`pnpm clean && pnpm install`

### 8.4 Chrome 扩展兼容性

**问题**：扩展无法加载
**解决**：
1. 检查 `manifest.json` 中的 CSP 配置
2. 确保没有使用不兼容的 CSS 特性
3. 测试在不同 Chrome 版本中的兼容性

---

## 🎉 迁移完成检查清单

- [ ] 所有依赖已正确安装
- [ ] 配置文件已正确设置
- [ ] 核心组件已迁移并测试
- [ ] 样式系统已完全迁移
- [ ] 功能测试全部通过
- [ ] 性能指标符合预期
- [ ] 文档已更新
- [ ] 代码已提交到版本控制

**恭喜！** 你已经成功完成了从 Material Design 3 到 Tailwind CSS 4 + Shadcn/UI 的迁移！

---

## 📚 相关文档

- [设计系统规范](./design-system-spec.md)
- [API 参考文档](./API_REFERENCE.md)
- [开发指南](./DEVELOPMENT_GUIDE.md)
- [故障排除](./TROUBLESHOOTING.md)
