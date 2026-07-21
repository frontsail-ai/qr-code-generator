import { ArrowDownRight, ArrowUpRight, CircleDot, type LucideIcon } from "lucide-react";
import type { GradientType } from "../../types";
import { PRESET_COLORS } from "../../utils/constants";
import { HexField, SwatchRow } from "./ColorPicker";

const GRADIENT_OPTIONS: { value: GradientType; icon: LucideIcon; title: string }[] = [
  { value: "linear-bl-tr", icon: ArrowUpRight, title: "Gradient — bottom-left to top-right" },
  { value: "linear-tl-br", icon: ArrowDownRight, title: "Gradient — top-left to bottom-right" },
  { value: "radial", icon: CircleDot, title: "Gradient — radial" },
];

function previewBackground(gradientType: GradientType, color1: string, color2: string): string {
  switch (gradientType) {
    case "none":
      return color1;
    case "radial":
      return `radial-gradient(circle, ${color1} 0%, ${color2} 100%)`;
    case "linear-bl-tr":
      return `linear-gradient(45deg, ${color1} 0%, ${color2} 100%)`;
    case "linear-tl-br":
      return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  }
}

interface ColorRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorRow({ label, value, onChange }: ColorRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-muted)] w-[38px]">
        {label}
      </span>
      <SwatchRow presets={PRESET_COLORS.slice(0, 4)} value={value} onChange={onChange} />
      <span className="flex-1" />
      <HexField value={value} onChange={onChange} />
    </div>
  );
}

interface ForegroundColorPickerProps {
  color1: string;
  color2: string;
  gradientType: GradientType;
  onColor1Change: (value: string) => void;
  onColor2Change: (value: string) => void;
  onGradientTypeChange: (value: GradientType) => void;
}

export function ForegroundColorPicker({
  color1,
  color2,
  gradientType,
  onColor1Change,
  onColor2Change,
  onGradientTypeChange,
}: ForegroundColorPickerProps) {
  const isGradient = gradientType !== "none";

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)]">
        Foreground
      </span>

      <div className="flex items-center gap-2.5">
        <div className="flex border border-[var(--border-hairline)] rounded-[2px] overflow-hidden w-max">
          <button
            type="button"
            onClick={() => onGradientTypeChange("none")}
            aria-pressed={!isGradient}
            className={`px-3 py-1.5 text-xs cursor-pointer border-none transition-colors duration-[140ms] ${
              isGradient
                ? "bg-[var(--paper-card)] text-[var(--ink-600)] font-medium hover:bg-[var(--paper-50)]"
                : "bg-[var(--ink-900)] text-[var(--paper-0)] font-semibold"
            }`}
          >
            Solid
          </button>
          {GRADIENT_OPTIONS.map(({ value, icon: Icon, title }) => {
            const selected = gradientType === value;
            return (
              <button
                type="button"
                key={value}
                onClick={() => onGradientTypeChange(value)}
                aria-pressed={selected}
                title={title}
                aria-label={title}
                className={`px-2.5 py-1.5 cursor-pointer flex items-center border-none border-l border-l-[var(--border-hairline)] transition-colors duration-[140ms] ${
                  selected
                    ? "bg-[var(--ink-900)] text-[var(--paper-0)]"
                    : "bg-[var(--paper-card)] text-[var(--ink-600)] hover:bg-[var(--paper-50)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
              </button>
            );
          })}
        </div>
        <span
          title="Color preview"
          className="w-7 h-7 rounded-[2px] border border-[var(--border-hairline)] shrink-0"
          style={{ background: previewBackground(gradientType, color1, color2) }}
        />
      </div>

      {isGradient ? (
        <>
          <ColorRow label="Start" value={color1} onChange={onColor1Change} />
          <ColorRow label="End" value={color2} onChange={onColor2Change} />
        </>
      ) : (
        <div className="flex items-center gap-1.5">
          <SwatchRow presets={PRESET_COLORS.slice(0, 4)} value={color1} onChange={onColor1Change} />
          <span className="flex-1" />
          <HexField value={color1} onChange={onColor1Change} />
        </div>
      )}
    </div>
  );
}
