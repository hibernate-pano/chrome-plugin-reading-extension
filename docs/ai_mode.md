# AI 模式设计文档

## 功能概述

AI 模式是一个智能辅助阅读的功能模块，它提供了一系列基于 AI 的文本处理功能，帮助用户更好地理解和阅读网页内容。

## 功能特性

### 1. 界面设计

- 右侧固定悬浮面板（宽度 300px）
- 半透明背景（rgba(255, 255, 255, 0.95)）
- 阴影效果（-2px 0 10px rgba(0, 0, 0, 0.1)）
- 平滑过渡动画（0.3s ease）

### 2. AI 功能按钮

- 生成摘要：自动提取文章的主要内容，生成简短摘要
- 翻译内容：将内容翻译成中文
- 解释内容：用更简单的语言解释文章内容
- AI 重排版：将 HTML 转换成 Markdown 格式并重新渲染

### 3. 结果展示区域

- 位于按钮下方
- 浅灰色背景（#f5f5f5）
- 圆角设计（5px）
- 可滚动查看长内容

### 4. 退出按钮

- 固定在右下角
- 蓝色主题（#1a73e8）
- 圆形按钮设计
- 悬浮效果

## 技术实现

### 1. 状态管理

```typescript
let isAIMode = false;
let originalContent: string | null = null;
```

### 2. 模式切换

- 与阅读模式互斥
- 保存原始页面内容
- 支持随时退出恢复原状

### 3. API 接口

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const API_ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions";

// 提示词模板
const PROMPTS = {
  SUMMARIZE: {
    system:
      "你是一个专业的文章摘要生成器。请生成一个简洁的摘要，突出文章的主要观点和关键信息。摘要应该：1. 不超过500字 2. 保持文章的核心意思 3. 使用简洁明了的语言",
    user: (content: string) => `请为以下文章生成摘要：\n\n${content}`,
  },
  TRANSLATE: {
    system:
      "你是一个专业的翻译器。请将内容翻译成流畅的中文，同时：1. 保持专业术语的准确性 2. 保持原文的语气和风格 3. 确保翻译的自然度",
    user: (content: string) => `请将以下内容翻译成中文：\n\n${content}`,
  },
  EXPLAIN: {
    system:
      "你是一个专业的解释器。请用通俗易懂的语言解释内容，要求：1. 简化专业术语 2. 提供必要的背景信息 3. 使用生动的例子 4. 保持解释的准确性",
    user: (content: string) => `请解释以下内容：\n\n${content}`,
  },
  REFORMAT: {
    system:
      "你是一个专业的文本重排版工具。请将HTML内容转换成优雅的Markdown格式，要求：1. 保持文档结构 2. 优化标题层级 3. 规范列表格式 4. 保持代码块格式 5. 优化图片引用",
    user: (content: string) =>
      `请将以下HTML内容转换成Markdown格式：\n\n${content}`,
  },
};

// API 配置
const API_CONFIG = {
  model: "deepseek-ai/DeepSeek-V2-Chat", // 或其他可用模型
  temperature: 0.7,
  top_p: 0.7,
  max_tokens: 2048,
  stream: false,
};
```

### 4. 功能实现细节

#### 4.1 生成摘要

```typescript
async function generateSummary(content: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: PROMPTS.SUMMARIZE.system },
    { role: "user", content: PROMPTS.SUMMARIZE.user(content) },
  ];

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VITE_SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      ...API_CONFIG,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error("摘要生成失败");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

#### 4.2 翻译内容

```typescript
async function translateContent(content: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: PROMPTS.TRANSLATE.system },
    { role: "user", content: PROMPTS.TRANSLATE.user(content) },
  ];

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VITE_SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      ...API_CONFIG,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error("翻译失败");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

#### 4.3 解释内容

```typescript
async function explainContent(content: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: PROMPTS.EXPLAIN.system },
    { role: "user", content: PROMPTS.EXPLAIN.user(content) },
  ];

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VITE_SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      ...API_CONFIG,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error("解释生成失败");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

#### 4.4 AI 重排版

```typescript
async function reformatContent(content: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: PROMPTS.REFORMAT.system },
    { role: "user", content: PROMPTS.REFORMAT.user(content) },
  ];

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VITE_SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      ...API_CONFIG,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error("重排版失败");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

## 错误处理

### 1. API 错误

```typescript
try {
  // API 调用
} catch (error) {
  aiResultContent.innerHTML =
    "操作失败: " + (error instanceof Error ? error.message : String(error));
}
```

### 2. 状态恢复

- 保存原始内容
- 出错时可回退
- 清理临时状态

## 样式设计

### 1. 容器样式

```css
position: fixed;
top: 0;
right: 0;
width: 300px;
height: 100vh;
background-color: rgba(255, 255, 255, 0.95);
box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
z-index: 9999;
padding: 20px;
overflow-y: auto;
transition: transform 0.3s ease;
```

### 2. 按钮样式

```css
margin: 5px 0;
width: 100%;
padding: 8px;
background-color: #1a73e8;
color: white;
border: none;
border-radius: 20px;
cursor: pointer;
```

### 3. 结果区域样式

```css
margin-top: 20px;
padding: 10px;
background: #f5f5f5;
border-radius: 5px;
```

## 使用流程

1. 点击扩展图标进入 AI 模式
2. 自动关闭阅读模式（如果开启）
3. 显示 AI 工具栏
4. 选择需要的 AI 功能
5. 在结果区域查看处理结果
6. 点击退出按钮或重新点击扩展图标退出

## 注意事项

1. API 密钥安全性

   - 使用环境变量存储
   - 避免暴露在前端代码中

2. 性能优化

   - 避免频繁 API 调用
   - 缓存处理结果
   - 优化 DOM 操作

3. 用户体验

   - 提供加载状态提示
   - 错误信息友好展示
   - 支持随时退出

4. 兼容性
   - 支持主流浏览器
   - 响应式设计
   - 优雅降级
