import { Check, Link as LinkIcon, RotateCcw, TriangleAlert, type LucideIcon } from "lucide-react";
import { useRef, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import type { ToastKind, ToastState } from "../types";

/* Plico primitives — see src/styles/plico.css for the token set. */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  icon?: LucideIcon;
  fullWidth?: boolean;
  size?: "sm" | "md";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  icon: Icon,
  fullWidth,
  size = "md",
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const sizeClass =
    size === "sm" ? "h-[30px] px-2.5 text-xs gap-1.5" : "h-[38px] px-4 text-[13px] gap-2";
  const base = `inline-flex items-center justify-center ${sizeClass} rounded-[2px] font-semibold cursor-pointer transition-colors duration-[140ms] disabled:cursor-not-allowed`;
  const variants = {
    primary:
      "bg-[var(--ink-900)] text-[var(--paper-0)] border border-[var(--ink-900)] hover:bg-[var(--ink-700)] disabled:bg-[var(--ink-300)] disabled:border-[var(--ink-300)]",
    secondary:
      "bg-[var(--paper-card)] text-[var(--ink-900)] border border-[var(--border-hairline)] hover:bg-[var(--paper-50)] disabled:text-[var(--ink-300)] disabled:hover:bg-[var(--paper-card)]",
  };
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} aria-hidden />}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  title: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline";
}

export function IconButton({
  icon: Icon,
  title,
  size = "md",
  variant = "ghost",
  className = "",
  ...rest
}: IconButtonProps) {
  const sizes = { sm: "w-7 h-7", md: "w-[34px] h-[34px]", lg: "w-10 h-10" };
  const iconSizes = { sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-[18px] h-[18px]" };
  const variants = {
    ghost:
      "bg-transparent border border-transparent text-[var(--ink-600)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]",
    outline:
      "bg-[var(--paper-card)] border border-[var(--border-hairline)] text-[var(--ink-900)] hover:bg-[var(--paper-50)] disabled:text-[var(--ink-300)] disabled:hover:bg-[var(--paper-card)]",
  };
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center rounded-[2px] cursor-pointer transition-colors duration-[140ms] disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      <Icon className={iconSizes[size]} aria-hidden />
    </button>
  );
}

interface BadgeProps {
  variant?: "ok" | "neutral" | "solid-ink" | "warn";
  dot?: boolean;
  children: ReactNode;
}

export function Badge({ variant = "neutral", dot, children }: BadgeProps) {
  const variants = {
    ok: "bg-[var(--signal-ok-50)] text-[var(--signal-ok-500)] border border-[color-mix(in_srgb,var(--signal-ok-500)_25%,transparent)]",
    warn: "bg-[var(--signal-warn-50)] text-[var(--signal-warn-500)] border border-[color-mix(in_srgb,var(--signal-warn-500)_25%,transparent)]",
    neutral: "bg-[var(--paper-50)] text-[var(--ink-600)] border border-[var(--border-default)]",
    "solid-ink": "bg-[var(--ink-900)] text-[var(--paper-0)] border border-[var(--ink-900)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded-[2px] font-mono text-[10px] font-semibold tracking-[0.08em] uppercase ${variants[variant]}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/* Numbered section eyebrow with a trailing hairline rule. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="plico-label text-[var(--text-secondary)]">{children}</span>
      <span className="flex-1 h-px bg-[var(--border-hairline)]" aria-hidden />
    </div>
  );
}

interface NoteProps {
  variant?: "warn" | "error";
  icon?: LucideIcon;
  /* Set to "alert" when the note appears in response to something the user just
     did, so screen readers announce it instead of waiting to be visited. */
  role?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  "data-testid"?: string;
  children: ReactNode;
}

const TOAST_ICONS: Record<ToastKind, LucideIcon> = {
  copy: LinkIcon,
  save: Check,
};

interface ToastProps {
  toast: ToastState | null;
  toastVisible: boolean;
  undoLabel: string | null;
  onUndo: () => void;
}

/* Bottom-centre status strip, drawing whichever of two independent things is
   current: a transient message, or a pending undo offer.
 *
 * A message wins while it is on screen because it is the newer, briefer event
 * — but it only *covers* the offer, it does not end it. The offer comes back
 * for the rest of its window once the message has said its piece. That
 * separation is the whole point: while the action lived inside the message,
 * "Link copied to clipboard" could permanently destroy the take-back for a
 * delete that happened half a second earlier (#57).
 *
 * The node stays mounted so the fade runs both ways, which makes it a live
 * region rather than something announced by appearing. The Undo button is the
 * exception: it is rendered only when actually offered, because a button
 * parked at `opacity: 0` is still a tab stop and still counts as visible to
 * Playwright — an invisible control that both keyboards and tests can reach is
 * worse than no control.
 */
export function Toast({ toast, toastVisible, undoLabel, onUndo }: ToastProps) {
  const showingMessage = toastVisible && toast !== null;
  const showingUndo = !showingMessage && undoLabel !== null;
  const visible = showingMessage || showingUndo;
  const current = showingMessage
    ? { Icon: TOAST_ICONS[toast.kind], text: toast.text }
    : showingUndo
      ? { Icon: RotateCcw, text: undoLabel }
      : null;

  /* Hold the last thing said so the strip fades out with its words still in
     it. Dropping them the instant the offer expires empties the box a fifth of
     a second before it disappears, which reads as a glitch rather than a
     dismissal. Writing the same value twice is harmless, so a render-phase
     assignment is safe here. */
  const lastRef = useRef(current);
  if (current) lastRef.current = current;
  const shown = current ?? lastRef.current;
  const Icon = shown?.Icon ?? RotateCcw;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="toast"
      className={`fixed bottom-[calc(6rem+var(--consent-inset))] lg:bottom-[calc(1.5rem+var(--consent-inset))] left-1/2 -translate-x-1/2 z-30 py-2.5 bg-[var(--ink-900)] text-[var(--paper-0)] text-[13px] font-medium rounded-[2px] shadow-[var(--shadow-lg)] flex items-center gap-2.5 transition-all duration-[220ms] ${
        showingUndo ? "pl-4 pr-2" : "px-4"
      } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
    >
      <Icon className="w-[15px] h-[15px] shrink-0" aria-hidden />
      {shown?.text}
      {showingUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="bg-transparent border-none cursor-pointer px-2 py-1 -my-1 rounded-[2px] text-[13px] font-semibold text-[var(--paper-0)] underline underline-offset-2 decoration-[color-mix(in_srgb,var(--paper-0)_45%,transparent)] transition-colors duration-[140ms] hover:bg-[color-mix(in_srgb,var(--paper-0)_16%,transparent)]"
        >
          Undo
        </button>
      )}
    </div>
  );
}

/* Inline advisory strip — the app's answer to a native alert(). Icon takes the
   signal colour, the message stays ink so it reads as prose. */
export function Note({
  variant = "warn",
  icon: Icon = TriangleAlert,
  role,
  className = "",
  ref,
  "data-testid": testId,
  children,
}: NoteProps) {
  const variants = {
    warn: "bg-[var(--signal-warn-50)] text-[var(--signal-warn-500)]",
    error: "bg-[var(--signal-error-50)] text-[var(--signal-error-500)]",
  };
  return (
    <div
      ref={ref}
      role={role}
      data-testid={testId}
      className={`flex items-start gap-2 px-2.5 py-2 rounded-[2px] ${variants[variant]} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden />
      <span className="text-xs text-[var(--ink-700)] leading-[1.45]">{children}</span>
    </div>
  );
}
