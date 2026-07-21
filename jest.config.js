module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['react-native-gesture-handler/jestSetup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:react-native|@react-native|@react-navigation|react-native-.*)/)',
  ],
};
