# MCP server blueprint

**Date:** 2026-07-31 · **Status:** implemented ([PR #14](https://github.com/frontsail-ai/qr-code-generator/pull/14)) · **Scope:** one PR, new package, no change to `apps/web`

Add `packages/mcp` — `@frontsail/qr-mcp`, a stdio MCP server that lets an agent generate the same QR codes the web app generates, and mint the same shareable links, without a browser. Publishable but not published in this PR.

## Why

The web app is the only way to use this QR logic today. An agent asked to "make a QR code for this URL with our brand colors" either drives a browser or reaches for a different library — and a different library means different defaults, different presets, and output that stops matching what the team's own site produces. [PR #13](https://github.com/frontsail-ai/qr-code-generator/pull/13) extracted the framework-free logic into `@frontsail/qr-core` precisely so a second consumer could exist. This is that consumer.

The value is specifically _fidelity_: not "an agent can make a QR code" (many tools do that) but "an agent makes **this** QR code" — same dot styles, same corner styles, same palette, same transparent-background sentinel, same share links.

## Target layout

```
packages/
  core/           unchanged
  mcp/            ← @frontsail/qr-mcp: stdio server, two tools
    src/
      index.ts        bin entry — wires the server to stdio
      server.ts       tool registration (importable without stdio, for tests)
      render.ts       the render pipeline + hard timeout
      sanitize.ts     SVG fixups for the rasterizer
      design.ts       tool input -> core's Customization/FormDataMap
      logo.ts         data-URI / absolute-path logo resolution
    tests/
      fixtures/       a real-world PNG logo + golden SVGs
```

## Design decisions

- **Render pipeline is fixed: jsdom + `@napi-rs/canvas` (as `nodeCanvas`) + `@resvg/resvg-js` rasterizing a sanitized SVG.** Two prior experiments (2026-07-31) converged on this after several pipelines produced silently-wrong output rather than errors. It is not a preference; the alternatives are broken.
- **The library's own canvas/PNG path is forbidden.** `type: "canvas"` + `getRawData("png")` drops logos silently on `canvas@2` and, with `@napi-rs/canvas`, renders solid squares. PNG is always produced by rasterizing the SVG through resvg.
- **The `canvas` (node-canvas) package is not a dependency and must not become one.** 19 MB, a `prebuild-install || node-gyp` postinstall that npm ≥ 11.16 is moving to block, and it segfaults under Bun. `@napi-rs/canvas` is napi-prebuilt with no install script.
- **`nodeCanvas` is passed unconditionally, and every `getRawData` call is wrapped in a hard timeout.** Without a canvas implementation, SVG-with-logo returns a promise that never settles — no error, no rejection. For a stdio MCP server that is a tool call that never returns, which is strictly worse for an agent than a failure it can report. The timeout converts the worst failure mode into an ordinary one.
- **Sanitize for the rasterizer only; return the SVG raw.** The `url('#id')` → `url(#id)` rewrite is required by resvg (unsanitized input renders a solid square) but changes bytes. Applying it only on the PNG path keeps the SVG the tool returns byte-identical to what the web app downloads. Both forms are valid SVG, so nothing is lost.
- **Core is bundled into the published artifact; runtime deps stay external.** Core exports raw TypeScript with extensionless imports and depends on UMD `lz-string` — neither is loadable by plain Node. `vp pack` inlines both into one ESM file (validated below). The published package therefore has no dependency on a private workspace package.
- **Parity is claimed precisely.** Non-logo SVG is byte-identical to the web app's download and is guarded by a golden-file test. Logo SVGs and all PNGs are _the same design_, not the same bytes: the library re-encodes logos through a canvas (`imageOptions.saveAsBlob`), and Chromium and resvg are different rasterizers. Overclaiming here would be a promise the package cannot keep.
- **Validation failures are MCP tool errors, never crashes.** `qr-code-styling` throws bare strings (not `Error`s) when content exceeds QR capacity, so the catch path must normalize before reporting.

## Validated assumptions

Validated 2026-07-31 on darwin/arm64, Node 24.18.1, against this repo at `464d7ee`.

| #   | Assumption                                                        | Verdict   | Evidence                                                                                                                                                              |
| --- | ----------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pipeline renders all four design classes                          | Confirmed | Scratchpad probe: plain/gradient/transparent/logo all produced SVG + PNG; transparent PNG had 168 448 zero-alpha pixels at 560px, logo PNG 12 544 logo-colored pixels |
| 2   | Raw (unsanitized) SVG is byte-identical to the web app's download | Confirmed | Node output vs the Playwright-captured browser downloads from the 2026-07-31 experiment: identical for plain, both gradients, and transparent, modulo the id counter  |
| 3   | `vp pack` bundles core + `lz-string`, keeps runtime deps external | Confirmed | Scaffold build: `dist/index.mjs`, 16.3 kB; tsdown reported `Detected dependencies in bundle: lz-string`; only `import { JSDOM } from "jsdom"` survives as an external |
| 4   | MCP SDK's current API is `McpServer` + `registerTool`             | Confirmed | `@modelcontextprotocol/sdk@1.30.0` `dist/esm/server/mcp.d.ts`: all six `tool()` overloads carry `@deprecated Use registerTool instead`                                |
| 5   | No runtime dependency runs an install script                      | Confirmed | `scripts` of sdk / jsdom / `@napi-rs/canvas` / `@resvg/resvg-js` contain no `install`/`preinstall`/`postinstall`; jsdom's `prepare` runs only for git installs        |
| 6   | Native deps ship per-platform prebuilds                           | Confirmed | Install pulled only `@napi-rs/canvas-darwin-arm64` and `@resvg/resvg-js-darwin-arm64`; other platforms are `optionalDependencies` gated by `os`/`cpu`                 |
| 7   | npm `@frontsail` scope is usable                                  | **No**    | `npm whoami` → E401 (token still invalid, same as PR #13's open question 2). `@frontsail/qr-mcp` and `@frontsail/qr-core` both 404 — free, but ownership unverifiable |

Assumption 7 is why this PR stops short of publishing.

### Dependency weight

| Package                     | Installed size | Role                                    |
| --------------------------- | -------------- | --------------------------------------- |
| `@napi-rs/canvas`           | 25.9 MB        | `nodeCanvas` for the library            |
| `jsdom`                     | 25.8 MB        | DOM for `qr-code-styling`               |
| `@modelcontextprotocol/sdk` | 23.9 MB        | protocol + stdio transport              |
| `@resvg/resvg-js`           | 3.4 MB         | SVG → PNG                               |
| `qr-code-styling`           | 0.8 MB         | the renderer                            |
| **Combined**                | **80 MB**      | what `npx -y @frontsail/qr-mcp` fetches |

80 MB is a real cold-start cost, paid once per npx cache generation. It is dominated by three deps that are each hard to avoid: jsdom is what makes the library run at all, the napi canvas is what stops the logo path hanging, and the SDK's own tree (express, hono, jose, ajv) is not ours to trim. Noted as a risk, not solved here.

## Plan

1. **`packages/mcp` package manifest.** `@frontsail/qr-mcp` v0.1.0, `"type": "module"`, `bin: { "qr-mcp": "./dist/index.mjs" }`, `files: ["dist"]`, `exports` pointing at the built ESM. Runtime deps: MCP SDK, jsdom, `@napi-rs/canvas`, `@resvg/resvg-js`, `qr-code-styling`, `zod`. `@frontsail/qr-core` sits in **devDependencies** — that is what makes `vp pack` inline it rather than emit an unresolvable import.
2. **`render.ts`.** `renderSvg(design, data)` → raw SVG string; `renderPng(design, data)` → PNG buffer via `new Resvg(sanitize(svg), { fitTo: { mode: "width", value: 560 } })`. Both go through one internal `getRawDataWithTimeout` helper that always supplies `nodeCanvas`. A lower-level export exists purely so a test can omit `nodeCanvas` and prove the timeout fires.
3. **`sanitize.ts`.** `url('#id')` → `url(#id)`. Also home to `canonicalizeIds`, used by the parity test to normalize the library's per-process instance counter — the trailing `-<n>` on generated ids, matched in syntactic context so that row/column indices inside an id are never mistaken for the counter.
4. **`design.ts`.** Zod schemas mirroring core's types, and the mapping from flat tool input to core's `Customization` + `FormDataMap`. Colors validated as hex or the `transparent` sentinel; unknown dot/corner styles rejected with the valid set listed in the message.
5. **`logo.ts`.** Accepts a `data:image/...;base64,` URI or an absolute filesystem path (read and converted to a data URI). Relative paths are rejected — an MCP server's working directory is not the user's.
6. **`server.ts`.** `createServer()` registering:
   - `generate_qr_code` — content type + fields + customization, `format: "svg" | "png"` (default `svg`), optional `output_path`. SVG returns text; PNG returns base64 image content; `output_path` writes the file and returns the path instead.
   - `create_share_link` — same design inputs, returns a `https://qr-code-gen.frontsail.app/` share URL via core's `encodeDesignToUrl`. Logos are excluded, exactly as in the web app.
7. **`index.ts`.** Shebang, `StdioServerTransport`, connect. Nothing else — everything testable lives in `server.ts`.
8. **Tests** (vitest, no Playwright): the experiment matrix as regressions with pixel-level assertions; a golden-file SVG parity guard; a stdio integration test that spawns the built server with the SDK's own `Client`; and a timeout test that doctors the render to omit `nodeCanvas` and asserts rejection.
9. **Docs.** `AGENTS.md` gains a `packages/mcp` section recording the three invariants that are easy to unknowingly break: core is bundled, the library's canvas/PNG path is forbidden, and sanitizer + timeout are load-bearing.

## Project conventions honored

- **[`AGENTS.md`, "Submitting changes"]** `just lint` + `just test` before reporting complete → both run before submission; the new package's tests join `vp run -r test`.
- **[`AGENTS.md`, "Submitting changes"]** Changes land via PR → one draft PR via `/submit`.
- **[PR #13, `packages/core`]** Packages carry their own `tsconfig.json` + `vite.config.js` and are discovered by the workspace globs → `packages/mcp` follows the same shape.
- **[`.github/workflows/ci.yml`]** CI calls `just lint-ci` / `test` / `build` → recipe names unchanged; no workflow edit expected (PR #13 learned that this guarantee covers only the just-recipe steps, so it is a claim to verify, not assume).
- **[`packages/core`]** Core stays DOM-free and framework-free → the MCP package imports from it and adds nothing to it beyond, at most, a small DOM-free export with a unit test.

## Risks & mitigations

- **80 MB npx cold start.** Mitigation: none in this PR; documented so the number is a decision input rather than a surprise. A slimmer path exists (pure-JS image shim + `saveAsBlob: false` + resvg, ≈ 12 MB) but needs its own validation pass and would change logo behavior.
- **Silent-wrongness is this package's characteristic failure.** Every pipeline that broke did so by producing a plausible file, not by throwing. Mitigation: tests assert on decoded pixels — zero-alpha counts, logo-colored pixel counts — not on "a buffer came back".
- **Package name unverifiable.** `@frontsail/qr-mcp` is free but scope ownership cannot be confirmed without a working npm token. Mitigation: nothing publishes in this PR; the name is trivially changeable before the first release.
- **Native prebuild coverage.** Both napi deps must have a prebuild for the user's platform and Node ABI, or install fails. Validated only on darwin/arm64 here; both projects publish the full matrix.

## Out of scope

Publishing to npm. The scannability skill. HTTP/SSE transports. Batch generation. Reading designs back out of a share link (the codec supports it; no tool needs it yet).

## Success criteria → plan mapping

- Agents get the web app's exact output → golden-file SVG parity test (step 8), pipeline fixed by decision above
- No silent wrongness → pixel-level matrix regressions (step 8), timeout guard (step 2)
- Publishable → manifest with `bin`/`files`/`exports` (step 1), core inlined (assumption 3)
- `apps/web` untouched → new package only; no edits under `apps/`

## Open questions

1. npm `@frontsail` scope ownership — still unresolved (assumption 7). Blocks publishing, not this PR. Action: working `npm login`, then `npm org ls frontsail`.
2. Tool naming — `generate_qr_code` / `create_share_link`. Snake case matches common MCP practice; open to `qr_generate` / `qr_share_link` if a prefix is preferred for disambiguation in a crowded tool list.
3. Whether `create_share_link` should accept a base URL override (useful for staging). Defaulted to the production origin; add only if asked.

## Outcome (2026-07-31, post-implementation)

Implemented in [PR #14](https://github.com/frontsail-ai/qr-code-generator/pull/14). 62 new vitest cases in `packages/mcp` (repo total 146); end-to-end verified by packing the tarball, installing it clean, and driving the `qr-mcp` bin over stdio with a real SDK client. Deviations from the plan as written:

1. **`create_share_link` accepts and silently drops a logo** rather than rejecting it — resolving a file path only to discard the bytes would be wasted I/O and a confusing error. A test asserts output is identical with and without a logo.
2. **Content fields are nested per type** (`url: { url }`, `vcard: { … }`) rather than flat — email and vcard would collide on `email`/`phone` field names.
3. **`renderRawSvg` exposes a `nodeCanvas` option** used only by the timeout test (an `in`-check honors an explicit `undefined`); without it the hang guard is untestable. The first version of that test passed in 10 ms because a parameter default silently exercised the normal path — the fixed version consumes 1506 ms of its 1500 ms budget, proving the hang is real.
4. **The package's `test` script runs `vp pack` first** — the integration test drives `dist/`, which is what `npx` executes.

**Name resolved (2026-08-01, release prep):** open question 1 and assumption 7 are closed — the published name is **`@frontsail-ai/qr-mcp`** (hyphen; the owned npm org is `frontsail-ai`, and the name is verified free). References above to `@frontsail/qr-mcp` are the plan as written and are left as history. The private `@frontsail/qr-core` keeps its name; it is bundled and never published, so it is not affected.

SDK notes recorded for future work: `tool()` is deprecated in SDK 1.30.0 in favor of `registerTool`; zod is declared directly rather than relied on transitively; the SDK itself is ~24 MB of the ~80 MB cold start. A ~12 MB slimming path exists (pure-JS image-dimension shim + `saveAsBlob: false` + dropping `@napi-rs/canvas`) but changes logo re-encoding behavior and needs its own validation pass.
