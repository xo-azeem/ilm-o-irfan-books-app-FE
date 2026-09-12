const reactNative = require('@react-native/eslint-config/flat');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'coverage/**',
    ],
  },
  ...reactNative,
  {
    rules: {
      // `void promise` is the project's fire-and-forget convention for async
      // work whose result is intentionally not awaited.
      'no-void': 'off',
      // Styles are theme-driven (`colors.*` from useTheme) and almost always
      // mix a literal with a runtime value, including ternaries the rule
      // cannot see past. Static styles still live in StyleSheet.create.
      'react-native/no-inline-styles': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': typescriptPlugin },
    rules: {
      // Every component is written as `export const X = memo(function X() {})`
      // so React DevTools keeps the display name. The rule has no option to
      // exempt a named function expression shadowing its own binding, and it
      // reported nothing else across the codebase, so it is off.
      '@typescript-eslint/no-shadow': 'off',
    },
  },
];
