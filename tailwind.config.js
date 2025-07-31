/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Material Design 3 Primary Colors
        'primary-10': '#001d36',
        'primary-20': '#003258',
        'primary-30': '#004a77',
        'primary-40': '#006397',
        'primary-50': '#007db8',
        'primary-60': '#2e98d3',
        'primary-70': '#58b2ea',
        'primary-80': '#7dcdff',
        'primary-90': '#c2e7ff',
        'primary-95': '#e1f4ff',
        'primary-99': '#fdfcff',

        // Secondary Colors
        'secondary-10': '#0f1419',
        'secondary-20': '#24292e',
        'secondary-30': '#3a3f44',
        'secondary-40': '#51565c',
        'secondary-50': '#696e74',
        'secondary-60': '#82878d',
        'secondary-70': '#9ca1a7',
        'secondary-80': '#b7bcc2',
        'secondary-90': '#d3d8de',
        'secondary-95': '#e1e6ec',
        'secondary-99': '#fdfcff',

        // Neutral Colors
        'neutral-0': '#000000',
        'neutral-10': '#1a1c1e',
        'neutral-20': '#2f3133',
        'neutral-25': '#3a3c3e',
        'neutral-30': '#464749',
        'neutral-40': '#5e5f61',
        'neutral-50': '#777779',
        'neutral-60': '#919294',
        'neutral-70': '#ababae',
        'neutral-80': '#c7c6ca',
        'neutral-90': '#e3e2e6',
        'neutral-95': '#f1f0f4',
        'neutral-98': '#faf9fd',
        'neutral-99': '#fdfcff',
        'neutral-100': '#ffffff',

        // Surface Colors
        'surface': 'var(--md-sys-color-surface)',
        'surface-dim': 'var(--md-sys-color-surface-dim)',
        'surface-bright': 'var(--md-sys-color-surface-bright)',
        'surface-container-lowest': 'var(--md-sys-color-surface-container-lowest)',
        'surface-container-low': 'var(--md-sys-color-surface-container-low)',
        'surface-container': 'var(--md-sys-color-surface-container)',
        'surface-container-high': 'var(--md-sys-color-surface-container-high)',
        'surface-container-highest': 'var(--md-sys-color-surface-container-highest)',

        // On Colors
        'on-surface': 'var(--md-sys-color-on-surface)',
        'on-surface-variant': 'var(--md-sys-color-on-surface-variant)',
        'on-primary': 'var(--md-sys-color-on-primary)',
        'on-primary-container': 'var(--md-sys-color-on-primary-container)',
        'on-secondary': 'var(--md-sys-color-on-secondary)',
        'on-secondary-container': 'var(--md-sys-color-on-secondary-container)',

        // Container Colors
        'primary-container': 'var(--md-sys-color-primary-container)',
        'secondary-container': 'var(--md-sys-color-secondary-container)',
        'error-container': 'var(--md-sys-color-error-container)',

        // Outline Colors
        'outline': 'var(--md-sys-color-outline)',
        'outline-variant': 'var(--md-sys-color-outline-variant)',

        // Legacy colors for backward compatibility
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        brand: {
          50: '#eef3f7',
          100: '#d5e1eb',
          200: '#acc3d6',
          300: '#7d9fb6',
          400: '#57809c',
          500: '#3e678a',
          600: '#2D4654',
          700: '#253a46',
          800: '#1e2f38',
          900: '#19252c',
        },
        paper: {
          cream: '#F8F5F1',
          mint: '#f1f7f5',
          warm: '#f9f3ee',
          cool: '#f2f5f8',
          sepia: '#f5f2e9',
        },
        accent: {
          50: '#fef8eb',
          100: '#faebc6',
          200: '#f5d88f',
          300: '#f0c358',
          400: '#E09F3E',
          500: '#d38625',
          600: '#b56a1b',
          700: '#92551a',
          800: '#744319',
          900: '#5e3717',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        mono: ['Roboto Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        reading: ['Georgia', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'paper': '0 1px 3px rgba(0, 0, 0, 0.05), 0 8px 25px -5px rgba(0, 0, 0, 0.08)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08), 0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        'float': '0 4px 12px rgba(0, 0, 0, 0.08), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.9', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.01)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        slideIn: 'slideIn 0.3s ease-out',
        breathe: 'breathe 5s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'paper-texture': "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFOklEQVRoQ92a23IbNxBEG5RkOVZi5/9/LXbKlhVR3G42Z7p3QO1DVS4CJbEE9vT9dIvw9/v3H803/l6//vjzZj5zfl33+vd1/TV6v/NM1/Vn/I+vL9++fS/uu65Pd/u8ct9NkcxE8JnBOG75HQJKAFFYCUDQJVnUgQtADMZAOZBz/TUEyMADkJsikwxJZkKiiwsZDICMBBIgA2GJpCSrVQOJvhvXpcUc0NmFCIoWJUZCp/EwMQ/DzWFOIcQxVjCYJwVkwOHZpkwhIwwAMQClkuCJeBaWkYqmQhNx19qAJMWwU0c4YBWKCAUBOAYrNSp1R74bCGOkzJHiY/sQlxBdBzV3AhGmVDPRsUJIcGYD4c0K4wbkYOYUYn0JCGZmOXllQu/7ABBZghUdNwKhlSi+pQOeZQxzLH1mQsQGRWEAZHdtzSIxgjjLlwWqNWCvJNJJRB4xFBQs5rQOxfHjewIBE8GG2bEHYO+N26VdMuTDZFUCY6GjGMwQRvouDPHbvUECMB9MJBDA0QX1xFDjZCfnGpGBu4iZB9dyzBCIecDK8yTWiFaQrKJFjPEeMCmGLsVAGl/CFpKXU8wMkTiQ3BsbJyC9RFmh6ZwCwrlBhqBCKT/MjBQpKAEJ9Ys6w3DnvE0QAAnVMVsCkEF0dHCZG8JUSGtGlYFsRKSz/vQsSQFUXESPQ76IrHIOscBk4eCUQFT7FEoZGcsDFh5FpS2C8yAjy+v8fciR5HGGkW2w9FaxQgPJxjpLV+SZFTLGQJRXgUkYMjdUbcJGZD3GSuQjXnQgYA7KESpxo84RrTRXcpLLPojYARSh7asFBPJvBrQE10KHNfK+K1QKilnDyiQbz2H3+iL8GQDBEYiDriBqb0UKm8qRxCaUYQzliEIWNecwl1ixXMTCF/UvJCXOcE+hsgZ64sZ6ooCxTcDEUZGp9B1IMOOa0tUrhKCgqCBJjRyGlDDrj4GgSkHFXJFi9sSB1eo0x6E3DmSu0zCvPSCAUTNkQHZfxLYGQnbwHDRzXntsY9U2RqICuQcQqXEvOu9GhUMQqHkCYjXWBtw6R6Q0qWDJ3BYVCgPpvciNTZQF1S0FZPVFmb5j5giD5lBEGOxZWL1U07HfJyjqZF2dOeCSZnbIkXU7Y6YwDO4EAo+U/GCLSSAxVOX0tnrCRqRMXRwIQIzdJ8Gg2JkbqG6wSGQWU6mOb4LwbhZ9C8BwOTEfJwAEQgVAQRGQHJG5sPgitAoqvJ45YSAqenLVgZQdkW5QR1oGpAYKs1wvkJQ1RrVUkTwjMC1foIl5a73LCNZ5B5JGYmq/0qkJtR4gk2ImiiBYseXuWBJnrGcQsdWoWgXvUlhxNUdKs2cQqlhb03qfkSIWc1ahXKFnfzlnZpY2p7YzPAykTl80NuhkVkbIkhTCm3PEYX6fV4qfPU/uB4J9rLd6mR9s3ycrMPdEyYbGGrR3LFcg2i0BjHLGOjbXD1G89MWRFB7xUYtXrYHcJXqkgyKidQ4eTwXAe7b1C8dTWqyKnYq3xr3lrQZSG/B1PaUJRCqUZFgfNtWvR49Pjo82HbdB6HGXsQMlqnfMbWRrxSB1TyD48TbpUTDoiXXZBYsajhwz/UfpfFRUvlr/JGXuAtLthR2YZHCNQkMVKZm5SQ1xrH26n7k0Et8Aoxl3wXPcJBiJZAlMXl7Bw9kOdWXqOzJf3XsOsPcf/Mdc9+j/SJJt9ZSCF1/fsR/5Lx4YZJ6KLfabAAAAAElFTkSuQmCC')",
      },
      transitionTimingFunction: {
        'elastic': 'cubic-bezier(0.4, 0.0, 0.2, 1.5)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'bounce': 'cubic-bezier(0.175, 0.885, 0.32, 1.5)',
      },
    },
  },
  plugins: [],
} 