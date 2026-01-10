/**
 * Vite Configuration for Refactored AI Reading Extension
 * Builds popup and background script from src directory
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
      '@popup': resolve(__dirname, 'src/popup'),
      '@background': resolve(__dirname, 'src/background'),
    }
  },
  css: {
    postcss: './postcss.config.js'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['chrome'],
      input: {
        // Popup entry - uses the root popup.html
        popup: resolve(__dirname, 'popup.html'),
        // Background script entry
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        globals: {
          chrome: 'chrome'
        },
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
          
          // React vendor chunk
          if (name.includes('react') || name.includes('react-dom')) {
            return 'assets/vendor/react-[hash].js';
          }
          
          // Shared modules
          if (name.includes('shared')) {
            return 'assets/shared-[hash].js';
          }
          
          // Other vendor chunks
          if (name.includes('node_modules')) {
            return 'assets/vendor/vendor-[hash].js';
          }
          
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          // CSS files
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/[name]-[hash].css';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      }
    },
    
    // Build optimizations
    sourcemap: process.env.NODE_ENV !== 'production',
    assetsInlineLimit: 4096, // 4kb inline limit
    reportCompressedSize: true,
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
  },

  server: {
    port: 3000,
    open: false
  }
});
