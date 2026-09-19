import { useCallback, useEffect, useMemo, useRef } from 'react';

import { deleteStorageObject, removeStoragePath } from '@/services/admin';

/**
 * Keeps an editor's uploads from outliving the edit.
 *
 * A cover, portrait or PDF goes to Storage the moment it is picked, before
 * anything is saved — the editor shows the real file and the real size, and
 * a save is one write rather than a write and an upload. The cost is that a
 * file can be uploaded and then never referenced: the operator picks a
 * second cover, or leaves the screen with "Discard". Those used to sit in
 * the bucket until someone noticed them on the Storage screen.
 *
 * Two lists, two rules:
 *
 *   · **Pending** — uploaded in this session, not yet saved. Nothing points
 *     at them, so they are removed outright: the earlier of two picks as
 *     soon as the second lands, and whatever is left when the screen goes
 *     away unsaved.
 *   · **Replaced** — the file the record pointed at before this save. It may
 *     still be shared (a duplicated title keeps the original's objects), so
 *     it goes through the guarded RPC, which refuses while any book or
 *     author still uses it. A refusal is the right answer, not an error.
 *
 * Every removal is fire-and-forget: a failed clean-up is an orphan the
 * Storage screen will list, never a failed save.
 */
export function useStorageCleanup() {
  const pending = useRef(new Set<string>());

  // Whatever is still pending when the editor unmounts was never saved.
  // The set is read at cleanup time, not captured at mount, so it sees
  // everything added during the edit.
  useEffect(() => {
    const set = pending.current;
    return () => {
      for (const path of set) {
        void removeStoragePath(path).catch(() => undefined);
      }
      set.clear();
    };
  }, []);

  /**
   * Records a fresh upload. If it replaces one made earlier in this same
   * edit, that earlier one is nobody's and goes now.
   */
  const replacePending = useCallback(
    (previous: string | null | undefined, next: string) => {
      if (previous && pending.current.has(previous)) {
        pending.current.delete(previous);
        void removeStoragePath(previous).catch(() => undefined);
      }
      pending.current.add(next);
    },
    [],
  );

  /**
   * The save landed. `kept` is what the record now points at and stays;
   * every other pending upload goes; and each of `previouslySaved` that is
   * no longer kept is offered to the guarded delete.
   */
  const commit = useCallback(
    (
      kept: Array<string | null | undefined>,
      previouslySaved: Array<string | null | undefined> = [],
    ) => {
      const keep = new Set(kept.filter((path): path is string => !!path));
      for (const path of keep) {
        pending.current.delete(path);
      }
      for (const path of pending.current) {
        void removeStoragePath(path).catch(() => undefined);
      }
      pending.current.clear();

      for (const path of previouslySaved) {
        if (!path || keep.has(path)) {
          continue;
        }
        const parsed = splitStoragePath(path);
        if (parsed) {
          void deleteStorageObject(parsed.bucket, parsed.name).catch(
            () => undefined,
          );
        }
      }
    },
    [],
  );

  return useMemo(() => ({ replacePending, commit }), [commit, replacePending]);
}

/** `covers/authors/x.jpg` → the bucket and the object name inside it. */
function splitStoragePath(
  path: string,
): { bucket: 'covers' | 'pdfs'; name: string } | null {
  const [bucket, ...rest] = path.split('/');
  const name = rest.join('/');
  if ((bucket !== 'covers' && bucket !== 'pdfs') || !name) {
    return null;
  }
  return { bucket, name };
}
