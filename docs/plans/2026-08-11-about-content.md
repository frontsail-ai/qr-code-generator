# Discovery content blueprint

**Date:** 2026-08-11 · **Status:** proposed · **Scope:** one PR — a below-the-fold content section in `apps/web`; no workspace behavior change

Fix [#79](https://github.com/frontsail-ai/qr-code-generator/issues/79): the page competes on "qr code generator" with almost no indexable text. Add the page's words — six notes on what actually differentiates this generator — below the workspace, prerendered by construction.

## Root-cause note

This ticket is a gap, not a regression, so the why-chain is short: the app has no prose because it was built as a pure workspace (every doc in `docs/plans/` is a feature blueprint; none mention discovery content), because no discovery requirement existed until the positioning expanded to "browser, code, agent" (#75–#77, 2026-08-11), and no SEO review had ever run until the one that produced #78–#82. Same root as #78 — that PR was the _visibility_ half (prerender), this is the _content_ half. Siblings #80–#82 are tracked separately.

## Design decisions

- **Below the fold, by invariant.** The workspace owns the first viewport; the notes begin after it. The 99% who came to make a QR code never see the section uninvited; crawlers and curious humans scroll. Pinned by a test asserting the heading is _not_ in the initial viewport.
- **The flex trap.** The root column is `min-h-screen flex flex-col` with the app row at `flex-1` — appending a tall sibling would have _compressed the workspace_ (flex redistributes when the container grows past the viewport). The row now carries `min-h-[calc(100vh-3.5rem)]`, replacing `min-h-0`; the short-window suite plus a dedicated test hold the geometry.
- **Content is claims the product actually keeps**, in the app's voice: client-side privacy, codes that never expire, share links carrying the design, measured scannability, agent integration, free/no-watermark exports. Long-tail queries ("no sign up", "without watermark", "never expires", "AI agents / MCP") are carried by the claims themselves, not keyword stuffing.
- **No fourth copy of install commands.** The agent note links to GitHub and points at the header's Agent setup dialog; it names no package, so the drift guards in `packages/mcp/tests/skill.test.ts` gain no new source to police.
- **Crawler-visible by construction** — static JSX flows through #83's prerender; the `crawler` project now also asserts the section's words in the raw HTML.
- **Inside the root div, not a sibling** — the section consumes `--consent-inset` (set on the root div) so its tail padding clears the consent banner and the mobile export bar, per the AGENTS.md rule that everything near the bottom edge accounts for the inset explicitly.

## Plan

1. `src/components/AboutSection.tsx` — eyebrow, h2, intro line, six-note `<dl>` grid.
2. `App.tsx` — render after the drawer block; app row `min-h` change.
3. `tests/about.spec.js` — fold discipline, readability, no horizontal overflow, workspace-height guard.
4. `tests/crawler.spec.js` — raw-HTML and JS-off assertions for the section's words.

## Out of scope

- Meta description trim (#80), font self-hosting (#81), sitemap lastmod (#82).
- Any change to workspace behavior or layout above the fold.
