# 图片加载优化

## 概述

本文档详细说明了对阅读插件中图片加载功能的优化，主要包括懒加载图片处理的改进、图片占位符的重新设计以及加载过渡效果的优化。这些改进旨在提供更流畅、更美观的图片加载体验。

## 懒加载图片处理优化

### 扩展懒加载属性检测

- 增加了对更多懒加载属性的支持，覆盖了各种网站使用的不同懒加载实现
- 新增的懒加载属性包括：
  ```javascript
  'data-echo', 'data-lazy-img', 'data-url', 'data-original-image',
  'data-src-retina', 'data-lazy-original', 'data-lazy-load',
  'data-src-mobile', 'data-src-desktop', 'data-src-tablet',
  'data-thumb', 'data-bg-src', 'data-full-src', 'data-image-src',
  'data-link', 'data-image', 'data-original-file', 'data-large-file',
  'data-medium-file', 'data-source-url', 'data-high-res-src',
  'data-low-res-src', 'data-normal-src', 'data-full-image',
  'data-zoom-image', 'data-large-image', 'data-main-image',
  'data-super-size-src', 'data-super-size', 'data-hd-src',
  'data-retina-src', 'data-raw-src', 'data-actualsrc',
  'data-original-image-src', 'data-original-image-url',
  'data-fullsize-src', 'data-fullsize-url', 'data-big',
  'data-big-src', 'data-big-url', 'data-src-large',
  'data-full', 'data-full-url', 'data-hires',
  'data-hires-src', 'data-hires-url', 'data-2x',
  'data-2x-src', 'data-2x-url', 'data-desktop',
  'data-desktop-src', 'data-desktop-url'
  ```

### 增强的图片源检测

- 添加了对 `srcset` 属性的检测和处理
- 添加了对 `noscript` 标签中图片的检测
- 添加了对相邻 `noscript` 标签的检测
- 增强了对父元素背景图片的检测，包括：
  - `data-background`
  - `data-bg`
  - `data-background-image`
  - `data-background-src`

### 改进的错误处理

- 添加了图片加载错误处理
- 实现了备用加载方案，确保即使预加载失败也能尝试直接加载

## 图片占位符重新设计

### 视觉设计优化

- 使用渐变背景和动画效果替代静态背景色
- 实现了"闪烁"(shimmer)效果，提供更好的视觉反馈
- 优化了加载动画的大小和颜色，使其更加低调
- 增加了圆角，与图片容器保持一致

### 尺寸计算优化

- 改进了占位符尺寸的计算方法
- 为图片添加了宽高属性，确保占位符能够正确计算大小
- 优化了默认宽高比例的处理

## 加载过渡效果优化

### 平滑过渡

- 实现了图片加载完成后的平滑淡入效果
- 添加了轻微的缩放效果，使图片加载更加生动
- 优化了占位符的淡出效果，避免突然消失

### 预加载机制

- 实现了图片预加载机制，使用新的 Image 对象
- 添加了延迟显示，确保过渡更加平滑
- 优化了加载时机，提前 300px 开始加载图片

### 容器样式优化

- 为图片容器添加了轻微的阴影效果
- 实现了悬停时的阴影增强效果
- 优化了暗色模式下的容器样式

## 代码实现

### 懒加载设置函数

```typescript
private setupLazyLoading(img: HTMLImageElement, src: string): void {
  // 创建交叉观察器
  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 当图片进入视口时加载
          const imgElement = entry.target as HTMLImageElement;
          
          // 预加载图片，使用新的 Image 对象
          const preloadImg = new Image();
          
          // 设置加载完成的回调
          preloadImg.onload = () => {
            // 延迟一小段时间再显示，使过渡更平滑
            setTimeout(() => {
              // 设置实际图片的 src
              imgElement.src = src;
              imgElement.classList.add('loaded');
              
              // 慢慢淡出占位图
              const placeholder = imgElement.parentElement?.querySelector('.image-placeholder');
              if (placeholder && placeholder instanceof HTMLElement) {
                placeholder.style.opacity = '0';
                
                // 等待过渡完成后移除占位图
                setTimeout(() => {
                  placeholder.remove();
                }, 300);
              }
            }, 100);
          };
          
          // 处理加载错误
          preloadImg.onerror = () => {
            // 尝试直接设置 src，作为备用方案
            imgElement.src = src;
            imgElement.classList.add('loaded');
            
            // 移除占位图
            const placeholder = imgElement.parentElement?.querySelector('.image-placeholder');
            if (placeholder) {
              placeholder.remove();
            }
            
            console.warn(`图片加载失败: ${src}`);
          };
          
          // 开始加载图片
          preloadImg.src = src;

          // 停止观察该图片
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '300px 0px', // 提前 300px 加载，增加提前量
      threshold: 0.01 // 当 1% 的图片可见时开始加载
    }
  );

  // 开始观察图片
  observer.observe(img);
}
```

### 占位符样式

```css
.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(110deg, #f5f5f5 30%, #eeeeee 50%, #f5f5f5 70%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: opacity 0.3s ease;
}

.dark .image-placeholder {
  background: linear-gradient(110deg, #2a2a2a 30%, #333333 50%, #2a2a2a 70%);
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

## 效果对比

### 优化前

- 图片加载时没有平滑过渡
- 占位符使用静态背景色，视觉效果单调
- 部分懒加载图片无法正确显示
- 图片容器样式简单，缺乏视觉深度

### 优化后

- 图片加载时有平滑的淡入和轻微缩放效果
- 占位符使用动态渐变和闪烁效果，提供更好的视觉反馈
- 支持更多类型的懒加载图片
- 图片容器有轻微阴影和悬停效果，增加视觉深度

## 后续优化方向

1. **自适应图片质量**：根据网络状况和设备性能动态调整图片质量
2. **渐进式加载**：实现大图片的渐进式加载，先显示低质量预览
3. **图片格式优化**：支持 WebP、AVIF 等现代图片格式
4. **图片缓存策略**：实现更智能的图片缓存机制
5. **图片错误恢复**：提供更多图片加载失败时的恢复选项
