import { supabase } from '@/lib/supabase';
import { ENDPOINTS } from '@/services/api/endpoints';
import { requestData, requestList, withEndpoint } from '@/services/api/client';
import type {
  DownloadRow,
  EntitlementRow,
  EntitlementStatus,
  HighlightRow,
  PlanRow,
  ProfileRow,
  ReadingProgressRow,
  WishlistToggleResult,
} from '@/services/api/types';
import { authorName, isEntitlementActive, mapCatalogBook } from '@/services/mappers';
import { getPlans, publicCoverUrl, type CatalogBook } from '@/services/catalog';

/**
 * Per-user reads and writes.
 *
 * Writes and the single-record reads go through the backend's authenticated
 * Edge Functions, which own validation and the `user_id` scoping. Three reads
 * deliberately stay on PostgREST because the matching endpoint returns less
 * than the screens need — each one is marked below, and RLS still scopes them
 * to the signed-in user.
 */

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
};

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

  return {
    // Trust the server's own verdict when it sends one; otherwise derive it.
    active:
      wrapped?.isActive ??
      isEntitlementActive(entitlement?.status, entitlement?.expires_at),
    expiresAt: entitlement?.expires_at ?? null,
    plan,
  };
}

/**
 * Saves the editable profile fields.
 *
 * Still a direct table write. `profile-update` no longer wipes the fields it
 * was not sent, but its writable set deliberately excludes `email` and
 * `date_of_birth` — two fields this form owns. The column-level grant on
 * `profiles` does cover both (see `20260816194000_admin_roles_cms`), and RLS
 * restricts the row to the caller, so the direct write is the lossless path.
 *
 * `updated_at` is deliberately not written: it is outside that grant, and
 * including it fails the whole statement with 42501. The trigger maintains it.
 */
export async function updateProfile(profile: Omit<ProfileDetails, 'memberSince'>) {
  const id = await userId();
  check(
    await supabase
      .from('profiles')
      .update({
        full_name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        date_of_birth: profile.dateOfBirth || null,
        address_line1: profile.addressLine1 || null,
        address_line2: profile.addressLine2 || null,
        city: profile.city || null,
        state: profile.state || null,
        postal_code: profile.postalCode || null,
        country: profile.country || null,
      })
      .eq('id', id)
      .select()
      .single(),
  );
}

/**
 * The shelves behind My Library.
 *
 * Direct reads. `library-overview` now returns real book cards with cover
 * colours and per-shelf counts, but its card still omits the author, and the
 * screen shows one on every row; it also carries neither the highlight count
 * nor the reading streak. Add `authors(name)` to that endpoint's card, plus the
 * two counters, and this can move over wholesale.
 */
export async function getLibrary() {
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

  return {
    progress: (progress.data ?? []).map(row => ({
      ...toBook(row.books as unknown as NestedBook),
      progress: Number(row.progress),
      chapter: row.chapter_label ?? 'Continue reading',
    })),
    wishlistCount: wishlist.data?.length ?? 0,
    downloads: (downloads.data ?? []).map(row => ({
      ...toBook(row.books as unknown as NestedBook),
      sizeBytes: Number(row.file_size_bytes ?? 0),
    })),
    highlightsCount: highlights.data?.length ?? 0,
    streak: streak.data?.current_streak ?? 0,
  };
}

/**
 * Saved books.
 *
 * Direct read: `wishlist-list` now carries the cover colours, but still not the
 * author, and the wishlist row renders one.
 */
export async function getWishlist(): Promise<CatalogBook[]> {
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
