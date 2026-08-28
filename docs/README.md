# docs/

How this directory is organized and maintained. Treat docs as code: they ship in PRs, they're reviewed, and changes that alter meaning are confirmed with the user first.

## What lives here

| Path                                      | Contents                                                                                                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)        | Layers, key mechanisms, tech choices, what's intentionally simple                                                                                                                                                                                 |
| [guidelines.md](guidelines.md)            | Process: lint/test policy, planning checklist, regression protocol, releases, submitting                                                                                                                                                          |
| [product-specs/](product-specs/README.md) | Behavioral specs (`APP`/`AGENT`/`SITE`) and system invariants (`INV`)                                                                                                                                                                             |
| `plans/`                                  | Dated design blueprints, one per non-trivial shipped change (`YYYY-MM-DD-slug.md`). Append-only history — a blueprint records what was decided and validated at the time; it is not updated to track later changes (beyond a Status/Outcome note) |
| `screenshots/`                            | Images referenced by the README                                                                                                                                                                                                                   |

## Spec format rules

Specs are behavioral, self-evidently testable, and identified (`### PREFIX-NUM: Title`); invariants are system-wide and carry `INV` IDs. IDs are never reused or renumbered — deletions leave holes. The full rules live in [product-specs/README.md](product-specs/README.md).

## When to update what

| Change                                                      | Update                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Product behavior changes                                    | The affected spec (confirm with the user); cite the ID in the PR |
| A new cross-cutting rule is earned (usually by an incident) | `product-specs/invariants.md`, with the incident reference       |
| A boundary, mechanism or tech choice changes                | `architecture.md`                                                |
| Process changes (testing, releasing, submitting)            | `guidelines.md`                                                  |
| A non-trivial change is being planned                       | New dated file in `plans/`                                       |
| Directory layout or doc index changes                       | `AGENTS.md` (the index)                                          |

## When not to write a doc

Don't document what the code already states (types, test names, lint config), don't duplicate a spec into prose, and don't create a doc for a one-off decision — that's what `plans/` entries and PR descriptions are for.

## Naming

Kebab-case filenames; plans are date-prefixed (`2026-08-11-prerender.md`). Spec files are named for the surface, not the technology.
