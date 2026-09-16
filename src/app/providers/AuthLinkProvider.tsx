import { useEffect, type ReactNode } from 'react';
import { Linking } from 'react-native';

import { openPushIntent } from '@/app/navigation/navigationRef';
import { showDialog } from '@/components/ui';
import { env } from '@/config/env';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

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

/**
 * What to do once the link has become a session, by the flow that sent it.
 *
 * `type` rides on the implicit-flow fragment (and on the query when the
 * backend's redirect adds it). A PKCE `?code=` may carry none, in which case
 * the session is simply set and the screen that is up decides what it means.
 */
async function routeAfterLink(type: string | null): Promise<void> {
  if (type === 'recovery') {
    // A recovery link signs the reader in so they can set a new password;
    // that screen is the point of the link, not a side effect.
    openPushIntent({ route: 'resetPassword' });
    return;
  }

  if (type === 'email_change') {
    // One or both halves of a change of address just landed. Everything
    // that shows the address re-reads the user record; the store is told
    // directly because its copy otherwise waits for the next token refresh.
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      useAuthStore.setState({ email: data.user.email ?? null });
    }
    void queryClient.invalidateQueries({ queryKey: ['account'] });
    void queryClient.invalidateQueries({ queryKey: ['profile'] });
    return;
  }

  // Sign-up confirmation, magic link, or a PKCE code with no type: the
  // session is set and the auth listener carries the rest of the app along.
  // The code screen, if it is up, notices the session and moves on.
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
    await routeAfterLink(params.get('type'));
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
    await routeAfterLink(params.get('type'));
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
