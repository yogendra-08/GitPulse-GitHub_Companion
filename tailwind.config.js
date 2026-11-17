const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        raised: token('raised'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        muted: token('muted'),
        faint: token('faint'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
        open: token('open'),
        merged: token('merged'),
        closed: token('closed'),
        info: token('info'),
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', '1rem'],
        sm: ['0.8125rem', '1.25rem'],
        base: ['0.875rem', '1.375rem'],
        lg: ['1rem', '1.5rem'],
        xl: ['1.125rem', '1.625rem'],
        '2xl': ['1.375rem', '1.75rem'],
      },
      boxShadow: {
        pop: '0 12px 40px rgb(0 0 0 / 0.32), 0 0 0 1px rgb(var(--line-strong))',
      },
    },
  },
  plugins: [],
};
