/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './index.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ios: {
          bg: '#F2F2F7',
          'bg-dark': '#000000',
          surface: '#FFFFFF',
          'surface-dark': '#1C1C1E',
          label: '#000000',
          'label-dark': '#FFFFFF',
          secondary: '#8E8E93',
          'secondary-dark': '#8E8E93',
          separator: 'rgba(60, 60, 67, 0.12)',
          'separator-dark': 'rgba(84, 84, 88, 0.65)',
          fill: 'rgba(120, 120, 128, 0.12)',
          'fill-dark': 'rgba(120, 120, 128, 0.24)',
          accent: '#007AFF',
          'accent-dark': '#0A84FF',
        },
        brand: {
          50: '#f0f9f4',
          500: '#389664',
          600: '#287851',
        },
      },
    },
  },
  plugins: [],
};
