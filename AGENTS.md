# QR Code Generator

A client-side QR code generator with live preview and customization. No backend — runs entirely in the browser. Deployed at https://frontsail-qr-gen.netlify.app/.

## Features

- **QR types:** URL, Email, Phone, Text, vCard
- **Live preview:** Real-time QR code updates as you type
- **Customization:** Foreground/background colors, gradients, 6 dot styles, corner styles, custom logo upload
- **History:** Auto-saved configurations in localStorage with restore/delete
- **Export:** Download as PNG (2x resolution) or SVG
- **Sharing:** Encode designs into self-sufficient URLs (via lz-string compression in the URL hash). Logos are excluded from shared URLs due to size constraints.

## Tech stack

React 18 + TypeScript, Vite, Tailwind CSS v4, BiomeJS (lint/format), Playwright (E2E tests), qr-code-styling.

## Submitting changes

Before reporting work as complete to the user, always run:

```bash
just lint
just test
```

When the user asks to push changes to GitHub, always:

1. Run `just lint` and `just test` — fix any failures before proceeding.
2. Submit changes in a new pull request (not directly to master).
