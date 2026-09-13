/**
 * The device's IANA time zone — "Asia/Karachi", "Europe/London".
 *
 * The backend draws reading days, the goal month and the night-reader hour in
 * whatever zone each request names, so every call that touches the reading
 * record sends this. UTC on a runtime whose `Intl` cannot answer, which is
 * also what the server assumes when nothing is sent.
 */
export function deviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && zone !== 'Etc/Unknown' ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Today as `YYYY-MM-DD` on the device's own clock — the server's day format. */
export function localDateKey(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`; NaN for a bad key. */
export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}
