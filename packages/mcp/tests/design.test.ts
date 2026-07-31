import { fileURLToPath } from "node:url";
import { DEFAULT_CUSTOMIZATION, TRANSPARENT } from "@frontsail/qr-core";
import { describe, expect, test } from "vite-plus/test";
import {
  customizationSchema,
  InputError,
  QR_TYPE_VALUES,
  toCustomization,
  toFormData,
} from "../src/design.ts";
import { resolveLogo } from "../src/logo.ts";

const LOGO_PATH = fileURLToPath(new URL("./fixtures/logo.png", import.meta.url));

describe("content mapping", () => {
  test("exposes exactly the QR types core offers", () => {
    expect([...QR_TYPE_VALUES].sort()).toEqual(["email", "phone", "text", "url", "vcard"]);
  });

  test("fills the requested type and defaults the rest", () => {
    const formData = toFormData({ content_type: "url", url: { url: "example.com" } });
    expect(formData.url).toEqual({ url: "example.com" });
    expect(formData.vcard.firstName).toBe("");
  });

  test("merges partial input over the type's defaults", () => {
    const formData = toFormData({ content_type: "email", email: { to: "a@b.co" } });
    expect(formData.email).toEqual({ to: "a@b.co", subject: "", body: "" });
  });

  test("rejects a content_type with no matching object", () => {
    expect(() => toFormData({ content_type: "url" })).toThrow(InputError);
    expect(() => toFormData({ content_type: "url" })).toThrow(/no "url" object/);
  });

  test("rejects a vcard where every field is blank", () => {
    expect(() => toFormData({ content_type: "vcard", vcard: { firstName: "  " } })).toThrow(
      /every field is empty/,
    );
  });
});

describe("customization mapping", () => {
  test("defaults to the web app's design", () => {
    expect(toCustomization(undefined)).toEqual({ ...DEFAULT_CUSTOMIZATION, logo: null });
  });

  test("maps snake_case input onto core's camelCase shape", () => {
    const result = toCustomization({
      foreground_color: "#123456",
      gradient_type: "radial",
      background_color: TRANSPARENT,
      dot_type: "dots",
      corner_square_type: "dot",
      corner_dot_type: "dot",
    });
    expect(result).toMatchObject({
      foregroundColor: "#123456",
      gradientType: "radial",
      backgroundColor: TRANSPARENT,
      dotType: "dots",
      cornerSquareType: "dot",
      cornerDotType: "dot",
    });
  });

  test("carries the resolved logo through", () => {
    expect(toCustomization({}, "data:image/png;base64,AAAA").logo).toBe(
      "data:image/png;base64,AAAA",
    );
  });
});

describe("customization schema", () => {
  test("accepts hex colors in 3, 6 and 8 digit forms", () => {
    for (const foreground_color of ["#FFF", "#1B1812", "#1B1812FF"]) {
      expect(customizationSchema.safeParse({ foreground_color }).success).toBe(true);
    }
  });

  test("rejects a non-hex foreground color", () => {
    const result = customizationSchema.safeParse({ foreground_color: "rebeccapurple" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/hex color/);
  });

  test("accepts the transparent sentinel for the background only", () => {
    expect(customizationSchema.safeParse({ background_color: TRANSPARENT }).success).toBe(true);
    expect(customizationSchema.safeParse({ foreground_color: TRANSPARENT }).success).toBe(false);
  });

  test("rejects an unknown dot type", () => {
    expect(customizationSchema.safeParse({ dot_type: "hexagon" }).success).toBe(false);
  });
});

describe("logo resolution", () => {
  test("returns null when no logo is given", async () => {
    expect(await resolveLogo(undefined)).toBe(null);
  });

  test("passes a data URI straight through", async () => {
    const uri = "data:image/png;base64,AAAA";
    expect(await resolveLogo(uri)).toBe(uri);
  });

  test("rejects a data URI that is not a base64 image", async () => {
    await expect(resolveLogo("data:text/plain,hello")).rejects.toThrow(/base64-encoded image/);
  });

  test("reads an absolute path into a data URI", async () => {
    const resolved = await resolveLogo(LOGO_PATH);
    expect(resolved?.startsWith("data:image/png;base64,")).toBe(true);
  });

  test("rejects a relative path with an explanation", async () => {
    await expect(resolveLogo("./logo.png")).rejects.toThrow(/absolute file path/);
  });

  test("rejects an unsupported file type", async () => {
    await expect(resolveLogo("/tmp/logo.bmp")).rejects.toThrow(/Unsupported logo file type/);
  });

  test("reports a missing file clearly", async () => {
    await expect(resolveLogo("/tmp/definitely-not-here-9d3f.png")).rejects.toThrow(/No file found/);
  });
});
