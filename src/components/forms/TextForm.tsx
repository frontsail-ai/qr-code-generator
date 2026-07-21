import type { FormComponentProps, TextFormData } from "../../types";

export function TextForm({ data, onChange }: FormComponentProps<TextFormData>) {
  // Byte capacity of a version-40 QR code at error correction level "Q",
  // the qr-code-styling default; beyond this the QR cannot be generated
  const maxLength = 1663;
  const charCount = data.content?.length || 0;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)]">
          Text Content
        </label>
        <span
          className={`plico-measure text-xs ${charCount > maxLength ? "text-[var(--signal-error-500)]" : "text-[var(--text-muted)]"}`}
        >
          {charCount} / {maxLength}
        </span>
      </div>
      <textarea
        value={data.content}
        onChange={(e) => onChange({ ...data, content: e.target.value })}
        placeholder="Enter any text..."
        rows={5}
        className="w-full px-3 py-2.5 bg-[var(--paper-card)] border border-[var(--border-hairline)] rounded-[2px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors duration-[140ms] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_1px_var(--border-focus)] resize-none"
      />
      {charCount > maxLength && (
        <p className="text-xs text-[var(--signal-error-500)] mt-1">Too long to fit in a QR code</p>
      )}
    </div>
  );
}
