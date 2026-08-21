# QR Code Generator

A client-side QR code generator with live preview and full styling — no backend, no accounts; designs never leave the user's device. One core serves three surfaces: the browser workspace at https://qr-code-gen.frontsail.app/, an MCP server + Agent Skill for AI agents, and a prerendered discovery surface for crawlers. Developed by [FrontSail AI](https://frontsail.ai/).

## Tech stack

|           |                                                                                            |
| --------- | ------------------------------------------------------------------------------------------ |
| App       | React 19, TypeScript, Tailwind v4 over `plico.css` tokens                                  |
| Toolchain | Vite+ (`vp`: dev/build/lint/format/types via Oxlint/Oxfmt), Bun workspaces, `just` recipes |
| Rendering | qr-code-styling (both surfaces); resvg + @napi-rs/canvas for browserless PNG               |
| Tests     | Vitest (core, mcp) · Playwright (chromium + JS-disabled `crawler` project)                 |
| Hosting   | Vercel, static; CSP in `vercel.json`                                                       |

## Architecture in 30 seconds

`packages/core` holds everything framework-free — types, formatters, option mapping, share-link codec — so the web app and the MCP server cannot disagree about what a design is. `apps/web` is the workspace; `packages/mcp` is the only publishable package; `skills/qr-code` is prose guidance in the Agent Skills format. The build prerenders the app into the served HTML. Details: [docs/architecture.md](docs/architecture.md).

## Layout

```
apps/web/          the deployed app: components, hooks, index.html, public/, Playwright suite
packages/core/     @frontsail/qr-core — framework-free logic, consumed as raw TS source
packages/mcp/      @frontsail-ai/qr-mcp — stdio MCP server; the only publishable package
skills/qr-code/    the scannability skill (Agent Skills format); plugin root; not a workspace package
docs/              specs, architecture, guidelines, dated plans/ blueprints
tools/             reserved, empty
.agents/skills/    symlink for Codex in-repo skill discovery
```

## Documentation index

| Doc                                                                  | What it holds                                                                   | Load when…                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md)                         | Layers, key mechanisms, tech choices                                            | Changing boundaries, adding a mechanism, or wondering why something is shaped this way                     |
| [docs/guidelines.md](docs/guidelines.md)                             | Lint/test policy, planning checklist, regression protocol, releases, submitting | Starting any plan; before pushing; on any regression                                                       |
| [docs/product-specs/README.md](docs/product-specs/README.md)         | Spec format + index                                                             | Adding or citing a spec                                                                                    |
| [docs/product-specs/invariants.md](docs/product-specs/invariants.md) | `INV-*` — system-wide rules, each carrying its incident                         | Any change touching validation, storage, reachability, undo, prerender, network, or the skill/MCP contract |
| [docs/product-specs/app.md](docs/product-specs/app.md)               | `APP-*` — workspace behavior                                                    | Changing anything a user sees or does in the app                                                           |
| [docs/product-specs/agents.md](docs/product-specs/agents.md)         | `AGENT-*` — MCP tools + skill contract                                          | Changing `packages/mcp` or `skills/`                                                                       |
| [docs/product-specs/site.md](docs/product-specs/site.md)             | `SITE-*` — discovery surface                                                    | Changing `index.html`, meta, sitemap, llms.txt, consent, or the prerender                                  |
| `docs/plans/`                                                        | Dated blueprints of shipped changes                                             | Wanting the rationale or measurements behind a past decision                                               |

## Process — the short version

- Before reporting done: `just lint` && `just test`. Work lands via PR, never directly on master.
- Every plan walks the checklist in [docs/guidelines.md](docs/guidelines.md): validate assumptions, cross-check the affected spec IDs and the architecture, plan tests, plan end-to-end verification.
- Specs lead. Behavior change → update the spec (confirm with the user); conflict → discuss before proceeding; regression → 5-whys root cause before the fix.
- Spec IDs (`APP-3`, `INV-15`, …) are stable and never renumbered — cite them in PRs and tests.
- The repo's characteristic bug is plausible output (INV-1). When in doubt, verify the artifact, not the intention.
