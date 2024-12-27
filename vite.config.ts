import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import type { LibraryFormats } from 'vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// 创建多个构建配置
export default defineConfig([
  // Content Script 配置
  {
    build: {
      outDir: 'dist',
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
    }
  },
  // Background Script 配置
  {
    build: {
      outDir: 'dist',
      lib: {
        entry: resolve(__dirname, 'src/background/background.ts'),
        name: 'background',
        formats: ['iife'] as LibraryFormats[],
        fileName: () => 'src/background/background.js'
      },
      rollupOptions: {
        external: ['chrome'],
        output: {
          globals: {
            chrome: 'chrome'
          }
        }
      }
    }
  },
  // Popup 页面配置
  {
    plugins: [react()],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
])
