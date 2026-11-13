const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

// iOS 27 stops an app built with its SDK at launch unless the app adopts the UIScene life
// cycle. Expo ships the scene delegate (EXExpoAppSceneDelegate), which creates the window
// and starts React Native in it, but the prebuild template still starts React Native from
// the app delegate. This plugin connects the two:
// - Info.plist declares one window scene handled by EXExpoAppSceneDelegate;
// - AppDelegate conforms to ExpoReactNativeFactoryProvider, so the scene delegate can reach
//   the factory, and no longer creates its own window.

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
      },
    ],
  },
};

// The template's window setup, from `#if os(iOS) || os(tvOS)` to its `#endif`.
const WINDOW_SETUP = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function patchAppDelegate(src) {
  if (src.includes('ExpoReactNativeFactoryProvider')) return src;
  const out = src
    .replace(
      'class AppDelegate: ExpoAppDelegate {',
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    )
    .replace(WINDOW_SETUP, '\n    // EXExpoAppSceneDelegate creates the window and starts React Native in it.\n');
  if (out === src || WINDOW_SETUP.test(out) || !out.includes('ExpoReactNativeFactoryProvider')) {
    throw new Error('withSceneLifecycle: AppDelegate.swift no longer matches the expected template.');
  }
  return out;
}

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return config;
  });
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle: expected a Swift AppDelegate.');
    }
    config.modResults.contents = patchAppDelegate(config.modResults.contents);
    return config;
  });
};
