import { Platform } from 'react-native';

import { strings } from '@/i18n/strings';

import appConfig from '../../app.json';

export const APP_VERSION: string =
  (appConfig as { expo?: { version?: string } }).expo?.version ?? '0';

/**
 * A human name for this device — "Google Pixel 7 · Android 14",
 * "iPhone · iOS 18.2". No native module: `Platform.constants` carries what
 * the OS volunteers, which is the model on Android and only the OS on iOS.
 */
export function deviceLabel(): string {
  if (Platform.OS === 'android') {
    const { Brand, Model, Release } = Platform.constants;
    const brand = Brand ? Brand[0].toUpperCase() + Brand.slice(1) : '';
    const model =
      Model && !Model.startsWith(brand) ? `${brand} ${Model}` : Model || brand;
    return `${model.trim() || strings().account.devices.androidDevice} · Android ${Release}`;
  }
  if (Platform.OS === 'ios') {
    const { osVersion, interfaceIdiom } = Platform.constants;
    const kind = interfaceIdiom === 'pad' ? 'iPad' : 'iPhone';
    return `${kind} · iOS ${osVersion}`;
  }
  return Platform.OS;
}

/**
 * The User-Agent every Supabase request carries.
 *
 * Supabase Auth stores it on the session row, which is how "Signed-in
 * devices" can name a phone rather than showing `okhttp/4.12`. Parsed back by
 * `parseDeviceUserAgent`.
 */
export function deviceUserAgent(): string {
  return `IlmOIrfan/${APP_VERSION} (${deviceLabel()})`;
}

/**
 * Turns a stored User-Agent into a label. Ours come back as we sent them;
 * anything else (a browser, an older build) is summarised rather than shown
 * raw.
 */
export function parseDeviceUserAgent(userAgent: string | null): string {
  const s = strings().account.devices;
  if (!userAgent) {
    return s.unknownDevice;
  }
  const ours = /^IlmOIrfan\/(\S+) \((.+)\)$/.exec(userAgent);
  if (ours) {
    return ours[2];
  }
  if (/okhttp/i.test(userAgent)) {
    return s.androidOlder;
  }
  if (/CFNetwork|Darwin/i.test(userAgent)) {
    return s.iphoneOlder;
  }
  if (/Mozilla/i.test(userAgent)) {
    return s.webBrowser;
  }
  return userAgent.slice(0, 60);
}

/** The app version a stored User-Agent was sent from, or null. */
export function parseDeviceAppVersion(userAgent: string | null): string | null {
  const ours = userAgent ? /^IlmOIrfan\/(\S+) \(/.exec(userAgent) : null;
  return ours ? ours[1] : null;
}
