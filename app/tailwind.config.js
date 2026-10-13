import temaPadrao from 'tailwindcss/defaultTheme'

/**
 * Densidade da tela.
 *
 * Todo espaçamento (padding, margem, gap, alturas) e todo canto arredondado
 * saem multiplicados por duas variáveis CSS definidas em src/index.css
 * (`--espaco` e `--raio`). Elas nascem com o valor compacto e voltam a 1 no
 * modo "Confortável" — assim uma única classe no <html> afina o sistema
 * inteiro, sem classe por classe.
 */
const semEscala = (valor) => valor === '0px' || valor === '1px' || valor === '0'

const escalaDeEspaco = Object.fromEntries(
  Object.entries(temaPadrao.spacing).map(([nome, valor]) => [
    nome,
    semEscala(valor) ? valor : `calc(${valor} * var(--espaco, 1))`,
  ]),
)

const escalaDeRaio = Object.fromEntries(
  Object.entries(temaPadrao.borderRadius).map(([nome, valor]) => [
    nome,
    semEscala(valor) || valor === '9999px' ? valor : `calc(${valor} * var(--raio, 1))`,
  ]),
)

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    spacing: escalaDeEspaco,
    borderRadius: escalaDeRaio,
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
        'dark-soft': '0 4px 18px -4px rgba(0, 0, 0, 0.5)',
        'dark-hover': '0 16px 34px -12px rgba(0, 0, 0, 0.65)',
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
