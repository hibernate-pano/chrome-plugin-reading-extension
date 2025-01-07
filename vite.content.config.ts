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
      entry: resolve(__dirname, 'src/content/content.ts'),
      name: 'content',
      formats: ['iife'] as LibraryFormats[],
      fileName: () => 'src/content/content.js'
    },
    rollupOptions: {
      external: ['chrome'],
      output: {
        globals: {
          chrome: 'chrome'
        }
      }
    }
  },
  define: {
    'process.env.VITE_SILICONFLOW_API_KEY': JSON.stringify(process.env.VITE_SILICONFLOW_API_KEY)
  }
}); 