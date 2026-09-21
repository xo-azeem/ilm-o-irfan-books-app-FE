/**
 * EAS Build hook (runs via the `eas-build-pre-install` npm script).
 *
 * `.env` is gitignored, so it never reaches the EAS worker. react-native-config
 * reads `.env` at native build time, so we materialise it here from the EAS
 * environment variables configured in the Expo dashboard / `eas env:create`.
 *
 * Only public keys belong here (Supabase anon key, RevenueCat public SDK keys,
 * Google OAuth client ids).
 * No-op when not running on EAS (EAS_BUILD is unset) or when `.env` already exists.
 *
 * The Firebase project files are gitignored too, and land the same way:
 * GOOGLE_SERVICES_JSON → android/app/google-services.json and
 * GOOGLE_SERVICE_INFO_PLIST → ios/IlmOIrfanApp/GoogleService-Info.plist. Each
 * may be an EAS *file* variable (the value is a path on the worker) or the
 * file's contents base64-encoded. Either is skipped when absent — the native
 * builds tolerate a missing file and simply leave push off.
 */
const fs = require('fs');
const path = require('path');

const FIREBASE_FILES = [
  ['GOOGLE_SERVICES_JSON', path.join('android', 'app', 'google-services.json')],
  [
    'GOOGLE_SERVICE_INFO_PLIST',
    path.join('ios', 'IlmOIrfanApp', 'GoogleService-Info.plist'),
  ],
];

function writeFirebaseFile(envKey, relTarget) {
  const value = process.env[envKey];
  if (!value) {
    console.log(`[eas-write-env] ${envKey} not set, skipping ${relTarget}`);
    return;
  }
  const target = path.join(__dirname, '..', relTarget);
  if (fs.existsSync(target)) {
    console.log(`[eas-write-env] ${relTarget} already present, skipping`);
    return;
  }
  let contents;
  if (fs.existsSync(value)) {
    contents = fs.readFileSync(value);
  } else {
    contents = require('buffer').Buffer.from(value.trim(), 'base64');
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  console.log(`[eas-write-env] wrote ${relTarget}`);
}

const KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'USE_LOCAL_SUPABASE',
  'REVENUECAT_IOS_KEY',
  'REVENUECAT_ANDROID_KEY',
  'REVENUECAT_ENTITLEMENT_ID',
  'GOOGLE_WEB_CLIENT_ID',
  'GOOGLE_IOS_CLIENT_ID',
];

const envPath = path.join(__dirname, '..', '.env');

if (!process.env.EAS_BUILD) {
  console.log('[eas-write-env] not on EAS, skipping');
  process.exit(0);
}

for (const [envKey, relTarget] of FIREBASE_FILES) {
  writeFirebaseFile(envKey, relTarget);
}

// The iOS Google Sign-In URL scheme is derived from GOOGLE_IOS_CLIENT_ID and
// lives in Info.plist, which cannot read .env — so it is written here too.
require('./google-ios-scheme');

if (fs.existsSync(envPath)) {
  console.log('[eas-write-env] .env already present, skipping');
  process.exit(0);
}

const missing = KEYS.filter(k => process.env[k] === undefined);
if (missing.length) {
  console.warn(`[eas-write-env] missing EAS env vars: ${missing.join(', ')}`);
}

const body = KEYS.filter(k => process.env[k] !== undefined)
  .map(k => `${k}=${process.env[k]}`)
  .join('\n');

fs.writeFileSync(envPath, body + '\n');
console.log(
  `[eas-write-env] wrote .env with ${KEYS.length - missing.length} keys`,
);
