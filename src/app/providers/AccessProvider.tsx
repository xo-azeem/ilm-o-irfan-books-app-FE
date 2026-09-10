import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { AccessEventRow } from '@/services/api/types';
import { configureBilling, forgetPurchaser, identifyPurchaser } from '@/services/billing';
import { useAccessStore } from '@/stores/accessStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Nudges the screens that render the plan and the renewal date.
 *
 * The lock keeps its own state, but Membership and Profile read the query
 * cache, so a change that arrived over the socket has to reach them too. The
 * key is scoped by user id, hence the prefix match.
 */
function refreshSubscriptionViews() {
  void queryClient.invalidateQueries({ queryKey: ['subscription'] });
}

/**
 * Keeps the membership lock fed.
 *
 * Three inputs, one reducer. The poll is the floor — it is what makes the socket
 * a correction channel rather than the lock:
 *
 *   · `entitlements-status`, on sign-in and on every foreground
 *   · `access_events` rows off the Postgres change feed, for changes in between
 *   · a re-fetch on every (re)subscribe, because a row written while the socket
 *     was down was not queued for us
 *
 * The countdown itself lives in `accessStore` and needs none of this: it runs
 * offline, from a date and a clock offset already on disk. If the socket were the
 * lock, turning off wifi a second before expiry would buy unlimited reading.
 */
export function AccessProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore(state => state.userId);
  const applyAccessState = useAccessStore(state => state.applyAccessState);
  const refresh = useAccessStore(state => state.refresh);
  const recheck = useAccessStore(state => state.recheck);
  const reset = useAccessStore(state => state.reset);

  // The store SDK is bound to the Supabase user id and nothing else: the
  // billing webhook looks the reader up by `app_user_id`, so an email or an
  // anonymous id there means a completed purchase that unlocks nobody. Signing
  // out returns the SDK to an anonymous id, so the next reader on this device
  // does not inherit the previous one's receipts.
  useEffect(() => {
    if (!userId) {
      void forgetPurchaser();
      return;
    }
    configureBilling();
    void identifyPurchaser(userId);
  }, [userId]);

  // Signing out drops the lock state with the session. Nothing the reader owns
  // goes with it — progress, highlights, wishlist and downloads are all
  // server-side or on disk, and expiry is not a reason to lose any of them.
  useEffect(() => {
    if (!userId) {
      reset();
    }
  }, [reset, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    async function poll() {
      const landed = await refresh();
      if (landed && !cancelled) {
        refreshSubscriptionViews();
      }
    }

    /**
     * Joins this reader's access feed.
     *
     * A Postgres change feed on `access_events`, and deliberately not a
     * broadcast: this project's `realtime.messages` has no partitions, so every
     * broadcast is dropped without an error — a subscription that looks healthy
     * and never delivers, on the one feature whose job is to take access away.
     * Nothing here calls `realtime.setAuth()` either; that was a private-channel
     * requirement and has no part in this.
     *
     * Everything about the subscription is quoted from the server's own
     * `realtime` block — topic, schema, table, event and row filter — so the
     * backend can move the feed without a client release, and nothing here
     * hardcodes a channel name or builds one out of the user id.
     *
     * The filter only tells the socket which rows to send. It is not what makes
     * this private: RLS on `access_events` is, and it holds whatever filter a
     * client asks for — another signed-in reader selecting this table gets an
     * empty set, anon gets 42501, and a device trying to insert its own unlock
     * gets 42501.
     */
    function connect() {
      const realtime = useAccessStore.getState().state.realtime;
      if (!realtime?.channel || cancelled) {
        return;
      }

      // A deployment that asks for anything other than the change feed is not
      // something to guess at: the poll and the countdown already keep the gate
      // correct, so the socket is left unopened rather than opened on a mode
      // this client does not implement.
      if (realtime.mode && realtime.mode !== 'postgres_changes') {
        if (__DEV__) {
          console.warn(
            `[access] unsupported realtime mode "${realtime.mode}" — relying on the poll and the countdown.`,
          );
        }
        return;
      }

      channel = supabase
        .channel(realtime.channel)
        .on(
          'postgres_changes',
          {
            event: (realtime.event || 'INSERT') as 'INSERT',
            schema: realtime.schema || 'public',
            table: realtime.table || 'access_events',
            ...(realtime.filter ? { filter: realtime.filter } : null),
          },
          ({ new: row }) => {
            // The delivered row is snake_case, the poll's body is camelCase, and
            // one reducer reads both — see `parseAccessState`.
            applyAccessState(row as AccessEventRow);
            refreshSubscriptionViews();
          },
        )
        .subscribe(status => {
          // A fresh subscription is also a reconnection: a row written while we
          // were away was not held for us, so the state is re-read rather than
          // assumed unchanged.
          if (status === 'SUBSCRIBED') {
            void poll();
          }
        });
    }

    void poll().then(connect);

    // Timers do not fire reliably in the background, so returning to the app is
    // its own checkpoint: re-evaluate the deadline against the clock first —
    // that alone can lock, with no network — then confirm with the server.
    const appState = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        return;
      }
      recheck();
      void poll();
    });

    return () => {
      cancelled = true;
      appState.remove();
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [applyAccessState, recheck, refresh, userId]);

  return children;
}
