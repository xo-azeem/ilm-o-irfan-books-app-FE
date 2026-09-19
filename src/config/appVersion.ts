import appConfig from '../../app.json';

/**
 * The version this bundle declares — `expo.version` in `app.json`, the one
 * value the app already reports when it registers for push. It has to be
 * bumped with every store release, because it is what the admin's "oldest
 * allowed app version" is compared against.
 */
export const APP_VERSION: string =
  (appConfig as { expo?: { version?: string } }).expo?.version ?? '0';

/** `"1.2.3"` → `[1, 2, 3]`. Anything unparseable in a slot reads as 0. */
function parts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map(slot => {
      const value = Number.parseInt(slot, 10);
      return Number.isFinite(value) ? value : 0;
    });
}

/** Negative when `a` is older than `b`, zero when equal, positive when newer. */
export function compareVersions(a: string, b: string): number {
  const left = parts(a);
  const right = parts(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/**
 * Whether this build is older than the oldest an admin still allows.
 *
 * `null` or an empty minimum means no floor has been set, and a minimum that
 * does not look like a version at all is ignored rather than trusted — a
 * typo in App settings must never lock every reader out.
 */
export function isBelowMinimum(
  minimum: string | null | undefined,
  current: string = APP_VERSION,
): boolean {
  const floor = minimum?.trim();
  if (!floor || !/^v?\d+(\.\d+)*$/i.test(floor)) {
    return false;
  }
  return compareVersions(current, floor) < 0;
}
