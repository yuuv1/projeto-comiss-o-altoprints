/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          pink: '#ec4899',
          purple: '#a855f7',
          blue: '#3b82f6',
          green: '#22c55e',
          orange: '#f97316',
        },
      },
      boxShadow: {
        soft: '0 4px 16px -4px rgba(88, 28, 135, 0.18)',
        hover: '0 14px 32px -12px rgba(88, 28, 135, 0.38)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up .25s ease-out both',
        'pop-in': 'pop-in .18s ease-out both',
        shimmer: 'shimmer 6s linear infinite',
      },
    },
  },
  plugins: [],
}
