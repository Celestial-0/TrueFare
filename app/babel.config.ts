module.exports = function (api: { cache: (arg0: boolean) => void; }) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // ... other plugins
        'react-native-reanimated/plugin', // This must be the last plugin
      ],
    };
};