import type {
  EmailFormData,
  FormDataMap,
  PhoneFormData,
  QRType,
  TextFormData,
  URLFormData,
  VCardFormData,
} from "./types";

type FormatterMap = {
  [K in QRType]: (data: FormDataMap[K]) => string;
};

const formatters: FormatterMap = {
  url: (data: URLFormData) => {
    const url = (data.url || "").trim();
    if (!url) return "";
    if (!url.match(/^https?:\/\//i)) {
      return `https://${url}`;
    }
    return url;
  },

  email: (data: EmailFormData) => {
    const { to, subject, body } = data;
    if (!to) return "";
    /* Built by hand rather than with `URLSearchParams`: that class emits
       form-encoding (spaces as `+`), which mail clients render literally in
       mailto links. RFC 6068 wants percent-encoding (`%20`). */
    const parts: string[] = [];
    if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
    if (body) parts.push(`body=${encodeURIComponent(body)}`);
    return `mailto:${to}${parts.length > 0 ? `?${parts.join("&")}` : ""}`;
  },

  phone: (data: PhoneFormData) => {
    const number = (data.number || "").replace(/\s+/g, "");
    return number ? `tel:${number}` : "";
  },

  text: (data: TextFormData) => data.content || "",

  vcard: (data: VCardFormData) => {
    /* RFC 2426 (vCard 3.0) escaping. Text values MUST backslash-escape
       backslash, semicolon and comma, and encode line breaks as a literal
       "\n" (§2.3, §2.5, §5) — an unescaped ";" in a name shifts the N
       components, and a raw newline would smuggle a whole extra property
       line into the card. Backslash goes first so it never re-escapes the
       escapes it just produced. */
    const escapeText = (value: string): string =>
      value
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");

    /* TEL, EMAIL and URL are phone-number/URI values, not TEXT — backslash
       escapes would corrupt them. Control characters (the injection vector)
       have no business in any of them, so they are dropped instead. */
    // oxlint-disable-next-line no-control-regex -- matching control chars is the point
    const stripControl = (value: string): string => value.replace(/[\u0000-\u001F\u007F]/g, "");

    const lines = ["BEGIN:VCARD", "VERSION:3.0"];

    if (data.firstName || data.lastName) {
      lines.push(`N:${escapeText(data.lastName || "")};${escapeText(data.firstName || "")}`);
      lines.push(`FN:${escapeText([data.firstName, data.lastName].filter(Boolean).join(" "))}`);
    }

    if (data.org) lines.push(`ORG:${escapeText(data.org)}`);
    if (data.title) lines.push(`TITLE:${escapeText(data.title)}`);
    if (data.phone) lines.push(`TEL:${stripControl(data.phone)}`);
    if (data.email) lines.push(`EMAIL:${stripControl(data.email)}`);
    if (data.website) {
      const website = stripControl(data.website);
      const url = website.match(/^https?:\/\//i) ? website : `https://${website}`;
      lines.push(`URL:${url}`);
    }

    lines.push("END:VCARD");
    // Content lines are CRLF-delimited (RFC 2426 §4)
    return lines.join("\r\n");
  },
};

export function formatQRData<K extends QRType>(type: K, data: FormDataMap[K]): string {
  const formatter = formatters[type];
  return formatter ? formatter(data) : "";
}
