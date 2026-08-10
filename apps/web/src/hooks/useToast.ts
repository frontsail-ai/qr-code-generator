import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastKind, ToastState } from "../types";

const MESSAGE_MS = 2000;

interface UseToastReturn {
  toast: ToastState | null;
  toastVisible: boolean;
  showToast: (kind: ToastKind, text: string) => void;
}

/* Transient messages: "Saved to history", "Link copied to clipboard".
 *
 * Deliberately incapable of carrying an action. Undo lives in `useUndo`, which
 * nothing here can evict — a message reporting that nothing was destroyed must
 * never be able to destroy a take-back (#57).
 */
export function useToast(): UseToastReturn {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const showToast = useCallback((kind: ToastKind, text: string) => {
    setToast({ kind, text });
    setToastVisible(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToastVisible(false), MESSAGE_MS);
  }, []);

  return { toast, toastVisible, showToast };
}
