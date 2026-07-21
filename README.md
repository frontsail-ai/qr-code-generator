# [QR Code Generator](https://frontsail-qr-code-generator.vercel.app/) [![CI](https://github.com/frontsail-ai/qr-code-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/frontsail-ai/qr-code-generator/actions/workflows/ci.yml)

A simple, client-side QR code generator with customization options. No backend required.

Use it online at https://frontsail-qr-code-generator.vercel.app/

## Features

- **Multiple QR Types:** URL, Email, Phone, Text, vCard
- **Live Preview:** Real-time QR code updates as you type
- **Customization:**
  - Foreground colors with gradient support (solid, linear, radial)
  - Background colors
  - 6 dot styles (Square, Rounded, Dots, Classy, Classy Rounded, Extra Rounded)
  - Corner square and dot styles
  - Custom logo upload
- **History:** Saved configurations with restore/delete
- **Export:** Download as PNG (2x resolution) or SVG

## Tech Stack

- React 19 + TypeScript
- [Vite+](https://viteplus.dev/) (dev server, build, lint, format, type checks)
- Bun (package manager)
- Tailwind CSS v4
- Playwright (testing)
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling)

## Getting Started

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
vp dev
```

Open http://localhost:5173 in your browser.

### Production Build

```bash
vp build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
vp preview
```

## Project Structure

```
src/
├── App.tsx                    # Main app component
├── types.ts                   # TypeScript type definitions
├── hooks/
│   ├── useQRCode.ts          # QR code generation hook
│   ├── useDebounce.ts        # Debounce utility hook
│   └── useSavedConfigs.ts    # History/saved configs hook
├── utils/
│   ├── constants.ts          # Configuration constants
│   └── qrDataFormatters.ts   # QR data formatting utilities
└── components/
    ├── Header.tsx
    ├── QRPreview.tsx
    ├── TypeSelector.tsx
    ├── SavedConfigs.tsx       # History sidebar
    ├── forms/                 # Form components for each QR type
    └── customization/         # Styling customization components
```

## Development

This project uses [just](https://github.com/casey/just) as a command runner. See available commands:

```bash
just --list
```

### Linting & Formatting

```bash
just lint        # Lint and auto-fix
just lint-ci     # Lint without fixing (for CI)
```

### Type Checking

```bash
vp check
```

### Testing

Run all tests:

```bash
just test
```

Run tests with UI:

```bash
bun run test:ui
```

Run tests in headed mode (visible browser):

```bash
bun run test:headed
```

## CI

GitHub Actions runs on every push/PR to `master`/`main`:

1. Install dependencies
2. Lint & type-check
3. Run tests
4. Build

## License

MIT
