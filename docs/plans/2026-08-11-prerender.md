# Build-time prerender blueprint

**Date:** 2026-08-11 · **Status:** proposed · **Scope:** one PR — `apps/web` build pipeline + one e2e project; no runtime behavior change for browsers with JavaScript

Fix [#78](https://github.com/frontsail-ai/qr-code-generator/issues/78): crawlers that do not execute JavaScript see an empty page. Render the app to HTML at build time and inject it into `dist/index.html`, so the deployed shell carries the page's actual words.

## Root-cause analysis

**Symptom.** `curl https://qr-code-gen.frontsail.app/` returns ~4KB: a full `<head>`, and a body containing only `<div id="root"></div>`. Every visible word exists only after React renders. Affected: all non-JS-executing crawlers — which includes the AI crawlers (GPTBot, ClaudeBot, PerplexityBot) the agent positioning courts. Google renders JS and is only mildly affected (render-queue latency).

**Why-chain (each link verified):**

1. Non-JS crawlers see an empty page → the served body is a bare mount point. _Evidence: live curl, 4058 bytes; `index.html:77-79`._
2. The body is bare → the app is a client-rendered SPA; all DOM is produced by `main.tsx` at runtime. _Evidence: `src/main.tsx:15` (`createRoot(rootElement).render(…)`)._
3. Nothing renders at build time → Vite's SPA build copies `index.html` through unchanged; the project has no prerender/SSR step. _Evidence: `vite.config.js` (no ssr/prerender config); built `dist/index.html` body identical to source._
4. No prerender step was ever added → the app began as a pure-client tool whose SEO surface was head-only (title/meta/JSON-LD), which was sufficient until the agent positioning (PRs #75–#77, 2026-08-11) made non-JS crawlers an audience. _Evidence: `docs/plans/` — no plan mentions crawlers before this one._
5. Nothing caught the gap → every e2e test runs in a browser with JavaScript on, so the entire suite sees post-render DOM; no check reads the built artifact. _Evidence: `playwright.config.js` — single chromium project against `vp dev`._

**Root cause:** the build pipeline produces no crawler-visible content, **and no check measures what a crawler sees** — the missing guardrail is what let the gap persist unnoticed. (Proximate cause: the empty `#root` div; symptom fix would be hand-written `<noscript>` content, rejected below.)

**Siblings:** the llms.txt 404 (fixed, #77); issue #79's future content section would have been equally invisible — this fix is its prerequisite.

## Validated assumptions

Validated 2026-08-11 on darwin/arm64 against this repo at `276775a`:

| #   | Assumption                                                                      | Result                                                      | Evidence                                                                                          |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | `vp build --ssr src/entry-server.tsx` produces a Node-loadable renderer         | **Confirmed**                                               | Build succeeds, 137KB `dist-server/entry-server.js`                                               |
| 2   | `renderToString(<App/>)` works in Node under a jsdom + `matchMedia` shim        | **Confirmed**                                               | Experiment: 37,936 chars, H1 and empty-state prose present                                        |
| 3   | Render-phase browser access is limited to `matchMedia`/storage                  | **Confirmed**                                               | `useMediaQuery.ts:4` (initializer); `safeStorage.ts:25`; effects don't run under `renderToString` |
| 4   | Vercel's build has no browser, so the prerender must be Node-only               | **Confirmed by design choice**                              | jsdom path chosen; no chromium dependency                                                         |
| 5   | `createRoot().render()` over prerendered children replaces them cleanly on boot | **Confirmed**                                               | React replaces the container's children at first commit; verified manually with JS on             |
| 6   | Vercel's build command runs the web package's `build` script                    | **UNVERIFIED** — dashboard config not visible from the repo | Post-merge check: curl production and grep the H1                                                 |

## Design decisions

- **Prerender, not `<noscript>` content.** Hand-written static content is a second copy of the app's words with no guard, and content visible only to non-JS agents drifts toward cloaking. The prerender ships the _same_ markup React produces.
- **`renderToString` under jsdom, not a headless browser.** Node-only keeps the chain identical on dev machines, CI, and Vercel's browserless build image. jsdom is already this repo's answer to "render web things in Node" (`packages/mcp`). The missing `matchMedia` is shimmed to answer min-width queries true, so the prerender is the desktop layout — the fullest content surface; real clients re-render to their own layout on boot.
- **The prerender fails the build loudly** (output length, H1 presence, mount-point presence). A silently-skipped injection ships the old empty shell — plausible output, the project's characteristic bug.
- **The guardrail is a second Playwright project (`crawler`)** with `javaScriptEnabled: false` against the _built_ output (`vpr build && vp preview`), asserting the words exist in the raw HTML and render styled without JS. This is the class-prevention: any future change that empties the built page turns CI red.

## Plan

1. `src/entry-server.tsx` — SSR entry exporting `render()`.
2. `scripts/prerender.mjs` — jsdom shim, render, inject into `dist/index.html`, loud failure modes.
3. `package.json` `build` → `vp build && vp build --ssr … && node scripts/prerender.mjs`; `jsdom` devDependency; `dist-server/` gitignored.
4. `playwright.config.js` — `crawler` project + preview webServer; `tests/crawler.spec.js`.
5. AGENTS.md — record the build shape and the invariant.

## Risks & mitigations

- **Assumption 6 (Vercel build command) is unverified** → check production HTML right after merge; if the deploy bypasses the npm script, set `buildCommand` in `vercel.json` as the follow-up.
- Prerendered markup diverging from client markup → not hydration, so no mismatch errors; React replaces wholesale. The crawler spec pins the words, the chromium suite pins the behavior.

## Out of scope

- The content section itself (#79) — this PR makes it crawler-visible once written.
- Self-hosted fonts (#81), meta length (#80), sitemap lastmod (#82).
