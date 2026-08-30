const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');

/**
 * Windows can expose the same folder as `d:\...` (Node cwd) and `D:\...`
 * (Win32 / some resolvers). Metro's path map is case-sensitive for the drive
 * letter, so a mismatch breaks SHA-1 for polyfills — especially after a folder
 * rename or a `--reset-cache`.
 *
 * Canonicalize to the uppercase drive letter and align process.cwd() so every
 * Metro path uses one casing for the life of the bundler process.
 */
function canonicalizeWindowsPath(filePath) {
  return path
    .resolve(filePath)
    .replace(/^([a-z]):/, (_, drive) => `${drive.toUpperCase()}:`);
}

const projectRoot = canonicalizeWindowsPath(__dirname);

try {
  if (
    path.resolve(process.cwd()).toLowerCase() === projectRoot.toLowerCase() &&
    process.cwd() !== projectRoot
  ) {
    process.chdir(projectRoot);
  }
} catch {
  // Non-fatal — projectRoot below still keeps Metro consistent.
}

const config = getDefaultConfig(projectRoot);
config.projectRoot = projectRoot;

module.exports = config;
