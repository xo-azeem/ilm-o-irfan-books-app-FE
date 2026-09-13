/**
 * The date-of-birth field is typed, not picked, so it has to meet the reader
 * halfway: `profiles.date_of_birth` is a Postgres `date` and `profile-update`
 * rejects anything that is not one, while a reader writes "14 March 1996".
 * These two functions translate between the column and the reader.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthIndex(name: string): number {
  const needle = name.toLowerCase();
  return MONTHS.findIndex(month => {
    const lower = month.toLowerCase();
    return lower === needle || (needle.length >= 3 && lower.startsWith(needle));
  });
}

function isoIfValid(year: number, month: number, day: number): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1000) {
    return null;
  }
  // Built in UTC so the day never slips across a timezone boundary; the
  // round trip through `Date` is only there to reject 31 February.
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Reads whatever the reader typed into a `YYYY-MM-DD` the column will take.
 *
 * Accepts the column's own form, the numeric day-first forms common here
 * (`14/03/1996`, `14-03-1996`, `14.03.1996`) and the written forms
 * (`14 March 1996`, `14 Mar 1996`, `March 14, 1996`). Returns `null` for
 * anything else, so the caller can refuse the save rather than let the server
 * refuse it.
 */
export function parseDateOfBirth(input: string): string | null {
  const text = input.trim();
  if (!text) {
    return null;
  }

  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    return isoIfValid(+match[1], +match[2] - 1, +match[3]);
  }

  match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (match) {
    return isoIfValid(+match[3], +match[2] - 1, +match[1]);
  }

  match = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})$/.exec(text);
  if (match) {
    return isoIfValid(+match[3], monthIndex(match[2]), +match[1]);
  }

  match = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(text);
  if (match) {
    return isoIfValid(+match[3], monthIndex(match[1]), +match[2]);
  }

  return null;
}

/**
 * The column's `1996-03-14` as the reader would say it: `14 March 1996`.
 * Anything that is not an ISO date is shown as it came, so a value the parser
 * does not understand is never silently blanked.
 */
export function formatDateOfBirth(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return iso;
  }
  const month = MONTHS[+match[2] - 1];
  if (!month) {
    return iso;
  }
  return `${+match[3]} ${month} ${match[1]}`;
}
