import {
  Check,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  RotateCcw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import type { ToastKind, ToastState, UndoRow } from "../types";

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

/* How many rows the tray shows before it folds the rest behind "+n earlier".
   Three is what fits without the block becoming a panel. */
const VISIBLE_ROWS = 3;

interface TrayProps {
  toast: ToastState | null;
  toastVisible: boolean;
  rows: UndoRow[];
  windowMs: number;
  windowKey: number;
  held: boolean;
  onTakeThrough: (depth: number) => void;
  onHold: () => void;
  onRelease: () => void;
}

/* Bottom-centre. Two jobs, deliberately two shapes.
 *
 * A message is an ink line with an icon and no controls: it reports, and two
 * seconds later it is gone. A take-back is a tray — the same ink, plus a rule
 * across the top that drains as the window runs out, a mono depth count, and a
 * *list* of what is reversible.
 *
 * The list is the point. Undoing removes a row from something visible rather
 * than swapping one label for another in place, and a label that changes half a
 * second after you clicked it reads as "that did not work". Subtraction cannot
 * be misread that way. It also makes depth reachable: a row below the top can
 * be taken directly, reversing everything above it in order.
 *
 * The two stack rather than one covering the other, so a message can no longer
 * hide a pending take-back even visually.
 */
export function Tray({
  toast,
  toastVisible,
  rows,
  windowMs,
  windowKey,
  held,
  onTakeThrough,
  onHold,
  onRelease,
}: TrayProps) {
  const [expanded, setExpanded] = useState(false);
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [reachingTo, setReachingTo] = useState(0);

  const showingMessage = toastVisible && toast !== null;
  const MessageIcon = toast ? TOAST_ICONS[toast.kind] : Check;
  const open = rows.length > 0;
  const hidden = rows.length - VISIBLE_ROWS;
  const shown = expanded ? rows : rows.slice(0, VISIBLE_ROWS);

  /* Collapse the disclosures when the tray empties, so the next one does not
     open mid-expanded from a previous life. */
  useEffect(() => {
    if (rows.length === 0) {
      setExpanded(false);
      setOpenGroup(null);
      setReachingTo(0);
    }
  }, [rows.length]);

  return (
    <div className="fixed bottom-[calc(6rem+var(--consent-inset))] lg:bottom-[calc(1.5rem+var(--consent-inset))] left-1/2 -translate-x-1/2 z-30 w-[352px] max-w-[calc(100vw-2rem)] flex flex-col items-stretch gap-2 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        data-testid="toast"
        className={`self-center flex items-center gap-2.5 px-4 py-2.5 bg-[var(--ink-900)] text-[var(--paper-0)] text-[13px] font-medium rounded-[2px] shadow-[var(--shadow-lg)] transition-all duration-[220ms] ${
          showingMessage
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <MessageIcon className="w-[15px] h-[15px] shrink-0" aria-hidden />
        {toast?.text}
      </div>

      {open && (
        <div
          data-testid="undo-tray"
          onMouseEnter={onHold}
          onMouseLeave={onRelease}
          onFocus={onHold}
          onBlur={onRelease}
          className="pointer-events-auto bg-[var(--ink-900)] text-[var(--paper-0)] rounded-[2px] overflow-hidden shadow-[var(--shadow-lg)]"
        >
          <div aria-hidden className="h-0.5 bg-[color-mix(in_srgb,var(--paper-0)_16%,transparent)]">
            <div
              key={windowKey}
              data-testid="undo-drain"
              className="plico-drain h-0.5 bg-[var(--paper-0)]"
              style={
                {
                  "--undo-window": `${windowMs}ms`,
                  animationPlayState: held ? "paused" : "running",
                } as React.CSSProperties
              }
            />
          </div>

          <div className="flex items-center gap-2 pl-3.5 pr-3 pt-2 pb-1">
            <span className="font-mono text-[10px] font-semibold tracking-[0.09em] uppercase text-[color-mix(in_srgb,var(--paper-0)_50%,transparent)]">
              Reversible — {rows.length}
            </span>
            <span className="flex-1" />
            <span className="font-mono text-[10px] tracking-[0.04em] text-[color-mix(in_srgb,var(--paper-0)_42%,transparent)]">
              {held ? "Held" : "\u2318Z"}
            </span>
          </div>

          {shown.map((row) => {
            /* `depth` is 1 for the newest group, which is the one the plain Undo
               takes; a row at depth n reverses n groups. */
            const isTop = row.depth === 1;
            /* Reaching for a deeper row tints everything it would reverse, so
               the number on the button and the rows it refers to are the same
               statement made twice. */
            const inReach = reachingTo > 0 && row.depth <= reachingTo;
            const reverses = row.depth;
            return (
              <div
                key={row.id}
                data-testid="undo-row"
                className={`flex flex-col transition-colors duration-[140ms] ${
                  inReach ? "bg-[color-mix(in_srgb,var(--paper-0)_10%,transparent)]" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 pl-3.5 pr-2 min-h-[34px]">
                  {isTop ? (
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  ) : (
                    <span
                      aria-hidden
                      className="w-3.5 text-center font-mono text-[10px] font-semibold text-[color-mix(in_srgb,var(--paper-0)_40%,transparent)]"
                    >
                      {String(reverses).padStart(2, "0")}
                    </span>
                  )}
                  <span
                    className={`text-[13px] leading-[1.3] ${
                      isTop
                        ? "text-[var(--paper-0)]"
                        : "text-[color-mix(in_srgb,var(--paper-0)_78%,transparent)]"
                    }`}
                  >
                    {row.text}
                  </span>
                  {row.count > 1 && (
                    <button
                      type="button"
                      onClick={() => setOpenGroup((id) => (id === row.id ? null : row.id))}
                      aria-expanded={openGroup === row.id}
                      aria-label={`${openGroup === row.id ? "Hide" : "Show"} what "${row.text}" covers`}
                      className="inline-flex items-center gap-1 px-1 py-px rounded-[2px] bg-transparent border border-[color-mix(in_srgb,var(--paper-0)_28%,transparent)] cursor-pointer font-mono text-[10px] font-semibold text-[color-mix(in_srgb,var(--paper-0)_72%,transparent)] transition-colors duration-[140ms] hover:bg-[color-mix(in_srgb,var(--paper-0)_12%,transparent)] hover:text-[var(--paper-0)]"
                    >
                      ×{row.count}
                      {openGroup === row.id ? (
                        <ChevronUp className="w-2.5 h-2.5" aria-hidden />
                      ) : (
                        <ChevronDown className="w-2.5 h-2.5" aria-hidden />
                      )}
                    </button>
                  )}
                  <span className="flex-1" />
                  {isTop ? (
                    <button
                      type="button"
                      onClick={() => onTakeThrough(1)}
                      data-testid="undo-take"
                      aria-label={`Undo: ${row.text}`}
                      className="bg-transparent border-none cursor-pointer px-2 py-1.5 -my-0.5 rounded-[2px] text-[13px] font-semibold text-[var(--paper-0)] underline underline-offset-2 decoration-[color-mix(in_srgb,var(--paper-0)_45%,transparent)] transition-colors duration-[140ms] hover:bg-[color-mix(in_srgb,var(--paper-0)_16%,transparent)]"
                    >
                      Undo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onTakeThrough(reverses)}
                      data-testid="undo-take-deep"
                      onMouseEnter={() => setReachingTo(reverses)}
                      onMouseLeave={() => setReachingTo(0)}
                      onFocus={() => setReachingTo(reverses)}
                      onBlur={() => setReachingTo(0)}
                      /* The glyph and number would otherwise announce as a bare
                         "3", which says nothing about what it costs. */
                      aria-label={`Undo through: ${row.text} — reverses ${reverses} actions`}
                      className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-[2px] bg-transparent border border-[color-mix(in_srgb,var(--paper-0)_20%,transparent)] cursor-pointer font-mono text-[10px] font-semibold text-[color-mix(in_srgb,var(--paper-0)_72%,transparent)] transition-colors duration-[140ms] hover:bg-[color-mix(in_srgb,var(--paper-0)_16%,transparent)] hover:text-[var(--paper-0)]"
                    >
                      <RotateCcw className="w-[11px] h-[11px]" aria-hidden />
                      {reverses}
                    </button>
                  )}
                </div>
                {openGroup === row.id && (
                  <div className="flex flex-col gap-0.5 pl-[38px] pr-3.5 pt-0.5 pb-2">
                    {row.items.map((item, i) => (
                      <span
                        key={`${row.id}-${i}`}
                        className="font-mono text-[11px] text-[color-mix(in_srgb,var(--paper-0)_55%,transparent)] whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="w-full text-left bg-transparent border-none border-t border-[color-mix(in_srgb,var(--paper-0)_10%,transparent)] cursor-pointer px-3.5 py-[7px] font-mono text-[10px] font-semibold tracking-[0.08em] uppercase text-[color-mix(in_srgb,var(--paper-0)_50%,transparent)] transition-colors duration-[140ms] hover:text-[var(--paper-0)]"
            >
              {expanded ? "Show fewer" : `+${hidden} earlier`}
            </button>
          )}
        </div>
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
