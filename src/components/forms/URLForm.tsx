import type { FormComponentProps, URLFormData } from "../../types";

export function URLForm({ data, onChange }: FormComponentProps<URLFormData>) {
  return (
    <div>
      <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
        Website URL
      </label>
      <input
        type="url"
        value={data.url}
        onChange={(e) => onChange({ ...data, url: e.target.value })}
        placeholder="frontsail.ai"
        className="w-full px-3 py-2.5 bg-[var(--paper-card)] border border-[var(--border-hairline)] rounded-[2px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors duration-[140ms] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_1px_var(--border-focus)] font-mono"
      />
    </div>
  );
}
