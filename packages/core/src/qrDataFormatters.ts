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
    /* Trimmed: a mailto addr-spec cannot carry surrounding whitespace, so
       `mailto: a@b.com ` is a link no client opens, and a subject of three
       spaces would ride along percent-encoded as `%20%20%20`. */
    const to = (data.to || "").trim();
    const subject = (data.subject || "").trim();
    const body = (data.body || "").trim();
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

  /* The only formatter that does not normalize whitespace: here the field
     *is* the payload, so padding the user typed is content, not syntax. An
     all-blank form never reaches this point — see `hasAnyContent`. */
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

    /* Trimmed before anything decides whether a field is present: whitespace
       carries no meaning in a vCard value, and an all-blank field would
       otherwise emit a line like `ORG:   ` that every consumer downstream
       reads as real content. */
    const trimmed = (value: string): string => (value || "").trim();
    const firstName = trimmed(data.firstName);
    const lastName = trimmed(data.lastName);
    const org = trimmed(data.org);
    const title = trimmed(data.title);
    const phone = trimmed(data.phone);
    const email = trimmed(data.email);
    const website = trimmed(data.website);

    const lines = ["BEGIN:VCARD", "VERSION:3.0"];

    if (firstName || lastName) {
      lines.push(`N:${escapeText(lastName)};${escapeText(firstName)}`);
      lines.push(`FN:${escapeText([firstName, lastName].filter(Boolean).join(" "))}`);
    }

    if (org) lines.push(`ORG:${escapeText(org)}`);
    if (title) lines.push(`TITLE:${escapeText(title)}`);
    if (phone) lines.push(`TEL:${stripControl(phone)}`);
    if (email) lines.push(`EMAIL:${stripControl(email)}`);
    if (website) {
      const uri = stripControl(website);
      lines.push(`URL:${uri.match(/^https?:\/\//i) ? uri : `https://${uri}`}`);
    }

    lines.push("END:VCARD");
    // Content lines are CRLF-delimited (RFC 2426 §4)
    return lines.join("\r\n");
  },
};

/* "There is nothing to encode" is a property of the form, not of any one
   formatter's output — and every consumer already reads the empty string as
   exactly that: the web app's empty state and export lock, the render hook's
   early return, and the MCP server's "nothing to encode" error. Deciding it
   once here is what stops the five formatters from each re-inventing the
   test and disagreeing, which is how an empty vCard came to encode a hollow
   BEGIN/END card while every other type correctly encoded nothing (#36).

   `?? ""` guards saved configs restored from localStorage that predate a
   field, which arrive with it missing rather than blank. */
function hasAnyContent(data: FormDataMap[QRType]): boolean {
  return Object.values(data).some((value: string) => (value ?? "").trim() !== "");
}

export function formatQRData<K extends QRType>(type: K, data: FormDataMap[K]): string {
  const formatter = formatters[type];
  if (!formatter || !hasAnyContent(data)) return "";
  return formatter(data);
}
