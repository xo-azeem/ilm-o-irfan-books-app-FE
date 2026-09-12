import ReactNativeBlobUtil from 'react-native-blob-util';

import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import { ApiError, requestData } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

/**
 * The reader's profile photo.
 *
 * Three steps, in this order, and the order is the point:
 *
 *   1. `avatar-upload-url` issues a one-off upload ticket for a path inside the
 *      reader's own folder. The app never picks that path — the backend scopes
 *      it to the user id, which is what stops one reader writing over another's.
 *   2. the bytes go straight to Storage, through the native HTTP layer.
 *   3. `profile-update` records the resulting `avatar_path`.
 *
 * Nothing is visible until step 3, so an upload that dies halfway leaves the
 * old photo in place rather than a broken reference to a new one.
 *
 * The `avatars` bucket is private — owner-only, unlike `covers` — so there is no
 * public URL to build and reading one back means asking Storage to sign it.
 */

/** The bucket the backend signs tickets for. Private, owner-scoped by RLS. */
const BUCKET = 'avatars';

/** Long enough for a screen to keep the photo across a few navigations. */
const SIGNED_READ_TTL_SECONDS = 60 * 60;

/** A profile photo has no business being larger, and the bucket agrees. */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * What `avatar-upload-url` answers with.
 *
 * Shaped to accept either form the endpoint may take: a Supabase
 * `createSignedUploadUrl` ticket (`signedUrl` plus `token`), or a bare
 * `uploadUrl`. `path` is the key handed on to `profile-update`, and is the one
 * field that has to be there.
 */
type AvatarUploadTicket = {
  path?: string | null;
  /** Relative or absolute — `resolveUploadUrl` handles both. */
  signedUrl?: string | null;
  uploadUrl?: string | null;
  url?: string | null;
  token?: string | null;
  bucket?: string | null;
};

function extensionFor(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic') || mime.includes('heif')) return 'heic';
  return 'jpg';
}

