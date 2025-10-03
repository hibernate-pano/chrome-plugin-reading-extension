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
        content: resolve(__dirname, 'src/content/contentShadcn.ts')
      },
      output: {
        globals: {
          chrome: 'chrome'
        },
        format: 'iife',
        dir: 'dist',
        entryFileNames: () => 'contentShadcn.js',
        chunkFileNames: 'assets/content-chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    minify: 'terser',
    target: 'es2020',
    sourcemap: process.env.NODE_ENV !== 'production',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug', 'console.info'] : []
      }
    }
  }
});


