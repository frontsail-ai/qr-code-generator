import { Contact, Link2, type LucideIcon, Mail, Phone, Type } from "lucide-react";
import type { QRType } from "../types";
import { QR_TYPES } from "../utils/constants";

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

/* Icon grid in the desktop inspector; horizontally scrollable chips on mobile. */
export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto lg:grid lg:grid-cols-5 lg:overflow-visible">
      {QR_TYPES.map((type) => {
        const Icon = ICONS[type.value];
        const selected = value === type.value;
        return (
          <button
            type="button"
            key={type.value}
            onClick={() => onChange(type.value)}
            aria-pressed={selected}
            className={`flex items-center lg:flex-col gap-1.5 lg:gap-[5px] px-3 lg:px-0.5 py-2 lg:py-[9px] rounded-[2px] border cursor-pointer whitespace-nowrap transition-colors duration-[140ms] shrink-0 lg:shrink ${
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
