# ⚡ 性能优化指南

> Chrome 阅读扩展的性能优化最佳实践

**📚 [返回文档中心](./README.md)** | **📖 [开发指南](./DEVELOPMENT_GUIDE.md)** | **🧪 [测试指南](./TESTING.md)**

---

## 📊 性能目标

### 🎯 关键指标

| 指标 | 目标值 | 当前值 | 状态 |
|------|--------|--------|------|
| **内容脚本加载时间** | < 100ms | ~80ms | ✅ |
| **Popup 打开时间** | < 200ms | ~150ms | ✅ |
| **阅读模式切换时间** | < 300ms | ~250ms | ✅ |
| **内存占用** | < 50MB | ~35MB | ✅ |
| **内容脚本大小** | < 50KB | ~42KB | ✅ |

---

## 🏗️ 架构优化

### 1. 最小化注入策略

**核心思想**: 只注入必要的代码，功能模块按需加载。

```javascript
// contentLoader.ts - 最小化入口脚本
// 只包含基础功能检测和动态加载逻辑
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

async function initializeExtension() {
  // 延迟加载主要功能模块
  const { ReadingModeManager } = await import('./features/readingMode');
  // 初始化逻辑...
}
```

**优势**:
- 减少初始加载时间
- 降低对页面性能的影响
- 支持渐进式功能加载

### 2. 代码分割优化

```javascript
// vite.content.config.ts
manualChunks: (id: string) => {
  // 核心模块 - 立即加载
  if (id.includes('contentLoader')) return 'core';
  
  // 功能模块 - 按需加载
  if (id.includes('readingMode')) return 'feature-reading';
  if (id.includes('contentExtraction')) return 'feature-extraction';
  
  // 第三方库 - 独立缓存
  if (id.includes('@mozilla/readability')) return 'vendor-readability';
  if (id.includes('turndown')) return 'vendor-turndown';
}
```

### 3. Web Workers 优化

```javascript
// 将计算密集型任务移到 Web Worker
// src/content/workers/contentProcessor.ts
self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'EXTRACT_CONTENT':
      const result = await extractContent(data.html);
      self.postMessage({ type: 'CONTENT_EXTRACTED', result });
      break;
      
    case 'PROCESS_MARKDOWN':
      const markdown = await processMarkdown(data.content);
      self.postMessage({ type: 'MARKDOWN_PROCESSED', markdown });
      break;
  }
};
```

---

## 💾 存储优化

### 1. 智能缓存策略

```javascript
// 实现多层缓存
class CacheManager {
  private memoryCache = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟
  
  async get(key: string) {
    // 1. 检查内存缓存
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && Date.now() - memoryItem.timestamp < this.CACHE_TTL) {
      return memoryItem.data;
    }
    
    // 2. 检查 Chrome 存储
    const storageItem = await chrome.storage.local.get(key);
    if (storageItem[key]) {
      // 更新内存缓存
      this.memoryCache.set(key, {
        data: storageItem[key],
        timestamp: Date.now()
      });
      return storageItem[key];
    }
    
    return null;
  }
}
```

### 2. 批量存储操作

```javascript
// 避免频繁的单个存储操作
class BatchStorageManager {
  private pendingWrites = new Map();
  private writeTimer: NodeJS.Timeout | null = null;
  
  async set(key: string, value: any) {
    this.pendingWrites.set(key, value);
    
    // 延迟批量写入
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => this.flushWrites(), 100);
  }
  
  private async flushWrites() {
    if (this.pendingWrites.size === 0) return;
    
    const items = Object.fromEntries(this.pendingWrites);
    await chrome.storage.local.set(items);
    
    this.pendingWrites.clear();
    this.writeTimer = null;
  }
}
```

---

## 🎨 UI 性能优化

### 1. React 组件优化

```typescript
// 使用 React.memo 避免不必要的重渲染
export const SettingsCard = React.memo<SettingsCardProps>(({ 
  title, 
  children, 
  isExpanded 
}) => {
  return (
    <div className={`settings-card ${isExpanded ? 'expanded' : ''}`}>
      <h3>{title}</h3>
      {children}
    </div>
  );
});

// 使用 useMemo 缓存计算结果
const ExpensiveComponent = () => {
  const expensiveValue = useMemo(() => {
    return computeExpensiveValue(props.data);
  }, [props.data]);
  
  return <div>{expensiveValue}</div>;
};
```

