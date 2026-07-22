import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0A0A0D',
        panel: '#111114',
        'panel-raised': '#17171B',
        rack: '#1D1D22',
        stroke: '#2A2A30',
        acid: '#C9F31D',
        'acid-dim': '#8FAE14',
        signal: '#E8342C',
        cement: '#8A8A8F',
        chalk: '#EDEDEA',
        gold: '#E0B25C',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
        body: ['var(--font-body)'],
      },
      keyframes: {
        pulse_bar: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        blink_rec: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      animation: {
        pulse_bar: 'pulse_bar 0.9s ease-in-out infinite',
        blink_rec: 'blink_rec 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
