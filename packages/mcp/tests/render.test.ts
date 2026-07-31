import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Customization } from "@frontsail/qr-core";
import { DEFAULT_CUSTOMIZATION, TRANSPARENT } from "@frontsail/qr-core";
import { describe, expect, test } from "vite-plus/test";
import { PNG_SIZE, RenderError, renderPng, renderRawSvg, renderSvg } from "../src/render.ts";
import { inspectPng, TEST_DATA } from "./helpers.ts";

const LOGO_PATH = fileURLToPath(new URL("./fixtures/logo.png", import.meta.url));
const LOGO_DATA_URI = `data:image/png;base64,${readFileSync(LOGO_PATH).toString("base64")}`;

const DESIGNS: Record<string, Customization> = {
  plain: { ...DEFAULT_CUSTOMIZATION },
  "gradient-linear": { ...DEFAULT_CUSTOMIZATION, gradientType: "linear-bl-tr" },
  "gradient-radial": { ...DEFAULT_CUSTOMIZATION, gradientType: "radial" },
  transparent: { ...DEFAULT_CUSTOMIZATION, backgroundColor: TRANSPARENT },
  "with-logo": { ...DEFAULT_CUSTOMIZATION, logo: LOGO_DATA_URI },
};

/* This is the experiment matrix from 2026-07-31 turned into a regression.
   Every pipeline that broke during that investigation broke by producing a
   plausible file rather than by throwing, so these assertions look at decoded
   pixels rather than at "a buffer came back". */
describe("SVG rendering", () => {
  for (const [name, design] of Object.entries(DESIGNS)) {
    test(`renders ${name}`, async () => {
      const svg = await renderSvg(design, TEST_DATA);
      expect(svg.trimStart().startsWith("<?xml")).toBe(true);
      expect(svg).toContain("<svg");
      expect(svg.length).toBeGreaterThan(1000);
    });
  }

  test("emits a linear gradient for a linear design", async () => {
    const svg = await renderSvg(DESIGNS["gradient-linear"]!, TEST_DATA);
    expect(svg).toContain("<linearGradient");
    expect(svg).not.toContain("<radialGradient");
  });

  test("emits a radial gradient for a radial design", async () => {
    const svg = await renderSvg(DESIGNS["gradient-radial"]!, TEST_DATA);
    expect(svg).toContain("<radialGradient");
  });

  test("carries the transparent sentinel through as a fill", async () => {
    const svg = await renderSvg(DESIGNS["transparent"]!, TEST_DATA);
    expect(svg).toContain(`fill="${TRANSPARENT}"`);
  });

  test("embeds the logo image", async () => {
    const svg = await renderSvg(DESIGNS["with-logo"]!, TEST_DATA);
    expect(svg).toContain("<image");
    expect(svg).toContain("data:image/png;base64,");
  });

  test("leaves the quoted url() form intact — sanitizing is a PNG-only step", async () => {
    const svg = await renderSvg(DESIGNS["gradient-linear"]!, TEST_DATA);
    expect(svg).toContain("url('#");
  });
});

describe("PNG rendering", () => {
  for (const [name, design] of Object.entries(DESIGNS)) {
    test(`renders ${name} at ${PNG_SIZE}px`, async () => {
      const png = await renderPng(design, TEST_DATA);
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      const stats = await inspectPng(png);
      expect(stats.width).toBe(PNG_SIZE);
      expect(stats.height).toBe(PNG_SIZE);
    });
  }

  test("transparent background produces genuinely zero-alpha pixels", async () => {
    const stats = await inspectPng(await renderPng(DESIGNS["transparent"]!, TEST_DATA));
    // Just over half the canvas is background for this design; assert a wide
    // band rather than an exact count so antialiasing changes do not flake.
    expect(stats.zeroAlpha).toBeGreaterThan(stats.total * 0.4);
    expect(stats.zeroAlpha).toBeLessThan(stats.total * 0.7);
  });

  test("an opaque background produces no transparent pixels", async () => {
    const stats = await inspectPng(await renderPng(DESIGNS["plain"]!, TEST_DATA));
    expect(stats.zeroAlpha).toBe(0);
    expect(stats.opaque).toBe(stats.total);
  });

  test("the logo actually rasterizes into the PNG", async () => {
    // The regression this guards: pipelines that drop the logo still emit a
    // valid, correctly sized, scannable PNG. Only the pixels give it away.
    const withLogo = await inspectPng(await renderPng(DESIGNS["with-logo"]!, TEST_DATA));
    const plain = await inspectPng(await renderPng(DESIGNS["plain"]!, TEST_DATA));
    expect(plain.logoRed).toBe(0);
    expect(withLogo.logoRed).toBeGreaterThan(200);
  });

  test("a solid-square render would fail these assertions", async () => {
    // Guards the sanitizer: unsanitized SVG makes resvg paint a solid block,
    // which would leave the gradient PNG with a single flat colour.
    const stats = await inspectPng(await renderPng(DESIGNS["gradient-linear"]!, TEST_DATA));
    expect(stats.opaque).toBe(stats.total);
    expect(stats.logoRed).toBe(0);
  });
});

describe("failure modes", () => {
  /* Trap this package exists to avoid: with no canvas implementation the
     library's logo path awaits a loadImage that never resolves, so getRawData
     neither resolves nor rejects. Production always passes nodeCanvas; this
     test removes it deliberately to prove the timeout is a real backstop and
     not decoration. An agent can act on an error, never on silence. */
  test("a render without nodeCanvas rejects on the timeout instead of hanging", async () => {
    const started = Date.now();
    await expect(
      renderRawSvg(DESIGNS["with-logo"]!, TEST_DATA, { nodeCanvas: undefined, timeoutMs: 1500 }),
    ).rejects.toThrow(/timed out/i);
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  test("content that exceeds QR capacity reports an actionable error", async () => {
    // The library throws a bare string here, not an Error.
    await expect(renderSvg(DESIGNS["plain"]!, "x".repeat(10_000))).rejects.toBeInstanceOf(
      RenderError,
    );
    await expect(renderSvg(DESIGNS["plain"]!, "x".repeat(10_000))).rejects.toThrow(/too large/i);
  });
});
