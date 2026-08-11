import { useCallback, useRef, useState } from "react";
import type { SaveConfigInput, SavedConfig } from "@frontsail/qr-core";
import { normalizeDesign } from "@frontsail/qr-core";
import { readItem, WRITE_OK, type WriteResult, writeItem } from "../utils/safeStorage";

const STORAGE_KEY = "qr-saved-configs";

/* History is what is in storage, not what React happens to be holding — so
   every change is written first and only becomes state if the write landed.
   The reverse order is what let the app print "Saved to history" and list an
   entry over a write that had failed on a full disk, leaving the user to find
   out on their next reload (#42). Undo runs the same gauntlet: a take-back
   that cannot be written is one that expires with the tab, and it is offered
   to someone already recovering from a mistake. */
/* An entry this build cannot make sense of, kept exactly as it was found.
   Skipping it in the list is right; deleting it is not. A newer build may have
   written a QR type this one has never heard of — a rolled-back deploy, a
   cached bundle, two tabs on either side of a release — and since the whole
   list is rewritten on every save, pruning it here would erase it from disk on
   the user's next download. It is parked with the index it held, so a build
   that understands it again finds it where the user left it. */
interface ForeignEntry {
  index: number;
  entry: unknown;
}

interface LoadedHistory {
  configs: SavedConfig[];
  foreign: ForeignEntry[];
}

function loadFromStorage(): LoadedHistory {
  const stored = readItem(STORAGE_KEY);
  if (!stored) return { configs: [], foreign: [] };

  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return { configs: [], foreign: [] };

    const configs: SavedConfig[] = [];
    const foreign: ForeignEntry[] = [];

    /* Entries written by older builds are missing fields the current one
       expects; `normalizeDesign` is the same gate the draft and share links go
       through, so one stale entry cannot take the whole list down with it. */
    parsed.forEach((entry: Partial<SavedConfig>, index) => {
      const design = normalizeDesign(entry);
      if (design && typeof entry.id === "string" && typeof entry.timestamp === "string") {
        configs.push({ id: entry.id, timestamp: entry.timestamp, ...design });
      } else {
        foreign.push({ index, entry });
      }
    });

    return { configs, foreign };
  } catch {
    return { configs: [], foreign: [] };
  }
}

/* Puts the unreadable entries back before the list is written. Ascending index
   order matters — each splice shifts everything after it. */
function withForeign(configs: SavedConfig[], foreign: ForeignEntry[]): unknown[] {
  if (foreign.length === 0) return configs;
  const out: unknown[] = [...configs];
  for (const { index, entry } of foreign) out.splice(Math.min(index, out.length), 0, entry);
  return out;
}

function configsMatch(a: SaveConfigInput, b: SaveConfigInput): boolean {
  // Compare qrType, formData, and customization (excluding id and timestamp)
  return (
    a.qrType === b.qrType &&
    JSON.stringify(a.formData) === JSON.stringify(b.formData) &&
    JSON.stringify(a.customization) === JSON.stringify(b.customization)
  );
}

function withConfig(prev: SavedConfig[], config: SaveConfigInput): SavedConfig[] {
  const existingIndex = prev.findIndex((c) => configsMatch(c, config));

  if (existingIndex !== -1) {
    // Move existing config to top with updated timestamp
    const updated: SavedConfig = {
      ...prev[existingIndex],
      timestamp: new Date().toISOString(),
    };
    return [updated, ...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1)];
  }

  const newConfig: SavedConfig = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...config,
  };
  return [newConfig, ...prev];
}

interface UseSavedConfigsReturn {
  savedConfigs: SavedConfig[];
  /** Every mutation reports whether storage took it; none of them assume it did. */
  saveConfig: (config: SaveConfigInput) => WriteResult;
  deleteConfig: (id: string) => WriteResult;
  clearAllConfigs: () => WriteResult;
  insertConfig: (config: SavedConfig, index: number) => WriteResult;
  restoreConfigs: (configs: SavedConfig[]) => WriteResult;
}

export function useSavedConfigs(): UseSavedConfigsReturn {
  const [loaded] = useState(loadFromStorage);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>(loaded.configs);
  const foreign = useRef(loaded.foreign);

  /* The list as it stands now, not as it stood when the caller was built. An
     undo lives inside a toast closure for six seconds, so reading the list
     through that closure would write back a snapshot taken before whatever the
     user did in the meantime — dropping a design saved during the undo window,
     which is the case `restoreConfigs` exists to protect. A functional update
     would see the current list, but the write has to happen *before* the state
     changes, and a reducer is no place for one. */
  const configsRef = useRef(savedConfigs);

  const commit = useCallback((next: SavedConfig[]): WriteResult => {
    const result = writeItem(STORAGE_KEY, JSON.stringify(withForeign(next, foreign.current)));
    if (result.ok) {
      configsRef.current = next;
      setSavedConfigs(next);
    }
    return result;
  }, []);

  const saveConfig = useCallback(
    (config: SaveConfigInput) => commit(withConfig(configsRef.current, config)),
    [commit],
  );

  const deleteConfig = useCallback(
    (id: string) => {
      const next = configsRef.current.filter((c) => c.id !== id);
      return next.length === configsRef.current.length ? WRITE_OK : commit(next);
    },
    [commit],
  );

  const clearAllConfigs = useCallback(() => commit([]), [commit]);

  /* Undoing a delete puts the entry back where it was. Re-adding it at the top
     would make an undone mistake look like a fresh save, leaving the user with
     a history they never had. The id guard covers the case where the same
     design was saved again inside the undo window. */
  const insertConfig = useCallback(
    (config: SavedConfig, index: number) => {
      const prev = configsRef.current;
      if (prev.some((c) => c.id === config.id)) return WRITE_OK;
      return commit([...prev.slice(0, index), config, ...prev.slice(index)]);
    },
    [commit],
  );

  /* The snapshot says what was cleared, not what history is allowed to hold —
     anything saved during the undo window is newer, so it stays and stays on
     top. */
  const restoreConfigs = useCallback(
    (configs: SavedConfig[]) => {
      const prev = configsRef.current;
      const missing = configs.filter((c) => !prev.some((p) => p.id === c.id));
      return missing.length === 0 ? WRITE_OK : commit([...prev, ...missing]);
    },
    [commit],
  );

  return {
    savedConfigs,
    saveConfig,
    deleteConfig,
    clearAllConfigs,
    insertConfig,
    restoreConfigs,
  };
}
