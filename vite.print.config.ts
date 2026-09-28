/**
 * Vite Configuration — Print Page
 *
 * The print page is a normal extension page (chrome-extension://…/print.html):
 * an HTML entry with an ES module script, loaded in its own tab. It is
 * neither a service worker nor a content script, so it gets its own config
 * rather than being forced into the IIFE content build.
 *
 * The entry lives at the project root so Vite emits dist/print.html. An entry
 * nested under src/ would emit dist/src/print/index.html instead, and the
 * background script needs a stable path to call chrome.runtime.getURL with.
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env': '{}',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@print': resolve(__dirname, 'src/print'),
    },
  },
  build: {
    outDir: 'dist',
    // Don't empty — background.js and content.js land here from the other configs
    emptyOutDir: false,
    rollupOptions: {
      external: ['chrome'],
      input: {
        print: resolve(__dirname, 'print.html'),
      },
      output: {
        globals: {
          chrome: 'chrome',
        },
        dir: 'dist',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
