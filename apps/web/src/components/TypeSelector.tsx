import { Contact, Link2, type LucideIcon, Mail, Phone, Type } from "lucide-react";
import type { QRType } from "@frontsail/qr-core";
import { QR_TYPES } from "@frontsail/qr-core";

const ICONS: Record<QRType, LucideIcon> = {
  url: Link2,
  email: Mail,
  phone: Phone,
  text: Type,
  vcard: Contact,
};

interface TypeSelectorProps {
  value: QRType;
  onChange: (value: QRType) => void;
}

/* One icon grid at every width.
 *
 * Mobile used to lay these out as chips in a horizontally scrolling row, which
 * put vCard 29px past the right edge of a 390px viewport with nothing to say it
 * was there: no fade, no partial chip, no scrollbar on a touch device. A type
 * you can only find by guessing that a row scrolls is a type most people never
 * find. Stacking the label under the icon fits all five in the same space. */
export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {QR_TYPES.map((type) => {
        const Icon = ICONS[type.value];
        const selected = value === type.value;
        return (
          <button
            type="button"
            key={type.value}
            onClick={() => onChange(type.value)}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-[5px] px-0.5 py-[9px] rounded-[2px] border cursor-pointer whitespace-nowrap transition-colors duration-[140ms] ${
              selected
                ? "bg-[var(--ink-900)] text-[var(--paper-0)] border-[var(--ink-900)]"
                : "bg-[var(--paper-card)] text-[var(--ink-600)] border-[var(--border-hairline)] hover:border-[var(--ink-400)] hover:text-[var(--ink-900)]"
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden />
            <span className={`text-[11px] ${selected ? "font-semibold" : "font-medium"}`}>
              {type.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
