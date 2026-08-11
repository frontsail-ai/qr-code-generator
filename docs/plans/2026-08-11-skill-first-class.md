# Multi-agent skill distribution blueprint

**Date:** 2026-08-11 · **Status:** proposed · **Scope:** one PR — skill metadata, enforcement tests, CI validation, README/AGENTS docs; no behavior change to any package

Make the skill at `skills/qr-code/` a first-class citizen of the project's positioning — QR codes in the browser, in your code, in your agent — by making it installable in OpenAI Codex and any [agentskills.io](https://agentskills.io/specification)-compatible agent, versioning it, and enforcing in CI that it cannot drift from the MCP server it documents.

## Why

The [skill blueprint](2026-08-01-qr-skill.md) shipped the judgment layer, but only for Claude Code: the install story is a Claude plugin, §4 of the skill hard-codes a Claude-only MCP command, and the README buries the agent path inside "Repository layout". Meanwhile nothing ties the skill to the code it makes claims about — the plugin sat at 0.2.0 while `@frontsail-ai/qr-mcp` shipped 0.3.0, and the plugin/marketplace description duplicate had no guard.

The format was never the obstacle: `SKILL.md` with `name`/`description` frontmatter **is** the Agent Skills spec, which Codex also reads. The work is metadata, distribution, and enforcement — not a port.

## Design decisions

- **One artifact, agent-neutral body.** The spec's point is that a single skill folder serves every host. `SKILL.md` names specific agents only where their commands genuinely differ (registering the MCP server); everything install-shaped lives in README's "Use it from your agent".
- **Version in spec metadata, synced to the plugin manifest, enforced by test.** `metadata.version` in frontmatter (the spec's convention) must equal `plugin.json` `version`; `packages/mcp/tests/skill.test.ts` asserts it, following the `SERVER_VERSION === package.json` precedent in [`manifest.test.ts`](../../packages/mcp/tests/manifest.test.ts). The skill's version line is independent of qr-mcp's — but any behaviour-visible qr-mcp change requires a skill review and bump (AGENTS.md rule).
- **Enforcement lives in `packages/mcp`, not a new toolchain.** `skills/` is deliberately not a workspace package, and the spec's reference validator (`skills-ref`) is Python. The spec constraints are simple enough to assert in vitest, which already runs in CI via `vp run -r test`.
- **`claude plugin validate . --strict` moves from manual mandate to CI step.** `just validate-plugin` wraps it; CI installs the CLI via npm (the runner already has Node). It is a static, auth-free check.
- **Codex in-repo discovery via symlink, not duplication.** `.agents/skills/qr-code → ../../skills/qr-code`; Codex scans `.agents/skills/` up the tree and follows symlinks. Symlinks require developer mode on Windows — acceptable for a repo developed on macOS and Linux CI.
- **The OpenAI catalog is not a target yet.** `openai/skills` was deprecated (June 2026) in favor of a plugins directory that is still settling; README documents the stable folder/`$skill-installer` path instead. Directory submission is a follow-up.

## Plan

1. `SKILL.md`: add `license: MIT` and `metadata` (`author`, `version: "0.3.0"`) to the frontmatter; rewrite the §4 install block agent-neutrally with Claude Code and Codex variants of the MCP registration.
2. `plugin.json`: bump `version` to 0.3.0.
3. New `packages/mcp/tests/skill.test.ts`: spec-validity of `name`/`description`/body length, version sync, plugin↔marketplace description sync, and a tripwire that the install command names the real package from `packages/mcp/package.json`.
4. `Justfile` `validate-plugin` recipe + CI step between lint and tests.
5. `.agents/skills/qr-code` symlink.
6. README: new "Use it from your agent" section (Claude Code / Codex / any agent); repository-layout paragraph shrinks to a pointer.
7. AGENTS.md: version-sync invariant, agent-neutrality rule, CI-enforced validate.

## Out of scope

- A "use it from your agent" mention on the website (the site has no footer at all; a separate design-conscious PR).
- Submission to the OpenAI plugins directory or community skill registries.
- Publishing the skill to npm — the plugin root must stay free of `package.json` (see the [skill blueprint](2026-08-01-qr-skill.md) Outcome).

## Success criteria

- `claude plugin install qr-code-generator@frontsail-qr` still works and ships the new frontmatter.
- The skill folder copied into `~/.codex/skills/` (or reached via `.agents/skills/` in a checkout) is discovered by Codex.
- Breaking the version sync or the description duplicate turns CI red.
