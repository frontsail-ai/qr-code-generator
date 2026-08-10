import {
  CORNER_DOT_TYPES,
  CORNER_SQUARE_TYPES,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_FORM_DATA,
  DOT_TYPES,
  GRADIENT_TYPES,
} from "./constants";
import type { Customization, FormDataMap, QRType } from "./types";

export interface DesignState {
  qrType: QRType;
  formData: FormDataMap;
  customization: Customization;
}

const VALID_QR_TYPES: QRType[] = ["url", "email", "phone", "text", "vcard"];

/* Which customization fields are closed sets. A value outside its set reaches
   qr-code-styling as an unknown shape name and draws nothing recognisable, so
   it is rejected here rather than rendered. The sets are read off the same
   constants the UI builds its buttons from — there is no second list to drift. */
const ENUMS = {
  gradientType: GRADIENT_TYPES.map((o) => o.value),
  dotType: DOT_TYPES.map((o) => o.value),
  cornerSquareType: CORNER_SQUARE_TYPES.map((o) => o.value),
  cornerDotType: CORNER_DOT_TYPES.map((o) => o.value),
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/* Only the fields the current schema knows about are copied, and only when
   they are still strings. A stored design outlives the code that wrote it:
   fields get added, renamed and retyped, so anything unrecognised is dropped
   and anything missing falls back to its default rather than arriving as
   `undefined` and crashing a `.trim()` three layers down. */
function normalizeFields<T extends object>(defaults: T, raw: unknown): T {
  const stored = isRecord(raw) ? raw : {};
  const result: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };

  for (const key of Object.keys(defaults)) {
    const value = stored[key];
    if (typeof value === "string") result[key] = value;
  }

  return result as T;
}

/* Spelled out per type rather than looped over `QR_TYPES`: the return type then
   makes adding a sixth QR type a compile error here, instead of a form whose
   fields quietly fail to survive a reload. */
function normalizeFormData(raw: unknown): FormDataMap {
  const source = isRecord(raw) ? raw : {};

  return {
    url: normalizeFields(DEFAULT_FORM_DATA.url, source.url),
    email: normalizeFields(DEFAULT_FORM_DATA.email, source.email),
    phone: normalizeFields(DEFAULT_FORM_DATA.phone, source.phone),
    text: normalizeFields(DEFAULT_FORM_DATA.text, source.text),
    vcard: normalizeFields(DEFAULT_FORM_DATA.vcard, source.vcard),
  };
}

/* A logo is only ever an inline image the user handed us. A stored value that
   points somewhere else — an `http(s)` URL, a `javascript:` payload — would be
   fetched or run by the renderer on behalf of a design the user never made,
   so nothing but a data-image URL survives the trip out of storage. */
function normalizeLogo(raw: unknown): string | null {
  return typeof raw === "string" && raw.startsWith("data:image/") ? raw : null;
}

function normalizeCustomization(raw: unknown): Customization {
  const source = isRecord(raw) ? raw : {};
  const result = { ...DEFAULT_CUSTOMIZATION };

  for (const key of Object.keys(DEFAULT_CUSTOMIZATION) as (keyof Customization)[]) {
    if (key === "logo") continue;
    const value = source[key];
    if (typeof value !== "string") continue;
    const allowed: readonly string[] | undefined = ENUMS[key as keyof typeof ENUMS];
    if (allowed && !allowed.includes(value)) continue;
    (result as Record<string, unknown>)[key] = value;
  }

  result.logo = normalizeLogo(source.logo);
  return result;
}

/**
 * Turns whatever came back from storage or a link into a design the app can
 * render, or `null` when it is not a design at all.
 *
 * Every route into the app that carries a design from outside React state —
 * the share-link codec, the persisted draft, saved history — arrives through
 * here, so "what counts as a valid design" is decided once. The alternative is
 * one notion of valid per entry point, which is how a blank vCard came to
 * encode a hollow card (#36) and how two logo paths came to disagree (#37).
 *
 * Partial input is expected, not exceptional: a share link carries one form's
 * fields and the customization the user actually changed. Only `qrType` has to
 * be there and be real; everything else falls back to its default.
 */
export function normalizeDesign(raw: unknown): DesignState | null {
  if (!isRecord(raw)) return null;
  if (!VALID_QR_TYPES.includes(raw.qrType as QRType)) return null;

  return {
    qrType: raw.qrType as QRType,
    formData: normalizeFormData(raw.formData),
    customization: normalizeCustomization(raw.customization),
  };
}
