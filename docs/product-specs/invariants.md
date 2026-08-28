# System Invariants

Conditions that hold across the product. Unlike feature specs, invariants don't have to be testable in isolation — they're upheld by code review, architectural boundaries, tests and process together. Most of these were paid for: the issue numbers are the receipts.

Breaking an invariant is a deliberate decision, not a side effect. If a change requires it, surface it for discussion before proceeding.

Prefix: `INV`.

---

### INV-1: Plausible output, not loud failure, is the characteristic bug

Every part of this system can produce output that looks right and is wrong: a QR that renders but does not scan, a published package whose bin was silently stripped, a prerender that ships an empty shell, a "saved" toast over a write that never happened. The defences that have actually caught things are pixel-level assertions on decoded output, reading `npm publish --dry-run` warnings instead of skimming past them, build scripts that refuse to ship implausible artifacts, and pointing a real agent at the result. New checks should follow that pattern: verify the artifact, not the intention.

### INV-2: Core is framework-free and renders nothing

`@frontsail/qr-core` must stay framework-free. Its tsconfig omits the DOM lib, so `window`/`document`/`localStorage` are type errors — pass browser values in as parameters instead (see `encodeDesignToUrl`). Its only dependency is `lz-string`. React-flavored types belong in `apps/web/src/types.ts`.

### INV-3: One notion of a valid design, not one per entry point

A formatter returns `""` for a form with nothing in it, and that empty string is the only signal of "nothing to encode" the whole system has — the web app's empty state and export lock, the render hook's early return, and the MCP server's `InputError` all derive from it. Anything arriving from outside React state — a share link, the persisted draft, a history entry — is validated by `normalizeDesign` before it is rendered: one notion of what a valid design is, which is what stops a value stored by an older build (or hand-edited into a link) from reaching the renderer. The emptiness check lives once in `formatQRData`, not per formatter — five private notions of "empty" is how a blank vCard came to encode a hollow `BEGIN`/`END` card (#36). `formatQRData` returning `""` means "empty _or_ unrepresentable"; callers that report the difference to a human ask `hasAnyContent` which of the two it was.

### INV-4: User text entering a structured payload goes through that format's escaping rules

Raw interpolation is how the mailto form-encoding and vCard semicolon bugs shipped. The rule is a sweep, not a per-format patch: percent-encoding per RFC 6068 for `mailto:` (recipient included), backslash escapes and CRLF per RFC 2426 for vCard, percent-encoding of the characters STD 66 excludes for `url`, the RFC 3966 subscriber grammar for `tel:`. Normalize whitespace wherever it is syntactically invalid; leave it alone only where the field _is_ the payload (`text`). When a value cannot be represented, encode nothing rather than dropping the offending characters — deleting the letters from `ext. 89` leaves `.89`, a well-formed URI that dials somewhere else. Verified with hostile-input tests.

### INV-5: User-facing failures are inline, never native dialogs

`alert`/`confirm`/`prompt` are lint errors (`no-alert`, configured in the root `vite.config.js`). Render the `Note` primitive instead — `variant="error"` with `role="alert"` for something the user just did.

### INV-6: An input with more than one entry point has one intake, not one per entry

