import type { EmailFormData, FormComponentProps } from "../../types";

export function EmailForm({ data, onChange }: FormComponentProps<EmailFormData>) {
  const update = (field: keyof EmailFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          value={data.to}
          onChange={(e) => update("to", e.target.value)}
          placeholder="hello@frontsail.ai"
          className="w-full px-3 py-2.5 bg-[var(--paper-card)] border border-[var(--border-hairline)] rounded-[2px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors duration-[140ms] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_1px_var(--border-focus)]"
        />
      </div>

      <div>
        <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
          Subject <span className="text-[var(--text-muted)] normal-case">(optional)</span>
        </label>
        <input
          type="text"
          value={data.subject}
          onChange={(e) => update("subject", e.target.value)}
          placeholder="Email subject"
          className="w-full px-3 py-2.5 bg-[var(--paper-card)] border border-[var(--border-hairline)] rounded-[2px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors duration-[140ms] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_1px_var(--border-focus)]"
        />
      </div>

      <div>
        <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
          Message <span className="text-[var(--text-muted)] normal-case">(optional)</span>
        </label>
        <textarea
          value={data.body}
          onChange={(e) => update("body", e.target.value)}
          placeholder="Email body"
          rows={3}
          className="w-full px-3 py-2.5 bg-[var(--paper-card)] border border-[var(--border-hairline)] rounded-[2px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors duration-[140ms] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_1px_var(--border-focus)] resize-none"
        />
      </div>
    </div>
  );
}
