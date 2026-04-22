import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import type { Customization, FormDataMap, QRType } from "../types";
import { DEFAULT_CUSTOMIZATION, DEFAULT_FORM_DATA } from "./constants";

const VALID_QR_TYPES: QRType[] = ["url", "email", "phone", "text", "vcard"];

interface SharePayload {
  v: 1;
  t: QRType;
  f: FormDataMap[QRType];
  c: Partial<Omit<Customization, "logo">>;
}

function stripDefaults(
  customization: Customization,
): Partial<Omit<Customization, "logo">> {
  const partial: Record<string, unknown> = {};
  for (const key of Object.keys(
    DEFAULT_CUSTOMIZATION,
  ) as (keyof Customization)[]) {
    if (key === "logo") continue;
    if (customization[key] !== DEFAULT_CUSTOMIZATION[key]) {
      partial[key] = customization[key];
    }
  }
  return partial;
}

function applyDefaults(
  partial: Partial<Omit<Customization, "logo">>,
): Customization {
  return { ...DEFAULT_CUSTOMIZATION, ...partial, logo: null };
}

export function encodeDesignToUrl(
  qrType: QRType,
  formData: FormDataMap,
  customization: Customization,
): string {
  const payload: SharePayload = {
    v: 1,
    t: qrType,
    f: formData[qrType],
    c: stripDefaults(customization),
  };
  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
  return `${window.location.origin}${window.location.pathname}#s=${compressed}`;
}

interface DecodedDesign {
  qrType: QRType;
  formData: FormDataMap;
  customization: Customization;
}

export function decodeDesignFromUrl(): DecodedDesign | null {
  const hash = window.location.hash;
  if (!hash.startsWith("#s=")) return null;

  try {
    const json = decompressFromEncodedURIComponent(hash.slice(3));
    if (!json) return null;

    const payload = JSON.parse(json) as SharePayload;
    if (payload.v !== 1) return null;
    if (!VALID_QR_TYPES.includes(payload.t)) return null;
    if (!payload.f || typeof payload.f !== "object") return null;

    const formData: FormDataMap = {
      ...DEFAULT_FORM_DATA,
      [payload.t]: { ...DEFAULT_FORM_DATA[payload.t], ...payload.f },
    };

    return {
      qrType: payload.t,
      formData,
      customization: applyDefaults(payload.c ?? {}),
    };
  } catch {
    return null;
  }
}
