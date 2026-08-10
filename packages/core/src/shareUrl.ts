import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Customization, FormDataMap, QRType } from "./types";
import { DEFAULT_CUSTOMIZATION } from "./constants";
import { type DesignState, normalizeDesign } from "./design";

interface SharePayload {
  v: 1;
  t: QRType;
  f: FormDataMap[QRType];
  c: Partial<Omit<Customization, "logo">>;
}

function stripDefaults(customization: Customization): Partial<Omit<Customization, "logo">> {
  const partial: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_CUSTOMIZATION) as (keyof Customization)[]) {
    if (key === "logo") continue;
    if (customization[key] !== DEFAULT_CUSTOMIZATION[key]) {
      partial[key] = customization[key];
    }
  }
  return partial;
}

/* `baseUrl` is the origin plus path the link should point at — browser callers
   pass `window.location.origin + window.location.pathname`. Injected rather
   than read here so this package stays free of the DOM. */
export function encodeDesignToUrl(
  qrType: QRType,
  formData: FormDataMap,
  customization: Customization,
  baseUrl: string,
): string {
  const payload: SharePayload = {
    v: 1,
    t: qrType,
    f: formData[qrType],
    c: stripDefaults(customization),
  };
  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
  return `${baseUrl}#s=${compressed}`;
}

/* `hash` is the URL fragment including the leading "#" — browser callers pass
   `window.location.hash`. */
export function decodeDesignFromUrl(hash: string): DesignState | null {
  if (!hash.startsWith("#s=")) return null;

  try {
    const json = decompressFromEncodedURIComponent(hash.slice(3));
    if (!json) return null;

    const payload = JSON.parse(json) as SharePayload;
    /* Structural rules of the payload itself — a link is a fixed shape, so a
       missing form or a version this build cannot read is a broken link, not a
       design to be patched up with defaults. What the fields are allowed to
       contain is `normalizeDesign`'s business, not this codec's. */
    if (payload.v !== 1) return null;
    if (!payload.f || typeof payload.f !== "object") return null;

    return normalizeDesign({
      qrType: payload.t,
      // The link only carries the selected type's fields; the rest default
      formData: { [payload.t]: payload.f },
      // Logos never travel in links — the codec strips them on the way out too
      customization: { ...payload.c, logo: null },
    });
  } catch {
    return null;
  }
}
