import { describe, expect, test } from "vite-plus/test";
import { DEFAULT_FORM_DATA } from "../src/constants";
import { formatQRData } from "../src/qrDataFormatters";
import type { FormDataMap, QRType } from "../src/types";

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

  // #43 — raw spaces make the payload an invalid URI, and scanners diverge on it
  test("percent-encodes interior spaces", () => {
    expect(formatQRData("url", { url: "frontsail.ai/some page?q=a b" })).toBe(
      "https://frontsail.ai/some%20page?q=a%20b",
    );
  });

  test("percent-encodes the other characters STD 66 excludes", () => {
    expect(formatQRData("url", { url: 'example.com/a"b<c>d^e`f{g}h|i\\j' })).toBe(
      "https://example.com/a%22b%3Cc%3Ed%5Ee%60f%7Bg%7Dh%7Ci%5Cj",
    );
  });

  test("percent-encodes non-ASCII as UTF-8, astral characters included", () => {
    expect(formatQRData("url", { url: "example.com/ünï" })).toBe(
      "https://example.com/%C3%BCn%C3%AF",
    );
    expect(formatQRData("url", { url: "example.com/🎉" })).toBe("https://example.com/%F0%9F%8E%89");
  });

  /* Reserved delimiters keep the structure the user typed, and an escape they
     typed themselves is not escaped a second time into %2520. */
  test("leaves reserved delimiters and existing escapes alone", () => {
    expect(formatQRData("url", { url: "https://example.com/a%20b?x=1&y=2#frag" })).toBe(
      "https://example.com/a%20b?x=1&y=2#frag",
    );
  });

  test("encodes a lone percent that introduces no escape", () => {
    expect(formatQRData("url", { url: "example.com/100%" })).toBe("https://example.com/100%25");
  });

  /* `new URL().href` would return "https://example.com/x" here, quietly
     dropping the port and appending a root path the user did not type. */
  test("does not rewrite the host, port or path the user typed", () => {
    expect(formatQRData("url", { url: "https://Example.COM:443/Path" })).toBe(
      "https://Example.COM:443/Path",
    );
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

  /* The recipient is a URI component too. Left raw, a "?" in it closes the
     addr-spec and everything after becomes headers — so a scanned code would
     blind-copy an address the sender never seeded. */
  test("percent-encodes a recipient that tries to open a header list", () => {
    expect(
      formatQRData("email", { to: "hi@example.com?bcc=lurker@example.net", subject: "", body: "" }),
    ).toBe("mailto:hi@example.com%3Fbcc=lurker@example.net");
  });

  test("percent-encodes a recipient that tries to append a header", () => {
    expect(
      formatQRData("email", { to: "hi@example.com&cc=lurker@example.net", subject: "", body: "" }),
    ).toBe("mailto:hi@example.com%26cc=lurker@example.net");
  });

  test("percent-encodes the gen-delims RFC 6068 names, and keeps @ and :", () => {
    expect(formatQRData("email", { to: "a/b#c[d]@example.com", subject: "", body: "" })).toBe(
      "mailto:a%2Fb%23c%5Bd%5D@example.com",
    );
  });

  test("percent-encodes interior whitespace in a recipient", () => {
    expect(formatQRData("email", { to: "hi there@example.com", subject: "", body: "" })).toBe(
      "mailto:hi%20there@example.com",
    );
  });
});

