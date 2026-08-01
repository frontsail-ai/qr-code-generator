import type { Customization, DotType } from "@frontsail/qr-core";
import { DEFAULT_CUSTOMIZATION, TRANSPARENT } from "@frontsail/qr-core";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import { describe, expect, test } from "vite-plus/test";
import { renderSvg } from "../src/render.ts";
import { sanitizeForRasterizer } from "../src/sanitize.ts";

/* ---------------------------------------------------------------------------
   Measurement harness behind skills/qr-code/SKILL.md.

   Every claim the skill marks "measured" comes from a number produced here, so
   the claims stay re-checkable: if a dependency changes a threshold, these
   tests move and the skill has to move with them.

   Decoding uses jsQR, a *proxy* for a phone camera, not a substitute. It reads
   a clean rasterized bitmap with no optics, motion blur, glare, perspective or
   print gain, so every threshold here is a generous upper bound on what real
   scanning tolerates. Findings are therefore written as "fails below X" — a
   decode at X proves nothing about a phone at X.
   --------------------------------------------------------------------------- */

const CONTENT = "https://frontsail.ai";
const CONTENT_LONG = `https://frontsail.ai/?ref=${"x".repeat(280)}`;
const MODULES = 25; // the symbol version CONTENT produces, measured below

function design(overrides: Partial<Customization> = {}): Customization {
  return { ...DEFAULT_CUSTOMIZATION, ...overrides };
}

/* Rasterize through the package's own SVG pipeline at a caller-chosen width.
   renderPng is fixed at 560px, so this repeats its rasterization step rather
   than calling it — same sanitizer, same renderer, variable size. */
async function rasterize(customization: Customization, data: string, width: number) {
  const svg = await renderSvg(customization, data);
  return Buffer.from(
    new Resvg(sanitizeForRasterizer(svg), { fitTo: { mode: "width", value: width } })
      .render()
      .asPng(),
  );
}

/* Decode, compositing transparent pixels onto `surface` first — which is what
   happens when a transparent PNG is dropped onto a coloured background. */
async function decodes(png: Buffer, surface: [number, number, number] = [255, 255, 255]) {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  const rgba = new Uint8ClampedArray(data);
  for (let i = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3]! / 255;
    if (alpha < 1) {
      for (let c = 0; c < 3; c++) {
        rgba[i + c] = Math.round(rgba[i + c]! * alpha + surface[c]! * (1 - alpha));
      }
      rgba[i + 3] = 255;
    }
  }
  return jsQR(rgba, image.width, image.height)?.data === CONTENT;
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const grey = (v: number): string => `#${v.toString(16).padStart(2, "0").repeat(3)}`;
const rgbOf = (v: number): [number, number, number] => [v, v, v];
const INK: [number, number, number] = [0x1b, 0x18, 0x12]; // DEFAULT_CUSTOMIZATION.foregroundColor

/* ------------------------------------------------------------------ */

describe("contrast: what actually governs decode", () => {
  /* The headline measurement, and the one that contradicts the usual advice.
     Contrast ratio alone does not predict decode. Two sweeps that pass through
     the same ratios give opposite answers, because a QR binarizer thresholds
     luminance to decide which modules are "dark" — so what matters is whether
     the dark modules are genuinely dark, not how far apart the two colours
     are. */

  test("lightening the foreground fails while the ratio is still high", async () => {
    let lastOk: number | null = null;
    let firstFail: number | null = null;
    for (let v = 0x60; v <= 0xc8; v += 8) {
      const ok = await decodes(await rasterize(design({ foregroundColor: grey(v) }), CONTENT, 560));
      if (ok) lastOk = v;
      else if (firstFail === null) firstFail = v;
    }
    const okRatio = contrastRatio(rgbOf(lastOk!), [255, 255, 255]);
    const failRatio = contrastRatio(rgbOf(firstFail!), [255, 255, 255]);
    console.log(
      `[contrast/fg] light foreground on white: last decode ${grey(lastOk!)} at ` +
        `${okRatio.toFixed(2)}:1, first failure ${grey(firstFail!)} at ${failRatio.toFixed(2)}:1`,
    );
    // Fails while still above the 3:1 that WCAG considers adequate for graphics.
    expect(failRatio).toBeGreaterThan(3);
  });

  test("darkening the background keeps decoding far below that ratio", async () => {
    const results: Array<{ bg: number; ratio: number; ok: boolean }> = [];
    for (let v = 0xff; v >= 0x30; v -= 24) {
      const ok = await decodes(await rasterize(design({ backgroundColor: grey(v) }), CONTENT, 560));
      results.push({ bg: v, ratio: contrastRatio(INK, rgbOf(v)), ok });
    }
    const lowestOk = results.filter((r) => r.ok).sort((a, b) => a.ratio - b.ratio)[0]!;
    console.log(
      `[contrast/bg] dark ink on darkening background: still decodes at ` +
        `${lowestOk.ratio.toFixed(2)}:1 (bg ${grey(lowestOk.bg)})`,
    );
    // The asymmetry is the finding: same ratios, opposite outcome.
    expect(lowestOk.ratio).toBeLessThan(3);
  });

  test("an inverted code (light modules on dark) decodes for jsQR", async () => {
    // Stated precisely because it is a caveat, not a recommendation: library
    // decoders handle inverted symbols, but the spec's reference decoding
    // algorithm assumes dark-on-light and scanner support has historically
    // been uneven.
    const ok = await decodes(
      await rasterize(
        design({ foregroundColor: "#FFFFFF", backgroundColor: "#1B1812" }),
        CONTENT,
        560,
      ),
    );
    console.log(`[contrast/inverted] white modules on ink decode: ${ok}`);
    expect(ok).toBe(true);
  });
});

