import { useCallback, useEffect, useRef, useState } from "react";
import type { UndoKind, UndoPush, UndoRow } from "../types";

/* How long a take-back stays available. This is the user's thinking time, not
   the notification's screen time — the two were the same thing until #57, which
   is precisely what made a "Link copied to clipboard" able to destroy one.

   The window covers the stack as a whole and restarts whenever it changes,
   including when an entry is taken: someone who undoes at the 5.9-second mark
   should not get a tenth of a second to notice the next offer. */
const UNDO_WINDOW_MS = 6000;

/* Resuming from a hold gives back at least this much, however little was left
   when the pointer arrived. The tray is a list you are meant to read, and a
   list that expires while being read is a list that should not have been
   offered — but a full reset on every passing cursor would make the window
   meaningless. */
const RESUME_FLOOR_MS = 2000;

/* Entries are only reachable while the window is open, so this is not a history
   depth so much as a ceiling on how much a rolling window can accumulate. Each
   push restarts the window, so a user acting steadily keeps the stack alive
   indefinitely, and a design snapshot can carry a logo data URL of a couple of
   megabytes. Twenty is far past any plausible burst and bounds the worst case
   at tens of megabytes rather than hundreds. Overflow drops the *oldest*, which
   is the entry the user is least likely to still want. */
const MAX_DEPTH = 20;

interface UndoGroup {
  id: number;
  kind: UndoKind;
  text: string;
  pluralText?: (count: number) => string;
  items: string[];
  slots: number[];
  undos: UndoPush["undo"][];
}

interface UseUndoReturn {
  /* Newest first. Empty when nothing is pending — there is no idle tray. */
  rows: UndoRow[];
  /* Milliseconds the window runs for from `windowKey`. Changing the key is the
     signal to restart the drain; the value is how long it should take. */
  windowMs: number;
  windowKey: number;
  held: boolean;
  /* History-rail positions currently held open by a pending take-back. */
  pendingSlots: number[];
  pushUndo: (entry: UndoPush) => void;
  /* Reverses every group from the top down to and including `depth`. Depth 1
     is the top, which is what the plain Undo button takes. */
  takeThrough: (depth: number) => void;
  hold: () => void;
  release: () => void;
  dismiss: () => void;
}

function labelFor(group: UndoGroup): string {
  return group.undos.length === 1
    ? group.text
    : (group.pluralText?.(group.undos.length) ?? group.text);
}

/* The undo store, owned separately from anything that draws it.
 *
 * #56 put the take-back inside the toast, which made undo *capacity* a property
 * of *display* capacity: every message evicted it, including the three that
 * announce nothing destructive (#57). #58 fixed that and coalesced same-kind
 * bursts; #71 made it a stack, so an unrelated action stops costing an earlier
 * one its take-back.
 *
 * What this adds is the reading time that a stack implies. A list of five
 * reversible actions is only useful if it can be read before it expires, so
 * pointer or focus anywhere over the tray holds every clock, and leaving
 * resumes with a floor. And because the list is visible, a row below the top
 * can be taken directly — reversing everything above it, in order, which is the
 * only order that is correct: entries are restored by the position they held,
 * so replaying oldest-first reinserts against a list that has already shifted.
 */
export function useUndo(): UseUndoReturn {
  const [stack, setStack] = useState<UndoGroup[]>([]);
  const [held, setHeld] = useState(false);
  const [windowKey, setWindowKey] = useState(0);
  const [windowMs, setWindowMs] = useState(UNDO_WINDOW_MS);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deadlineRef = useRef(0);
  const nextIdRef = useRef(1);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const armWindow = useCallback((ms: number) => {
    clearTimeout(timeoutRef.current);
    deadlineRef.current = performance.now() + ms;
    setWindowMs(ms);
    setWindowKey((k) => k + 1);
    timeoutRef.current = setTimeout(() => setStack([]), ms);
  }, []);

  const pushUndo = useCallback(
    (entry: UndoPush) => {
      setStack((prev) => {
        const top = prev[prev.length - 1];
        const merges = top?.kind === entry.kind;
        const group: UndoGroup = {
          id: merges && top ? top.id : nextIdRef.current++,
          kind: entry.kind,
          text: entry.text,
          pluralText: entry.pluralText,
          items:
            merges && top
              ? [...top.items, entry.itemLabel ?? entry.text]
              : [entry.itemLabel ?? entry.text],
          slots:
            merges && top
              ? [...top.slots, ...(entry.slot === undefined ? [] : [entry.slot])]
              : entry.slot === undefined
                ? []
                : [entry.slot],
          undos: merges && top ? [...top.undos, entry.undo] : [entry.undo],
        };
        const next = merges ? [...prev.slice(0, -1), group] : [...prev, group];
        return next.length > MAX_DEPTH ? next.slice(next.length - MAX_DEPTH) : next;
      });
      setHeld(false);
      armWindow(UNDO_WINDOW_MS);
    },
    [armWindow],
  );

  /* Newest first, both across groups and inside one: `insertConfig` restores an
     entry by the position it held, so replaying oldest-first reinserts each one
     against a list that has already shifted under it. */
  const takeThrough = useCallback(
    (depth: number) => {
      if (depth < 1 || stack.length === 0) return;
      const taking = stack.slice(Math.max(0, stack.length - depth));
      for (const group of [...taking].reverse()) {
        let refused = false;
        for (const undo of [...group.undos].reverse()) {
          if (undo() === false) {
            refused = true;
            break;
          }
        }
        if (refused) break;
      }
      const remaining = stack.slice(0, Math.max(0, stack.length - depth));
      setStack(remaining);
      setHeld(false);
      if (remaining.length > 0) armWindow(UNDO_WINDOW_MS);
      else clearTimeout(timeoutRef.current);
    },
    [stack, armWindow],
  );

  const hold = useCallback(() => {
    if (timeoutRef.current === undefined) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
    setHeld(true);
  }, []);

  const release = useCallback(() => {
    setHeld((wasHeld) => {
      if (!wasHeld) return false;
      const left = Math.max(RESUME_FLOOR_MS, deadlineRef.current - performance.now());
      armWindow(left);
      return false;
    });
  }, [armWindow]);

  const dismiss = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
    setHeld(false);
    setStack([]);
  }, []);

  const rows: UndoRow[] = stack
    .map((group, i) => ({
      id: group.id,
      depth: stack.length - i,
      kind: group.kind,
      text: labelFor(group),
      count: group.undos.length,
      items: group.items,
    }))
    .reverse();

  const pendingSlots = stack.flatMap((group) => group.slots);

  return {
    rows,
    windowMs,
    windowKey,
    held,
    pendingSlots,
    pushUndo,
    takeThrough,
    hold,
    release,
    dismiss,
  };
}
