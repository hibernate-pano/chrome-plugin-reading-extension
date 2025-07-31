import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import type { LibraryFormats } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/contentLoader.ts'),
      name: 'ContentLoader',
      formats: ['iife'] as LibraryFormats[], // 使用IIFE格式以兼容Chrome扩展
      fileName: () => 'src/contentLoader/contentLoader'
    },
    rollupOptions: {
      external: ['chrome', 'highlight.js'],
      output: {
        globals: {
          chrome: 'chrome'
        },
        dir: 'dist',
        entryFileNames: 'src/[name]/[name].js',
        chunkFileNames: 'src/content/chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: true, // 内联动态导入以避免ES模块问题
        // 由于使用IIFE格式和内联动态导入，不需要手动分块
        manualChunks: undefined
      }
    },
    // 启用代码分割
    target: 'esnext',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    }
  },
  // 确保依赖项正确解析
  resolve: {
    alias: {
      'turndown': resolve(__dirname, 'node_modules/turndown/lib/turndown.browser.cjs')
    }
  },
  // 确保Web Worker正确处理
  worker: {
    format: 'es'
  }
}); 