describe("phone", () => {
  test("strips whitespace and prefixes tel:", () => {
    expect(formatQRData("phone", { number: "+44 20 7946 0958" })).toBe("tel:+442079460958");
  });

  test("returns empty for empty input", () => {
    expect(formatQRData("phone", { number: "   " })).toBe("");
  });

  /* RFC 3966 §3 lists exactly "-", ".", "(" and ")" as visual separators and
     excludes the space, so this is the conformant output, not a half-done
     normalization (#44). */
  test("keeps RFC 3966 visual separators", () => {
    expect(formatQRData("phone", { number: "+1 (555) 123-4567" })).toBe("tel:+1(555)123-4567");
    expect(formatQRData("phone", { number: "555.123.4567" })).toBe("tel:555.123.4567");
  });

  test("keeps the * and # that the local-number grammar admits", () => {
    expect(formatQRData("phone", { number: "*67 555 1234" })).toBe("tel:*675551234");
    expect(formatQRData("phone", { number: "#31# 555 1234" })).toBe("tel:#31#5551234");
  });

  test("does not prefix a number that already arrived as a tel: URI", () => {
    expect(formatQRData("phone", { number: "tel:+15551234567" })).toBe("tel:+15551234567");
  });

  /* Each of these encodes nothing rather than something plausible. Dropping
     the offending characters instead would turn "ext. 89" into ".89", a valid
     URI that dials a different number. */
  test.each([
    ["a spelled-out extension", "+1 555 123 4567 ext. 89"],
    ["a vanity number", "+1-555-CALL-NOW"],
    ["a shorthand extension", "555 123 4567 x89"],
    ["a tel URI parameter", "+1 555 123 4567;ext=99"],
    ["a stray delimiter", "+1 555/123/4567"],
    ["non-ASCII digits", "+١ ٥٥٥ ١٢٣"],
    ["markup", "+1 555 123 4567 <script>"],
    ["separators with no digit at all", "()-."],
  ])("refuses to encode %s", (_label, number) => {
    expect(formatQRData("phone", { number })).toBe("");
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
      ].join("\r\n"),
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
    ).toBe(["BEGIN:VCARD", "VERSION:3.0", "ORG:Acme", "END:VCARD"].join("\r\n"));
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
    ).toBe(["BEGIN:VCARD", "VERSION:3.0", "N:;Ada", "FN:Ada", "END:VCARD"].join("\r\n"));
  });

  const emptyVCard = {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    org: "",
    title: "",
    website: "",
  };

  test("escapes semicolons so they cannot shift the N components (RFC 2426 \u00a72.5)", () => {
    const out = formatQRData("vcard", {
      ...emptyVCard,
      firstName: "Ada",
      lastName: "Lovelace; PhD",
    });
    expect(out).toContain("N:Lovelace\\; PhD;Ada");
    expect(out).toContain("FN:Ada Lovelace\\; PhD");
  });

  test("escapes commas in text values", () => {
    expect(formatQRData("vcard", { ...emptyVCard, org: "Acme, Inc." })).toContain(
      "ORG:Acme\\, Inc.",
    );
  });

  test("escapes backslashes before any other escape", () => {
    expect(formatQRData("vcard", { ...emptyVCard, firstName: "A", lastName: "B\\C" })).toContain(
      "N:B\\\\C;A",
    );
  });

  test("encodes newlines as literal \\n so a field cannot inject an extra property line", () => {
    const out = formatQRData("vcard", {
      ...emptyVCard,
      firstName: "A",
      lastName: "B\nNOTE:injected",
    });
    expect(out.split("\r\n").some((line) => line.startsWith("NOTE:"))).toBe(false);
    expect(out).toContain("N:B\\nNOTE:injected;A");
  });

  test("strips control characters from the URI-valued fields", () => {
    const out = formatQRData("vcard", {
      ...emptyVCard,
      email: "a@b.co\u0000",
      website: "example.org\nNOTE:y",
    });
    expect(out).toContain("EMAIL:a@b.co");
    expect(out).toContain("URL:https://example.orgNOTE:y");
    expect(out.split("\r\n").filter((line) => line.startsWith("NOTE:"))).toEqual([]);
  });

  /* TEL now runs through the same normalization as the `phone` type, which
     admits no letter and so no smuggled property name. The line is dropped
     whole rather than emitted as the junk number `+44NOTE:x`. */
  test("drops a TEL line whose number cannot be represented, keeping the card", () => {
    const out = formatQRData("vcard", {
      ...emptyVCard,
      firstName: "Ada",
      phone: "+44\r\nNOTE:x",
    });
    expect(out).toContain("FN:Ada");
    expect(out.split("\r\n").filter((line) => line.startsWith("TEL:"))).toEqual([]);
    expect(out.split("\r\n").filter((line) => line.startsWith("NOTE:"))).toEqual([]);
  });

  test("normalizes TEL exactly as the phone type does", () => {
    const out = formatQRData("vcard", { ...emptyVCard, phone: "+1 (555) 123-4567" });
    expect(out).toContain("TEL:+1(555)123-4567");
    expect(formatQRData("phone", { number: "+1 (555) 123-4567" })).toBe("tel:+1(555)123-4567");
  });

  test("delimits content lines with CRLF (RFC 2426 \u00a74)", () => {
    const out = formatQRData("vcard", { ...emptyVCard, org: "Acme" });
    expect(out.split("\r\n")).toEqual(["BEGIN:VCARD", "VERSION:3.0", "ORG:Acme", "END:VCARD"]);
  });
});

describe("emptiness contract", () => {
  /* Every consumer reads an empty string as "nothing to encode" — the web
     app's empty state and export lock, the render hook, the MCP server's
     error. The contract belongs to all formatters, so the cases are derived
     from DEFAULT_FORM_DATA rather than hand-listed: a sixth QR type inherits
     it the day it is added, not the day someone remembers to extend this
     file. */
  const types = Object.keys(DEFAULT_FORM_DATA) as QRType[];

  /* Built by walking DEFAULT_FORM_DATA rather than by hand, so the shape is
     opaque to the compiler on the way out — hence the double assertion. */
  const filledWith = (filler: string): FormDataMap =>
    Object.fromEntries(
      Object.entries(DEFAULT_FORM_DATA).map(([type, data]) => [
        type,
        Object.fromEntries(Object.keys(data).map((field) => [field, filler])),
      ]),
    ) as unknown as FormDataMap;

  for (const type of types) {
    test(`${type} encodes nothing when every field is blank`, () => {
      expect(formatQRData(type, DEFAULT_FORM_DATA[type])).toBe("");
    });

    test(`${type} encodes nothing when every field is whitespace`, () => {
      expect(formatQRData(type, filledWith("  \t ")[type])).toBe("");
    });
  }

  test("a single filled field is enough to have something to encode", () => {
    expect(formatQRData("vcard", { ...DEFAULT_FORM_DATA.vcard, org: "Acme" })).toContain(
      "ORG:Acme",
    );
    expect(formatQRData("text", { content: " padded " })).toBe(" padded ");
  });
});

describe("whitespace normalization", () => {
  test("trims the mailto recipient, which cannot carry surrounding spaces", () => {
    expect(formatQRData("email", { to: "  a@b.com  ", subject: "", body: "" })).toBe(
      "mailto:a@b.com",
    );
  });

  test("drops a subject that is only whitespace instead of encoding it", () => {
    expect(formatQRData("email", { to: "a@b.com", subject: "   ", body: "" })).toBe(
      "mailto:a@b.com",
    );
  });

  test("trims vCard values so a blank field emits no property line", () => {
    const out = formatQRData("vcard", {
      ...DEFAULT_FORM_DATA.vcard,
      firstName: "   ",
      org: "  Acme  ",
    });
    expect(out).toBe(["BEGIN:VCARD", "VERSION:3.0", "ORG:Acme", "END:VCARD"].join("\r\n"));
  });
});
