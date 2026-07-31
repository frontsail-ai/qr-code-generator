import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, test } from "vite-plus/test";
import { DEFAULT_CUSTOMIZATION, DEFAULT_FORM_DATA, TRANSPARENT } from "../src/constants";
import { decodeDesignFromUrl, encodeDesignToUrl } from "../src/shareUrl";
import type { Customization, FormDataMap } from "../src/types";

const BASE_URL = "https://qr-code-gen.frontsail.app/";

// Hand-built hashes for payloads the encoder would never produce.
function hashFor(payload: unknown): string {
  return `#s=${compressToEncodedURIComponent(JSON.stringify(payload))}`;
}

function roundTrip(
  qrType: Parameters<typeof encodeDesignToUrl>[0],
  formData: FormDataMap,
  customization: Customization,
) {
  const url = encodeDesignToUrl(qrType, formData, customization, BASE_URL);
  return decodeDesignFromUrl(url.slice(url.indexOf("#")));
}

describe("encodeDesignToUrl", () => {
  test("appends the payload to the caller-supplied base URL", () => {
    const url = encodeDesignToUrl("url", DEFAULT_FORM_DATA, DEFAULT_CUSTOMIZATION, BASE_URL);
    expect(url.startsWith(`${BASE_URL}#s=`)).toBe(true);
  });

  test("omits customization values that match the defaults", () => {
    const defaults = encodeDesignToUrl("url", DEFAULT_FORM_DATA, DEFAULT_CUSTOMIZATION, BASE_URL);
    const changed = encodeDesignToUrl(
      "url",
      DEFAULT_FORM_DATA,
      { ...DEFAULT_CUSTOMIZATION, dotType: "dots" },
      BASE_URL,
    );
    expect(changed.length).toBeGreaterThan(defaults.length);
  });

  test("never carries the logo", () => {
    const withLogo = { ...DEFAULT_CUSTOMIZATION, logo: "data:image/png;base64,AAAA" };
    const decoded = roundTrip("url", DEFAULT_FORM_DATA, withLogo);
    expect(decoded?.customization.logo).toBe(null);
  });
});

describe("decodeDesignFromUrl", () => {
  test("round-trips type, form data and customization", () => {
    const formData: FormDataMap = {
      ...DEFAULT_FORM_DATA,
      email: { to: "hi@example.com", subject: "Hello & goodbye", body: "line one" },
    };
    const customization: Customization = {
      ...DEFAULT_CUSTOMIZATION,
      foregroundColor: "#2C4A8A",
      gradientType: "radial",
      dotType: "classy-rounded",
      cornerSquareType: "extra-rounded",
      cornerDotType: "dot",
    };

    const decoded = roundTrip("email", formData, customization);

    expect(decoded?.qrType).toBe("email");
    expect(decoded?.formData.email).toEqual(formData.email);
    expect(decoded?.customization).toEqual({ ...customization, logo: null });
  });

  test("round-trips the transparent background sentinel", () => {
    const customization: Customization = {
      ...DEFAULT_CUSTOMIZATION,
      backgroundColor: TRANSPARENT,
    };

    const decoded = roundTrip("url", DEFAULT_FORM_DATA, customization);

    expect(decoded?.customization.backgroundColor).toBe(TRANSPARENT);
  });

  test("restores defaults for the fields that were stripped", () => {
    const decoded = roundTrip("url", DEFAULT_FORM_DATA, {
      ...DEFAULT_CUSTOMIZATION,
      dotType: "dots",
    });

    expect(decoded?.customization).toEqual({ ...DEFAULT_CUSTOMIZATION, dotType: "dots" });
  });

  test("fills untouched QR types with their default form data", () => {
    const formData: FormDataMap = {
      ...DEFAULT_FORM_DATA,
      url: { url: "example.com" },
    };

    const decoded = roundTrip("url", formData, DEFAULT_CUSTOMIZATION);

    expect(decoded?.formData.vcard).toEqual(DEFAULT_FORM_DATA.vcard);
  });

  test("returns null for a hash that carries no design", () => {
    expect(decodeDesignFromUrl("")).toBe(null);
    expect(decodeDesignFromUrl("#other=1")).toBe(null);
  });

  test("returns null for a corrupt payload", () => {
    expect(decodeDesignFromUrl("#s=not-actually-compressed")).toBe(null);
  });

  test("rejects an unknown QR type", () => {
    expect(decodeDesignFromUrl(hashFor({ v: 1, t: "telegram", f: { url: "" }, c: {} }))).toBe(null);
  });

  test("rejects a payload from a future codec version", () => {
    expect(decodeDesignFromUrl(hashFor({ v: 2, t: "url", f: { url: "" }, c: {} }))).toBe(null);
  });

  test("rejects a payload with no form data", () => {
    expect(decodeDesignFromUrl(hashFor({ v: 1, t: "url", c: {} }))).toBe(null);
  });
});