describe("transparent background on a coloured surface", () => {
  /* A transparent export carries no background of its own, so whatever it
     lands on becomes the light module. */
  const surfaces: Array<{ name: string; rgb: [number, number, number] }> = [
    { name: "white", rgb: [255, 255, 255] },
    { name: "light grey", rgb: [222, 222, 222] },
    { name: "mid grey", rgb: [128, 128, 128] },
    { name: "dark grey", rgb: [64, 64, 64] },
    { name: "near-black", rgb: [27, 24, 18] },
  ];

  test("survives light and mid surfaces, dies on a dark one", async () => {
    const png = await rasterize(design({ backgroundColor: TRANSPARENT }), CONTENT, 560);
    const outcome: Record<string, boolean> = {};
    for (const surface of surfaces) {
      outcome[surface.name] = await decodes(png, surface.rgb);
      console.log(
        `[transparent] on ${surface.name.padEnd(11)} ` +
          `contrast ${contrastRatio(INK, surface.rgb).toFixed(2).padStart(5)}:1  ` +
          `${outcome[surface.name] ? "decodes" : "FAILS"}`,
      );
    }
    expect(outcome["white"]).toBe(true);
    expect(outcome["near-black"]).toBe(false);
  });

  test("an opaque background is immune to the surface underneath", async () => {
    const png = await rasterize(design(), CONTENT, 560);
    for (const surface of surfaces) expect(await decodes(png, surface.rgb)).toBe(true);
  });
});

describe("logo and the error-correction budget", () => {
  function solidLogo(): string {
    const c = createCanvas(24, 24);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#E5007E";
    ctx.fillRect(0, 0, 24, 24);
    return c.toDataURL("image/png");
  }

  function darkModuleCount(svg: string): number {
    const widths = [...svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)"/g)].map((m) =>
      Number(m[1]),
    );
    const module = Math.min(...widths);
    return widths.filter((w) => w === module).length;
  }

  test("the logo hides the same fraction of modules regardless of content length", async () => {
    // Counters the intuition that "long content + logo" is the danger case:
    // the logo scales with the canvas, not with the module count.
    const logo = solidLogo();
    const fractions: number[] = [];
    for (const content of [CONTENT, CONTENT_LONG]) {
      const hidden =
        (darkModuleCount(await renderSvg(design(), content)) -
          darkModuleCount(await renderSvg(design({ logo }), content))) /
        darkModuleCount(await renderSvg(design(), content));
      fractions.push(hidden);
      console.log(
        `[logo] ${String(content.length).padStart(3)} chars: hides ${(hidden * 100).toFixed(1)}% of dark modules`,
      );
    }
    expect(Math.abs(fractions[0]! - fractions[1]!)).toBeLessThan(0.05);
  });

  test("both short and near-capacity content still decode with the default logo", async () => {
    const logo = solidLogo();
    expect(await decodes(await rasterize(design({ logo }), CONTENT, 560))).toBe(true);
    const long = await rasterize(design({ logo }), CONTENT_LONG, 560);
    const image = await loadImage(long);
    const canvas = createCanvas(image.width, image.height);
    canvas.getContext("2d").drawImage(image, 0, 0);
    const { data } = canvas.getContext("2d").getImageData(0, 0, image.width, image.height);
    expect(jsQR(new Uint8ClampedArray(data), image.width, image.height)?.data).toBe(CONTENT_LONG);
  });
});

describe("physical size and dot style", () => {
  const styles: DotType[] = [
    "square",
    "rounded",
    "dots",
    "classy",
    "classy-rounded",
    "extra-rounded",
  ];

  test("every dot style decodes down to roughly two pixels per module", async () => {
    /* The interesting result is the absence of a result: the styles do not
       separate. Differences land inside one step of the ladder, so at these
       sizes the limiting factor is pixels-per-module, not the shape drawn in
       each module. */
    const floors: Record<string, number | null> = {};
    for (const dotType of styles) {
      let smallest: number | null = null;
      for (const width of [60, 50, 45, 40, 36, 32, 28, 24, 20]) {
        if (await decodes(await rasterize(design({ dotType }), CONTENT, width))) smallest = width;
        else break;
      }
      floors[dotType] = smallest;
      console.log(
        `[dot-style] ${dotType.padEnd(15)} smallest decoding width ${smallest ?? ">60"}px ` +
          `(${smallest ? (smallest / MODULES).toFixed(2) : "-"} px/module)`,
      );
    }
    for (const style of styles) {
      expect(floors[style]).not.toBe(null);
      // All styles sit in the same narrow band; none needs 3x the pixels.
      expect(floors[style]! / MODULES).toBeLessThan(3);
    }
  });
});

describe("quiet zone", () => {
  /* Exports carry no quiet zone: qr-code-styling's `margin` defaults to 0 and
     neither core nor this package sets it. Whatever margin appears is integer
     rounding slack from fitting N modules into a fixed pixel box, so it varies
     with content length and cannot be relied on. */
  async function marginInModules(content: string) {
    const svg = await renderSvg(design(), content);
    const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/g)].map((m) => ({
      x: Number(m[1]),
      w: Number(m[2]),
    }));
    const module = Math.min(...rects.map((r) => r.w));
    return Math.min(...rects.filter((r) => r.w === module).map((r) => r.x)) / module;
  }

  test("the margin is rounding slack, not a designed quiet zone", async () => {
    const short = await marginInModules(CONTENT);
    const long = await marginInModules(CONTENT_LONG);
    console.log(
      `[quiet-zone] short content ${short.toFixed(2)} modules, ` +
        `near-capacity ${long.toFixed(2)} modules — the spec requires 4`,
    );
    expect(short).toBeLessThan(1); // the common case gets essentially none
    expect(Math.abs(long - short)).toBeGreaterThan(0.5); // and it is not stable
  });
});
