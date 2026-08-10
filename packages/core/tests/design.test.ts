import { describe, expect, test } from "vite-plus/test";
import { DEFAULT_CUSTOMIZATION, DEFAULT_FORM_DATA } from "../src/constants";
import { normalizeDesign } from "../src/design";

const PNG = "data:image/png;base64,AAAA";

describe("normalizeDesign", () => {
  test("keeps a complete, valid design intact", () => {
    const design = normalizeDesign({
      qrType: "email",
      formData: {
        ...DEFAULT_FORM_DATA,
        email: { to: "hi@example.com", subject: "Hello", body: "line one" },
      },
      customization: { ...DEFAULT_CUSTOMIZATION, dotType: "dots", logo: PNG },
    });

    expect(design?.qrType).toBe("email");
    expect(design?.formData.email).toEqual({
      to: "hi@example.com",
      subject: "Hello",
      body: "line one",
    });
    expect(design?.customization.dotType).toBe("dots");
    expect(design?.customization.logo).toBe(PNG);
  });

  test("fills the types and fields the input left out", () => {
    const design = normalizeDesign({ qrType: "url", formData: { url: { url: "example.com" } } });

    expect(design?.formData.url.url).toBe("example.com");
    expect(design?.formData.vcard).toEqual(DEFAULT_FORM_DATA.vcard);
    expect(design?.customization).toEqual(DEFAULT_CUSTOMIZATION);
  });

  describe("rejects what is not a design", () => {
    test.each([
      ["null", null],
      ["a string", "url"],
      ["an array", []],
      ["no type", { formData: {} }],
      ["an unknown type", { qrType: "telegram" }],
      ["a type that is not a string", { qrType: 3 }],
    ])("%s", (_label, raw) => {
      expect(normalizeDesign(raw)).toBe(null);
    });
  });

  describe("survives storage written by another version of the app", () => {
    test("drops fields the schema no longer has", () => {
      const design = normalizeDesign({
        qrType: "url",
        formData: { url: { url: "example.com", utmSource: "legacy" } },
      });

      expect(design?.formData.url).toEqual({ url: "example.com" });
    });

    test("defaults a field that predates the value that should be in it", () => {
      const design = normalizeDesign({
        qrType: "vcard",
        formData: { vcard: { firstName: "Ada" } },
      });

      expect(design?.formData.vcard.website).toBe("");
    });

    test("defaults form fields that are not strings", () => {
      const design = normalizeDesign({
        qrType: "text",
        formData: { text: { content: { nested: true } } },
      });

      expect(design?.formData.text.content).toBe("");
    });

    test("defaults form data that is not an object", () => {
      const design = normalizeDesign({ qrType: "url", formData: "example.com" });

      expect(design?.formData).toEqual(DEFAULT_FORM_DATA);
    });
  });

  describe("customization", () => {
    test("rejects a style value outside its set", () => {
      const design = normalizeDesign({
        qrType: "url",
        customization: { dotType: "hexagons", cornerDotType: "triangle", gradientType: "conic" },
      });

      expect(design?.customization.dotType).toBe(DEFAULT_CUSTOMIZATION.dotType);
      expect(design?.customization.cornerDotType).toBe(DEFAULT_CUSTOMIZATION.cornerDotType);
      expect(design?.customization.gradientType).toBe(DEFAULT_CUSTOMIZATION.gradientType);
    });

    test("keeps colors, which are free-form strings", () => {
      const design = normalizeDesign({
        qrType: "url",
        customization: { foregroundColor: "#123456", backgroundColor: "transparent" },
      });

      expect(design?.customization.foregroundColor).toBe("#123456");
      expect(design?.customization.backgroundColor).toBe("transparent");
    });

    test("ignores keys the schema does not know", () => {
      const design = normalizeDesign({
        qrType: "url",
        customization: { dotType: "dots", shadow: "heavy" },
      });

      expect(design?.customization).toEqual({ ...DEFAULT_CUSTOMIZATION, dotType: "dots" });
    });
  });

  describe("logo", () => {
    test("keeps an inline image", () => {
      expect(
        normalizeDesign({ qrType: "url", customization: { logo: PNG } })?.customization.logo,
      ).toBe(PNG);
    });

    /* A logo becomes an image the renderer loads. Anything that is not inline
       data would have the app reach out to — or run — whatever a stored design
       names, on behalf of a user who never chose it. */
    test.each([
      ["a remote URL", "https://evil.example/pixel.png"],
      ["a script URL", "javascript:alert(1)"],
      ["a non-image data URL", "data:text/html,<script>alert(1)</script>"],
      ["a number", 42],
      ["null", null],
    ])("drops %s", (_label, logo) => {
      expect(normalizeDesign({ qrType: "url", customization: { logo } })?.customization.logo).toBe(
        null,
      );
    });
  });
});
