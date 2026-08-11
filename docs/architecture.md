# Architecture

A client-only product with three delivery surfaces sharing one core: the browser workspace, an MCP server for agents, and a static discovery surface. There is no backend anywhere — every design is computed and stored on the user's device (see INV-16).

## Layers

```
apps/web ───────────┐
                    ├──▶ packages/core ──▶ qr-code-styling ──▶ SVG / PNG
packages/mcp ───────┘
skills/qr-code  (prose: teaches agents which designs scan; no code)
```

| Layer                                  | Why it exists                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core` (`@frontsail/qr-core`) | Everything that has nothing to do with React: types, presets, the five data formatters, the qr-code-styling option mapping, the share-link codec, and the scan-risk thresholds. Framework-free and DOM-free by type-level enforcement (see INV-2), consumed as raw TypeScript source — no build step. It exists so the web app and the MCP server cannot disagree about what a design is (see INV-3). |
| `apps/web`                             | The deployed workspace: React 19 components, hooks owning each concern (draft, history, undo, consent, logo intake), `index.html` with the SEO head, and the Playwright suite.                                                                                                                                                                                                                        |
| `packages/mcp`                         | The stdio MCP server exposing `generate_qr_code` and `create_share_link`. The only publishable package; bundles core at pack time (see INV-18). Published to npm via tag-triggered trusted publishing with version-agreement gates.                                                                                                                                                                   |
| `skills/qr-code`                       | The judgment layer the tools deliberately lack — scannability guidance in the Agent Skills format, versioned and drift-guarded against the manifests (see INV-17).                                                                                                                                                                                                                                    |

## Key mechanisms

- **Design state → render**: one `SaveConfigInput` shape flows from forms through `formatQRData` (emptiness + escaping, INV-3/INV-4) into the qr-code-styling option mapping. The web app renders via the DOM; the MCP server renders via jsdom + resvg, byte-parity guarded.
- **Share links**: the whole design compresses (lz-string) into the URL fragment — the codec lives in core, the browser supplies `location`. Nothing is stored server-side; the hash is consumed and stripped on arrival (APP-10).
- **Storage**: `safeStorage.ts` is the only module that touches Web Storage (lint-enforced); draft per-tab, history shared, every write's result surfaced (INV-7/INV-8).
- **The build prerenders**: three stages (client build → `--ssr` build of `entry-server.tsx` → `scripts/prerender.mjs` under a jsdom shim) so the served HTML carries the page's words and the sitemap gets stamped (INV-15). Node-only on purpose — Vercel's build image has no browser.
- **Bottom-edge layout**: the consent banner publishes its measured height as `--consent-inset`; every bottom-anchored element consults it individually — there is deliberately no global "safe viewport" (INV-11).
- **The one modal** (Agent setup) is a native `<dialog>` in the top layer; the undo keyboard gates on it and the undo clock holds while it's open (INV-14).

## Tech choices

| Choice                                                           | Reason                                                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| React 19 + TypeScript                                            | The workspace is deeply stateful; strict types carry the design-shape contract                  |
| Vite+ (`vp`)                                                     | One CLI for dev/build/test/lint/format (Oxlint/Oxfmt); `--ssr` builds power the prerender       |
| Bun workspaces                                                   | Monorepo package management; core consumed as raw TS source                                     |
| Tailwind v4 + `plico.css` tokens                                 | The design system is a token file; components use arbitrary-value classes against it            |
| qr-code-styling                                                  | The one renderer both surfaces share                                                            |
| resvg + @napi-rs/canvas (mcp only)                               | Browserless PNG rasterization; node-canvas is banned (INV-18)                                   |
| Playwright (3 projects: chromium, crawler, + vitest in packages) | The crawler project runs JS-disabled against the built artifact — the discovery surface's proof |
| Vercel (static, CSP in `vercel.json`)                            | Static hosting matches "no backend"; the CSP is a guardrail, not a formality (INV-16)           |

## Intentionally simple

One page, no router, no state library, no i18n, no server rendering at request time (the prerender is build-time). `tools/*` is reserved in the workspace globs for later. Historical design rationale lives in `docs/plans/` blueprints, one dated file per shipped change.
