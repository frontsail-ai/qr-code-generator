import { isTransparent } from "./constants";
import type { Customization } from "./types";

/* Scan-risk heuristics for a color design, anchored to the measurements in
   packages/mcp/tests/scannability.test.ts. The model those tests establish:
   a QR binarizer thresholds *luminance* to decide which modules are dark, so
   what predicts decode is whether the dark modules are genuinely dark — not
   the WCAG contrast ratio between the two colours (a pale-grey-on-white code
   passes WCAG 3:1 for graphics and does not scan).

   Measured decode boundaries under ideal conditions (jsQR on a clean raster —
   a generous upper bound on what a phone camera tolerates, hence the margins
   below): a grey foreground on white last decodes at #7C7C7C (relative
   luminance 0.202) and first fails at #808080 (0.216); the default ink keeps
   decoding on backgrounds darkened to a luminance gap of only ~0.022. If the
   scannability suite's thresholds move, revisit these constants. */

export type ScanRiskKind = "inverted" | "fg-too-light" | "low-separation";

export interface ScanRisk {
  kind: ScanRiskKind;
  message: string;
}

/* Ideal-condition failure starts at 0.216; warn ~30% below it so real
   cameras, print gain and glare keep a margin. */
const FG_LUMINANCE_MAX = 0.15;

/* Ideal-condition decode survives a gap of ~0.022; warn at 5x that. */
const MIN_LUMINANCE_GAP = 0.1;

/* WCAG relative luminance — the same formula the measurement harness uses. */
export function relativeLuminance(hexColor: string): number {
  const hex = hexColor.replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const channel = (offset: number): number => {
    const c = Number.parseInt(full.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/* Returns the highest-priority risk for the design's colours, or null when
   the colours look safe. A transparent background is assessed as white: the
   recommended placement for a transparent export is a light surface, and the
   export hint already tells the user the backdrop is theirs to control. */
export function assessScanRisk(customization: Customization): ScanRisk | null {
  const { foregroundColor, foregroundColor2, gradientType, backgroundColor } = customization;

  const fgStops = gradientType === "none" ? [foregroundColor] : [foregroundColor, foregroundColor2];
  // The lightest stop is the one a binarizer loses first
  const fgLum = Math.max(...fgStops.map(relativeLuminance));
  const bgLum = isTransparent(backgroundColor) ? 1 : relativeLuminance(backgroundColor);

  if (fgLum > bgLum) {
    return {
      kind: "inverted",
      message:
        "Light modules on a dark background — many scanner apps cannot read inverted codes. Swap the colors, or put the code on a light panel.",
    };
  }
  if (fgLum > FG_LUMINANCE_MAX) {
    return {
      kind: "fg-too-light",
      message:
        "The foreground may be too light to scan reliably — decoders need the dark modules genuinely dark. Darken the foreground.",
    };
  }
  if (bgLum - fgLum < MIN_LUMINANCE_GAP) {
    return {
      kind: "low-separation",
      message:
        "The foreground and background are too close in brightness to scan reliably. Lighten the background or darken the foreground.",
    };
  }
  return null;
}
