/**
 * Vite Configuration — Content Script
 * Builds content.js (IIFE) + content.css from src/content/index.ts.
 * Content scripts must be IIFE and cannot use ES modules at runtime.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env': '{}',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@content': resolve(__dirname, 'src/content'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    outDir: 'dist',
    // Don't empty — background.js already built by vite.config.ts
    emptyOutDir: false,
    rollupOptions: {
      external: ['chrome'],
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        globals: {
          chrome: 'chrome',
        },
        format: 'iife',
        dir: 'dist',
        entryFileNames: 'content.js',
        // Inline all chunks — required for IIFE content scripts
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          // Content script CSS — referenced as content.css in manifest
          if (assetInfo.name?.endsWith('.css')) {
            return 'content.css';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs:
          process.env.NODE_ENV === 'production'
            ? ['console.debug', 'console.log']
            : [],
      },
    },
  },
});
