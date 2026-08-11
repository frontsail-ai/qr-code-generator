# Agent-setup dialog blueprint

**Date:** 2026-08-11 · **Status:** proposed · **Scope:** one PR, `apps/web` + one test file in `packages/mcp`; no behavior change to any package

Give the web app the third leg of the positioning — browser, code, agent — as a quiet "Agent setup" trigger in the header opening the app's first modal dialog, with copy-able install commands for Claude Code, OpenAI Codex, and any [Agent Skills](https://agentskills.io) agent. Follow-up deferred from the [skill distribution blueprint](2026-08-11-skill-first-class.md).

## Why

After the skill went multi-agent, the website still never mentioned that the generator works from an agent at all — no GitHub link, no npm mention, nothing. The audience is deliberately lopsided: ~99% of visitors will never run a CLI command, so the entry point must be invisible-until-wanted; the 1% who will are the ones who star repositories.

## Design decisions

- **Native `<dialog>` + `showModal()`, conditionally mounted.** The platform provides focus containment, Escape, focus restore and the top layer; hand-rolling those for the app's first modal would be reimplementation without precedent. Top layer renders above the z-50 consent banner — acceptable for a transient, user-invoked surface. Idle mounts nothing. Not a `ui.tsx` primitive: one consumer is too early for an abstraction.
- **Escape must not spend a take-back.** The undo keydown effect (Escape → `dismissUndo`, ⌘Z → `takeThrough`) now also gates on `agentSetupOpen` — a modal above the tray owns the keyboard. Companion: opening calls `holdUndo()` because `showModal()` makes the Undo button inert; an offer must not drain while unreachable.
- **Feedback stays inside the dialog.** The toast/tray paints at z-30, underneath the top-layer backdrop, so a copy confirms on the button ("Copied", 2s) and a refusal renders an inline error Note. This is a deliberate, geometry-forced deviation from the app-level `showToast("copy", …)` pattern.
- **One source of command text, born guarded.** Commands live in `src/content/agentSetup.ts` as literal strings; `packages/mcp/tests/skill.test.ts` greps that file — and now `README.md` symmetrically — against the real manifests (package name, `plugin@marketplace`, repo slug and skill URL derived from `plugin.json`).
- **Desktop and tablet only (≥640px).** The phone header has ~28px of slack at 390px, and the audience installing CLI tools is at a terminal. Discoverability on phones is carried by the updated meta description / OG / JSON-LD copy instead. Dialog state lives in `App`, so a second trigger (e.g. in the mobile drawer) can be added without restructuring.

## Plan

1. `src/content/agentSetup.ts` — sections + commands + repo URL.
2. `src/components/AgentSetupDialog.tsx` — dialog + `CommandBlock` (mono block, `overflow-x-auto`, one Copy button per section).
3. `Header.tsx` — `hidden sm:inline-flex` secondary Button, Terminal icon, right of the spacer.
4. `App.tsx` — `agentSetupOpen` state, keydown gate, `holdUndo`/`releaseUndo` on open/close, conditional mount.
5. `index.html` — meta description, `og:description`, JSON-LD gain the agent capability.
6. `packages/mcp/tests/skill.test.ts` — drift guards over the web module and README.
7. `tests/agent-setup.spec.js` — ten cases: reachability of trigger and top-layer content, focus restore through conditional unmount (the least-standardised behavior in play), Escape closing without spending a pending undo (the load-bearing test), the hold, copy capture and inline confirmation, refused-copy reporting, block-not-page overflow at 640px, reduced motion, and the native-dialog tripwire around it all.

## Out of scope

- A mobile (<640px) entry point.
- `.catch()` on the two pre-existing share-copy calls in `App.tsx` — a real gap under "a failed persist is reported", but it needs an error-capable feedback surface (`ToastKind` has none); separate PR.
- A generic Dialog primitive; entry animation.

## Success criteria

- The trigger is unobstructed at ≥640px and absent below; the dialog's contents pass `expectUnobstructed` inside the top layer.
- Deleting a design, opening the dialog, pressing Escape: the dialog closes and the take-back survives and still works.
- Renaming the npm package, plugin, or marketplace turns CI red via the web-module and README drift tests.
