import type { CornerDotType, CornerSquareType } from "../../types";
import { CORNER_DOT_TYPES, CORNER_SQUARE_TYPES } from "../../utils/constants";

const SQUARE_GLYPH_RADIUS: Record<CornerSquareType, string> = {
  square: "0",
  dot: "50%",
  "extra-rounded": "4px",
};

const DOT_GLYPH_RADIUS: Record<CornerDotType, string> = {
  square: "0",
  dot: "50%",
};

interface CornerStyleSelectorProps {
  squareValue: CornerSquareType;
  dotValue: CornerDotType;
  onSquareChange: (value: CornerSquareType) => void;
  onDotChange: (value: CornerDotType) => void;
}

export function CornerStyleSelector({
  squareValue,
  dotValue,
  onSquareChange,
  onDotChange,
}: CornerStyleSelectorProps) {
  const buttonClass = (selected: boolean) =>
    `flex-1 flex items-center justify-center py-2 rounded-[2px] border cursor-pointer transition-colors duration-[140ms] ${
      selected
        ? "bg-[var(--ink-900)] text-[var(--paper-0)] border-[var(--ink-900)]"
        : "bg-[var(--paper-card)] text-[var(--ink-600)] border-[var(--border-hairline)] hover:border-[var(--ink-400)] hover:text-[var(--ink-900)]"
    }`;

  return (
    <div className="flex gap-2.5">
      <div className="flex-1 flex flex-col gap-2">
        <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)]">
          Corner square
        </span>
        <div className="flex gap-1.5">
          {CORNER_SQUARE_TYPES.map((type) => (
            <button
              type="button"
              key={type.value}
              onClick={() => onSquareChange(type.value)}
              aria-pressed={squareValue === type.value}
              title={type.label}
              aria-label={type.label}
              className={buttonClass(squareValue === type.value)}
            >
              <span
                className="w-3.5 h-3.5 border-[2.5px] border-current"
                style={{ borderRadius: SQUARE_GLYPH_RADIUS[type.value] }}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
      <div className="w-[104px] flex flex-col gap-2">
        <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)]">
          Corner dot
        </span>
        <div className="flex gap-1.5">
          {CORNER_DOT_TYPES.map((type) => (
            <button
              type="button"
              key={type.value}
              onClick={() => onDotChange(type.value)}
              aria-pressed={dotValue === type.value}
              title={type.label}
              aria-label={type.label}
              className={buttonClass(dotValue === type.value)}
            >
              <span
                className="w-2.5 h-2.5 bg-current"
                style={{ borderRadius: DOT_GLYPH_RADIUS[type.value] }}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
