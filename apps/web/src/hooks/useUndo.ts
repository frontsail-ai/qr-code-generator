import { useCallback, useEffect, useRef, useState } from "react";
import type { UndoKind, UndoPush } from "../types";

/* How long a take-back stays available. This is the user's thinking time, not
   the notification's screen time — the two were the same thing until #57, which
   is precisely what made a "Link copied to clipboard" able to destroy one. */
const UNDO_WINDOW_MS = 6000;

interface UndoGroup {
  kind: UndoKind;
  text: string;
  pluralText?: (count: number) => string;
  undos: UndoPush["undo"][];
}

interface UseUndoReturn {
  undoLabel: string | null;
  pushUndo: (entry: UndoPush) => void;
  runUndo: () => void;
}

/* The undo store, owned separately from anything that draws it.
 *
 * #56 put the take-back inside the toast, which quietly made undo *capacity* a
 * property of *display* capacity: a strip shows one message, so the app could
 * hold one take-back, and every message evicted it — including the three that
 * announce nothing destructive. Deleting a design and then downloading a PNG
 * lost the design (#57).
 *
 * Holding the entries here costs nothing extra: a deleted config was already in
 * `savedConfigs` a moment earlier, so keeping it for the window is the same
 * peak memory the app had before the delete. No cap is needed.
 */
export function useUndo(): UseUndoReturn {
  const [group, setGroup] = useState<UndoGroup | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  /* Consecutive same-kind actions merge into one offer; a different kind starts
     a new one. Merging across kinds would mean a single "Undo" silently
     reversing two unrelated things. */
  const pushUndo = useCallback((entry: UndoPush) => {
    setGroup((prev) => ({
      kind: entry.kind,
      text: entry.text,
      pluralText: entry.pluralText,
      undos: prev?.kind === entry.kind ? [...prev.undos, entry.undo] : [entry.undo],
    }));
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setGroup(null), UNDO_WINDOW_MS);
  }, []);

  /* Newest first. `insertConfig` restores an entry by the position it held, so
     replaying a burst oldest-first would reinsert each one against a list that
     has already shifted under it. */
  const runUndo = useCallback(() => {
    if (!group) return;
    clearTimeout(timeoutRef.current);
    for (const undo of [...group.undos].reverse()) {
      if (undo() === false) break;
    }
    setGroup(null);
  }, [group]);

  const undoLabel = !group
    ? null
    : group.undos.length === 1
      ? group.text
      : (group.pluralText?.(group.undos.length) ?? group.text);

  return { undoLabel, pushUndo, runUndo };
}
