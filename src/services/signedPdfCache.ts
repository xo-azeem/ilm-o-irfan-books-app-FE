import { getSignedPdfUrl } from '@/lib/supabase';
import { createSignedPdfHold } from '@/services/signedPdfHold';

/**
 * The signed PDF URL, asked for a moment before it is needed.
 *
 * Opening a book that is not on the device is: ask `get-signed-pdf` for a URL,
 * then download the file. The download is the bulk of the wait and cannot be
 * made smaller — the catalogue's PDFs are vector, already compressed, and gzip
 * takes 8% off them — but the request in front of it can be taken off the
 * path entirely. A reader on a book's detail page is about to open it, so the
 * URL is fetched then, and the tap on Read starts the download at once instead
 * of first paying a TLS handshake and an Edge Function round trip.
 *
 * It is a few hundred bytes of JSON and no part of the book, so it is fetched
 * on any connection: nothing here spends a reader's data on a book they do
 * not open. The rules for holding it are in `signedPdfHold.ts`.
 */

export type SignedPdf = Awaited<ReturnType<typeof getSignedPdfUrl>>;

const hold = createSignedPdfHold<SignedPdf>(getSignedPdfUrl);

export const warmSignedPdf = hold.warm;
export const takeSignedPdf = hold.take;
export const clearSignedPdfs = hold.clear;
