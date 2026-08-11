# Self-hosted fonts blueprint

**Date:** 2026-08-11 · **Status:** proposed · **Scope:** one PR — font delivery, CSP, one e2e file; no visual change

Fix [#81](https://github.com/frontsail-ai/qr-code-generator/issues/81): every visit fetched IBM Plex from Google while the page promised that nothing leaves your machine. Ship the fonts from our own origin and make the promise a tested network invariant.

## Root-cause note

Why-chain, verified: the page pinged Google because `index.html:38-43` loaded the fonts stylesheet from `fonts.googleapis.com` (+2 preconnects) → the link-tag route was chosen after a mid-file CSS `@import` silently dropped the fonts in production (incident documented at `index.html:35-37`) → the privacy claim and the font source were never reconciled because the claim governed user _content_ while nothing measured the page's _network behavior_ → the CSP even allowlisted the Google font hosts (`vercel.json`), so infrastructure could contradict the promise without anything getting loud. **Root cause: the privacy promise had no enforcement at the network layer.** Sibling sweep: the only other third-party surface is GTM/GA, consent-gated by design — no other silent contacts; the CSP after this change allowlists nothing that fires before consent.

## Design decisions

- **Fontsource packages, not committed woff2 blobs.** `@fontsource/ibm-plex-{sans,mono}` (400–700) imported as **JS imports in `main.tsx`** — Vite bundles the `@font-face` rules into the hashed CSS asset and copies the woff2 files to `/assets`. JS imports deliberately sidestep the documented mid-file `@import` trap.
- **CSP is the guardrail, tightened in the same change**: `style-src` drops `fonts.googleapis.com`, `font-src` becomes `'self'` (it previously allowed _only_ `fonts.gstatic.com` — self-hosting without this flip would have silently blocked the fonts in production, the exact class of failure the original incident documents).
- **The promise becomes a test.** `tests/fonts.spec.js`: (1) before consent, zero off-origin requests during load and interaction — this guards against _any_ future third-party creep, not just fonts; (2) `document.fonts.check()` proves IBM Plex actually loaded — the anti-silent-fallback assertion.
- Latin subsets arrive with `unicode-range`, so browsers fetch only what the page uses; the weight set matches the old Google URL exactly (400/500/600/700, both families, no italics).

## Plan

1. `apps/web` deps: `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`; eight weight imports in `main.tsx`.
2. `index.html`: remove preconnects + Google stylesheet; comment records the new shape and the standing `@import` warning.
3. `vercel.json`: CSP `style-src 'self' 'unsafe-inline'`, `font-src 'self'`.
4. `tests/fonts.spec.js` (chromium project): the two tests above.
5. AGENTS.md: the network invariant.

## Risks & mitigations

- CSP applies only on Vercel (preview/production), so local tests can't exercise it → post-merge check: production loads with fonts rendering and no CSP violations in the console.
- Fontsource CSS ordering vs. tokens: font imports precede `index.css` in `main.tsx`, so `--font-*` token references resolve against loaded faces either way.

## Out of scope

- Meta description (#80), sitemap lastmod (#82); the GTM/GA consent-gated surface (working as designed).
