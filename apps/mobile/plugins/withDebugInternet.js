const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// app.json blocks INTERNET so the release APK asks for nothing it doesn't use: the app is
// offline by design. A debug build still has to reach Metro, so INTERNET is declared again
// in the debug manifest, which outranks main's tools:node="remove" when manifests merge.
module.exports = function withDebugInternet(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const manifest = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/debug/AndroidManifest.xml',
      );
      const permission = '<uses-permission android:name="android.permission.INTERNET"/>';
      const xml = fs.readFileSync(manifest, 'utf8');
      if (!xml.includes(permission)) {
        fs.writeFileSync(manifest, xml.replace(/(<manifest[^>]*>)/, `$1\n    ${permission}\n`));
      }
      return config;
    },
  ]);
};
