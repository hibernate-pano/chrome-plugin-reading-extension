import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  build: {
    // 启用特定于Chrome扩展的优化
    target: 'esnext',
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      // 压缩选项
      compress: {
        drop_console: false, // 在生产环境可以设置为true
        drop_debugger: true
      }
    },
    
    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // 核心模块 - 最小化初始加载
          if (id.includes('src/content/contentLoader') || 
              id.includes('src/content/ui/readerFloatingButton')) {
            return 'core';
          }
          
          // 第三方依赖
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand';
          }
          
          // 功能模块
          if (id.includes('src/content/features/readingMode') || 
              id.includes('src/content/features/contentProcessors')) {
            return 'feature-reader-mode';
          }
          
          if (id.includes('src/content/features/contentExtraction') || 
              id.includes('node_modules/@mozilla/readability')) {
            return 'feature-content-extraction';
          }
          
          if (id.includes('src/utils/performance') || 
              id.includes('src/content/features/performance-measurement')) {
            return 'feature-performance';
          }
          
          // 通用工具
          if (id.includes('src/utils/')) {
            return 'utils';
          }
          
          // UI组件
          if (id.includes('src/components/')) {
            return 'ui-components';
          }
          
          // 动画
          if (id.includes('src/content/ui/buttonAnimations') || 
              id.includes('src/content/ui/transitions')) {
            return 'ui-animations';
          }
          
          // 设置
          if (id.includes('src/settings/')) {
            return 'settings';
          }
          
          // 存储
          if (id.includes('src/storage/')) {
            return 'storage';
          }
          
          // 动态加载模块
          if (id.includes('src/content/dynamic/')) {
            return 'dynamic-core';
          }
          
          // 其他node_modules依赖
          if (id.includes('node_modules/')) {
            return 'vendor-other';
          }
          
          // 默认分块策略
          return undefined;
        },
        
        // 控制入口文件的名称
        entryFileNames: 'assets/[name]-[hash].js',
        
        // 自定义块名称格式
        chunkFileNames: (chunkInfo: any) => {
          const name = chunkInfo.name || '';
          
          if (name.startsWith('vendor-')) {
            return `assets/vendor/${name}-[hash].js`;
          }
          
          if (name === 'core') {
            return `assets/core/${name}-[hash].js`;
          }
          
          if (name.startsWith('feature-')) {
            return `assets/features/${name}-[hash].js`;
          }
          
          if (name.startsWith('ui-')) {
            return `assets/ui/${name}-[hash].js`;
          }
          
          return `assets/chunks/${name}-[hash].js`;
        },
        
        // 资源文件名称
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // 其他构建优化
    sourcemap: process.env.NODE_ENV !== 'production', 
    assetsInlineLimit: 4096, // 4kb以下文件内联为base64
    emptyOutDir: true,
    reportCompressedSize: false // 禁止报告压缩大小以提高构建性能
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    open: false
  }
});
