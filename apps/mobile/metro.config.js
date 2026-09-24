const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// @slash/core lives outside apps/mobile in the npm workspace, so Metro must watch the
// monorepo root and resolve modules from both node_modules trees. This is the standard
// Expo-in-a-monorepo setup. Hierarchical lookup stays on: some Expo packages (e.g.
// expo-modules-core) are nested under apps/mobile/node_modules/expo/node_modules rather
// than hoisted, and only Node's normal upward walk finds them.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// packages/core's TypeScript source uses explicit ".js" specifiers pointing at ".ts" files
// — the "moduleResolution: bundler" convention Vite already resolves for the web app.
// Metro resolves specifiers literally, so retry an unresolved own-source ".js" import as
// ".ts"/".tsx" before giving up. Real package.json "main": "index.js" files never reach
// this fallback because they resolve on the first, unmodified attempt.
const { resolveRequest: defaultResolveRequest } = config.resolver;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolveDefault = (name) =>
    defaultResolveRequest
      ? defaultResolveRequest(context, name, platform)
      : context.resolveRequest(context, name, platform);
  if (!moduleName.endsWith('.js')) return resolveDefault(moduleName);
  try {
    return resolveDefault(moduleName);
  } catch (error) {
    for (const ext of ['.ts', '.tsx']) {
      try {
        return resolveDefault(moduleName.slice(0, -3) + ext);
      } catch {
        // try the next extension
      }
    }
    throw error;
  }
};

module.exports = config;
