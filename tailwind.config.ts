import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0a0a0d',
        panel: '#111114',
        'panel-raised': '#18181c',
        stroke: '#2a2a30',
        chalk: '#ededea',
        cement: '#7a7a82',
        acid: '#c9f31d',
        'acid-dim': '#a3c516',
        gold: '#e8b923',
        signal: '#ff4d4d',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
        body: ['var(--font-body)'],
      },
      keyframes: {
        pulse_bar: {
          '0%, 100%': { opacity: '0.6', transform: 'scaleY(0.4)' },
          '50%': { opacity: '1', transform: 'scaleY(1)' },
        },
      },
      animation: {
        pulse_bar: 'pulse_bar 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
