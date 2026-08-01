import { describe, expect, test } from "vite-plus/test";
import { QUIET_ZONE_MODULES, quietZoneMargin } from "../src/quietZone";

/* Mirrors how qr-code-styling turns a margin back into a rendered layout: it
   derives the module size from the space left after the margin, then centres
   the symbol, so leftover slack widens the quiet zone. Verifying against this
   is what makes the margin values meaningful rather than arbitrary. */
function renderedQuietZone(moduleCount: number, canvasSize: number, margin: number): number {
  const module = Math.floor((canvasSize - 2 * margin) / moduleCount);
  if (module < 1) return 0;
  return (canvasSize - moduleCount * module) / 2 / module;
}

// Symbol sizes for versions 1..40 are 21 + 4*(v-1) modules.
const VERSIONS = [1, 2, 3, 5, 8, 10, 15, 17, 20, 27, 33, 40].map((v) => ({
  version: v,
  modules: 21 + 4 * (v - 1),
}));

describe("quietZoneMargin", () => {
  for (const canvasSize of [280, 560]) {
    test(`yields at least ${QUIET_ZONE_MODULES} modules at every version on a ${canvasSize}px canvas`, () => {
      for (const { version, modules } of VERSIONS) {
        const margin = quietZoneMargin(modules, canvasSize);
        const quiet = renderedQuietZone(modules, canvasSize, margin);
        // Version 40 does not fit on a 280px canvas at one pixel per module
        // plus a border; that render is undecodable either way.
        if (Math.floor(canvasSize / (modules + 2 * QUIET_ZONE_MODULES)) < 1) continue;
        expect(
          quiet,
          `v${version} (${modules} modules) on ${canvasSize}px gave ${quiet.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(QUIET_ZONE_MODULES);
      }
    });
  }

  test("leaves the module size as large as the quiet zone allows", () => {
    // v1 on 280px: 25 modules + 8 of quiet zone = 33 units, so 8px each.
    expect(quietZoneMargin(25, 280)).toBe(40);
    expect(renderedQuietZone(25, 280, 40)).toBe(5);
  });

  test("is a no-op when rounding slack already exceeds the requirement", () => {
    // 81 modules on 280px floor to 3px each, leaving 18px — already 6 modules.
    const margin = quietZoneMargin(81, 280);
    expect(renderedQuietZone(81, 280, margin)).toBe(renderedQuietZone(81, 280, 0));
  });

  test("falls back to a safe ratio when the module count is unknown", () => {
    const margin = quietZoneMargin(null, 280);
    expect(margin).toBeGreaterThan(0);
    // Safe across the whole version range, which is the point of the fallback.
    for (const { modules } of VERSIONS) {
      if (Math.floor((280 - 2 * margin) / modules) < 1) continue;
      expect(renderedQuietZone(modules, 280, margin)).toBeGreaterThanOrEqual(QUIET_ZONE_MODULES);
    }
  });

  test("gives up rather than destroying a symbol that cannot fit", () => {
    // 177 modules on a 100px canvas cannot hold the symbol plus a border.
    expect(quietZoneMargin(177, 100)).toBe(0);
  });

  test("handles degenerate inputs without producing a negative margin", () => {
    expect(quietZoneMargin(0, 280)).toBeGreaterThanOrEqual(0);
    expect(quietZoneMargin(-5, 280)).toBeGreaterThanOrEqual(0);
    expect(quietZoneMargin(25, 0)).toBe(0);
  });

  test("honours a caller-supplied quiet-zone width", () => {
    const four = quietZoneMargin(25, 560, 4);
    const eight = quietZoneMargin(25, 560, 8);
    expect(eight).toBeGreaterThan(four);
    expect(renderedQuietZone(25, 560, eight)).toBeGreaterThanOrEqual(8);
  });
});
