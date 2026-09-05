import { supabase } from '@/lib/supabase';
import { ENDPOINTS } from '@/services/api/endpoints';
import { requestData, requestList, withEndpoint } from '@/services/api/client';
import type {
  DownloadListRow,
  DownloadRow,
  EntitlementRow,
  EntitlementStatus,
  HighlightDeleteResult,
  HighlightRow,
  LibraryBookCard,
  LibraryOverviewPayload,
  PlanRow,
  ProfileRow,
  ProgressItemRow,
  ReadingProgressRow,
  WishlistItemRow,
  WishlistToggleResult,
} from '@/services/api/types';
import { authorName, isEntitlementActive, mapCatalogBook } from '@/services/mappers';
import { getPlans, publicCoverUrl, type CatalogBook } from '@/services/catalog';

/**
 * Per-user reads and writes.
 *
 * Everything here goes through the backend's authenticated Edge Functions,
 * which own the validation and the `user_id` scoping. Each call keeps a
 * PostgREST fallback for a project that has not deployed the function yet — see
 * `withEndpoint` — and RLS scopes those to the signed-in user, so the two paths
 * return the same rows and nothing above this module can tell which answered.
 *
 * Two things stay on PostgREST outright, and are marked where they appear:
 * `isInWishlist`, which no endpoint answers for a single book, and
 * `removeDownload`, for which the backend exposes no delete.
 */

/**
 * Where a book stops counting as "still reading".
 *
 * Mirrors `library-overview` and `admin_user_directory`, which both finish a
 * book at `progress >= 0.99`. Only the fallback path applies it by hand; the
 * endpoint has already split the two shelves by the time they arrive.
 */
const FINISHED_THRESHOLD = 0.99;

/**
 * Rows per shelf in the library summary.
 *
 * `library-overview` caps this at 50 server-side. Every shelf also reports its
 * true `totalCount`, so the chips stay accurate past the cap.
 */
const LIBRARY_SHELF_LIMIT = 50;

/** The streak `profile-read` embeds, flattened for the record screen. */
export type ProfileStreak = {
  current: number;
  longest: number;
  lastReadDate: string | null;
};

export type ProfileDetails = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  memberSince: string;
  /**
   * From `profile-read`, which reads `reading_streaks` alongside the profile.
   * Zeroed on the table fallback, which has no second read to spend on it.
   */
  streak: ProfileStreak;
};

/** The editable half of the profile — what the personal-details form owns. */
export type ProfileForm = Omit<ProfileDetails, 'memberSince' | 'streak'>;

/**
 * A book joined onto a per-user row. The author relation is selected without
 * `!inner` and typed nullable to match `book_list_items`, which the backend
 * switched to a `left join` on authors.
 */
type NestedBook = {
  id: string;
  title: string;
  cover_path: string | null;
  cover_color: string | null;
  cover_color_dark: string | null;
  authors: { name: string } | { name: string }[] | null;
};

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.data == null) {
    throw new Error('Expected data was not returned.');
  }
  return result.data;
}

async function userId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('You must be signed in.');
  }
  return data.user.id;
}

function toBook(book: NestedBook): CatalogBook {
  return mapCatalogBook(
    {
      id: book.id,
      title: book.title,
      author_name: authorName(book.authors),
      cover_path: book.cover_path,
      cover_color: book.cover_color,
      cover_color_dark: book.cover_color_dark,
      rating: null,
      tag: null,
      genre: null,
      read_time_minutes: null,
      price_cents: 0,
      currency: 'USD',
      format: 'Digital edition',
      is_premium: false,
    },
    publicCoverUrl(book.cover_path),
  );
}

/**
 * Maps the card `library-overview`, `wishlist-list` and `downloads-list` embed.
 *
 * Richer than the direct-query path it replaces: the card carries `genre`,
 * `read_time_minutes` and — importantly — `is_premium`, which `toBook` had to
 * hardcode to `false`, so a premium title on a shelf never wore its badge.
 * Price and rating are not on the card; the catalog defaults stand in, and no
 * library surface renders either.
 */
