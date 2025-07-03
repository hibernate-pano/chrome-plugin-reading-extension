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
      name: 'content',
      formats: ['iife'] as LibraryFormats[],
      fileName: () => 'src/content/content.js'
    },
    rollupOptions: {
      external: ['chrome'],
      output: {
        globals: {
          chrome: 'chrome'
        },
        dir: 'dist',
        entryFileNames: 'src/[name]/[name].js',
        chunkFileNames: 'src/content/chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: {
          // 将阅读模式功能单独打包
          readingMode: ['src/content/features/readingMode.ts'],
          // 将内容提取功能单独打包
          contentExtraction: ['src/content/features/contentExtraction.ts'],
          // 将UI组件单独打包
          ui: ['src/content/ui/readerFloatingButton.ts'],
          // 将提取器单独打包
          extractors: [
            'src/content/extractors/ExtractorFactory.ts',
            'src/content/extractors/BaseExtractor.ts',
            'src/content/extractors/ReadabilityExtractor.ts',
            'src/content/extractors/contentExtractor.ts'
          ]
        }
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
  }
}); 