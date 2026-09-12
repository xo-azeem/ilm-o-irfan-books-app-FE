/**
 * EAS Build hook (runs via the `eas-build-pre-install` npm script).
 *
 * `.env` is gitignored, so it never reaches the EAS worker. react-native-config
 * reads `.env` at native build time, so we materialise it here from the EAS
 * environment variables configured in the Expo dashboard / `eas env:create`.
 *
 * Only public keys belong here (Supabase anon key, RevenueCat public SDK keys).
 * No-op when not running on EAS (EAS_BUILD is unset) or when `.env` already exists.
 */
const fs = require('fs');
const path = require('path');

const KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'USE_LOCAL_SUPABASE',
  'REVENUECAT_IOS_KEY',
  'REVENUECAT_ANDROID_KEY',
];

const envPath = path.join(__dirname, '..', '.env');

if (!process.env.EAS_BUILD) {
  console.log('[eas-write-env] not on EAS, skipping');
  process.exit(0);
}
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
