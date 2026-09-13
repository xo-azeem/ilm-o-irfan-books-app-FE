/**
 * Search terms as PostgREST filters.
 *
 * Every admin list searches with `column ilike '%term%'` over a view, through
 * supabase-js's `.ilike()` and `.or()`. Two things stand between what an
 * operator types and what reaches Postgres:
 *
 * - LIKE's own wildcards. A `%` or `_` in the term would match anything rather
 *   than itself, and a `\` would escape whatever follows it. Each is escaped
 *   with a backslash — Postgres's default LIKE escape — so the term matches
 *   literally.
 * - PostgREST's filter grammar. Inside `.or()` a comma or a parenthesis ends
 *   the value, and a double quote opens a quoted one. None of them is worth a
 *   search, so they become spaces rather than a malformed request.
 *
 * PostgREST turns `*` into `%` in a pattern; that is left alone, so `*` is
 * the one wildcard an operator can use on purpose.
 */

/** The longest term sent to the server; anything past it is noise. */
const MAX_TERM_LENGTH = 100;

/**
 * The term as a `%…%` ILIKE pattern, or `null` when there is nothing to
 * search for. Safe to place inside `.or()` as well as `.ilike()`.
 */
export function likePattern(term: string): string | null {
  const cleaned = term
    .replace(/[,()"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TERM_LENGTH);
  if (!cleaned) {
    return null;
  }
  const escaped = cleaned.replace(/[\\%_]/g, match => `\\${match}`);
  return `%${escaped}%`;
}

/**
 * One `.or()` argument: the pattern tested against each column in turn.
 * `null` when the term is empty, so the caller can skip the filter.
 */
export function anyColumnLike(term: string, columns: string[]): string | null {
  const pattern = likePattern(term);
  if (!pattern) {
    return null;
  }
  return columns.map(column => `${column}.ilike.${pattern}`).join(',');
}
