import { supabase } from '@/lib/supabase';
import { authorName, isEntitlementActive, mapCatalogBook } from '@/services/mappers';
import type { CatalogBook } from '@/services/catalog';

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

type NestedBook = {
  id: string;
  title: string;
  cover_path: string | null;
  cover_color: string | null;
  cover_color_dark: string | null;
  authors: { name: string } | { name: string }[];
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
  return mapCatalogBook({
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
  });
}

export async function getProfile(): Promise<ProfileDetails> {
  const id = await userId();
  const row = check(
    await supabase.from('profiles').select('*').eq('id', id).single(),
  ) as {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    date_of_birth: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    created_at: string;
  };

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

export async function getSubscription() {
  const id = await userId();
  const [entitlement, plans] = await Promise.all([
    supabase
      .from('entitlements')
      .select('plan_id,status,starts_at,expires_at,store,updated_at')
      .eq('user_id', id)
      .maybeSingle(),
    supabase
      .from('plans')
      .select('id,name,price_cents,currency,interval,features')
      .eq('is_active', true)
      .order('sort_order')
      .limit(1)
      .maybeSingle(),
  ]);

  if (entitlement.error || plans.error) {
    throw new Error(
      entitlement.error?.message ?? plans.error?.message ?? 'Could not load subscription.',
    );
  }

  return {
    active: isEntitlementActive(entitlement.data?.status, entitlement.data?.expires_at),
    expiresAt: entitlement.data?.expires_at ?? null,
    plan: plans.data,
  };
}

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

export async function getLibrary() {
  const id = await userId();
  const [progress, wishlist, downloads, highlights, streak] = await Promise.all([
    supabase
      .from('reading_progress')
      .select(
        'book_id,progress,chapter_label,books!inner(id,title,cover_path,cover_color,cover_color_dark,authors!inner(name))',
      )
      .eq('user_id', id)
      .order('last_read_at', { ascending: false }),
    supabase.from('wishlist').select('book_id').eq('user_id', id),
    supabase
      .from('downloads')
      .select(
        'book_id,status,file_size_bytes,downloaded_at,books!inner(id,title,cover_path,cover_color,cover_color_dark,authors!inner(name))',
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

export async function getWishlist(): Promise<CatalogBook[]> {
  const id = await userId();
  const result = await supabase
    .from('wishlist')
    .select(
      'book_id,created_at,books!inner(id,title,cover_path,cover_color,cover_color_dark,authors!inner(name))',
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

export async function addToWishlist(bookId: string) {
  const id = await userId();
  check(
    await supabase
      .from('wishlist')
      .upsert({ user_id: id, book_id: bookId }, { onConflict: 'user_id,book_id' })
      .select()
      .single(),
  );
}

export async function removeFromWishlist(bookId: string) {
  const id = await userId();
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('user_id', id)
    .eq('book_id', bookId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getHighlights(bookId: string) {
  const id = await userId();
  const result = await supabase
    .from('highlights')
    .select('id,page_number,text_excerpt,note,color,created_at')
    .eq('user_id', id)
    .eq('book_id', bookId)
    .order('page_number', { ascending: true })
    .order('created_at', { ascending: true });
  return check(result);
}

export async function addHighlight(bookId: string, pageNumber: number, note?: string) {
  const id = await userId();
  check(
    await supabase
      .from('highlights')
      .insert({
        user_id: id,
        book_id: bookId,
        page_number: pageNumber,
        note: note ?? `Page ${pageNumber}`,
      })
      .select()
      .single(),
  );
}

export async function saveReadingProgress(
  bookId: string,
  currentPage: number,
  totalPages: number,
) {
  const id = await userId();
  check(
    await supabase
      .from('reading_progress')
      .upsert(
        {
          user_id: id,
          book_id: bookId,
          current_page: currentPage,
          total_pages: totalPages,
          progress: totalPages > 0 ? Math.min(currentPage / totalPages, 1) : 0,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,book_id' },
      )
      .select()
      .single(),
  );
}

export async function syncDownload(
  bookId: string,
  status: 'pending' | 'completed' | 'failed',
  sizeBytes?: number,
) {
  const id = await userId();
  check(
    await supabase
      .from('downloads')
      .upsert(
        {
          user_id: id,
          book_id: bookId,
          status,
          file_size_bytes: sizeBytes ?? null,
          downloaded_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,book_id' },
      )
      .select()
      .single(),
  );
}

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
