const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add custom resolver alias for react-native-blob-util/index.js compatibility issue
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  './utils/uri': require.resolve('react-native-blob-util/utils/uri.js'),
};

module.exports = config;