function cardToBook(card: LibraryBookCard): CatalogBook {
  return mapCatalogBook(
    {
      id: card.id,
      title: card.title,
      author_name: authorName(card.author),
      cover_path: card.cover_path,
      cover_color: card.cover_color,
      cover_color_dark: card.cover_color_dark,
      rating: null,
      tag: null,
      genre: card.genre,
      read_time_minutes: card.read_time_minutes,
      price_cents: null,
      currency: null,
      format: null,
      is_premium: card.is_premium,
    },
    publicCoverUrl(card.cover_path),
  );
}

/**
 * True when the endpoint's cards carry an author at all.
 *
 * The author was added to these three endpoints' book card after they first
 * shipped, and every library and wishlist row renders one. A project still
 * running the earlier build answers with the key absent — not null — so the
 * reads below fall back to the direct queries rather than relabelling a whole
 * shelf "Unknown". A book with no author record sends `author: null`, which is
 * a real answer and passes this check.
 */
function hasAuthor(cards: Array<LibraryBookCard | null | undefined>): boolean {
  if (cardsLackAuthor) {
    return false;
  }
  const present = cards.filter(Boolean) as LibraryBookCard[];
  if (present.length === 0) {
    return true;
  }
  if (present.some(card => 'author' in card)) {
    return true;
  }
  // Remembered for the rest of the session, the same lifetime `withEndpoint`
  // gives an undeployed function: without it every refetch would pay for the
  // endpoint call and the fallback queries both.
  cardsLackAuthor = true;
  return false;
}

let cardsLackAuthor = false;

/** PostgREST returns a joined one-to-one relation as an object or a 1-item array. */
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getProfile(): Promise<ProfileDetails> {
  const row = await withEndpoint(
    ENDPOINTS.profileRead,
    () => requestData<ProfileRow | null>(ENDPOINTS.profileRead, { auth: true }),
    async () => {
      const id = await userId();
      const result = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data as ProfileRow | null;
    },
  );

  if (!row) {
    throw new Error('Your profile has not been created yet.');
  }

  return {
    fullName: row.full_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    dateOfBirth: row.date_of_birth ?? '',
    addressLine1: row.address_line1 ?? '',
    addressLine2: row.address_line2 ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    postalCode: row.postal_code ?? '',
    country: row.country ?? '',
    memberSince: `Member since ${new Date(row.created_at).getFullYear()}`,
    // `profile-read` reads `reading_streaks` in the same round trip, so the
    // record screen no longer needs a separate query for the streak — and gets
    // the real `longest_streak` instead of echoing the current one back.
    streak: {
      current: row.streak?.current_streak ?? 0,
      longest: row.streak?.longest_streak ?? 0,
      lastReadDate: row.streak?.last_read_date ?? null,
    },
  };
}

/**
 * Current premium state.
 *
 * `entitlements-status` carries the joined plan for a subscriber; a reader with
 * no entitlement still needs a plan to show on the paywall, so `plans-list`
 * supplies the first active one.
 */
export async function getSubscription() {
  const payload = await withEndpoint(
    ENDPOINTS.entitlementsStatus,
    () =>
      requestData<EntitlementStatus | EntitlementRow | null>(
        ENDPOINTS.entitlementsStatus,
        { auth: true },
      ),
    async () => {
      const id = await userId();
      const result = await supabase
        .from('entitlements')
        .select('*, plan:plans(*)')
        .eq('user_id', id)
        .maybeSingle();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data as EntitlementRow | null;
    },
  );

  // The endpoint now wraps the row as `{ isActive, entitlement }`. An older
  // deployment — and the table fallback — hand back the bare row.
  const wrapped =
    payload && typeof payload === 'object' && 'entitlement' in payload
      ? (payload as EntitlementStatus)
      : null;
  const entitlement = wrapped ? wrapped.entitlement : (payload as EntitlementRow | null);

  // `plan` is the current alias, `plans` the previous one.
  const entitledPlan = firstOf<PlanRow>(entitlement?.plan ?? entitlement?.plans ?? null);
  const plan = entitledPlan ?? (await getPlans())[0] ?? null;

  // Trust the server's own verdict when it sends one; otherwise derive it.
  const active =
    wrapped?.isActive ?? isEntitlementActive(entitlement?.status, entitlement?.expires_at);

  return {
    /** The subscription itself — what the membership badge and paywall read. */
    active,
    /** `profiles.role` or the `app_role` claim, as the server sees it. */
    isAdmin: wrapped?.isAdmin ?? false,
    /**
     * What `get-signed-pdf` will actually do, in one flag.
     *
     * An admin holds no subscription and is still served every PDF, so gating
     * the unlock on `active` alone shows them a locked button on a file the
     * backend would hand over. Older deployments omit the field, and there the
     * subscription is all this call knows — the caller folds in the local admin
     * flag for that case.
     */
    canAccessPremium: wrapped?.canAccessPremium ?? active,
    expiresAt: entitlement?.expires_at ?? null,
    plan,
  };
}