The logo can arrive from the picker or from a drop anywhere on the canvas; both go through `useLogoIntake`, which owns validation _and_ the rejection message. Sharing only the validator is what let the two paths drift into an `alert()` and a silent `return` for the same file (#37).

### INV-7: The user's working state has an owner, and a failed persist is reported rather than logged

The design being edited lives in `useDraft`, which writes through `src/utils/safeStorage.ts` — the only module allowed to touch Web Storage, enforced by `no-restricted-globals`. Durability used to be a side effect of downloading, so a refresh threw away anything not yet exported (#42); worse, the one path that did persist caught its own `QuotaExceededError` and logged it while two surfaces reported a save that never happened. `writeItem` returns a `WriteResult` instead of throwing so "it did not get stored" cannot be dropped by accident, and every caller renders the failure where the user just acted. The draft is keyed per tab, which keeps two open tabs from overwriting each other's work without needing a lease.

### INV-8: What the app remembers about storage is a cache, not a fact — and something has to ask

`localStorage` is not this tab's to assume about: another tab's sweep takes slots, the browser evicts under pressure, the user clears site data with the tab open. A remembered fingerprint answers "has the design changed?" when the question is "is what I wrote still there?" — believing it meant the draft was never written again for a whole session, silently, with the work on screen looking saved (#65). Any skip-the-write optimisation must be predicated on the slot still being there, and the write needs occasions to run that are not "the data changed": a `storage` event naming the slot, the tab becoming visible again, the flush on the way out. A guard that is never reached guards nothing. The same rule is why history reads unreadable entries back from storage at write time rather than remembering them from boot — remembering them wrote deleted entries back.

### INV-9: Reachability is proven by hit-testing, not geometry

A message rendered off-screen is a silent failure, and geometry cannot tell you it is on screen: `toBeVisible()` passes on a node scrolled out of the viewport, `toBeInViewport()` passes on a single visible pixel (#61), and `toBeInViewport({ ratio: 1 })` passes on an element lying _underneath_ a fixed overlay. Use `expectUnobstructed` (`apps/web/tests/support/reachability.js`) for anything the user has to see or click — it asserts geometry **and** hit-tests top and bottom, naming whatever covers it. The rule covers all the ways UI fails to reach someone: underneath another control (the export bar under the consent banner), past the edge (vCard 29px beyond a 390px viewport), under the contrast floor (a 2.99:1 counter), or saying the wrong thing ("add some content" to a user staring at a filled-in field — see INV-3's `hasAnyContent`).

### INV-10: Whatever is appended to the canvas column's tail brings itself into view

The column is anchored to the top and grows downward (#66), so on a short window its end — the advisories and export controls — runs past the fold. Anything appended there calls `scrollIntoView({ block: "nearest" })` when it appears, carries a `scroll-mb-*`, and has room under the column to scroll into. Scrolling the document is safe precisely because the inspector is sticky — the field being typed into does not move.

### INV-11: `--consent-inset` is the app's only statement of where the banner is

It is the banner's measured height (a `ResizeObserver`), zero once answered, and everything that must stay clear of the bottom edge consults it: the asides subtract it, the toast and mobile export bar offset by it, the canvas pads by it. There is no notion of a "safe" viewport anywhere — anything new that positions against the bottom edge has nothing to inherit and must include it explicitly. That includes scroll margins: `scrollIntoView` aligns to a viewport that does not know its lower reaches are spoken for.

### INV-12: Confirmation guards blast radius, and the gesture, not just the click

A confirmation that sits where the trigger sat is not a confirmation — the second click of a double-click landed on "Confirm?" and took three saved designs to zero. Inline arming must ignore clicks for longer than the platform double-click threshold, so the question can only be answered by a click aimed at the question. Confirmation is reserved for blast radius ("Clear all"), never a substitute for a take-back.

### INV-13: A control that destroys user data offers a take-back, and the take-back is not a message

The handler snapshots what it is about to overwrite and pushes it to `useUndo`; `useToast` carries transient messages and is deliberately incapable of holding an action. This is a capability rule, not a per-button one — while the toast was text-only, every irreversible path said nothing, and a mis-clicked hover icon was final (#41). Undo restores _position_, not just presence. Keep undo's lifetime out of the notification's: making the action a field of the toast made undo capacity a property of display capacity, and deleting a design then downloading a PNG lost the design (#57). A message may draw _over_ a pending offer; only `useUndo` decides when an offer ends.

### INV-14: The undo store is a stack, and no destructive action may cost another one its take-back

Same-kind actions coalesce into the top group and replay newest-first (position-correct reinsertion); an unrelated action lands _on top_, and taking the top re-offers what was underneath (#57/#58). Merging across kinds is one line and wrong — a single "Undo" reversing two unrelated things under a label naming one of them is a worse surprise than the bug. The rolling window covers the whole stack and restarts on every change including a pop; depth is capped because a design snapshot can carry a multi-megabyte logo. A modal above the tray owns the keyboard and holds the clock — closing a dialog must not spend a pending take-back.

### INV-15: The build prerenders, and crawler-visible means present at first render

`vpr build` runs three stages: the client build, an `--ssr` build of `src/entry-server.tsx`, and `scripts/prerender.mjs`, which renders the app under a jsdom shim and injects the markup into `dist/index.html` (#78) — the same script stamps the sitemap. The script fails the build rather than ship an empty shell, and the `crawler` Playwright project (JS disabled, against the built output) pins the words in CI. Anything that must be crawler-visible has to exist at first render without effects; content that appears only after an effect runs is invisible to every non-JS crawler.

### INV-16: Before consent, the page talks to no one

"Runs entirely in your browser" is a measured property, not copy: every asset — fonts included — ships from our own origin, the CSP's `font-src 'self'` makes a third-party font loud instead of silent, and `tests/fonts.spec.js` fails on any off-origin request made before the user consents to analytics (#81). Never load fonts via CSS `@import` — the production bundler drops mid-file `@import`s silently; font CSS enters through JS imports in `main.tsx`.

### INV-17: The skill is a plugin whose claims are evidence, whose version is synced, and whose body is agent-neutral

The plugin root is `skills/qr-code/`, not the repo root — pointing the marketplace at `"./"` installs the whole monorepo, so the plugin root stays free of `package.json`. Every scannability claim in `SKILL.md` is cited or measured (`packages/mcp/tests/scannability.test.ts`; evidence table in `docs/plans/2026-08-01-qr-skill.md`); if a threshold moves, the skill moves, and `packages/core/src/scanRisk.ts` is revisited. The skill must agree with the MCP tool descriptions — a contradiction is worse than either being silent. `SKILL.md` `metadata.version` and `plugin.json` `version` must agree (enforced by `packages/mcp/tests/skill.test.ts`, which also pins the install commands in the README, the web dialog, and llms.txt to the real manifests); any behaviour-visible change to `packages/mcp` requires reviewing the skill and bumping both. The body names agents only where their commands genuinely differ.

### INV-18: The MCP server renders through one guarded pipeline

Core is bundled, not depended on (`devDependencies`, inlined by `vp pack` — a `dependencies` entry would publish an unresolvable private import). The library's own canvas/PNG path is forbidden (silently drops logos); PNG is always resvg rasterizing the sanitized SVG, and sanitization happens on the PNG path only — the returned SVG keeps byte-parity with the web app (`tests/parity.test.ts`). Never add the `canvas` (node-canvas) package; `@napi-rs/canvas` is the supported canvas. `nodeCanvas` is always passed and every `getRawData` call keeps its timeout — without one, a bad logo is a tool call that hangs forever, worse for an agent than any error; the browser guards the same hazard with byte-level upload validation plus the render watchdog. Test fixtures must be real-world PNGs.
