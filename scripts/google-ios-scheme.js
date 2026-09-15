/**
 * Writes the Google Sign-In URL scheme into ios/IlmOIrfanApp/Info.plist.
 *
 * The iOS Google Sign-In SDK returns to the app through a custom URL scheme
 * that is the iOS OAuth client id reversed (`com.googleusercontent.apps.<id>`).
 * The id lives in `.env` as GOOGLE_IOS_CLIENT_ID so it is not committed, and
 * Info.plist cannot read `.env`, so this script bridges the two:
 *
 *   npm run google:ios-scheme        (locally, after editing .env)
 *   eas-build-pre-install            (on EAS, via scripts/eas-write-env.js)
 *
 * It replaces the single `<string>` under the `google-signin` URL type and is
 * idempotent. With no id configured it leaves the placeholder alone, which is
 * harmless: the app then reports Google sign-in as unavailable on iOS.
 */
const fs = require('fs');
const path = require('path');

const PLIST = path.join(__dirname, '..', 'ios', 'IlmOIrfanApp', 'Info.plist');
const MARKER = '<string>google-signin</string>';

function readDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function reversedClientId(clientId) {
  // 1234-abc.apps.googleusercontent.com → com.googleusercontent.apps.1234-abc
  const parts = clientId.split('.');
  return parts.reverse().join('.');
}

function main() {
  const clientId = (
    process.env.GOOGLE_IOS_CLIENT_ID ||
    readDotEnv().GOOGLE_IOS_CLIENT_ID ||
    ''
  ).trim();

  if (!clientId) {
    console.log(
      '[google-ios-scheme] GOOGLE_IOS_CLIENT_ID not set, leaving Info.plist alone',
    );
    return;
  }

  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    console.warn(
      `[google-ios-scheme] GOOGLE_IOS_CLIENT_ID does not look like an iOS OAuth client id: ${clientId}`,
    );
  }

  const scheme = reversedClientId(clientId);
  const plist = fs.readFileSync(PLIST, 'utf8');
  const at = plist.indexOf(MARKER);
  if (at < 0) {
    console.error(
      '[google-ios-scheme] Info.plist has no google-signin URL type; add it back',
    );
    process.exit(1);
  }

  // The scheme string is the next <string> after the CFBundleURLSchemes key
  // that follows the marker.
  const schemesKey = plist.indexOf('<key>CFBundleURLSchemes</key>', at);
  const open = plist.indexOf('<string>', schemesKey);
  const close = plist.indexOf('</string>', open);
  if (schemesKey < 0 || open < 0 || close < 0) {
    console.error(
      '[google-ios-scheme] Info.plist google-signin URL type is malformed',
    );
    process.exit(1);
  }

  const current = plist.slice(open + '<string>'.length, close);
  if (current === scheme) {
    console.log('[google-ios-scheme] Info.plist already up to date');
    return;
  }

  const next =
    plist.slice(0, open + '<string>'.length) + scheme + plist.slice(close);
  fs.writeFileSync(PLIST, next);
  console.log(`[google-ios-scheme] wrote ${scheme}`);
}

main();
