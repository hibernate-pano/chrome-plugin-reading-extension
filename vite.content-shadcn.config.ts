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
      entry: resolve(__dirname, 'src/content/contentShadcn.ts'),
      name: 'ContentShadcn',
      formats: ['iife'] as LibraryFormats[],
      fileName: () => 'src/content/contentShadcn'
    },
    rollupOptions: {
      external: ['chrome'],
      output: {
        globals: {
          chrome: 'chrome'
        },
        dir: 'dist',
        entryFileNames: 'src/content/[name].js',
        chunkFileNames: 'src/content/chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: true,
        manualChunks: undefined
      }
    },
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
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'turndown': resolve(__dirname, 'node_modules/turndown/lib/turndown.browser.cjs')
    }
  },
  css: {
    postcss: './postcss.config.js'
  }
});
