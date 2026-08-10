import { describe, expect, test } from "vite-plus/test";
import { DEFAULT_CUSTOMIZATION, TRANSPARENT } from "../src/constants";
import { assessScanRisk, relativeLuminance } from "../src/scanRisk";
import type { Customization } from "../src/types";

function design(overrides: Partial<Customization>): Customization {
  return { ...DEFAULT_CUSTOMIZATION, ...overrides };
}

describe("relativeLuminance", () => {
  test("anchors: black is 0, white is 1", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  test("matches the measured boundary greys from the scannability suite", () => {
    // packages/mcp/tests/scannability.test.ts: #7C7C7C last decodes (0.202),
    // #808080 first fails (0.216) under ideal jsQR conditions
    expect(relativeLuminance("#7C7C7C")).toBeCloseTo(0.202, 2);
    expect(relativeLuminance("#808080")).toBeCloseTo(0.216, 2);
  });

  test("expands 3-digit hex", () => {
    expect(relativeLuminance("#fff")).toBeCloseTo(1, 5);
  });
});

describe("assessScanRisk", () => {
  test("default black-on-white design is safe", () => {
    expect(assessScanRisk(DEFAULT_CUSTOMIZATION)).toBeNull();
  });

  test("white-on-white warns that the foreground is too light", () => {
    // The captured repro behind issue #38: an invisible code exported READY
    const risk = assessScanRisk(design({ foregroundColor: "#FFFFFF", backgroundColor: "#FFFFFF" }));
    expect(risk?.kind).toBe("fg-too-light");
  });

  test("the measured ideal-condition failure grey warns", () => {
    expect(assessScanRisk(design({ foregroundColor: "#808080" }))?.kind).toBe("fg-too-light");
  });

  test("greys inside the safety margin warn even though jsQR still decodes them", () => {
    // #7C7C7C decodes on a clean raster; a phone camera has no such luck.
    // Warning inside the margin is intentional — jsQR is an upper bound.
    expect(assessScanRisk(design({ foregroundColor: "#7C7C7C" }))?.kind).toBe("fg-too-light");
  });

  test("a comfortably dark foreground does not warn", () => {
    expect(assessScanRisk(design({ foregroundColor: "#2C4A8A" }))).toBeNull();
  });

  test("dark ink on a near-ink background warns about separation", () => {
    // Measured: decode survives to a luminance gap of ~0.022 (bg #333) under
    // ideal conditions; the product warns at 5x that boundary
    const risk = assessScanRisk(design({ backgroundColor: "#333333" }));
    expect(risk?.kind).toBe("low-separation");
  });

  test("an inverted design warns even though libraries can decode it", () => {
    const risk = assessScanRisk(design({ foregroundColor: "#FFFFFF", backgroundColor: "#1B1812" }));
    expect(risk?.kind).toBe("inverted");
  });

  test("a gradient is judged by its lightest stop", () => {
    const risk = assessScanRisk(
      design({
        gradientType: "linear-bl-tr",
        foregroundColor: "#1B1812",
        foregroundColor2: "#EEEEEE",
      }),
    );
    expect(risk?.kind).toBe("fg-too-light");
  });

  test("a gradient with both stops dark is safe", () => {
    const risk = assessScanRisk(
      design({
        gradientType: "linear-bl-tr",
        foregroundColor: "#1B1812",
        foregroundColor2: "#2C4A8A",
      }),
    );
    expect(risk).toBeNull();
  });

  test("the second color is ignored while the gradient is off", () => {
    const risk = assessScanRisk(design({ gradientType: "none", foregroundColor2: "#FFFFFF" }));
    expect(risk).toBeNull();
  });

  test("a transparent background is assessed as a light backdrop", () => {
    expect(assessScanRisk(design({ backgroundColor: TRANSPARENT }))).toBeNull();
    expect(
      assessScanRisk(design({ backgroundColor: TRANSPARENT, foregroundColor: "#DDDDDD" }))?.kind,
    ).toBe("fg-too-light");
  });
});