/**
 * Saves the editable profile fields.
 *
 * `profile-update` writes only the keys it is sent, so the address a reader
 * saved last week survives a name change, and it owns the validation — a
 * malformed `date_of_birth` comes back as a 400 naming the field rather than
 * as a raw Postgres error. `email` is deliberately not sent: it is read-only
 * on this form, and changing it is an auth operation, not a profile edit.
 *
 * The direct table write stays as the fallback for a project without the
 * function deployed. `updated_at` is written by neither: it is outside the
 * column-level grant `authenticated` holds on `profiles`, and including it
 * fails the whole statement with 42501. The trigger maintains it.
 */
export async function updateProfile(profile: ProfileForm) {
  const patch = {
    full_name: profile.fullName,
    phone: profile.phone,
    date_of_birth: profile.dateOfBirth || null,
    address_line1: profile.addressLine1 || null,
    address_line2: profile.addressLine2 || null,
    city: profile.city || null,
    state: profile.state || null,
    postal_code: profile.postalCode || null,
    country: profile.country || null,
  };

  await withEndpoint(
    ENDPOINTS.profileUpdate,
    () =>
      requestData<ProfileRow>(ENDPOINTS.profileUpdate, {
        method: 'PUT',
        auth: true,
        body: patch,
      }),
    async () => {
      const id = await userId();
      return check(
        await supabase.from('profiles').update(patch).eq('id', id).select().single(),
      ) as ProfileRow;
    },
  );
}

/** A shelf entry with where the reader left off. */
export type LibraryProgressBook = CatalogBook & { progress: number; chapter: string };

/** A shelf entry with what it costs on disk. */
export type LibraryDownloadBook = CatalogBook & { sizeBytes: number };

export type LibrarySummary = {
  reading: LibraryProgressBook[];
  finished: LibraryProgressBook[];
  downloads: LibraryDownloadBook[];
  /**
   * The saved shelf, which `library-overview` returns alongside the others.
   *
   * Reading it from here is what lets the Library tab render four shelves off a
   * single request. `getWishlist` stays for the standalone Saved screen, which
   * pages the full list rather than the capped summary.
   */
  saved: CatalogBook[];
  readingCount: number;
  finishedCount: number;
  downloadsCount: number;
  wishlistCount: number;
  highlightsCount: number;
  streak: number;
};

function toProgressBook(row: ProgressItemRow): LibraryProgressBook | null {
  if (!row.book) {
    return null;
  }
  return {
    ...cardToBook(row.book),
    progress: Number(row.progress ?? 0),
    chapter: row.chapter_label ?? 'Continue reading',
  };
}

function toDownloadBook(row: DownloadListRow): LibraryDownloadBook | null {
  if (!row.book) {
    return null;
  }
  return { ...cardToBook(row.book), sizeBytes: Number(row.file_size_bytes ?? 0) };
}

function compact<T>(rows: Array<T | null>): T[] {
  return rows.filter((row): row is T => row !== null);
}

/**
 * The shelves behind My Library.
 *
 * `library-overview` answers all five shelves — saved, reading, finished,
 * downloaded and highlighted — in one round trip, with a real total beside
 * each one. The direct-query path it replaces cost five, and could only count
 * the rows it had rather than the rows that exist.
 *
 * It also owns where "finished" starts: `progress >= 0.99`, the same threshold
 * `admin_user_directory` uses. Splitting at `>= 1` on this side left a book the
 * backend counts as finished sitting on the Reading shelf instead.
 *
 * Each shelf is capped at `limit`; `wishlist-list`, `downloads-list` and
 * `reading-progress` page the full lists when a screen needs them.
 */
