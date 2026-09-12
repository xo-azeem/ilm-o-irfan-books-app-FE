module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
        },
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
      },
    ],
    // react-native-worklets/plugin (needed by Reanimated 4) is added
    // automatically by babel-preset-expo when the package is installed.
  ],
};
