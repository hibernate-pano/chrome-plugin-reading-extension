import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
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
      input: {
        content: resolve(__dirname, 'src/content/contentShadcn.ts')
      },
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        dir: 'dist',
        entryFileNames: () => 'contentShadcn.js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    minify: 'terser',
    target: 'es2018',
    sourcemap: false
  }
});


