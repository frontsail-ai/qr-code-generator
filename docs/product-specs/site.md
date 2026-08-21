# The Discovery Surface

What crawlers, search engines, AI crawlers and link previews get from qr-code-gen.frontsail.app. The through-line: everything here is served, measured, and honest — no claim the page doesn't keep (see INV-15/INV-16).

Prefix: `SITE`.

---

### SITE-1: The served HTML carries the page's words

A client that never executes JavaScript reads the full workspace markup — the H1, the labels, the empty state — directly in the served `dist/index.html`, styled by the linked CSS.

### SITE-2: The notes below the fold are the page's indexable content

The "Why this generator" section — privacy, non-expiring codes, share-link semantics, measured scannability, agent integration, free-without-asterisk — is present in the served HTML and readable without JavaScript.

### SITE-3: The SERP snippet fits the display budget

The meta description is at most 160 characters and still names the browser, free, no-sign-up, privacy, export-format and agent claims. Title, canonical, Open Graph (with a 1200×630 image), Twitter card, and JSON-LD (`WebApplication` + `Organization`) are present and consistent.

### SITE-4: The sitemap's lastmod is the build date

`/sitemap.xml` lists the single page with a `lastmod` stamped at build time — never a hand-written date that freezes while the page changes.

### SITE-5: llms.txt briefs agents in their own format

`/llms.txt` serves a curated brief: what the app is, both agent surfaces with per-agent install commands (drift-guarded, see AGENT-8), and the share-link format.

### SITE-6: Robots are welcome

`robots.txt` allows all user agents — AI crawlers included — and names the sitemap.

### SITE-7: Analytics load only after consent

No analytics script, cookie or request exists before the user accepts the consent banner; declining keeps the page silent. Before any consent decision, the page makes no off-origin request at all (see INV-16).

### SITE-8: The consent banner never hides what it asks beside

The banner publishes its measured height (see INV-11), so the export controls, toasts, tray and page tail stay reachable while it is up — on any viewport the suite covers.
