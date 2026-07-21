import { useEffect, useState } from "react";
import { PRESET_COLORS } from "../../utils/constants";

interface SwatchRowProps {
  presets: string[];
  value: string;
  onChange: (value: string) => void;
}

export function SwatchRow({ presets, value, onChange }: SwatchRowProps) {
  return (
    <div className="flex gap-1.5">
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

interface HexFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/* Mono hex input with the "#" outside the field. Edits are kept locally
   while typing and committed once they form a valid 3- or 6-digit hex,
   so mid-edit keystrokes are never silently dropped. */
export function HexField({ value, onChange }: HexFieldProps) {
  const [draft, setDraft] = useState(value.replace("#", ""));

  useEffect(() => {
    setDraft(value.replace("#", ""));
  }, [value]);

  const handleChange = (raw: string) => {
    const hex = raw.replace("#", "").slice(0, 6);
    if (!/^[0-9A-Fa-f]*$/.test(hex)) return;
    setDraft(hex);
    if (hex.length === 6 || hex.length === 3) {
      onChange(`#${hex.toUpperCase()}`);
    }
  };

  return (
    <span className="inline-flex items-center h-7 border border-[var(--border-hairline)] rounded-[2px] bg-[var(--paper-card)] px-2 gap-1 transition-colors duration-[140ms] focus-within:border-[var(--border-focus)]">
      <span className="font-mono text-xs text-[var(--text-muted)]">#</span>
      <input
        type="text"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setDraft(value.replace("#", ""))}
        className="w-14 border-none outline-none bg-transparent font-mono text-xs text-[var(--text-primary)] [font-feature-settings:'zero'_1]"
        placeholder="000000"
        aria-label="Hex color"
      />
    </span>
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
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <SwatchRow presets={PRESET_COLORS} value={value} onChange={onChange} />
        <HexField value={value} onChange={onChange} />
      </div>
    </div>
  );
}
