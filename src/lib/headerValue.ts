/**
 * A header value's worth of a string: printable US-ASCII, single-spaced.
 *
 * HTTP header values are ASCII by the spec and the native HTTP stack enforces
 * it: one character outside that range makes it reject the *whole request*
 * (`java.lang.IllegalArgumentException: Unexpected char 0xb7`), so a middle
 * dot or an accented brand name in a device label would take down every call
 * the app makes, sign-in included. Anything that goes into a header is put
 * through here first.
 *
 * An accent is dropped rather than mangled, and a middle dot becomes a hyphen
 * so a device still reads as "Xiaomi M2007J3SY - Android 12" wherever the
 * value is shown back to a reader.
 *
 * No React Native import, so it can be tested on its own.
 */
export function asciiHeaderValue(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/·/g, '-')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Whether a string may be sent as a header value as it stands. */
export function headerSafe(value: string): boolean {
  return value.length > 0 && /^[\x20-\x7e]*$/.test(value);
}
