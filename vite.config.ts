import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env': '{}'
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'turndown': resolve(__dirname, 'node_modules/turndown/lib/turndown.browser.cjs')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['chrome'],
      output: {
        globals: {
          chrome: 'chrome'
        },
        // 自定义分块策略
        manualChunks: (id: string) => {
          // 核心功能
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
    reportCompressedSize: false // 禁止报告压缩大小以提高构建性能
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    open: false
  }
});
