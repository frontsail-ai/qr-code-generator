# Product Specs

Behavioral specifications for every feature area, plus system-wide invariants. These are the reference an implementation is checked against — specs lead; if the code diverges, that's a conflict to surface, not a doc to quietly edit.

## Format

Every spec is:

1. **Behavioral** — what the system does, never how it's implemented. "Exports include the 4-module quiet zone", not "`prerender.mjs` injects the markup".
2. **Self-evidently testable** — precise enough that a tester can derive the verification path from the body alone. If a spec needs a separate "how to test" note, the body isn't done.
3. **Identified** — `### PREFIX-NUM: Short title`. NUM is unique within its file and **never reused**: deletions leave holes, and nothing is ever renumbered. IDs are stable references — tests, PR descriptions and other docs cite them.

**Invariants** (`invariants.md`) use the same ID format but describe system-wide properties rather than feature behaviors. They don't have to be testable in isolation — reviews, boundaries and process uphold them together. Most carry the issue number of the incident that created them.

## Index

| File                           | Prefix  | Covers                                                                                                      |
| ------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------- |
| [invariants.md](invariants.md) | `INV`   | System-wide conditions: validation, storage, reachability, undo, prerender, network, skill/MCP integrity    |
| [app.md](app.md)               | `APP`   | The browser workspace: designing, styling, exporting, history, draft, sharing, undo, the agent-setup dialog |
| [agents.md](agents.md)         | `AGENT` | The MCP server's tools and the Agent Skill's install/behavior contract                                      |
| [site.md](site.md)             | `SITE`  | The discovery surface: served HTML, meta, sitemap, llms.txt, consent and the quiet network                  |
