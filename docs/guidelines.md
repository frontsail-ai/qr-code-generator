# Working Guidelines

Process rules for changing this repo. Product behavior lives in [product-specs/](product-specs/); architecture in [architecture.md](architecture.md).

## Lint and test — always, before reporting done

```bash
just lint    # vp check --fix: Oxlint + Oxfmt + type-aware type check
just test    # vp run -r test: core vitest, mcp vitest (packed artifact), web Playwright (chromium + crawler)
```

100% of code is linted and type-checked; every behavior change lands with tests at the layer that can actually catch its failure (unit for core logic, the packed artifact for mcp, e2e for the workspace, the JS-disabled crawler project for the discovery surface). If no test layer can catch a change's failure mode, say so — that gap is itself a finding.

## Planning checklist — mandatory for every plan

1. **Validate assumptions** — read the code on HEAD, run the cheap experiment; no plan built on "probably".
2. **Cross-validate against product specs** — name every affected `APP`/`AGENT`/`SITE`/`INV` ID and how the plan satisfies or changes it.
3. **Cross-validate against the architecture** — boundaries (core stays DOM-free, storage through `safeStorage`, one render pipeline) and mechanisms (consent-inset, prerender, undo stack).
4. **Plan automated test coverage** for new logic, per the policy above.
5. **Plan end-to-end verification** — how the change will be seen working in the real app, not just in tests.

Non-trivial changes get a dated blueprint in `docs/plans/` (`YYYY-MM-DD-slug.md`, `**Date:** · **Status:** · **Scope:**` header) recording the decisions and validated assumptions.

## On conflict, surface — never silently reconcile

Specs lead. If an implementation diverges from a spec, or a plan needs to break an invariant, bring it up for discussion before proceeding. Doc updates that change meaning are confirmed with the user, not slipped into a diff.

## On regression: root-cause first

Conduct a cause analysis using the 5-whys before attempting a fix — report the root cause, its siblings, and the class-prevention (test, guardrail, or doc), then fix. The repo's characteristic bug is plausible output (INV-1); regressions here tend to be silent, so the analysis must name what would have made this one loud.

**Dependency bumps that redden golden or parity tests are the system working, not flakiness.** `qr-code-styling`, `@resvg/resvg-js` and `@napi-rs/canvas` all decide what gets rendered — read the pixels and decide whether the new rendering is acceptable _before_ touching a golden. Regenerating first converts a detection into a silent acceptance.

## Releases and versioned artifacts

- `@frontsail-ai/qr-mcp`: bump `package.json`, `SERVER_VERSION`, tag `qr-mcp-v<version>` — the release workflow refuses to publish when they disagree. Full checklist in `packages/mcp/README.md`.
- The skill: any behavior-visible mcp change requires reviewing `SKILL.md` and bumping its version in both files (INV-17).
- After touching either plugin manifest: `just validate-plugin` (CI runs it too, but a red push costs a round-trip).

## Submitting

Work lands via pull request, never directly on master. Conventional Commits with a capitalized, sentence-style subject (`feat(web): …`). Run `just lint` and `just test` before pushing; PRs describe problem and solution, embed screenshots for visual changes, and cite the spec IDs they touch.
