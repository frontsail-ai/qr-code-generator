import type { Customization, GradientType } from "@frontsail/qr-core";
import { DEFAULT_CUSTOMIZATION } from "@frontsail/qr-core";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { describe, expect, test } from "vite-plus/test";
import { renderPng, renderSvg, SVG_SIZE } from "../src/render.ts";
import { TEST_DATA } from "./helpers.ts";

/* Gradient direction is only checkable by rendering. Core can assert the
   rotation number, but whether that number points where the option's name
   promises depends on qr-code-styling's coordinate convention: it maps
   rotation to (cos θ, sin θ) in SVG space, where y grows *downward*. Deriving
   the angles in the usual y-up convention is what flipped both linear
   directions vertically while still producing a plausible-looking gradient. */

const START = "#FF0000"; // gradient offset 0
const END = "#0000FF"; // gradient offset 1

function design(gradientType: GradientType): Customization {
  return {
    ...DEFAULT_CUSTOMIZATION,
    gradientType,
    foregroundColor: START,
    foregroundColor2: END,
  };
}

/* The gradient applied to the QR's data modules, in user space over the whole
   image. Corners get their own separate gradient defs scoped to each finder
   element, so this deliberately reads the dot gradient only. */
async function dotGradientVector(gradientType: GradientType) {
  const svg = await renderSvg(design(gradientType), TEST_DATA);
  const tag = svg.match(/<linearGradient id="dot-color-[^"]*"[^>]*>/)?.[0];
  if (!tag) throw new Error(`no dot gradient found for ${gradientType}`);
  const at = (name: string) => Number(tag.match(new RegExp(`${name}="([-\\d.]+)"`))?.[1]);
  return { x1: at("x1"), y1: at("y1"), x2: at("x2"), y2: at("y2") };
}

const TOP = 0;
const LEFT = 0;
const RIGHT = SVG_SIZE;
const BOTTOM = SVG_SIZE;

describe("linear gradients point where their names say", () => {
  test("linear-bl-tr runs from the bottom-left corner to the top-right", async () => {
    expect(await dotGradientVector("linear-bl-tr")).toEqual({
      x1: LEFT,
      y1: BOTTOM,
      x2: RIGHT,
      y2: TOP,
    });
  });

  test("linear-tl-br runs from the top-left corner to the bottom-right", async () => {
    expect(await dotGradientVector("linear-tl-br")).toEqual({
      x1: LEFT,
      y1: TOP,
      x2: RIGHT,
      y2: BOTTOM,
    });
  });

  test("the two linear directions mirror each other vertically", async () => {
    // The shipped regression had both tilting the same way, so bl-tr rendered
    // as tl-br. Comparing the pair catches that even if a future convention
    // change moves both together.
    const blTr = await dotGradientVector("linear-bl-tr");
    const tlBr = await dotGradientVector("linear-tl-br");
    expect(blTr.x1).toBe(tlBr.x1);
    expect(blTr.x2).toBe(tlBr.x2);
    expect(blTr.y1).toBe(tlBr.y2);
    expect(blTr.y2).toBe(tlBr.y1);
  });
});

describe("gradients survive rasterization", () => {
  /* Corroborates the vectors above in actual pixels. Only the bottom-right
     quadrant is usable: the other three contain finder patterns, and each
     finder carries its own full-range gradient, so they average to the same
     mid-tone whichever direction the dots run. */
  async function bottomRightBias(gradientType: GradientType) {
    const png = await renderPng(design(gradientType), TEST_DATA);
    const image = await loadImage(png);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, image.width, image.height);

    const box = Math.floor(image.width / 4);
    const from = image.width - box;
    let red = 0;
    let blue = 0;
    let n = 0;
    for (let y = from; y < image.width; y++) {
      for (let x = from; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
        if (r > 240 && g > 240 && b > 240) continue;
        red += r;
        blue += b;
        n++;
      }
    }
    if (n === 0) throw new Error("no modules sampled");
    return { red: red / n, blue: blue / n };
  }

  test("tl-br ends blue in the bottom-right, where its gradient terminates", async () => {
    const { red, blue } = await bottomRightBias("linear-tl-br");
    expect(blue).toBeGreaterThan(red * 2);
  });

  test("bl-tr does not, because the bottom-right is only midway along it", async () => {
    const { red, blue } = await bottomRightBias("linear-bl-tr");
    expect(Math.abs(red - blue)).toBeLessThan(60);
  });
});
