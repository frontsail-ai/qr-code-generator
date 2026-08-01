# @frontsail-ai/qr-mcp

An [MCP](https://modelcontextprotocol.io/) server that generates QR codes identical to the ones [qr-code-gen.frontsail.app](https://qr-code-gen.frontsail.app/) produces — same dot and corner styles, same palette, same transparent-background handling, same share links.

It shares its rendering logic with the web app rather than reimplementing it, so agent output cannot drift from what the site produces.

## Setup

Add it to your MCP client's config:

```json
{
  "mcpServers": {
    "qr-code-generator": {
      "command": "npx",
      "args": ["-y", "@frontsail-ai/qr-mcp"]
    }
  }
}
```

In Claude Code, one line does the same thing:

```bash
claude mcp add qr -- npx -y @frontsail-ai/qr-mcp
```

Requires Node 20+. The first run downloads roughly 80 MB of dependencies (jsdom, a native canvas, and an SVG rasterizer); subsequent runs use the npx cache.

## Tools

### `generate_qr_code`

Renders a QR code as SVG (default, 280px) or PNG (560px), returned inline or written to `output_path`.

```jsonc
{
  "content_type": "url", // url | email | phone | text | vcard
  "url": { "url": "example.com" }, // the object matching content_type
  "customization": {
    "foreground_color": "#1B1812",
    "foreground_color_2": "#2C4A8A", // second gradient stop
    "gradient_type": "linear-bl-tr", // none | linear-bl-tr | linear-tl-br | radial
    "background_color": "transparent", // a hex color, or "transparent"
    "dot_type": "rounded",
    "corner_square_type": "extra-rounded",
    "corner_dot_type": "dot",
    "logo": "/absolute/path/to/logo.png", // or a data: URI
  },
  "format": "svg", // svg | png
  "output_path": "/absolute/path/out.svg", // optional
}
```

Content shapes: `url { url }`, `email { to, subject?, body? }`, `phone { number }`, `text { content }`, `vcard { firstName?, lastName?, phone?, email?, org?, title?, website? }`.

### `create_share_link`

Takes the same design inputs and returns a `qr-code-gen.frontsail.app` link that reopens the design in the web editor. The design travels in the URL fragment — nothing is stored server-side. Logos are excluded, matching the web app.

## Output fidelity

- **SVG without a logo is byte-identical** to the file the web app downloads, aside from an internal id counter with no rendered effect. A test in this repo enforces that against SVGs captured from the live site.
- **PNG and logo SVGs are the same design, not the same bytes.** PNGs are rasterized with resvg rather than Chromium, and the library re-encodes logo images, so exact byte equality is not achievable. Ask for SVG when you need exactness.

## Releasing

From `packages/mcp`, **on a checkout of merged `master`**. `npm publish` packs whatever `dist/` currently holds, and `dist/` is built from the working tree — so publishing from a feature branch ships unreviewed code under a released version number. Confirm with `git status` and `git log --oneline -1` before step 1; a released version is immutable, so this cannot be corrected in place.

1. **Bump the version in two places** — `package.json` and `SERVER_VERSION` in `src/server.ts`. They are separate constants today; the version an MCP client sees in the handshake comes from the latter.
2. `vp run test` from the repo root — the package's test script packs first, so this also proves the build.
3. `npm publish --dry-run --access public` and read the output. Confirm the file list is exactly `dist/index.mjs`, `README.md`, `package.json`, and that **no `npm warn publish` lines appear** — npm silently drops malformed fields rather than failing, and a stripped `bin` would break `npx` for everyone while the tarball still looks fine locally.
4. `npm publish --access public`. The `--access public` is not optional: scoped packages default to restricted, and without it the first publish fails on a free account.
5. Tag the release: `git tag qr-mcp-v<version> && git push origin qr-mcp-v<version>`.
6. Smoke-test the real thing: `npx -y @frontsail-ai/qr-mcp` should start and speak MCP on stdio.

## License

MIT
