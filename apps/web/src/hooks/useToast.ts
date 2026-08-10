import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastAction, ToastKind, ToastState } from "../types";

/* A passive toast only has to be noticed; an actionable one has to be read,
   decided about, and travelled to. Two seconds is plenty for "Saved to
   history" and nowhere near enough to catch a mistake. */
const PASSIVE_MS = 2000;
const ACTIONABLE_MS = 6000;

interface UseToastReturn {
  toast: ToastState | null;
  toastVisible: boolean;
  showToast: (kind: ToastKind, text: string, action?: ToastAction) => void;
  runToastAction: () => void;
}

/* The app's single feedback channel.
 *
 * It carries an optional action because a destructive control needs somewhere
 * to put the take-back, and this is the only place in the app that speaks to
 * the user after the fact. While the channel was text-only, every irreversible
 * path had a choice between saying nothing and opening a native dialog that
 * `no-alert` forbids — so they all said nothing, and a mis-clicked Delete was
 * final (#41).
 */
export function useToast(): UseToastReturn {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const showToast = useCallback((kind: ToastKind, text: string, action?: ToastAction) => {
    setToast({ kind, text, action });
    setToastVisible(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => setToastVisible(false),
      action ? ACTIONABLE_MS : PASSIVE_MS,
    );
  }, []);

  /* Taking the offer consumes it. An undo that lingers invites a second click,
     and the second click has nothing left to undo. */
  const runToastAction = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setToastVisible(false);
    toast?.action?.onAction();
  }, [toast]);

  return { toast, toastVisible, showToast, runToastAction };
}
