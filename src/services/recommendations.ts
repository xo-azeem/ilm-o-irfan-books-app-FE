import { ENDPOINTS } from '@/services/api/endpoints';
import { requestData } from '@/services/api/client';
import type {
  BookListItem,
  RecommendationReasonType,
  RecommendationSectionRow,
  RecommendationsPayload,
  RecommendedBookRow,
} from '@/services/api/types';
import { coverUrlFor, type CatalogBook } from '@/services/catalog';
import { mapCatalogBook } from '@/services/mappers';

/**
 * "Because you read …".
 *
 * The backend derives these from the reader's own history — progress writes,
 * downloads, wishlist toggles and highlights are all signals — and composes
 * the rail headings itself, so the app renders `title` and `subtitle` verbatim
 * rather than captioning an arbitrary book with a guess. It also excludes
 * anything already read, downloaded or wishlisted, so nothing is re-filtered
 * here.
 *
 * There is no table fallback and no local substitute: signed out, or with the
 * function undeployed, there are simply no recommendations to draw.
 */

export type { RecommendationReasonType };

/** Why a book is here. Styling only — every string is already composed. */
export type RecommendationReason = {
  type: RecommendationReasonType;
  label?: string;
  seedBookId?: string;
};

export type RecommendedBook = CatalogBook & { reason?: RecommendationReason };

/** One rail: a book the reader finished, and what follows from it. */
export type RecommendationRail = {
  id: string;
  seedBookId: string;
  reasonType: RecommendationReasonType;
  reasonLabel?: string;
  /** Rendered as-is: "Because you read <the book they actually read>". */
  title: string;
  /** Rendered as-is: "More from <that author>". Undefined when unset. */
  subtitle?: string;
  /** Always a real book from the reader's history. */
  seedBook: CatalogBook;
  books: RecommendedBook[];
};

export type Recommendations = {
  generatedAt: string | null;
  /**
   * The flag to branch on — never `sections.length`.
   *
   * `false` is the cold start: no sections, a `books` list of well-rated recent
   * titles, every reason typed `popular`. That list belongs under a neutral
   * heading, never under "Because you read …".
   */
  isPersonalized: boolean;
  sections: RecommendationRail[];
  /** The same cards, flat and ranked by relevance. */
  books: RecommendedBook[];
};

/** The backend's caps. Asking for more is a 400, so the ask is clamped here. */
const MAX = { limit: 50, sections: 6, perSection: 20 } as const;

export type RecommendationParams = {
  /** Books in the flat list. Backend default 20, max 50. */
  limit?: number;
  /** How many "Because you read X" rails. Backend default 3, max 6. */
  sections?: number;
  /** Books inside each rail. Backend default 10, max 20. */
  perSection?: number;
  signal?: AbortSignal;
};

/** Home's ask: three rails of ten, plus a flat list for the cold start. */
export const HOME_RECOMMENDATIONS: RecommendationParams = {
  sections: 3,
  perSection: 10,
};

/** A "see all recommendations" screen's ask: no rails, one long ranked list. */
export const ALL_RECOMMENDATIONS: RecommendationParams = {
  sections: 0,
  limit: 50,
};

function clamp(value: number | undefined, max: number): number | undefined {
  if (value == null) {
    return undefined;
  }
  return Math.max(0, Math.min(Math.trunc(value), max));
}

function toBook(row: BookListItem): CatalogBook {
  return mapCatalogBook(row, coverUrlFor(row));
}

function toRecommended(row: RecommendedBookRow): RecommendedBook {
  const reason = row.reason;

  return {
    ...toBook(row),
    reason: reason
      ? {
          type: reason.type,
          label: reason.label ?? undefined,
          seedBookId: reason.seedBookId ?? undefined,
        }
      : undefined,
  };
}

function toRail(row: RecommendationSectionRow): RecommendationRail {
  return {
    id: row.id,
    seedBookId: row.seedBookId,
    reasonType: row.reasonType,
    reasonLabel: row.reasonLabel ?? undefined,
    // Composed server-side from the book the reader actually read. Not rebuilt.
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    seedBook: toBook(row.seedBook),
    books: (row.books ?? []).map(toRecommended),
  };
}

/**
 * The reader's recommendations.
 *
 * Authenticated: `request` fails fast with `AUTH_REQUIRED` rather than
 * spending a round trip on a 401, so a signed-out caller is a caught error and
 * not a rendered section.
 *
 * Nothing needs to be triggered to keep these fresh. The backend rebuilds them
 * when the reader's signals have moved — at most every half hour, and at least
 * daily — off the `reading-progress` writes the app already makes.
 */
export async function getRecommendations({
  limit,
  sections,
  perSection,
  signal,
}: RecommendationParams = {}): Promise<Recommendations> {
  const payload = await requestData<RecommendationsPayload>(
    ENDPOINTS.recommendations,
    {
      auth: true,
      query: {
        limit: clamp(limit, MAX.limit),
        sections: clamp(sections, MAX.sections),
        perSection: clamp(perSection, MAX.perSection),
      },
      signal,
    },
  );

  return {
    generatedAt: payload?.generatedAt ?? null,
    isPersonalized: Boolean(payload?.isPersonalized),
    // Fewer rails than asked for is normal — a reader whose whole history is
    // one author legitimately produces one section.
    sections: (payload?.sections ?? []).map(toRail),
    books: (payload?.books ?? []).map(toRecommended),
  };
}