### 2. CSS 性能优化

```css
/* 使用 CSS 变量减少重复计算 */
:root {
  --transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
  --shadow-elevation-1: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* 优化动画性能 - 只动画 transform 和 opacity */
.card-transition {
  transform: translateY(0);
  opacity: 1;
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}

.card-transition.entering {
  transform: translateY(-8px);
  opacity: 0;
}

/* 使用 will-change 提示浏览器优化 */
.animated-element {
  will-change: transform, opacity;
}

.animated-element.animation-complete {
  will-change: auto; /* 动画完成后移除提示 */
}
```

### 3. 虚拟滚动（如需要）

```typescript
// 对于长列表使用虚拟滚动
const VirtualizedList = ({ items, itemHeight = 50 }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = 300;
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd);
  
  return (
    <div 
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={visibleStart + index}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🔄 异步操作优化

### 1. 防抖和节流

```typescript
// 防抖 - 用于用户输入
const debouncedSave = useMemo(
  () => debounce(async (settings: UserSettings) => {
    await saveSettings(settings);
  }, 300),
  []
);

// 节流 - 用于滚动事件
const throttledScroll = useMemo(
  () => throttle((scrollPosition: number) => {
    updateScrollPosition(scrollPosition);
  }, 100),
  []
);
```

### 2. 请求优化

```typescript
// 请求去重
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async request(key: string, requestFn: () => Promise<any>) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
}

// 并发控制
class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => Promise<any>> = [];
  
  constructor(private limit: number = 3) {}
  
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const task = this.queue.shift()!;
    
    try {
      await task();
    } finally {
      this.running--;
      this.process();
    }
  }
}
```

---

## 📊 性能监控

### 1. 性能指标收集

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  startTimer(name: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    };
  }
  
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // 保持最近100个数据点
    if (values.length > 100) {
      values.shift();
    }
  }
  
  getStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }
}

// 使用示例
const monitor = new PerformanceMonitor();

async function enableReadingMode() {
  const endTimer = monitor.startTimer('reading-mode-enable');
  
  try {
    // 执行阅读模式逻辑
    await processContent();
    await renderReadingView();
  } finally {
    endTimer();
  }
}
```

### 2. 内存监控

```typescript
// 内存使用监控
class MemoryMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  
  start() {
    this.checkInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log('内存使用情况:', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
      }
    }, 30000); // 每30秒检查一次
  }
  
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
```

---

## 🛠️ 构建优化

### 1. 构建配置优化

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // 将大型第三方库分离
          'vendor-readability': ['@mozilla/readability'],
          'vendor-react': ['react', 'react-dom']
        }
      }
    }
  }
});
```

### 2. 资源优化

```bash
# 图片优化
pnpm add -D imagemin imagemin-pngquant imagemin-mozjpeg

# 在构建脚本中压缩图片
imagemin public/icon*.png --out-dir=dist/icons --plugin=pngquant
```

---

## 📈 性能测试

### 1. 自动化性能测试

```javascript
// 性能测试脚本
describe('Performance Tests', () => {
  test('内容脚本加载时间', async () => {
    const start = performance.now();
    await loadContentScript();
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100); // 100ms 以内
  });
  
  test('阅读模式切换时间', async () => {
    const start = performance.now();
    await toggleReadingMode();
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(300); // 300ms 以内
  });
});
```

### 2. 性能基准测试

```bash
# 使用 Lighthouse CI 进行性能测试
npm install -g @lhci/cli

# 配置 lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }]
      }
    }
  }
};
```

---

## 🎯 优化检查清单

### ✅ 代码层面
- [ ] 使用 React.memo 和 useMemo 优化组件渲染
- [ ] 实现防抖和节流机制
- [ ] 使用 Web Workers 处理计算密集型任务
- [ ] 优化异步操作和错误处理

### ✅ 资源层面
- [ ] 实现代码分割和按需加载
- [ ] 压缩图片和静态资源
- [ ] 使用适当的缓存策略
- [ ] 最小化第三方依赖

### ✅ 监控层面
- [ ] 实现性能指标收集
- [ ] 设置内存监控
- [ ] 建立性能基准测试
- [ ] 定期进行性能审计

---

**记住**：性能优化是一个持续的过程，需要定期监控和调整！⚡
