# Monorepo restructure blueprint

**Date:** 2026-07-31 · **Status:** proposed · **Scope:** one PR, zero behavior change

Restructure the repo into a Bun-workspace monorepo — `apps/web` (the deployed app) + `packages/core` (framework-free QR logic) — keeping Bun as the package manager and validating the Vercel deploy via the PR's own preview build before merge.

## Why

The QR logic (option mapping, data formatters, presets, share codec) currently lives inside the React app. Planned agent-facing distribution (stdio MCP server on npm, a scannability skill; see the discussion of 2026-07-30) needs that logic without React. Extracting it into a shared package is step zero for every distribution path; skipping it forks the logic and lets agent output drift from web output — different defaults, different presets, eventually different rendering.

## Target layout

```
apps/
  web/            ← today's app; the Vercel deploy (qr-code-gen.frontsail.app)
packages/
  core/           ← @frontsail/qr-core: types, presets, formatters, option mapping, share codec
tools/            ← empty for now; reserved in workspace globs
skills/           ← future SKILL.md folders — deliberately NOT workspace packages
```

Future packages (`packages/mcp`, …) arrive in separate PRs.

## Design decisions

- **Core does not render.** Rendering in Node needs jsdom (and possibly node-canvas); if core imported a renderer, the web app would be one bundler misconfiguration away from shipping jsdom to the browser. Core describes a QR; consumers render it. Consequence: core's only dependency is `lz-string`.
- **Core is private, source-exported, unbuilt.** `"exports": {".": "./src/index.ts"}` — the app's Vite build consumes TS source directly (validated, see below). No versioning ceremony, no changesets, no "which core is the MCP server on". Publish exactly one package later: the MCP server, with core bundled in.
- **Core's tsconfig has no DOM lib.** Browser leakage (`window`, `document`, `localStorage`) becomes a type error rather than a code-review hope.
- **Bun stays.** vp's `vite:monorepo` template defaults to pnpm + catalogs, but vp's workspace discovery also reads `workspaces` from package.json. Validated by experiment — no pnpm migration.
- **Deploy stays config-as-code.** Root `vercel.json` gains `"outputDirectory": "apps/web/dist"`; the root `build` script becomes `vp run web#build`. No dashboard changes unless the preview build proves otherwise.

## Validated assumptions

Validated 2026-07-31 against vite-plus 0.2.4, bun 1.3.3, this repo at `fa7f7d8`.

| #   | Assumption                                         | Verdict   | Evidence                                                                                                                                                                                               |
| --- | -------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | vp workspace discovery works with Bun `workspaces` | Confirmed | Scratchpad experiment: root `workspaces: ["apps/*", "packages/*"]` + `workspace:*` deps; `vp install` succeeded, `vp run` listed `@qr/core#test` and `web#build`, root `vp check` scanned all packages |
| 2   | Core can export raw TS source with no build step   | Confirmed | Same experiment: `web#build` resolved the core package to `./src/index.ts` and built                                                                                                                   |
| 3   | Core unit tests viable per-package                 | Confirmed | Same experiment: `vp test` (vitest) passed inside the package                                                                                                                                          |
| 4   | `vp` binary available in Vercel's build            | Confirmed | `node_modules/.bin/vp → vite-plus/bin/vp`; vite-plus is a root devDep, so `bun run build` resolves it                                                                                                  |
| 5   | Core needs no qr-code-styling dependency           | Confirmed | Only runtime import is `useQRCode.ts:1` (stays in the app); all other src matches are comments                                                                                                         |
| 6   | `QR_TYPES.icon` is dead data                       | Confirmed | `TypeSelector.tsx` maps icons via its own `ICONS` record; no other `.icon` usage in src                                                                                                                |
| 7   | No in-flight work conflicts                        | Confirmed | No open PRs at planning time; PR #12 (transparent background) merged as `fa7f7d8`, the master tip                                                                                                      |
| 8   | Vercel deploy survives the move                    | Partial   | Config side planned below; dashboard state not CLI-inspectable. Mitigated: the PR's Vercel preview build gates the merge                                                                               |

Falsifier for the overall hypothesis — vp's workspace features being pnpm-only — was tested first and did not fire (assumption 1).

## Plan

