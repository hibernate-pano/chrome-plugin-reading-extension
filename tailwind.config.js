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
        material: {
          primary: '#3e678a', // from brand.500
          onPrimary: '#FFFFFF',
          secondary: '#E09F3E', // from accent.400
          onSecondary: '#000000',
          background: '#FFFFFF',
          darkBackground: '#121212',
          surface: '#FFFFFF',
          darkSurface: '#1E1E1E',
          error: '#B00020',
          onBackground: '#000000',
          darkOnBackground: '#FFFFFF',
          onSurface: '#000000',
          darkOnSurface: '#FFFFFF',
          onError: '#FFFFFF',
        },
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
        sans: ['Roboto', 'Inter var', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        mono: ['Roboto Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        reading: ['Georgia', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'md-h1': '6rem',      // 96sp
        'md-h2': '3.75rem',   // 60sp
        'md-h3': '3rem',      // 48sp
        'md-h4': '2.125rem',  // 34sp
        'md-h5': '1.5rem',    // 24sp
        'md-h6': '1.25rem',   // 20sp
        'md-subtitle1': '1rem', // 16sp
        'md-subtitle2': '0.875rem', // 14sp
        'md-body1': '1rem',   // 16sp
        'md-body2': '0.875rem', // 14sp
        'md-button': '0.875rem', // 14sp
        'md-caption': '0.75rem', // 12sp
        'md-overline': '0.625rem', // 10sp
      },
      fontWeight: { // Material Design specific weights
        'md-light': '300',
        'md-regular': '400',
        'md-medium': '500',
      },
      letterSpacing: { // Material Design specific letter spacing
        'md-h1': '-0.09375rem', // -1.5px
        'md-h2': '-0.03125rem', // -0.5px
        'md-h3': '0rem',        // 0px
        'md-h4': '0.015625rem', // 0.25px
        'md-h5': '0rem',        // 0px
        'md-h6': '0.009375rem', // 0.15px
        'md-subtitle1': '0.009375rem', // 0.15px
        'md-subtitle2': '0.00625rem',  // 0.1px
        'md-body1': '0.03125rem',   // 0.5px
        'md-body2': '0.015625rem',  // 0.25px
        'md-button': '0.078125rem', // 1.25px
        'md-caption': '0.025rem',    // 0.4px
        'md-overline': '0.09375rem',  // 1.5px
      },
      boxShadow: {
        'paper': '0 1px 3px rgba(0, 0, 0, 0.05), 0 8px 25px -5px rgba(0, 0, 0, 0.08)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08), 0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        'float': '0 4px 12px rgba(0, 0, 0, 0.08), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        // Material Design Elevation
        'md-dp1': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        'md-dp2': '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
        'md-dp4': '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
        'md-dp6': '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
        'md-dp8': '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)',
        'md-dp12': '0 20px 40px rgba(0,0,0,0.3), 0 16px 13px rgba(0,0,0,0.25)',
        'md-dp16': '0 25px 50px rgba(0,0,0,0.35), 0 20px 15px rgba(0,0,0,0.28)',
        'md-dp24': '0 30px 60px rgba(0,0,0,0.4), 0 25px 20px rgba(0,0,0,0.3)',
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
        // Material Design Standard Easing Curves
        'md-standard': 'cubic-bezier(0.4, 0.0, 0.2, 1)',      // Standard curve - for elements quickly changing screen state
        'md-decelerate': 'cubic-bezier(0.0, 0.0, 0.2, 1)',    // Deceleration curve - for elements entering the screen
        'md-accelerate': 'cubic-bezier(0.4, 0.0, 1, 1)',      // Acceleration curve - for elements exiting the screen
        // Custom easings below are not standard Material Design.
        // Consider replacing their usage in UI elements with the 'md-' prefixed ones.
        // 'elastic': 'cubic-bezier(0.4, 0.0, 0.2, 1.5)', // Kept for reference, but prefer MD curves for UI
        // 'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Kept for reference
        // 'bounce': 'cubic-bezier(0.175, 0.885, 0.32, 1.5)', // Kept for reference
      },
    },
  },
  plugins: [],
} 