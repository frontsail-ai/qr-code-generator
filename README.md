# QR Code Generator [![CI](https://github.com/frontsail-ai/qr-code-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/frontsail-ai/qr-code-generator/actions/workflows/ci.yml)

A simple, client-side QR code generator with customization options. No backend required.

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

- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- BiomeJS (linting & formatting)
- Playwright (testing)
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling)

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn
- [just](https://github.com/casey/just) (optional, for convenience commands)

### Installation

```bash
yarn install
```

### Development

```bash
yarn dev
```

Open http://localhost:5173 in your browser.

### Production Build

```bash
yarn build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
yarn preview
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
yarn type-check
```

### Testing

Run all tests:
```bash
just test
```

Run tests with UI:
```bash
yarn test:ui
```

Run tests in headed mode (visible browser):
```bash
yarn test:headed
```

## CI

GitHub Actions runs on every push/PR to `master`/`main`:
1. Install dependencies
2. Lint & type-check
3. Run tests
4. Build

## License

MIT