function localPath(uri: string): string {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

/**
 * The absolute URL to write to.
 *
 * Supabase signs upload URLs relative to the Storage API, so a ticket can carry
 * either `/storage/v1/object/upload/sign/...` or the whole thing.
 */
function resolveUploadUrl(ticket: AvatarUploadTicket): string | null {
  const candidate = ticket.signedUrl ?? ticket.uploadUrl ?? ticket.url ?? null;
  if (!candidate) {
    return null;
  }
  if (/^https?:\/\//.test(candidate)) {
    return candidate;
  }
  return `${env.supabaseUrl}${candidate.startsWith('/') ? '' : '/'}${candidate}`;
}

/** The object key, minus the bucket prefix Storage does not want repeated. */
function objectKey(path: string, bucket: string): string {
  return path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
}

export type AvatarUploadResult = {
  /** What was written to `profiles.avatar_path`. */
  path: string;
  /** A signed URL for drawing it straight away, without a re-read. */
  url: string | null;
};

/**
 * Refuses an oversized photo before spending the upload.
 *
 * The bucket limit rejects it only after the bytes have gone up, which on a
 * phone connection is a long wait for a failure that was knowable at the start.
 */
async function ensureWithinSizeLimit(localUri: string) {
  try {
    const stats = await ReactNativeBlobUtil.fs.stat(localPath(localUri));
    if (Number(stats.size) > MAX_AVATAR_BYTES) {
      throw new ApiError(
        'That photo is larger than 5 MB. Pick a smaller one.',
        400,
        'AVATAR_TOO_LARGE',
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // The file could not be measured. Let the upload be the judge rather than
    // refusing a photo that is very probably fine.
  }
}

async function uploadTask(
  method: 'POST' | 'PUT',
  url: string,
  headers: Record<string, string>,
  localUri: string,
  onProgress?: (fraction: number) => void,
) {
  const task = ReactNativeBlobUtil.fetch(
    method,
    url,
    headers,
    ReactNativeBlobUtil.wrap(localPath(localUri)),
  );

  if (onProgress) {
    task.uploadProgress({ interval: 150 }, (written, total) => {
      onProgress(total > 0 ? Math.min(written / total, 1) : 0);
    });
  }

  const response = await task;
  const status = response.info().status;

  if (status < 200 || status >= 300) {
    let message = `Could not upload the photo (${status}).`;
    try {
      const parsed = JSON.parse(response.data) as {
        message?: string;
        error?: string;
      };
      message = parsed.message ?? parsed.error ?? message;
    } catch {
      // A non-JSON body says nothing the status has not said already.
    }
    throw new ApiError(message, status, 'AVATAR_UPLOAD_FAILED');
  }
}

/** The signed-ticket path: the token authorises the write, not the session. */
async function putSigned(
  url: string,
  token: string | null,
  localUri: string,
  mime: string,
  onProgress?: (fraction: number) => void,
) {
  await ensureWithinSizeLimit(localUri);

  await uploadTask(
    'PUT',
    url,
    {
      apikey: env.supabaseAnonKey,
      'Content-Type': mime,
      'x-upsert': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : null),
    },
    localUri,
    onProgress,
  );
}

/** The fallback path: the reader's own JWT, with RLS doing the scoping. */
async function putAuthenticated(
  bucket: string,
  key: string,
  localUri: string,
  mime: string,
  onProgress?: (fraction: number) => void,
) {
  await ensureWithinSizeLimit(localUri);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new ApiError('You must be signed in.', 401, 'AUTH_REQUIRED');
  }

  const encoded = key.split('/').map(encodeURIComponent).join('/');

  await uploadTask(
    'POST',
    `${env.supabaseUrl}/storage/v1/object/${bucket}/${encoded}`,
    {
      Authorization: `Bearer ${session.access_token}`,
      apikey: env.supabaseAnonKey,
      'Content-Type': mime,
      'x-upsert': 'true',
      'cache-control': '3600',
    },
    localUri,
    onProgress,
  );
}

/**
 * Uploads a picked photo and records it on the profile.
 *
 * The bytes are streamed by the native layer rather than read into JavaScript:
 * the shared supabase-js client buffers a whole body in memory and gives up
 * after 12 seconds, which a photo off a modern camera can genuinely exceed.
 */
export async function uploadAvatar(
  localUri: string,
  mime = 'image/jpeg',
  onProgress?: (fraction: number) => void,
): Promise<AvatarUploadResult> {
  const ticket = await requestData<AvatarUploadTicket>(
    ENDPOINTS.avatarUploadUrl,
    {
      method: 'POST',
      auth: true,
      body: { contentType: mime, extension: extensionFor(mime) },
    },
  );

  const bucket = ticket?.bucket || BUCKET;
  const path = ticket?.path?.trim();
  if (!path) {
    throw new ApiError(
      'The server did not say where to store the photo.',
      502,
      'AVATAR_PATH_MISSING',
    );
  }

  const uploadUrl = resolveUploadUrl(ticket);
  if (uploadUrl) {
    await putSigned(
      uploadUrl,
      ticket.token ?? null,
      localUri,
      mime,
      onProgress,
    );
  } else {
    // A ticket with no URL issued only a path, leaving the write to the
    // authenticated Storage API — which RLS scopes to this reader's folder.
    await putAuthenticated(
      bucket,
      objectKey(path, bucket),
      localUri,
      mime,
      onProgress,
    );
  }

  // Only now does the photo exist as far as the app is concerned. `avatar_path`
  // is the one key sent: `profile-update` writes only what it is given, so the
  // name and address the reader saved last week are untouched.
  await requestData<unknown>(ENDPOINTS.profileUpdate, {
    method: 'PUT',
    auth: true,
    body: { avatar_path: path },
  });

  onProgress?.(1);

  return { path, url: await getAvatarUrl(path) };
}

/**
 * A URL for drawing a stored avatar.
 *
 * The bucket is private, so this is a signed read rather than a path
 * concatenation. `null` is an ordinary answer — no photo set, or a signature
 * this reader is not entitled to — and every caller falls back to initials.
 */
export async function getAvatarUrl(
  path: string | null | undefined,
  ttlSeconds = SIGNED_READ_TTL_SECONDS,
): Promise<string | null> {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectKey(path, BUCKET), ttlSeconds);

  return error ? null : (data?.signedUrl ?? null);
}
