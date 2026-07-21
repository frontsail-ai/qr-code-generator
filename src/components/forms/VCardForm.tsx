import type { FormComponentProps, VCardFormData } from "../../types";

export function VCardForm({ data, onChange }: FormComponentProps<VCardFormData>) {
  const update = (field: keyof VCardFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-[var(--paper-card)] border border-[var(--border-hairline)] rounded-[2px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors duration-[140ms] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_1px_var(--border-focus)]";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
            First Name
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            placeholder="John"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
            Last Name
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            placeholder="Doe"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
          Phone
        </label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="+1 234 567 8900"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="john@frontsail.ai"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
            Organization
          </label>
          <input
            type="text"
            value={data.org}
            onChange={(e) => update("org", e.target.value)}
            placeholder="Company Inc."
            className={inputClass}
          />
        </div>
        <div>
          <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Manager"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
          Website
        </label>
        <input
          type="url"
          value={data.website}
          onChange={(e) => update("website", e.target.value)}
          placeholder="frontsail.ai"
          className={inputClass}
        />
      </div>
    </div>
  );
}
