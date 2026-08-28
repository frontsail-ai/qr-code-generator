# The Agent Surface

What AI agents get: the `@frontsail-ai/qr-mcp` MCP server (generation) and the `qr-code` Agent Skill (judgment). Same designs, same renderer, same guardrails as the browser (see INV-17/INV-18).

Prefix: `AGENT`.

---

### AGENT-1: generate_qr_code renders any design the web app can

The tool accepts the five content types with the web app's full styling surface and returns SVG (280px, the preferred default) or PNG (560px), or writes to an absolute `output_path`. Error-correction level is fixed at Q, the quiet zone is always present, and the logo footprint is fixed at its default — none of the three is a parameter.

### AGENT-2: Returned SVG is byte-identical to the web app's

The same design produces the same SVG bytes as the browser export; sanitization for rasterizing happens only on the PNG path (see INV-18).

### AGENT-3: create_share_link round-trips into the editor

The tool returns a URL that reopens the design in the web editor with every styling choice intact; logos are not included in share links.

### AGENT-4: Empty and unrepresentable are distinguished errors

Content that formats to nothing produces an input error telling the agent whether the form was empty or the value cannot be represented in its format — the same distinction the web app surfaces (see INV-3).

### AGENT-5: Tool calls never hang

Every render path carries a timeout; a bad logo or a stalled rasterizer produces an error, not a promise that never settles (see INV-18).

### AGENT-6: The MCP handshake reports the released version

The version the server announces equals the published package version; the release process refuses to publish when the tag, manifest and handshake disagree.

### AGENT-7: The skill installs from the spec, everywhere

`skills/qr-code` is a valid Agent Skill (agentskills.io format): installable as a Claude Code plugin from this repo's marketplace, discoverable by Codex via `.agents/skills/`, and copyable into any spec-compatible agent's skills directory.

### AGENT-8: One set of install commands, everywhere they appear

The install commands shown in the README, the web app's Agent setup dialog, and `/llms.txt` name the real package, plugin, marketplace and repository from the manifests — a rename breaks CI in all three places at once (see INV-17).

### AGENT-9: The skill teaches only what was measured

Every scannability threshold the skill asserts traces to the committed decoder harness or a cited standard, and the skill's guidance never contradicts what the MCP tools say about themselves (see INV-17).