export async function getLibrary(limit = LIBRARY_SHELF_LIMIT): Promise<LibrarySummary> {
  return withEndpoint(
    ENDPOINTS.libraryOverview,
    async () => {
      const payload = await requestData<LibraryOverviewPayload>(ENDPOINTS.libraryOverview, {
        auth: true,
        query: { limit },
      });

      const reading = payload?.readingProgress?.items ?? [];
      const finished = payload?.finished?.items ?? [];
      const downloads = payload?.downloads?.items ?? [];
      const saved = payload?.wishlist?.items ?? [];

      const cards = [...reading, ...finished, ...downloads, ...saved].map(row => row.book);
      if (!hasAuthor(cards)) {
        return libraryFromTables();
      }

      // The endpoint returns every download row; only a completed one is on
      // disk, and the shelf means "available offline".
      const offline = compact(
        downloads.filter(row => row.status === 'completed').map(toDownloadBook),
      );

      return {
        reading: compact(reading.map(toProgressBook)),
        finished: compact(finished.map(toProgressBook)),
        saved: compact(saved.map(row => (row.book ? cardToBook(row.book) : null))),
        downloads: offline,
        readingCount: payload?.readingProgress?.totalCount ?? reading.length,
        finishedCount: payload?.finished?.totalCount ?? finished.length,
        // Counted from the shelf, not from the endpoint's total: that total
        // includes the pending and failed rows a download leaves behind, and
        // showing "12 files offline" for nine files on disk is worse than
        // undercounting a reader who is past the shelf cap.
        downloadsCount: offline.length,
        wishlistCount: payload?.wishlist?.totalCount ?? 0,
        highlightsCount: payload?.highlights?.totalCount ?? 0,
        // `library-overview` carries no streak. `profile-read` does, and the
        // record screen reads it from there.
        streak: 0,
      };
    },
    () => libraryFromTables(),
  );
}

/** The pre-`library-overview` path: five reads, kept as the fallback. */
async function libraryFromTables(): Promise<LibrarySummary> {
  const id = await userId();
  const [progress, wishlist, downloads, highlights, streak] = await Promise.all([
    supabase
      .from('reading_progress')
      .select(
        'book_id,progress,chapter_label,books!inner(id,title,cover_path,cover_color,cover_color_dark,authors(name))',
      )
      .eq('user_id', id)
      .order('last_read_at', { ascending: false }),
    supabase.from('wishlist').select('book_id').eq('user_id', id),
    supabase
      .from('downloads')
      .select(
        'book_id,status,file_size_bytes,downloaded_at,books!inner(id,title,cover_path,cover_color,cover_color_dark,authors(name))',
      )
      .eq('user_id', id)
      .eq('status', 'completed')
      .order('downloaded_at', { ascending: false }),
    supabase.from('highlights').select('id').eq('user_id', id),
    supabase.from('reading_streaks').select('current_streak').eq('user_id', id).maybeSingle(),
  ]);

  if (progress.error || wishlist.error || downloads.error || highlights.error || streak.error) {
    throw new Error(
      progress.error?.message ??
        wishlist.error?.message ??
        downloads.error?.message ??
        highlights.error?.message ??
        streak.error?.message ??
        'Could not load library.',
    );
  }

  const started = (progress.data ?? []).map(row => ({
    ...toBook(row.books as unknown as NestedBook),
    progress: Number(row.progress),
    chapter: row.chapter_label ?? 'Continue reading',
  }));

  const reading = started.filter(book => book.progress < FINISHED_THRESHOLD);
  const finished = started.filter(book => book.progress >= FINISHED_THRESHOLD);
  const offline = (downloads.data ?? []).map(row => ({
    ...toBook(row.books as unknown as NestedBook),
    sizeBytes: Number(row.file_size_bytes ?? 0),
  }));

  return {
    reading,
    finished,
    downloads: offline,
    // The fallback's wishlist read is a count only, so the Library tab falls
    // back to its own `useWishlist` query for the shelf itself.
    saved: [],
    readingCount: reading.length,
    finishedCount: finished.length,
    downloadsCount: offline.length,
    wishlistCount: wishlist.data?.length ?? 0,
    highlightsCount: highlights.data?.length ?? 0,
    streak: streak.data?.current_streak ?? 0,
  };
}

