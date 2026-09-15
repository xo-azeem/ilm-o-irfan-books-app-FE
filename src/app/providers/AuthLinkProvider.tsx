import { useEffect, type ReactNode } from 'react';
import { Linking } from 'react-native';

import { openPushIntent } from '@/app/navigation/navigationRef';
import { showDialog } from '@/components/ui';
import { env } from '@/config/env';
import { supabase } from '@/lib/supabase';

/**
 * Turns `ilmoirfan://auth/callback…` links into a session.
 *
 * Supabase auth emails — sign-up confirmation, a changed address, password
 * recovery — and OAuth redirects end on this scheme (the backend allow-lists
 * `ilmoirfan://**`). Two shapes arrive, depending on the flow:
 *
 *   · implicit:  #access_token=…&refresh_token=…&type=signup
 *   · pkce:      ?code=…
 *   · failure:   ?error=…&error_description=… (or the same in the fragment)
 *
 * Whichever it is, the outcome is `setSession` / `exchangeCodeForSession`, and
 * from there `onAuthStateChange` carries the rest of the app along exactly as
 * a password sign-in would. A link opened on a different device cannot reach
 * this code, which is why the verify screen also accepts the 6-digit code.
 */

function parseParams(url: string): URLSearchParams {
  // The token set rides in the fragment; PKCE codes and errors in the query.
  // Merge both so one lookup serves every shape.
  const params = new URLSearchParams();
  const hashAt = url.indexOf('#');
  const queryAt = url.indexOf('?');

  const query =
    queryAt >= 0
      ? url.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined)
      : '';
  const fragment = hashAt >= 0 ? url.slice(hashAt + 1) : '';

  for (const part of [query, fragment]) {
    if (!part) continue;
    for (const [key, value] of new URLSearchParams(part)) {
      params.set(key, value);
    }
  }
  return params;
}

function isAuthLink(url: string): boolean {
  return url.startsWith(`${env.appScheme}://auth`);
}

async function consumeAuthLink(url: string): Promise<void> {
  const params = parseParams(url);

  const errorDescription =
    params.get('error_description') ?? params.get('error');
  if (errorDescription) {
    showDialog({
      title: 'Link did not work',
      message: decodeURIComponent(errorDescription.replace(/\+/g, ' ')),
      tone: 'warning',
    });
    return;
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    if (params.get('type') === 'recovery') {
      openPushIntent({ route: 'resetPassword' });
    }
    return;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    // A recovery link signs the reader in so they can set a new password;
    // that screen is the point of the link, not a side effect.
    if (params.get('type') === 'recovery') {
      openPushIntent({ route: 'resetPassword' });
    }
    return;
  }

  // A bare ilmoirfan://auth/callback with nothing on it — the email verified
  // through Supabase's own page and simply sent the reader back. Nothing to
  // do; the next getUser() will show the address confirmed.
}

let lastHandled: string | null = null;

export function AuthLinkProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let mounted = true;

    async function handle(url: string | null) {
      if (!mounted || !url || !isAuthLink(url) || url === lastHandled) {
        return;
      }
      lastHandled = url;
      try {
        await consumeAuthLink(url);
      } catch (error) {
        showDialog({
          title: 'Could not sign you in',
          message:
            error instanceof Error
              ? error.message
              : 'The link may have expired. Request a new one.',
          tone: 'danger',
        });
      }
    }

    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => void handle(url));

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return children;
}
