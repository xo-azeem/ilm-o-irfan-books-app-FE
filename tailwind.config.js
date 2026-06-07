/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './index.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9f4',
          100: '#dcf2e4',
          200: '#bce4cc',
          300: '#8fcfaa',
          400: '#5ab382',
          500: '#389664',
          600: '#287851',
          700: '#216043',
          800: '#1d4d37',
          900: '#193f2f',
          950: '#0d231a',
        },
      },
    },
  },
  plugins: [],
};
