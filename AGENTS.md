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
- `tools/*` — reserved in the workspace globs; empty for now.

Rules for `packages/core`: it must stay framework-free and render nothing. Its tsconfig omits the DOM lib, so `window`/`document`/`localStorage` are type errors — pass browser values in as parameters instead (see `encodeDesignToUrl`). Its only dependency is `lz-string`. React-flavored types belong in `apps/web/src/types.ts`.

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
