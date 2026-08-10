// App-local component prop types. Everything framework-free lives in
// @frontsail/qr-core; this file holds the React-flavored leftovers.
export interface FormComponentProps<T> {
  data: T;
  onChange: (data: T) => void;
}

export type ToastKind = "copy" | "save" | "undo";

/* The take-back a toast offers. Its closure owns the payload needed to reverse
   the action, so a toast that replaces another also replaces what "Undo" means
   — there is never a stale action pointing at a stale payload. */
export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastState {
  kind: ToastKind;
  text: string;
  action?: ToastAction;
}
