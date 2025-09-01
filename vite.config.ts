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
      input: {
        // Popup 入口
        popup: resolve(__dirname, 'index.html'),
        // Background 入口
        background: resolve(__dirname, 'src/background/background.ts'),
        // Content 入口 (使用 Shadcn 版本)
        content: resolve(__dirname, 'src/content/contentShadcn.ts'),
        // Content Loader 入口 (备用)
        contentLoader: resolve(__dirname, 'src/content/contentLoader.ts')
      },
      output: {
        globals: {
          chrome: 'chrome'
        },
        // 统一的输出配置
        dir: 'dist',
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          if (name === 'popup') {
            return 'popup.js';
          } else if (name === 'background') {
            return 'background.js';
          } else if (name === 'content') {
            return 'contentShadcn.js';
          } else if (name === 'contentLoader') {
            return 'contentLoader.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name || '';
          
          // 预设配置 - 单独分割，避免过大
          if (name.includes('builtInPresets')) {
            return 'assets/presets/builtInPresets-[hash].js';
          }
          
          // 核心功能
          if (name.includes('readingMode') || name.includes('contentProcessors')) {
            return 'assets/features/feature-reader-mode-[hash].js';
          }
          
          if (name.includes('contentExtraction') || name.includes('@mozilla/readability')) {
            return 'assets/features/feature-content-extraction-[hash].js';
          }
          
          if (name.includes('performance')) {
            return 'assets/features/feature-performance-[hash].js';
          }
          
          // UI组件 - 更细粒度分割
          if (name.includes('components/ui/')) {
            return 'assets/ui/ui-core-[hash].js';
          }
          
          if (name.includes('components/')) {
            return 'assets/ui/ui-components-[hash].js';
          }
          
          // 动画 - 单独分割
          if (name.includes('animations') || name.includes('transitions')) {
            return 'assets/ui/ui-animations-[hash].js';
          }
          
          // 工具函数 - 按功能分割
          if (name.includes('utils/dom')) {
            return 'assets/utils/utils-dom-[hash].js';
          }
          
          if (name.includes('utils/')) {
            return 'assets/utils/utils-[hash].js';
          }
          
          // 存储 - 按模块分割
          if (name.includes('storage/models/')) {
            return 'assets/storage/storage-models-[hash].js';
          }
          
          if (name.includes('storage/')) {
            return 'assets/storage/storage-[hash].js';
          }
          
          // 设置
          if (name.includes('settings')) {
            return 'assets/settings-[hash].js';
          }
          
          // 动态加载模块
          if (name.includes('dynamic/')) {
            return 'assets/dynamic-core-[hash].js';
          }
          
          // React 相关
          if (name.includes('react') || name.includes('react-dom')) {
            return 'assets/vendor/react-[hash].js';
          }
          
          // 其他第三方库
          if (name.includes('node_modules/')) {
            return 'assets/vendor/vendor-[hash].js';
          }
          
          return 'assets/chunks/[name]-[hash].js';
        },
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // 其他构建优化
    sourcemap: process.env.NODE_ENV !== 'production', 
    assetsInlineLimit: 4096, // 4kb以下文件内联为base64
    reportCompressedSize: false, // 禁止报告压缩大小以提高构建性能
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    }
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    open: false
  },
  
  // CSS 配置
  css: {
    postcss: './postcss.config.js'
  }
});
