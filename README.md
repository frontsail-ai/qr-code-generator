<p align="center">
  <img src="apps/web/public/favicon.svg" width="72" alt="Module Q — the QR Code Generator mark">
</p>

<h1 align="center">QR Code Generator</h1>

<p align="center">
  <b>Design a QR code you'd actually print.</b><br>
  Live preview, gradients, dot styles, logo overlays, and shareable links —
  running entirely in your browser. No backend, no accounts, no tracking.
  Your designs never leave your machine.
</p>

<p align="center">
  <a href="https://qr-code-gen.frontsail.app/"><b>▶ Try it live</b></a>
  ·
  <a href="https://github.com/frontsail-ai/qr-code-generator/actions/workflows/ci.yml"><img src="https://github.com/frontsail-ai/qr-code-generator/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

![The QR Code Generator workspace — history rail, live preview canvas, and style inspector](docs/screenshots/desktop-populated.png)

## Features

- **Five content types:** URL, Email, Phone, Text, vCard
- **Live preview:** the code redraws as you type, with a capacity guard instead of silent failures
- **Styling:** solid or gradient foregrounds (linear/radial), background colors (or none, for a transparent export), 6 dot styles, corner styles, and logo overlays with a scannability warning
- **History:** every download is saved locally with a live thumbnail — restore, share, or delete any past design
- **Sharing:** designs encode into self-sufficient URLs; the recipient's browser rebuilds the design with nothing stored server-side
- **Export:** PNG at 2× resolution or SVG
- **Workspace UI:** three-pane desktop layout on an engineering-grid canvas; mobile gets a history drawer and a sticky export bar

## Repository layout

A Bun workspace monorepo:

```
apps/
  web/        the deployed app (React, Vite+, Playwright e2e)
packages/
  core/       @frontsail/qr-core — framework-free QR logic + vitest units
```

`packages/core` holds the parts that have nothing to do with React: types,
presets, data formatters, the qr-code-styling option mapping, and the
share-link codec. It renders nothing and its tsconfig omits the DOM lib, so a
stray `window` is a type error. The app consumes its TypeScript source
directly — there is no build step for the package. `tools/*` is reserved in
the workspace globs for later.

## Tech stack

- React 19 + TypeScript
- [Vite+](https://viteplus.dev/) (dev server, build, lint, format, type checks)
- [Bun](https://bun.sh/) (package manager, workspaces)
- Tailwind CSS v4
- Vitest (unit tests) and Playwright (E2E testing)
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling)

## Getting started

### Prerequisites

- [Vite+](https://viteplus.dev/guide/) (`vp` CLI; manages Node.js and the package manager)
- [Bun](https://bun.sh/) 1.3+
- [just](https://github.com/casey/just) (optional, for convenience commands)

### Installation

```bash
vp install
```

### Development

```bash
just run     # or: vp run web#dev
```

Open http://localhost:5173 in your browser.

### Production build

```bash
just build   # or: vp run web#build
```

The built files will be in `apps/web/dist/`. Preview with `vp run web#preview`.

## Development workflow

This project uses [just](https://github.com/casey/just) as a command runner. See available commands:

```bash
just --list
```

### Linting, formatting & type checks

```bash
just lint        # Format, lint, and type-check with auto-fix
just lint-ci     # Check-only mode (what CI runs)
```

### Testing

```bash
just test                          # Core unit tests + the full Playwright suite
vp run '@frontsail/qr-core#test'   # Unit tests only
vp run web#test:ui                 # Playwright UI mode
vp run web#test:headed             # Visible browser
```

The e2e suite starts its own dev server on port 5177 and never reuses a
running one, so it can't accidentally test whatever else is on 5173.

## CI

GitHub Actions runs on every push/PR to `master`/`main`: install, lint & type-check, test, build.

## About

Developed and maintained by [FrontSail AI](https://frontsail.ai/).

## License

MIT
