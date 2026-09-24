module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved its Babel transform into react-native-worklets; it must be last.
    plugins: ['react-native-worklets/plugin'],
  };
};
