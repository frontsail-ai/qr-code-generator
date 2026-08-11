// App-local component prop types. Everything framework-free lives in
// @frontsail/qr-core; this file holds the React-flavored leftovers.
export interface FormComponentProps<T> {
  data: T;
  onChange: (data: T) => void;
}

/* Transient messages only. A take-back is not a message — see `useUndo`. */
export type ToastKind = "copy" | "save";

export interface ToastState {
  kind: ToastKind;
  text: string;
}

/* Which destructive action produced an undo entry. Consecutive pushes of the
   same kind coalesce into one offer, so this is load-bearing rather than
   decorative: a typo here would silently split a burst or merge two things
   that should not merge. */
export type UndoKind = "delete" | "clear" | "restore" | "share-load" | "logo";

export interface UndoPush {
  kind: UndoKind;
  text: string;
  /* Renders the offer once a burst has coalesced. Omitted where a burst is not
     reachable — you cannot clear an already-cleared history, or remove a logo
     twice without adding one back in between. */
  pluralText?: (count: number) => string;
  /* Return `false` to say the take-back itself was refused — a restore into
     full storage, say. Replay of a coalesced group stops there rather than
     retrying into the same wall and overwriting the reported failure with a
     later success. Canvas-only undos have nothing to refuse and return void. */
  undo: () => boolean | void;
}
