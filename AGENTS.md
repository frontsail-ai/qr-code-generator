# QR Code Generator

A client-side QR code generator with live preview and customization. No backend — runs entirely in the browser. Developed and maintained by [FrontSail AI](https://frontsail.ai/). Deployed at https://qr-code-gen.frontsail.app/.

## Features

- **QR types:** URL, Email, Phone, Text, vCard
- **Live preview:** Real-time QR code updates as you type
- **Customization:** Foreground/background colors (including a transparent background), gradients, 6 dot styles, corner styles, custom logo upload
- **History:** Auto-saved configurations in localStorage with restore/delete
- **Export:** Download as PNG (2x resolution) or SVG
- **Sharing:** Encode designs into self-sufficient URLs (via lz-string compression in the URL hash). Logos are excluded from shared URLs due to size constraints.

## Layout

Bun workspace monorepo:

- `apps/web` — the deployed app. React components, hooks, `index.html`, `public/`, and the Playwright suite.
- `packages/core` — `@frontsail/qr-core`: types, presets, data formatters, the qr-code-styling option mapping, and the share-link codec, plus their vitest units. Consumed as raw TypeScript source (`"exports": {".": "./src/index.ts"}`), so there is no build step.
- `packages/mcp` — `@frontsail-ai/qr-mcp`: the stdio MCP server that renders QR codes for agents. The only publishable package.
- `skills/qr-code` — the QR scannability skill, distributed as a Claude Code plugin. Not a workspace package.
- `tools/*` — reserved in the workspace globs; empty for now.

Rules for `packages/core`: it must stay framework-free and render nothing. Its tsconfig omits the DOM lib, so `window`/`document`/`localStorage` are type errors — pass browser values in as parameters instead (see `encodeDesignToUrl`). Its only dependency is `lz-string`. React-flavored types belong in `apps/web/src/types.ts`.

Rules for `skills/`:

- **The plugin root is `skills/qr-code/`, not the repo root.** `.claude-plugin/marketplace.json` at the repo root points `source` at `./skills/qr-code`, which holds its own `.claude-plugin/plugin.json` and `SKILL.md` (the documented single-skill-at-plugin-root form). Pointing `source` at `"./"` also works and installs the whole monorepo — 345 MB, because the root `package.json` makes the installer run a dependency install. Keep the plugin root free of `package.json`.
- **Every scannability claim in `SKILL.md` is cited or measured.** The measurements come from `packages/mcp/tests/scannability.test.ts`; the evidence table is in `docs/plans/2026-08-01-qr-skill.md`. Do not add a claim to the skill without adding its evidence, and if a threshold in that test moves, update the skill.
- **The skill must agree with the MCP tool descriptions.** They ship to the same audience; a contradiction between them is worse than either being silent.
- Run `claude plugin validate . --strict` after touching either manifest.

Rules for `packages/mcp` — each of these was learned by watching a plausible-looking but wrong file get produced, so treat them as invariants rather than preferences:

- **Core is bundled, not depended on.** `@frontsail/qr-core` sits in `devDependencies` precisely so `vp pack` inlines it (with `lz-string`) into `dist/index.mjs`. Moving it to `dependencies` would publish an import of a private package that no consumer can resolve. Core's raw TypeScript is not loadable by plain Node either way.
- **The library's own canvas/PNG path is forbidden.** Never `type: "canvas"` + `getRawData("png")`: it silently drops logos with node-canvas 2 and paints solid squares with the napi canvas. PNG is always resvg rasterizing the sanitized SVG.
- **Never add the `canvas` (node-canvas) package.** It carries a `prebuild-install || node-gyp` postinstall that npm is moving to block, and it segfaults under Bun. `@napi-rs/canvas` is the supported canvas.
- **`nodeCanvas` is always passed, and every `getRawData` call keeps its timeout.** Without a canvas implementation the logo path returns a promise that never settles — a tool call that hangs forever, which is worse for an agent than any error.
- **Sanitize on the PNG path only.** The `url('#id')` → `url(#id)` rewrite is what makes resvg work, but it changes bytes; applying it to returned SVG would break byte-parity with the web app, which `tests/parity.test.ts` guards using SVGs captured from the live site.
- Test fixtures must be real-world PNGs. resvg decodes node-canvas-2-encoded PNGs as black, so a fixture built that way would fail for reasons unrelated to the code.

## Tech stack

React 19 + TypeScript, Vite+ (`vp` CLI: dev/build/lint/format/type checks via Oxlint/Oxfmt), Bun (package manager, workspaces), Tailwind CSS v4, Vitest (core unit tests), Playwright (E2E tests), qr-code-styling.

## Submitting changes

Before reporting work as complete to the user, always run:

```bash
just lint
just test
```

When the user asks to push changes to GitHub, always:

1. Run `just lint` and `just test` — fix any failures before proceeding.
2. Submit changes in a new pull request (not directly to master).