1. **Root `package.json`:** rename `qr-preview` → `qr-code-generator`; add `"workspaces": ["apps/*", "packages/*", "tools/*"]`; keep `packageManager: bun@1.3.3`; keep vite-plus/typescript as root devDeps; `build` script → `vp run web#build` (what Vercel invokes). Root `vite.config.js` keeps only fmt/lint config, per the vp template pattern.
2. **`packages/core`** — `@frontsail/qr-core`, `"private": true`, dependency `lz-string` only:
   - `types.ts` minus `FormComponentProps` (React-flavored; stays in the app)
   - `constants.ts` minus the dead `icon` field on `QR_TYPES`
   - `qrDataFormatters.ts`, unchanged
   - `shareUrl.ts` with the origin injected as a parameter (currently reads `window.location`)
   - `mapOptionsToQRConfig` + `buildGradient`, lifted out of `useQRCode.ts` (the React hook stays behind)
   - tsconfig `lib: ["ES2020"]` — no DOM
3. **`packages/core/tests`:** vitest units — share-codec round-trip (including the `transparent` sentinel and defaults-stripping), formatter cases (mailto escaping, vCard fields), gradient mapping. First unit tests in the repo; everything was previously exercised only through Playwright.
4. **`apps/web`:** move `src/`, `index.html`, `public/`, app-level `vite.config.js` (react + tailwind plugins), `tsconfig.json`, `tests/`, `playwright.config.js`. Rewrite `../utils/constants`-style imports to `@frontsail/qr-core` (~20 files, mechanical). `FormComponentProps` moves to an app-local types file.
5. **Playwright port fix** (folded in): dedicated port + `reuseExistingServer: false` locally, so `just test` can never silently test another project's dev server squatting on 5173 (this happened during the transparent-background work).
6. **Justfile:** recipe names unchanged — CI calls `just lint-ci` / `test` / `build` and `.github/workflows/ci.yml` needs no edits — bodies become workspace-aware (`vp check` at root; `vp run -r test` covering core units + web e2e; `vp run web#build`).
7. **Vercel:** root `vercel.json` keeps the CSP/security-header and immutable-cache rules, gains `"outputDirectory": "apps/web/dist"`. **Merge gate: the PR's Vercel preview build must be green.** Fallback if framework detection misbehaves: set Root Directory to `apps/web` in the dashboard and move `vercel.json` there (manual step, owner: Dmitri).
8. **Docs & hygiene:** AGENTS.md/README get the layout map; `audit-output/` added to `.gitignore`.

## Project conventions honored

- **[`AGENTS.md`, "Submitting changes"]** `just lint` + `just test` before reporting complete → step 6 keeps these recipes canonical; both run before submission.
- **[`AGENTS.md`, "Submitting changes"]** Changes land via PR, never direct to master → one behavior-change-free PR via `/submit`.
- **[`package.json` `packageManager`, `bun.lock`]** Bun is the package manager → Bun workspaces; the template's pnpm default explicitly rejected (assumption 1).
- **[`.github/workflows/ci.yml`]** CI = `vp install --frozen-lockfile` + just recipes at root → recipe names preserved so ci.yml is untouched.
- **[root `vite.config.js`]** lint/fmt via vp with type-aware oxlint → retained at root; packages inherit.
- Migration tooling, async machinery — don't exist in this repo; don't constrain the plan.

## Risks & mitigations

- **Vercel preview ≠ production settings.** A green preview strongly implies but doesn't prove the production build path. Merge when someone can watch the first production deploy; a failed build does not replace the running deployment, so worst case is a redeploy after a dashboard tweak.
- **Import-rewrite sprawl.** ~20 files change imports; all mechanical, verified by the type-check in `vp check` plus the full Playwright suite.

## Out of scope

MCP server, skill authoring, npm publishing, Node-side rendering. Core's API is shaped to serve them, but nothing agent-facing ships in this PR.

## Success criteria → plan mapping (Confirmed)

- Zero behavior change → 47 Playwright tests moved and passing (step 4), green preview deploy (step 7)
- Core purity → dependency list + DOM-less tsconfig (step 2)
- Ready for future packages → workspace globs (step 1), unit-test pattern established (step 3)

## Open questions

1. Internal package name `@frontsail/qr-core` — cosmetic (private package), default stands unless objected.
2. npm `@frontsail` scope ownership — unverified (local npm token invalid; org page not publicly inspectable). Not blocking this PR; blocks the MCP package's name in PR 2. Action: `npm login` + `npm org ls frontsail`.
3. `tools/*` reserved in workspace globs now — included (costs nothing); objections welcome.
