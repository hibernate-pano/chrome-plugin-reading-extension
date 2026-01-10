/**
 * Vite Configuration for Refactored Content Script
 * Builds content script as IIFE from src directory
 * Requirements: 7.3 - Bundle size < 500KB
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
    'process.env': '{}'
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@content': resolve(__dirname, 'src/content'),
    }
  },
  css: {
    postcss: './postcss.config.js'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't empty - popup/background already built
    rollupOptions: {
      external: ['chrome'],
      input: {
        content: resolve(__dirname, 'src/content/index.ts')
      },
      output: {
        globals: {
          chrome: 'chrome'
        },
        format: 'iife', // Content scripts must be IIFE
        dir: 'dist',
        entryFileNames: 'content.js',
        // Inline all chunks for IIFE format
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          // CSS for content script
          if (assetInfo.name?.endsWith('.css')) {
            return 'content.css';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      }
    },
    
    // Build optimizations
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' 
          ? ['console.debug', 'console.log']
          : []
      }
    }
  }
});
