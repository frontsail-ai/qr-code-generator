/* The only module in the app allowed to touch Web Storage.
 *
 * Its whole reason to exist is the return type. Every previous caller wrapped
 * its own `try { … } catch { console.error(…) }`, which turns a failed write
 * into a line in a console nobody has open while the UI goes on claiming the
 * data was kept — that is how "Saved to history" came to be printed over a
 * write that never landed (#42). A `WriteResult` cannot be ignored by
 * accident: the caller has to look at it to know what to render.
 *
 * Storage is unavailable more often than it looks. Safari in Lockdown Mode and
 * private windows with cookies blocked throw on the property access itself,
 * not on the call, so even reading has to be guarded.
 */

export type StorageFailure = "quota" | "unavailable";

export type WriteResult = { ok: true } | { ok: false; reason: StorageFailure };

export const WRITE_OK: WriteResult = { ok: true };

type StorageKind = "local" | "session";

function storage(kind: StorageKind): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/* Chrome and Safari throw a `QuotaExceededError`; Firefox throws
   `NS_ERROR_DOM_QUOTA_REACHED` with the legacy code 1014. Anything else means
   storage is not merely full but unusable, which is a different message. */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

export function readItem(key: string, kind: StorageKind = "local"): string | null {
  try {
    return storage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeItem(key: string, value: string, kind: StorageKind = "local"): WriteResult {
  const store = storage(kind);
  if (!store) return { ok: false, reason: "unavailable" };

  try {
    store.setItem(key, value);
    return WRITE_OK;
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
  }
}

/* Removal has no failure worth reporting: a key that cannot be removed because
   storage is gone is a key that is not there. */
export function removeItem(key: string, kind: StorageKind = "local"): void {
  try {
    storage(kind)?.removeItem(key);
  } catch {
    /* nothing to undo */
  }
}

export function keysWithPrefix(prefix: string, kind: StorageKind = "local"): string[] {
  const store = storage(kind);
  if (!store) return [];

  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}
