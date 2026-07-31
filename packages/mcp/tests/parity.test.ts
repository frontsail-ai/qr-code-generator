import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Customization } from "@frontsail/qr-core";
import { DEFAULT_CUSTOMIZATION, TRANSPARENT } from "@frontsail/qr-core";
import { describe, expect, test } from "vite-plus/test";
import { renderSvg } from "../src/render.ts";
import { canonicalizeIds, sanitizeForRasterizer } from "../src/sanitize.ts";
import { TEST_DATA } from "./helpers.ts";

/* The goldens in fixtures/golden are not this package's own output. They are
   the files the deployed web app downloaded, captured through Playwright on
   2026-07-31 by clicking its "Download SVG" button. Comparing against them
   makes this a real parity guard: if the MCP server ever stops matching the
   browser, this fails.

   The one permitted difference is qr-code-styling's per-process instance
   counter in generated ids — the browser builds a preview instance before the
   download instance, so its counter runs one ahead of a fresh Node process.
   That id is internal and has no rendered effect. */
const goldenPath = (name: string) =>
  fileURLToPath(new URL(`./fixtures/golden/${name}.svg`, import.meta.url));

const DESIGNS: Record<string, Customization> = {
  plain: { ...DEFAULT_CUSTOMIZATION },
  "gradient-linear": { ...DEFAULT_CUSTOMIZATION, gradientType: "linear-bl-tr" },
  "gradient-radial": { ...DEFAULT_CUSTOMIZATION, gradientType: "radial" },
  transparent: { ...DEFAULT_CUSTOMIZATION, backgroundColor: TRANSPARENT },
};

describe("SVG parity with the web app", () => {
  for (const [name, design] of Object.entries(DESIGNS)) {
    test(`${name} matches the browser's download byte for byte`, async () => {
      const ours = await renderSvg(design, TEST_DATA);
      const golden = readFileSync(goldenPath(name), "utf8");

      // Byte length must match exactly — the id counter is a same-width
      // substitution, so any length change is a genuine difference.
      expect(ours.length).toBe(golden.length);
      expect(canonicalizeIds(ours)).toBe(canonicalizeIds(golden));
    });
  }
});

describe("canonicalizeIds", () => {
  test("normalizes the trailing instance counter", () => {
    expect(canonicalizeIds('id="clip-path-dot-color-3"')).toBe('id="clip-path-dot-color-N"');
    expect(canonicalizeIds("url(#dot-color-12)")).toBe("url(#dot-color-N)");
  });

  test("does not mistake row/column indices for the counter", () => {
    // Regression: a substring-based normalizer rewrote the row index too, but
    // only when the counter happened to be 0 — so it passed for browser output
    // (counter 3) and failed for Node output (counter 0).
    expect(canonicalizeIds('id="clip-path-corners-square-color-0-1-0"')).toBe(
      'id="clip-path-corners-square-color-0-1-N"',
    );
    expect(canonicalizeIds('id="corners-dot-color-0-0-0"')).toBe('id="corners-dot-color-0-0-N"');
  });

  test("leaves path data alone", () => {
    const d = 'd="M 8 8v 56h 56v -56zM 16 16h 40v 40h -40z"';
    expect(canonicalizeIds(d)).toBe(d);
  });
});

describe("sanitizeForRasterizer", () => {
  test("unquotes url() references so resvg resolves them", () => {
    expect(sanitizeForRasterizer(`fill="url('#dot-color-0')"`)).toBe(`fill="url(#dot-color-0)"`);
  });

  test("leaves already-unquoted references untouched", () => {
    expect(sanitizeForRasterizer(`fill="url(#dot-color-0)"`)).toBe(`fill="url(#dot-color-0)"`);
  });

  test("changes nothing else in a real SVG", async () => {
    const svg = await renderSvg(DESIGNS["gradient-linear"]!, TEST_DATA);
    const sanitized = sanitizeForRasterizer(svg);
    // Re-quoting every url(...) reference must reproduce the original exactly,
    // which is only true if the quotes were the sole thing that changed.
    expect(sanitized.replace(/url\((#[^)]*)\)/g, "url('$1')")).toBe(svg);
    expect(sanitized.length).toBeLessThan(svg.length);
  });
});
