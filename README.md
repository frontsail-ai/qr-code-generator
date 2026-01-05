# QR Code Generator

A simple, client-side QR code generator with customization options. No backend required.

## Features

- **Multiple QR Types:** URL, Email, Phone, Text, vCard
- **Live Preview:** Real-time QR code updates as you type
- **Customization:**
  - Foreground and background colors
  - 6 dot styles (Square, Rounded, Dots, Classy, Classy Rounded, Extra Rounded)
  - Corner square and dot styles
  - Custom logo upload
- **Export:** Download as PNG or SVG

## Tech Stack

- React 18
- Vite
- Tailwind CSS v4
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling)

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn

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
├── App.jsx                    # Main app component
├── hooks/
│   ├── useQRCode.js          # QR code generation hook
│   └── useDebounce.js        # Debounce utility hook
├── utils/
│   ├── constants.js          # Configuration constants
│   └── qrDataFormatters.js   # QR data formatting utilities
└── components/
    ├── Header.jsx
    ├── QRPreview.jsx
    ├── TypeSelector.jsx
    ├── forms/                 # Form components for each QR type
    └── customization/         # Styling customization components
```

## Testing

Run all tests:
```bash
yarn test
```

Run tests with UI:
```bash
yarn test:ui
```

Run tests in headed mode (visible browser):
```bash
yarn test:headed
```

## License

MIT
