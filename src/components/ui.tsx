import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/* Plico primitives — see src/styles/plico.css for the token set. */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  icon?: LucideIcon;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  icon: Icon,
  fullWidth,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 h-[38px] px-4 rounded-[2px] text-[13px] font-semibold cursor-pointer transition-colors duration-[140ms] disabled:cursor-not-allowed";
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
      {Icon && <Icon className="w-4 h-4" aria-hidden />}
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
