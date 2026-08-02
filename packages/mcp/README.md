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

Releases are published by [`.github/workflows/release-mcp.yml`](../../.github/workflows/release-mcp.yml) when a `qr-mcp-v*` tag is pushed. There is no npm token anywhere in this repo — the workflow authenticates with npm Trusted Publishing over GitHub OIDC, and npm generates provenance attestations automatically.

1. **Bump the version in two places** — `package.json` and `SERVER_VERSION` in `src/server.ts`. The version an MCP client sees in the handshake comes from the constant, so a drifting one ships a package that misreports itself. A test pins them equal.
2. **Merge it.** The workflow refuses to publish a tag whose commit is not reachable from `master`.
3. **Tag and push:**
   ```bash
   git tag qr-mcp-v<version> && git push origin qr-mcp-v<version>
   ```

The workflow then verifies the tag is on `master`, checks the tag version against both constants, runs the package's tests against the packed artifact, rejects the release if the dry run emits any `npm warn`, publishes, and finally `npx`es the published version to confirm its handshake reports the right one. Every one of those gates exists because it was nearly missed by hand.

To exercise the gates without publishing — after changing the workflow, for instance — run it from the Actions tab via **workflow_dispatch** with an existing tag. It runs everything and publishes nothing.

### Trusted publisher registration

One-time, on npmjs.com, under the package's **Settings → Trusted Publisher**. All fields are case-sensitive, and npm matches the workflow by **filename only**:

| Field                | Value               |
| -------------------- | ------------------- |
| Organization or user | `frontsail-ai`      |
| Repository           | `qr-code-generator` |
| Workflow filename    | `release-mcp.yml`   |
| Environment          | _(leave empty)_     |

Renaming or moving the workflow file breaks publishing until this registration is updated to match.

### Manual fallback

Only for registry emergencies — a broken OIDC exchange, or a release that cannot wait on GitHub Actions. It bypasses every gate above, so re-read them and check by hand.

From `packages/mcp`, on a checkout of merged `master` (`npm publish` packs whatever `dist/` currently holds, so a feature-branch publish ships unreviewed code under an immutable version):

```bash
vp run test                                   # packs, then tests the packed artifact
npm publish --dry-run --access public         # must emit no `npm warn` lines
npm publish --access public --otp=<code>      # auth-and-writes 2FA requires a fresh code
git tag qr-mcp-v<version> && git push origin qr-mcp-v<version>
npx -y @frontsail-ai/qr-mcp@<version>         # handshake must report <version>
```

`--access public` is not optional for a scoped package, and `--otp` is what makes an unattended publish possible at all — without it npm falls back to a browser flow that needs a terminal.

## License

MIT
