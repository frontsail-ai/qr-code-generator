# Quiet-zone export fix blueprint

**Date:** 2026-08-01 · **Status:** proposed · **Scope:** one PR, rendered output changes, approved

Every QR this project renders — web preview, both web downloads, both MCP formats — gains a quiet zone of at least 4 modules, filled with the background colour. Transparent backgrounds stay transparent.

## Why

[PR #17](https://github.com/frontsail-ai/qr-code-generator/pull/17)'s harness measured what the exports actually ship: **0.18 modules** of quiet zone for short content, up to 6 for near-capacity. [ISO/IEC 18004](https://cdn.standards.iteh.ai/samples/83389/dee29007cb62437f9767323e6af02f90/ISO-IEC-18004-2024.pdf) requires at least 4 on all four sides. The margin that exists today is integer-rounding slack, not a design decision, so it varies with payload length and disappears exactly in the common case — a short URL.

The app hides the problem rather than showing it. The preview card's padding supplies on screen the margin the exported file lacks, so a design looks safe right up to the moment someone drops the bare export onto a photo. The skill shipped in #17 can only tell agents to compensate; this makes the generator stop creating the problem.

## Decisions (settled before this document)

- **Option A: canvas sizes stay 280 (SVG) / 560 (PNG); the symbol shrinks inside them.** Growing the canvas would preserve module size but break the fixed-size contract and the UI's `280 × 280` annotation. At v1 the shrink leaves 8px per module — 4× the ~2px/module decode floor #17 measured — and by v10 the change is a no-op because rounding slack already exceeds 4 modules.
- **Margin is computed per render from the actual module count**, not a fixed ratio. A fixed 14% margin is safe but overshoots badly on large symbols; per-render keeps the overshoot to what integer module sizes force.
- **Preview and exports move together.** WYSIWYG is the point, and a preview that shows the real quiet zone is the honest render. The preview card's padding comes down so the card does not read double-padded.
- **Always on.** Not a toggle, not a share-link payload field. A quiet zone is a correctness property, not a style.

## The formula

qr-code-styling derives the module size from the canvas and the margin, then _centres_ the symbol — so leftover rounding slack lands in the margin as well. Choosing a margin directly therefore does not give a predictable quiet zone. Choose the module size instead:

```
target = floor(canvasSize / (moduleCount + 2 * quietModules))
margin = floor((canvasSize - moduleCount * target) / 2)
```

Pick the largest module size that leaves room for the symbol plus 4 modules each side, then hand the leftover half to the margin. Because the library re-derives the module size from that margin, the result lands on `target` and the quiet zone is at least the 4 modules asked for.

### Measured across the version range

`before` is today's output; `after` is with the formula applied. Every case clears 4 modules.

| Case             | modules | 280px before    | 280px after | 560px before    | 560px after |
| ---------------- | ------- | --------------- | ----------- | --------------- | ----------- |
| v1 (20 chars)    | 25      | 11px / **0.18** | 8px / 5.00  | 22px / **0.23** | 16px / 5.00 |
| v3 (50 chars)    | 37      | 7px / **1.43**  | 6px / 4.83  | 15px / **0.13** | 12px / 4.83 |
| v5 (100 chars)   | 49      | 5px / **3.40**  | 4px / 10.50 | 11px / **0.91** | 9px / 6.56  |
| v10 (300 chars)  | 81      | 3px / 6.00      | 3px / 6.00  | 6px / 6.17      | 6px / 6.17  |
| v17 (700 chars)  | 117     | 2px / 11.50     | 2px / 11.50 | 4px / 11.50     | 4px / 11.50 |
| v27 (1200 chars) | 153     | 1px / 63.00     | 1px / 63.00 | 3px / 16.67     | 3px / 16.67 |
| v33 (1600 chars) | 177     | 1px / 51.00     | 1px / 51.00 | 3px / **4.67**  | 3px / 4.67  |

Reading the table:

- **Worst case after the fix is 4.67 modules** (v33 at 560px), best-case overshoot is 10.50 (v5 at 280px). Overshoot is forced by integer module sizes — asking for 4 modules when the module size floors from 4.67px to 4px hands the difference to the margin.
- **From v10 upward the change is a no-op**: those symbols already carry ≥4 modules of slack, and `after` equals `before` exactly. The fix bites precisely where the problem was, on small symbols.
- **The cost is module size on small symbols**: 11px → 8px at v1/280, 22px → 16px at v1/560. Both remain far above the ~2px/module floor.
- Extreme overshoot at v27/280 (63 modules) is pre-existing, not introduced here — at 1px per module that render is unusable regardless.

## How the module count is obtained

The count is only known once the symbol is built, and the margin must be passed to the constructor — so each consumer constructs twice: once to read the count, once to render. A bare construction costs **3.28ms** (50 constructions in 164ms), so the preview's debounced re-render absorbs it.

`QRCodeStyling` exposes the count at `_qr.getModuleCount()`. That is a private field, so the accessor is guarded: when it is unavailable, `quietZoneMargin` falls back to a fixed ratio that is safe for every version (verified: 14% of the canvas yields ≥5 modules at v1 and more above it). A test asserts the private path still works, so a library upgrade that breaks it fails CI rather than silently shipping codes with no quiet zone.

Alternatives rejected: computing the version from data length and EC level in core would reimplement mode-selection rules from the spec and could drift from the library's own choices; rendering once and parsing the SVG to count modules costs a full render rather than a construction.

## Plan

1. **`packages/core`** — export `quietZoneMargin(moduleCount, canvasSize, quietModules = 4)`, pure and DOM-free, plus the `QUIET_ZONE_MODULES` constant. Unit tests cover the version range, the fallback path, and the degenerate case where the canvas is too small to help.
2. **`apps/web/src/hooks/useQRCode.ts`** — two-pass construction for both the 280px preview instance and the 560px PNG download instance.
3. **`packages/mcp/src/render.ts`** — same two-pass in `renderRawSvg`, so SVG and the resvg-rasterized PNG both carry it.
4. **`apps/web/src/components/QRPreview.tsx`** — reduce the card padding so the card does not read double-padded now that the code supplies its own margin. The `280 × 280` drafting annotation stays truthful because the canvas size is unchanged.
5. **Tests that must move**: the four parity goldens regenerate from the corrected app; `scannability.test.ts`'s quiet-zone case flips from "rounding slack, not a designed quiet zone" to asserting ≥4 modules across the version range; one Playwright download test gains a pixel-level assertion that decodes the exported PNG and measures the background border in modules, rather than inferring from the DOM.
6. **Docs and version**: `SKILL.md`'s quiet-zone trap is rewritten — the warning becomes "exports before this version lack it" and the advice to add margin manually goes away; MCP tool descriptions updated; README size claims re-verified (they stay valid under Option A); MCP bumped to 0.2.0 with `SERVER_VERSION` in step, which the manifest test already pins; `RELEASING` gains "publish only from a merged master checkout"; AGENTS.md gains the line about which defences actually work here.

## Project conventions honored

- **[`AGENTS.md`]** `just lint` + `just test` before reporting complete → both run.
- **[repo PR conventions]** This changes rendered output, so the PR body carries before/after screenshots.
- **[PR #15 / #16]** Version bumps touch both `package.json` and `SERVER_VERSION`; the manifest test enforces it.
- **[PR #17]** Every claim in the skill is cited or measured → the rewritten quiet-zone section is backed by the table above and by the flipped test.

## Risks & mitigations

- **Every existing share link re-renders with a quiet zone.** Approved. The encoded design is unchanged; only the rendering moves, and it moves toward the standard.
- **Small symbols lose module size.** Quantified above; the worst case stays 4× the measured decode floor.
- **The `_qr` private accessor could break on upgrade.** Guarded fallback plus a test that fails loudly.
- **Two constructions per render.** 3.28ms each, behind an existing debounce.

## Out of scope

Publishing 0.2.0 to npm — a separate consented step. A user-facing quiet-zone control. Changing export dimensions. Print-specific sizing guidance.

## Success criteria → plan mapping

- Every export carries ≥4 modules → formula (step 1) applied in both consumers (steps 2–3), asserted by the flipped test and the Playwright pixel measurement (step 5)
- Transparent stays transparent → verified before writing this; the margin is painted by the background rect, which is `fill="transparent"` in that mode
- No stale guidance → skill and tool descriptions updated in the same PR (step 6)
