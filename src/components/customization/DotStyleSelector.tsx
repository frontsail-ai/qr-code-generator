import type { DotType } from "../../types";
import { DOT_TYPES } from "../../utils/constants";

/* Per-style border-radius for the three-dot preview glyph. */
const DOT_PREVIEW_RADIUS: Record<DotType, string> = {
  square: "0",
  rounded: "2px",
  dots: "50%",
  classy: "0 50% 0 50%",
  "classy-rounded": "1px 50% 1px 50%",
  "extra-rounded": "3px",
};

interface DotStyleSelectorProps {
  value: DotType;
  onChange: (value: DotType) => void;
}

export function DotStyleSelector({ value, onChange }: DotStyleSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)]">
        Dot style
      </span>
      <div className="grid grid-cols-3 gap-1.5">
        {DOT_TYPES.map((type) => {
          const selected = value === type.value;
          return (
            <button
              type="button"
              key={type.value}
              onClick={() => onChange(type.value)}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-1.5 px-1 py-[9px] rounded-[2px] border cursor-pointer whitespace-nowrap transition-colors duration-[140ms] ${
                selected
                  ? "bg-[var(--ink-900)] text-[var(--paper-0)] border-[var(--ink-900)]"
                  : "bg-[var(--paper-card)] text-[var(--ink-600)] border-[var(--border-hairline)] hover:border-[var(--ink-400)] hover:text-[var(--ink-900)]"
              }`}
            >
              <span className="flex gap-0.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-current"
                    style={{ borderRadius: DOT_PREVIEW_RADIUS[type.value] }}
                  />
                ))}
              </span>
              <span className={`text-[11px] ${selected ? "font-semibold" : "font-medium"}`}>
                {type.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
