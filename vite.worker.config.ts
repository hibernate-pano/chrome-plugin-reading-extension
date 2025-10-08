import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Worker构建配置
export default defineConfig({
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env': '{}'
  },
  build: {
    outDir: 'dist/workers',
    emptyOutDir: false,
    lib: {
      entry: {
        'dataProcessing.worker': resolve(__dirname, 'src/content/workers/dataProcessing.worker.ts'),
        'contentExtraction.worker': resolve(__dirname, 'src/content/workers/contentExtraction.worker.ts'),
        'markdown.worker': resolve(__dirname, 'src/content/workers/markdown.worker.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        format: 'es'
      }
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false
      }
    }
  }
});
