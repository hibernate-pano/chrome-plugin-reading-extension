import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
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
  css: {
    postcss: './postcss.config.js'
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
        background: resolve(__dirname, 'src/background/index.ts')
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
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // 手动代码分割配置
        manualChunks: (id) => {
          // React和React-DOM分离
          if (id.includes('node_modules/react/') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-dom/')) {
            return 'vendor-react-dom';
          }
          // Radix UI组件分离
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          // 其他大型第三方库
          if (id.includes('node_modules/@mozilla/readability')) {
            return 'vendor-readability';
          }
          if (id.includes('node_modules/turndown')) {
            return 'vendor-turndown';
          }
        }
      }
    },

    // 其他构建优化
    sourcemap: process.env.NODE_ENV !== 'production',
    assetsInlineLimit: 4096, // 4kb以下文件内联为base64
    reportCompressedSize: false, // 禁止报告压缩大小以提高构建性能
    target: 'es2020',
    cssCodeSplit: true, // 启用CSS代码分割
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      }
    },
    // 优化chunk大小警告阈值
    chunkSizeWarningLimit: 600
  },

  // 开发服务器配置
  server: {
    port: 3000,
    open: false
  }
});