/**
 * Saved books, newest first.
 *
 * `wishlist-list` is paginated and card-sized — the direct read it replaces
 * pulled a join for every saved title with no page limit at all. The endpoint
 * also carries `is_premium`, so a saved premium title finally wears its badge
 * on the shelf.
 */
export async function getWishlist(pageSize = LIBRARY_SHELF_LIMIT): Promise<CatalogBook[]> {
  return withEndpoint(
    ENDPOINTS.wishlistList,
    async () => {
      const rows = await requestList<WishlistItemRow>(ENDPOINTS.wishlistList, {
        auth: true,
        pageSize,
      });

      const cards = rows.map(row => row.book);
      if (!hasAuthor(cards)) {
        return wishlistFromTables();
      }

      return compact(cards.map(card => (card ? cardToBook(card) : null)));
    },
    () => wishlistFromTables(),
  );
}

async function wishlistFromTables(): Promise<CatalogBook[]> {
  const id = await userId();
  const result = await supabase
    .from('wishlist')
    .select(
      'book_id,created_at,books!inner(id,title,cover_path,cover_color,cover_color_dark,authors(name))',
    )
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  return unwrapBooks(result);
}

export async function isInWishlist(bookId: string): Promise<boolean> {
  const id = await userId();
  const { data, error } = await supabase
    .from('wishlist')
    .select('book_id')
    .eq('user_id', id)
    .eq('book_id', bookId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

/**
 * Adds or removes a saved book in one call and reports where it landed.
 *
 * The server decides the direction from the row it finds, so a stale client
 * state cannot save a book twice or delete one it never saved.
 */
export async function toggleWishlist(bookId: string): Promise<boolean> {
  return withEndpoint(
    ENDPOINTS.wishlistToggle,
    async () => {
      const result = await requestData<WishlistToggleResult>(ENDPOINTS.wishlistToggle, {
        method: 'POST',
        auth: true,
        body: { book_id: bookId },
      });
      // `wishlisted` is the endpoint's answer for the resulting state;
      // `added` is the older field and still sent alongside it.
      return Boolean(result?.wishlisted ?? result?.added);
    },
    async () => {
      const id = await userId();
      const saved = await isInWishlist(bookId);

      if (saved) {
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', id)
          .eq('book_id', bookId);
        if (error) {
          throw new Error(error.message);
        }
        return false;
      }

      // A plain insert, not an upsert: `authenticated` holds no UPDATE grant on
      // wishlist, and PostgREST compiles upsert to ON CONFLICT DO UPDATE, which
      // would be refused. A duplicate key means a concurrent tap already added
      // it — the outcome we wanted either way.
      const { error } = await supabase
        .from('wishlist')
        .insert({ user_id: id, book_id: bookId });
      if (error && error.code !== '23505') {
        throw new Error(error.message);
      }
      return true;
    },
  );
}

export async function getHighlights(bookId: string): Promise<HighlightRow[]> {
  const rows = await withEndpoint(
    ENDPOINTS.highlightsList,
    () =>
      // The endpoint filters server-side when given `book_id`, so the reader
      // no longer pulls down every highlight the person owns.
      requestList<HighlightRow>(ENDPOINTS.highlightsList, {
        auth: true,
        query: { book_id: bookId },
        pageSize: 100,
      }),
    async () => {
      const id = await userId();
      const result = await supabase
        .from('highlights')
        .select('id,user_id,book_id,page_number,text_excerpt,note,color,created_at')
        .eq('user_id', id)
        .eq('book_id', bookId);
      return check(result) as HighlightRow[];
    },
  );

  // An older deployment ignores `book_id`, so the filter stays on this side too.
  return rows
    .filter(row => row.book_id === bookId)
    .sort(
      (a, b) =>
        (a.page_number ?? 0) - (b.page_number ?? 0) ||
        Date.parse(a.created_at) - Date.parse(b.created_at),
    );
}

export async function addHighlight(bookId: string, pageNumber: number, note?: string) {
  const row = {
    book_id: bookId,
    page_number: pageNumber,
    note: note ?? `Page ${pageNumber}`,
  };

  await withEndpoint(
    ENDPOINTS.highlightsUpsert,
    () =>
      requestData<HighlightRow>(ENDPOINTS.highlightsUpsert, {
        method: 'POST',
        auth: true,
        body: row,
      }),
    async () => {
      const id = await userId();
      return check(
        await supabase
          .from('highlights')
          .insert({ user_id: id, ...row })
          .select()
          .single(),
      ) as HighlightRow;
    },
  );
}

/**
 * Removes one of the reader's own bookmarks.
 *
 * The endpoint scopes the delete to `user_id` as well as `id`, so an id from
 * a stale cache can only ever match a row the caller owns, and answers 404
 * when it matches nothing — which is what makes an already-removed bookmark
 * distinguishable from a failed request.
 */
export async function deleteHighlight(highlightId: string) {
  await withEndpoint(
    ENDPOINTS.highlightsDelete,
    () =>
      requestData<HighlightDeleteResult>(ENDPOINTS.highlightsDelete, {
        method: 'POST',
        auth: true,
        body: { id: highlightId },
      }),
    async () => {
      const id = await userId();
      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('id', highlightId)
        .eq('user_id', id);
      if (error) {
        throw new Error(error.message);
      }
      return { id: highlightId, deleted: true };
    },
  );
}

export async function saveReadingProgress(
  bookId: string,
  currentPage: number,
  totalPages: number,
) {
  // The endpoint rejects `current_page > total_pages` with a 400, and the
  // reader can briefly report a page past the end while a document is still
  // settling — so the page is clamped to the book rather than sent as-is.
  const pages = totalPages > 0 ? Math.round(totalPages) : null;
  const page = Math.max(1, Math.min(Math.round(currentPage), pages ?? Number.MAX_SAFE_INTEGER));
  // `progress` is now strictly 0–1; anything outside that range is a 400, and
  // `progress_percent` is the separate field for a 0–100 value.
  const progress = pages ? Math.max(0, Math.min(page / pages, 1)) : 0;

  await withEndpoint(
    ENDPOINTS.readingProgress,
    () =>
      requestData<ReadingProgressRow>(ENDPOINTS.readingProgress, {
        method: 'POST',
        auth: true,
        body: {
          book_id: bookId,
          current_page: page,
          total_pages: pages,
          progress,
        },
      }),
    async () => {
      const id = await userId();
      return check(
        await supabase
          .from('reading_progress')
          .upsert(
            {
              user_id: id,
              book_id: bookId,
              current_page: page,
              total_pages: pages,
              progress,
              last_read_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,book_id' },
          )
          .select()
          .single(),
      ) as ReadingProgressRow;
    },
  );
}

export async function syncDownload(
  bookId: string,
  status: 'pending' | 'completed' | 'failed',
  sizeBytes?: number,
) {
  const row = {
    book_id: bookId,
    status,
    file_size_bytes: sizeBytes ?? null,
  };

  await withEndpoint(
    ENDPOINTS.downloadsCreate,
    () =>
      requestData<DownloadRow>(ENDPOINTS.downloadsCreate, {
        method: 'POST',
        auth: true,
        body: row,
      }),
    async () => {
      const id = await userId();
      return check(
        await supabase
          .from('downloads')
          .upsert(
            { user_id: id, ...row, downloaded_at: new Date().toISOString() },
            { onConflict: 'user_id,book_id' },
          )
          .select()
          .single(),
      ) as DownloadRow;
    },
  );
}

/**
 * Direct delete: the backend exposes `downloads-create` but no removal
 * endpoint, and the reader must be able to free up storage offline-first.
 */
export async function removeDownload(bookId: string) {
  const id = await userId();
  const { error } = await supabase
    .from('downloads')
    .delete()
    .eq('user_id', id)
    .eq('book_id', bookId);
  if (error) {
    throw new Error(error.message);
  }
}

function unwrapBooks(result: {
  data: Array<{ books: unknown }> | null;
  error: { message: string } | null;
}): CatalogBook[] {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data ?? []).map(row => toBook(row.books as NestedBook));
}
