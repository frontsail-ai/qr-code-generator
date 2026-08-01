/* The quiet zone is the empty border a QR symbol needs so a scanner can find
   its edges. ISO/IEC 18004 requires at least 4 modules on all four sides.

   qr-code-styling does not take a quiet zone directly: it derives the module
   size from the canvas size and the `margin` option, then centres the symbol —
   so whatever rounding slack is left over lands in the margin as well. Picking
   a margin therefore does not give a predictable quiet zone. Pick the module
   size instead, and let the margin be whatever is left. */

/** Modules of clear space required on every side. */
export const QUIET_ZONE_MODULES = 4;

/* Used when the module count cannot be determined. Safe for every symbol
   version — it yields more than the required 4 modules at version 1 and
   progressively more above it — at the cost of overshooting on large symbols. */
const FALLBACK_MARGIN_RATIO = 0.14;

/**
 * The `margin` to hand qr-code-styling so the rendered symbol carries at least
 * `quietModules` of clear space per side.
 *
 * Pass `null` for `moduleCount` when the symbol size is unknown; the result is
 * then a conservative ratio of the canvas rather than an exact fit.
 */
export function quietZoneMargin(
  moduleCount: number | null,
  canvasSize: number,
  quietModules: number = QUIET_ZONE_MODULES,
): number {
  if (canvasSize <= 0) return 0;
  if (moduleCount === null || moduleCount <= 0) {
    return Math.floor(canvasSize * FALLBACK_MARGIN_RATIO);
  }

  // The largest module size that still leaves room for the symbol plus the
  // quiet zone on both sides.
  const target = Math.floor(canvasSize / (moduleCount + quietModules * 2));

  /* Below one pixel per module there is nothing useful to do: the canvas is
     too small to hold the symbol and its quiet zone, and shrinking further
     would destroy the symbol to protect its border. Such a render is already
     undecodable; leave the margin alone rather than making it worse. */
  if (target < 1) return 0;

  return Math.floor((canvasSize - moduleCount * target) / 2);
}
