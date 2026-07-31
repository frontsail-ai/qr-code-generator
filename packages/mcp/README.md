# @frontsail/qr-mcp

An [MCP](https://modelcontextprotocol.io/) server that generates QR codes identical to the ones [qr-code-gen.frontsail.app](https://qr-code-gen.frontsail.app/) produces — same dot and corner styles, same palette, same transparent-background handling, same share links.

It shares its rendering logic with the web app rather than reimplementing it, so agent output cannot drift from what the site produces.

## Setup

Add it to your MCP client's config:

```json
{
  "mcpServers": {
    "qr-code-generator": {
      "command": "npx",
      "args": ["-y", "@frontsail/qr-mcp"]
    }
  }
}
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

## License

MIT
