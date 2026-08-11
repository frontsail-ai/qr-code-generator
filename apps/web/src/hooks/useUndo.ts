import { useCallback, useEffect, useRef, useState } from "react";
import type { UndoKind, UndoPush } from "../types";

/* How long a take-back stays available. This is the user's thinking time, not
   the notification's screen time — the two were the same thing until #57, which
   is precisely what made a "Link copied to clipboard" able to destroy one.

   The window covers the stack as a whole and restarts whenever it changes,
   including when an entry is taken: someone who undoes at the 5.9-second mark
   should not get a tenth of a second to notice the next offer. */
const UNDO_WINDOW_MS = 6000;

/* Entries are only reachable while the window is open, so this is not a history
   depth so much as a ceiling on how much a rolling window can accumulate. Each
   push restarts the window, so a user acting steadily keeps the stack alive
   indefinitely, and a design snapshot can carry a logo data URL of a couple of
   megabytes. Twenty is far past any plausible burst and bounds the worst case
   at tens of megabytes rather than hundreds. Overflow drops the *oldest*, which
   is the entry the user is least likely to still want. */
const MAX_DEPTH = 20;

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
 * #58 fixed that and coalesced consecutive same-kind actions, which widened the
 * slot without deepening the store: a *different* kind still replaced whatever
 * was held, so deleting a design and then removing a logo cost the design. The
 * store is now a stack. Same-kind actions still merge into the top group —
 * "3 designs deleted" reversed by one click — but an unrelated action lands on
 * top of the previous one instead of overwriting it, and taking the top reveals
 * what was underneath.
 *
 * Merging across kinds would have been one line, and wrong: a single "Undo"
 * reversing both a deleted design and a removed logo, under a label that can
 * only name one of them, is a worse surprise than the bug.
 */
export function useUndo(): UseUndoReturn {
  const [stack, setStack] = useState<UndoGroup[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const armWindow = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStack([]), UNDO_WINDOW_MS);
  }, []);

  const pushUndo = useCallback(
    (entry: UndoPush) => {
      setStack((prev) => {
        const top = prev[prev.length - 1];
        const merges = top?.kind === entry.kind;
        const group: UndoGroup = {
          kind: entry.kind,
          text: entry.text,
          pluralText: entry.pluralText,
          undos: merges && top ? [...top.undos, entry.undo] : [entry.undo],
        };
        const next = merges ? [...prev.slice(0, -1), group] : [...prev, group];
        return next.length > MAX_DEPTH ? next.slice(next.length - MAX_DEPTH) : next;
      });
      armWindow();
    },
    [armWindow],
  );

  /* Takes the top group only. Within it, newest first: `insertConfig` restores
     an entry by the position it held, so replaying a burst oldest-first would
     reinsert each one against a list that has already shifted under it. Across
     groups the same order holds for the same reason — each group is undone
     against the state that existed just after it happened. */
  const runUndo = useCallback(() => {
    const top = stack[stack.length - 1];
    if (!top) return;
    for (const undo of [...top.undos].reverse()) {
      if (undo() === false) break;
    }
    const remaining = stack.slice(0, -1);
    setStack(remaining);
    if (remaining.length > 0) armWindow();
    else clearTimeout(timeoutRef.current);
  }, [stack, armWindow]);

  const top = stack[stack.length - 1];
  const undoLabel = !top
    ? null
    : top.undos.length === 1
      ? top.text
      : (top.pluralText?.(top.undos.length) ?? top.text);

  return { undoLabel, pushUndo, runUndo };
}
