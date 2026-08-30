/**
 * NativeWind mirrors the *layout* half of the design system — spacing, radii,
 * tracking and the handful of colours that appear in plain container classes.
 *
 * Semantic colour lives in `src/theme/palette.ts` and reaches components through
 * `useTheme().colors`, so there is exactly one place to retune a token. Adding
 * every semantic colour here as well would mean maintaining the ramp twice.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./App.tsx', './index.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DMSans-Regular'],
      },
      letterSpacing: {
        display: '-0.02em',
        sleek: '-0.02em',
        snug: '-0.01em',
        label: '0.12em',
        wide: '0.04em',
      },
      borderRadius: {
        chip: '12px',
        control: '13px',
        field: '15px',
        button: '16px',
        card: '18px',
        'card-lg': '20px',
        hero: '24px',
        sheet: '26px',
      },
      colors: {
        app: {
          // Base surfaces — the only colours used in bare container classes.
          bg: '#F5F8F2',
          'bg-dark': '#080B09',
          surface: '#FFFFFF',
          'surface-dark': '#121711',
          'surface-alt': '#FAFCF7',
          'surface-alt-dark': '#101410',
          'surface-raised': '#F0F4EC',
          'surface-raised-dark': '#1A211A',

          ink: '#101A12',
          'ink-dark': '#F1F5EE',
          'ink-soft': '#2C3D30',
          'ink-soft-dark': '#D6DED2',
          muted: '#4A634F',
          'muted-dark': '#97A599',
          faint: '#6E856F',
          'faint-dark': '#63715F',

          border: 'rgba(16, 26, 18, 0.10)',
          'border-dark': 'rgba(241, 245, 238, 0.08)',
          fill: 'rgba(45, 138, 71, 0.12)',
          'fill-dark': 'rgba(45, 138, 71, 0.18)',

          primary: '#2D8A47',
          'primary-dark': '#2D8A47',
          'primary-soft': '#3D7A2E',
          'primary-soft-dark': '#8FBF6A',
          'on-primary': '#FFFFFF',
          'on-primary-dark': '#F5FBF2',

          gold: '#A4801A',
          'gold-dark': '#C9A227',
          danger: '#C0392B',
          'danger-dark': '#E86A6A',
        },
        palette: {
          green: '#2D8A47',
          'green-bright': '#3FA660',
          'green-soft': '#8FBF6A',
          gold: '#C9A227',
          'gold-bright': '#E5BE2B',
          lime: '#D0E836',
          amber: '#D99A2B',
          red: '#E86A6A',
        },
      },
    },
  },
  plugins: [],
};
