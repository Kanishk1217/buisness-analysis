import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#0a0a0a',
        surface:  '#111111',
        surface2: '#1a1a1a',
        border:   '#262626',
        dim:      '#52525b',
        muted:    '#a1a1aa',
        primary:  '#fafafa',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '4px',
        lg: '4px',
      },
    },
  },
  plugins: [],
} satisfies Config
