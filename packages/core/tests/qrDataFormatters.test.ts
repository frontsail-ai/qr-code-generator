import { describe, expect, test } from "vite-plus/test";
import { formatQRData } from "../src/qrDataFormatters";

describe("url", () => {
  test("passes an absolute URL through untouched", () => {
    expect(formatQRData("url", { url: "https://example.com/a?b=c" })).toBe(
      "https://example.com/a?b=c",
    );
    expect(formatQRData("url", { url: "http://example.com" })).toBe("http://example.com");
  });

  test("prefixes a bare host with https", () => {
    expect(formatQRData("url", { url: "example.com" })).toBe("https://example.com");
  });

  test("trims surrounding whitespace", () => {
    expect(formatQRData("url", { url: "  example.com  " })).toBe("https://example.com");
  });

  test("returns empty for empty input", () => {
    expect(formatQRData("url", { url: "   " })).toBe("");
  });
});

describe("email", () => {
  test("emits a bare mailto when only the recipient is set", () => {
    expect(formatQRData("email", { to: "hi@example.com", subject: "", body: "" })).toBe(
      "mailto:hi@example.com",
    );
  });

  test("percent-escapes subject and body per RFC 6068 (spaces as %20, not +)", () => {
    expect(
      formatQRData("email", {
        to: "hi@example.com",
        subject: "Tea & biscuits",
        body: "line one\nline two",
      }),
    ).toBe("mailto:hi@example.com?subject=Tea%20%26%20biscuits&body=line%20one%0Aline%20two");
  });

  test("escapes a literal plus so clients cannot decode it as a space", () => {
    expect(formatQRData("email", { to: "hi@example.com", subject: "a+b", body: "" })).toBe(
      "mailto:hi@example.com?subject=a%2Bb",
    );
  });

  test("percent-encodes non-ASCII text as UTF-8", () => {
    expect(
      formatQRData("email", { to: "hi@example.com", subject: "ümlauts — dash", body: "" }),
    ).toBe("mailto:hi@example.com?subject=%C3%BCmlauts%20%E2%80%94%20dash");
  });

  test("omits the query string parts that are empty", () => {
    expect(formatQRData("email", { to: "hi@example.com", subject: "", body: "Hello" })).toBe(
      "mailto:hi@example.com?body=Hello",
    );
  });

  test("returns empty without a recipient", () => {
    expect(formatQRData("email", { to: "", subject: "Hi", body: "There" })).toBe("");
  });
});

describe("phone", () => {
  test("strips whitespace and prefixes tel:", () => {
    expect(formatQRData("phone", { number: "+44 20 7946 0958" })).toBe("tel:+442079460958");
  });

  test("returns empty for empty input", () => {
    expect(formatQRData("phone", { number: "   " })).toBe("");
  });
});

describe("text", () => {
  test("passes content through verbatim", () => {
    expect(formatQRData("text", { content: "  spaces kept  " })).toBe("  spaces kept  ");
  });

  test("returns empty for empty input", () => {
    expect(formatQRData("text", { content: "" })).toBe("");
  });
});

describe("vcard", () => {
  test("emits every populated field", () => {
    expect(
      formatQRData("vcard", {
        firstName: "Ada",
        lastName: "Lovelace",
        phone: "+44123",
        email: "ada@example.com",
        org: "Analytical Engines",
        title: "Mathematician",
        website: "example.com",
      }),
    ).toBe(
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Lovelace;Ada",
        "FN:Ada Lovelace",
        "ORG:Analytical Engines",
        "TITLE:Mathematician",
        "TEL:+44123",
        "EMAIL:ada@example.com",
        "URL:https://example.com",
        "END:VCARD",
      ].join("\n"),
    );
  });

  test("keeps an absolute website URL as-is", () => {
    expect(
      formatQRData("vcard", {
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        org: "",
        title: "",
        website: "http://example.com",
      }),
    ).toContain("URL:http://example.com");
  });

  test("skips the name lines when both name fields are empty", () => {
    expect(
      formatQRData("vcard", {
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        org: "Acme",
        title: "",
        website: "",
      }),
    ).toBe(["BEGIN:VCARD", "VERSION:3.0", "ORG:Acme", "END:VCARD"].join("\n"));
  });

  test("still emits the name lines with only one half of the name", () => {
    expect(
      formatQRData("vcard", {
        firstName: "Ada",
        lastName: "",
        phone: "",
        email: "",
        org: "",
        title: "",
        website: "",
      }),
    ).toBe(["BEGIN:VCARD", "VERSION:3.0", "N:;Ada", "FN:Ada", "END:VCARD"].join("\n"));
  });
});
