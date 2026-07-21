import { Pipette } from "lucide-react";
import { useState } from "react";
import { BG_PRESET_COLORS } from "../../utils/constants";

interface SwatchRowProps {
  presets: string[];
  value: string;
  onChange: (value: string) => void;
  /* 5-column grid for full palettes; inline row for short slices */
  grid?: boolean;
}

export function SwatchRow({ presets, value, onChange, grid }: SwatchRowProps) {
  return (
    <div className={grid ? "grid grid-cols-5 gap-1.5 w-max" : "flex gap-1.5"}>
      {presets.map((color) => {
        const selected = value.toUpperCase() === color.toUpperCase();
        return (
          <button
            type="button"
            key={color}
            onClick={() => onChange(color)}
            aria-pressed={selected}
            className={`w-6 h-6 rounded-[2px] cursor-pointer p-0 transition-transform duration-[140ms] hover:scale-110 ${
              selected
                ? "border-2 border-[var(--ink-900)] outline outline-2 outline-[var(--paper-card)] -outline-offset-4"
                : "border border-[var(--border-hairline)]"
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        );
      })}
    </div>
  );
}

/* Read-only hex display with the "#" outside the field — the value is set
   via swatches or the pipette, never typed. */
export function HexField({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center h-7 border border-[var(--border-hairline)] rounded-[2px] bg-[var(--paper-card)] px-2 gap-1">
      <span className="font-mono text-xs text-[var(--text-muted)]">#</span>
      <input
        type="text"
        value={value.replace("#", "").toUpperCase()}
        readOnly
        className="w-14 border-none outline-none bg-transparent font-mono text-xs text-[var(--text-primary)] [font-feature-settings:'zero'_1]"
        aria-label="Hex color"
      />
    </span>
  );
}

interface PipetteButtonProps {
  onPick: (value: string) => void;
  label: string;
}

/* The custom-color eyedropper: a pipette glyph with an invisible native
   color input stretched over it. */
export function PipetteButton({ onPick, label }: PipetteButtonProps) {
  return (
    <span
      title={label}
      className="relative w-7 h-7 border border-[var(--border-hairline)] rounded-[2px] bg-[var(--paper-card)] flex items-center justify-center shrink-0"
    >
      <Pipette className="w-3.5 h-3.5 text-[var(--ink-600)]" aria-hidden />
      <input
        type="color"
        aria-label={label}
        onChange={(e) => onPick(e.target.value.toUpperCase())}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </span>
  );
}

type CustomSlots = [string | null, string | null, string | null];

/* Pipette + three most-recent custom colors. Slots live in component state
   only — they are a scratchpad, not part of the saved design. */
export function CustomColorRow({
  value,
  onChange,
  pickerLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  pickerLabel: string;
}) {
  const [slots, setSlots] = useState<CustomSlots>([null, null, null]);

  const handlePick = (color: string) => {
    setSlots((prev) => {
      const next = [...prev] as CustomSlots;
      const empty = next.indexOf(null);
      if (empty >= 0) {
        next[empty] = color;
      } else {
        next.pop();
        next.unshift(color);
      }
      return next;
    });
    onChange(color);
  };

  return (
    <div className="flex items-center gap-1.5">
      <PipetteButton onPick={handlePick} label={pickerLabel} />
      {slots.map((color, i) =>
        color ? (
          <button
            type="button"
            // biome-ignore lint/suspicious/noArrayIndexKey: slots are positional
            key={i}
            onClick={() => onChange(color)}
            aria-pressed={value.toUpperCase() === color.toUpperCase()}
            className={`w-6 h-6 rounded-[2px] cursor-pointer p-0 ${
              value.toUpperCase() === color.toUpperCase()
                ? "border-2 border-[var(--ink-900)] outline outline-2 outline-[var(--paper-card)] -outline-offset-4"
                : "border border-[var(--border-hairline)]"
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ) : (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: slots are positional
            key={i}
            title="Empty slot — pick a custom color to fill it"
            className="w-6 h-6 rounded-[2px] border border-dashed border-[var(--ink-300)]"
          />
        ),
      )}
      <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--text-muted)]">
        Custom
      </span>
    </div>
  );
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)]">
        {label}
      </span>
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <SwatchRow presets={BG_PRESET_COLORS} value={value} onChange={onChange} grid />
        <HexField value={value} />
      </div>
      <CustomColorRow
        value={value}
        onChange={onChange}
        pickerLabel="Pick a custom background color"
      />
    </div>
  );
}
