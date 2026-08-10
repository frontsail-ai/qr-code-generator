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

/* Percent-encodes the characters that may not appear raw in a URI (RFC 3986
   §2): everything outside printable ASCII, the handful of printable ones
   STD 66 excludes, and a `%` that does not already introduce an escape —
   encoding that one unconditionally would turn a hand-typed `%20` into
   `%2520`. Reserved delimiters are deliberately left alone, so a URL keeps
   the structure the user typed; the callers that need a delimiter neutralised
   pass it in `extra`.

   The `u` flag is load-bearing: without it the negated class matches lone
   surrogates, and encoding half a code point produces mojibake. */
const uriUnsafe = (extra = "") =>
  new RegExp(`%(?![0-9A-Fa-f]{2})|[^\\x21-\\x7E]|["<>\\\\^\`{|}]${extra}`, "gu");

const encodeUriUnsafe = (value: string, extra?: string): string =>
  value.replace(uriUnsafe(extra), (ch) => encodeURIComponent(ch));

/* RFC 3966 §3: `visual-separator = "-" / "." / "(" / ")"`, and the space is
   pointedly not one of them — the spec says tel URIs "MUST NOT use spaces in
   visual separators". So stripping spaces while keeping `()-.` is not an
   inconsistency to tidy up (#44): it is exactly what the grammar asks for,
   and the separators carry the formatting the user typed. `*` and `#` ride
   along because the local-number grammar admits them (`*67`, `#31#`).

   Anything else — the letters of a vanity number, an "ext." suffix, or a `;`
   that would open a tel URI parameter — cannot be represented, and there is
   no safe way to drop it: deleting the letters from "ext. 89" leaves ".89",
   whose `.` is a visual separator, yielding a perfectly valid URI that dials
   a different number. Silently plausible output is this project's
   characteristic bug, so an unrepresentable number encodes nothing instead. */
const TEL_SUBSCRIBER = /^\+?[0-9.()*#-]+$/;

function normalizePhoneNumber(raw: string): string {
  // A pasted `tel:` link would otherwise be prefixed a second time
  const number = (raw || "").replace(/\s+/g, "").replace(/^tel:/i, "");
  if (!TEL_SUBSCRIBER.test(number)) return "";
  // `global-number-digits` requires at least one DIGIT; separators alone are not a number
  return /[0-9]/.test(number) ? number : "";
}

const formatters: FormatterMap = {
  url: (data: URLFormData) => {
    const url = (data.url || "").trim();
    if (!url) return "";
    const absolute = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    /* Encoded rather than run through `new URL()`, which #43 suggested: that
       class is a type error here (the package's tsconfig omits the DOM lib),
       and `href` also lowercases the host, drops default ports and appends a
       root path — rewriting parts of the URL the user did not ask us to
       touch. Encoding fixes the raw spaces without the collateral. */
    return encodeUriUnsafe(absolute);
  },

  email: (data: EmailFormData) => {
    /* Trimmed: a mailto addr-spec cannot carry surrounding whitespace, so
       `mailto: a@b.com ` is a link no client opens, and a subject of three
       spaces would ride along percent-encoded as `%20%20%20`. */
    const to = (data.to || "").trim();
    const subject = (data.subject || "").trim();
    const body = (data.body || "").trim();
    if (!to) return "";
    /* The recipient is a URI component too, not a value we can paste in raw.
       RFC 6068 §2 wants the gen-delims other than "@" and ":" percent-encoded
       here — without that, a recipient of `a@b.com?bcc=x@y.com` closes the
       addr-spec and appends a header, so a scanned code silently blind-copies
       a third party. `&` goes with them: it only delimits once a `?` has
       opened the header list, but lenient clients have been known to split on
       it anyway, and it round-trips for the addresses where it is legitimate
       atext. "@" and ":" stay literal — the address needs them. */
    const recipient = encodeUriUnsafe(to, "|[/?#\\[\\]&]");
    /* Built by hand rather than with `URLSearchParams`: that class emits
       form-encoding (spaces as `+`), which mail clients render literally in
       mailto links. RFC 6068 wants percent-encoding (`%20`). */
    const parts: string[] = [];
    if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
    if (body) parts.push(`body=${encodeURIComponent(body)}`);
    return `mailto:${recipient}${parts.length > 0 ? `?${parts.join("&")}` : ""}`;
  },

  phone: (data: PhoneFormData) => {
    const number = normalizePhoneNumber(data.number);
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

    /* EMAIL and URL are URI values, not TEXT — backslash escapes would
       corrupt them. Control characters (the injection vector) have no
       business in either, so they are dropped instead. TEL goes through
       `normalizePhoneNumber`, which admits no control character to begin
       with. */
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
    /* Same normalization as the `phone` type: one notion of what a phone
       number is, not two that drift. The failure handling differs because the
       scope does — a card is more than its TEL, so an unrepresentable number
       drops its line rather than blanking the whole vCard. */
    const tel = normalizePhoneNumber(phone);
    if (tel) lines.push(`TEL:${tel}`);
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
export function hasAnyContent(data: FormDataMap[QRType]): boolean {
  return Object.values(data).some((value: string) => (value ?? "").trim() !== "");
}

export function formatQRData<K extends QRType>(type: K, data: FormDataMap[K]): string {
  const formatter = formatters[type];
  if (!formatter || !hasAnyContent(data)) return "";
  return formatter(data);
}
