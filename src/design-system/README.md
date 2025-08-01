# Chrome阅读扩展设计系统

## 概述

本项目已从Material Design 3迁移到基于Tailwind CSS 4 + Shadcn/UI的现代化设计系统。

## 技术栈

- **CSS框架**: Tailwind CSS 4.x
- **组件库**: Shadcn/UI (基于Radix UI)
- **图标**: Lucide React
- **样式工具**: Class Variance Authority (CVA)
- **工具函数**: clsx + tailwind-merge

## 设计令牌

### 颜色系统

```css
:root {
  /* 基础颜色 */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  
  /* 主色调 */
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  
  /* 次要颜色 */
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  
  /* 静音色 */
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  /* 边框 */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  
  /* 卡片 */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  
  /* 弹出框 */
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  
  /* 破坏性操作 */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  
  /* 环形进度条 */
  --ring: 221.2 83.2% 53.3%;
  
  /* 半径 */
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 84% 4.9%;
  
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  
  --ring: 217.2 91.2% 59.8%;
}
```

### 阅读模式专用颜色

```css
/* 纸张背景色 */
.paper-cream {
  --reading-bg-color: #F8F5F1;
  --reading-text-color: #2D1B0E;
}

.paper-mint {
  --reading-bg-color: #f1f7f5;
  --reading-text-color: #1a3d32;
}

.paper-warm {
  --reading-bg-color: #f9f3ee;
  --reading-text-color: #3d2e1f;
}

.paper-cool {
  --reading-bg-color: #f2f5f8;
  --reading-text-color: #1f2937;
}

.paper-sepia {
  --reading-bg-color: #f5f2e9;
  --reading-text-color: #4a3728;
}
```

## 组件库

### 核心组件

- **Button**: `src/components/ui/button.tsx`
- **Card**: `src/components/ui/card.tsx`
- **Switch**: `src/components/ui/switch.tsx`
- **Slider**: `src/components/ui/slider.tsx`

### 使用示例

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>标题</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default" size="sm">
          按钮
        </Button>
      </CardContent>
    </Card>
  );
}
```

## 响应式设计

使用Tailwind CSS的响应式前缀：

- `sm:` - 640px及以上
- `md:` - 768px及以上
- `lg:` - 1024px及以上
- `xl:` - 1280px及以上

## 无障碍支持

- 所有组件基于Radix UI，内置无障碍支持
- 支持键盘导航
- 符合WCAG 2.1 AA标准
- 支持屏幕阅读器

## 迁移指南

### 从Material Design 3迁移

1. **颜色变量**: 使用新的CSS自定义属性
2. **组件**: 替换为Shadcn/UI组件
3. **样式**: 使用Tailwind CSS类名
4. **图标**: 使用Lucide React图标

### 常见替换

```tsx
// 旧的 Material Design 3
<div className="md-surface md-primary-container">
  <button className="md-button md-filled-button">
    按钮
  </button>
</div>

// 新的 Shadcn/UI
<Card>
  <CardContent>
    <Button variant="default">
      按钮
    </Button>
  </CardContent>
</Card>
```

## 开发工具

- **Tailwind CSS IntelliSense**: VS Code扩展
- **Headwind**: 自动排序Tailwind类名
- **Prettier Plugin Tailwindcss**: 格式化Tailwind类名

## 构建配置

- PostCSS配置: `postcss.config.js`
- Tailwind配置: `tailwind.config.js`
- TypeScript路径别名: `@/*` 映射到 `src/*`
