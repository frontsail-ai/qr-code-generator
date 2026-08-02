# MCP release automation blueprint

**Date:** 2026-08-02 · **Status:** proposed · **Scope:** one PR, CI config only, no product code

Publishing `@frontsail-ai/qr-mcp` becomes a tag push. No npm token exists in the repo, and the RELEASING checklist's rules become workflow gates instead of things a human has to remember.

## Why

Both releases so far were hand-run, and both went wrong in a way the checklist was supposed to prevent.

`0.1.0` shipped from an unmerged feature branch — the tarball contained the gradient fix that was still in review. `0.2.0` needed a one-time password relayed by hand, twice, because npm's `auth-and-writes` 2FA blocks unattended publishing. npm also flagged during login that [tokens bypassing 2FA are being restricted for direct publishing](https://gh.io/npm-gat-bypass2fa-deprecation), so the token workaround has a shelf life.

The checklist already encodes the right rules. It just relies on a person executing them in order, at the end of a long session, which is exactly when they get skipped.

## Verified mechanics

Checked against current docs on 2026-08-02, because both npm's trusted-publishing and GitHub's OIDC surfaces changed recently.

| Fact                                                                          | Verdict     | Source                                                                                                                         |
| ----------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| npm Trusted Publishing authenticates GitHub Actions via OIDC, no stored token | Confirmed   | [npm trusted publishers](https://docs.npmjs.com/trusted-publishers)                                                            |
| Requires `permissions: id-token: write`                                       | Confirmed   | Same                                                                                                                           |
| Requires npm ≥ 11.5.1 and Node ≥ 22.14.0                                      | Confirmed   | Same                                                                                                                           |
| Registration is per-package on npmjs.com; fields are case-sensitive           | Confirmed   | Same                                                                                                                           |
| Workflow is identified by **filename only**, not path                         | Confirmed   | Same                                                                                                                           |
| GitHub-hosted runners only                                                    | Confirmed   | Same                                                                                                                           |
| `repository.url` in package.json must match the GitHub repo                   | Confirmed   | Same — ours already does                                                                                                       |
| **Provenance needs `--provenance`**                                           | **Refuted** | Trusted publishing generates attestations **automatically**; the flag is for token-based publishing. Passing it is unnecessary |
| One trusted publisher per package                                             | Confirmed   | Same                                                                                                                           |

## Design

- **Trigger is a `qr-mcp-v*` tag push.** Tags are already the release ritual, and a tag is a deliberate act in a way that a branch merge is not.
- **Four gates, each one a bug that nearly shipped:**
  1. _Tag must be reachable from master_ — `git merge-base --is-ancestor`. This is the `0.1.0` mistake, mechanised.
  2. _Tag version == package.json == `SERVER_VERSION`_ — the handshake version an MCP client sees comes from the constant, so drift ships a package that misreports itself. A test already pins two of the three; this pins the tag to them.
  3. _The packed artifact passes its own tests_ — the package's test script runs `vp pack` first, so the stdio integration test drives the exact `dist/` about to be published.
  4. _Dry run must emit no `npm warn`_ — npm corrects malformed fields silently on publish, which is how `0.1.0` nearly shipped a `bin` npx could not run while the local tarball looked fine.
- **`workflow_dispatch` rehearses everything except the publish**, so the gates can be exercised before the trusted publisher exists, and afterwards whenever the workflow changes.
- **Post-publish smoke test** polls the registry, then `npx`es the published version and asserts the handshake reports the tag's version — verifying the artifact on npm rather than the one in the runner.

### Toolchain composition

The repo's convention is `voidzero-dev/setup-vp`, but trusted publishing needs a specific npm version and the `.npmrc` that `actions/setup-node` writes. The workflow uses both: `setup-node` for the publishing surface, `setup-vp` for the `vp` commands. Because the interaction between two Node installs on one runner is not something to assume, an explicit step prints both versions and fails with a clear message if npm is below 11.5.1 — a loud failure beats a mysterious OIDC rejection.

## Out of scope

Automating the version bump. Publishing the plugin/skill (it distributes from the marketplace, not npm). Release notes generation.

## Risks

- **The registration is manual and case-sensitive.** Until the user completes it on npmjs.com, the publish leg cannot work; the rehearsal leg proves everything else.
- **Renaming this workflow file breaks publishing** — npm matches on filename. Noted in a comment at the top of the file.
- **A tag pushed to a non-master commit fails loudly** rather than publishing. That is the intent, but it will surprise someone eventually.
