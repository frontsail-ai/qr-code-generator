---
name: qr-code
description: Design and generate QR codes that actually scan. Use when creating a QR code, styling one with colours, gradients, dot shapes or a logo, judging whether a QR design will scan, or debugging a code that will not read. Also use for any question about QR error-correction levels, quiet zones, contrast, transparent backgrounds, logo coverage, sizing a code for print or a banner, or making a shareable link to a QR design.
---

# QR codes that scan

Generating a QR code is easy and the result usually looks fine. Most failures are invisible in the file you get back — the code renders, previews well, and then does not read off a phone. Work through the decisions below in order.

## What you can and cannot change

Get this straight before advising anyone, because the usual QR advice assumes controls this toolchain does not expose.

**You control:** the content and its length, foreground and background colours, gradient direction, dot and corner shapes, a centre logo, and the output format and size.

**You do not control:**

- **Error-correction level.** Fixed at Q (~25% recoverable). There is no parameter for it — not in the MCP tools, not in the web app. Never advise "raise it to H to pay for the logo"; it cannot be done here. Recommend shorter content, a bigger code, a real quiet zone, darker modules or a smaller logo instead.
- **Quiet zone width.** Fixed at the 4 modules the standard requires. It is always present and always painted in the background colour; there is no parameter to widen or remove it.
- **Logo size.** Fixed at the default footprint, about 10% of the dark modules.

## 1. Pick the content type

Five types, each with its own fields: `url`, `email`, `phone`, `text`, `vcard`.

Choose the specific type over `text`. A URL encoded as `text` still scans, but phones offer "open link" for a `url` and plain text for the rest — the type changes what the scan _does_, not just what it contains.

Keep payloads short. Length drives the symbol version: more characters means more, smaller modules at the same physical size, and smaller modules are the single biggest cause of scan failure. For long destinations, shorten the URL rather than encoding the long one. vCards are the usual offender — include only the fields the recipient needs.

## 2. Style within the safety rails

**Contrast — the rule is not what you think.** Keep the _dark modules genuinely dark_. This is not the same as keeping contrast ratio high, and the difference is measurable: a light-grey foreground on white stops decoding at a 3.95:1 ratio, while near-black ink on a mid-grey background still decodes at 1.68:1. Same ratios, opposite outcomes, because a decoder thresholds luminance to decide which modules are dark rather than comparing the two colours. Practical consequence: a pale-on-white code can pass a WCAG 3:1 graphics check and still not scan. Never lighten the foreground to make a code feel softer — darken the background instead.

**Never invert unless you must.** Light modules on a dark background decode in software libraries and the standard permits it, but scanner support has historically been uneven and you cannot tell which app your recipient will use. If a dark design is required, prefer dark-background-with-dark-ink only when you have tested it, and otherwise put a light panel behind the code.

**Dot and corner styles are a design choice, not a scannability one.** All six dot styles decode down to roughly 1.6–2.0 pixels per module — they do not meaningfully separate. Pick whichever suits the brand. Note `corner_square_type: "extra-rounded"` is the value the web app's picker labels simply "Rounded"; there is no separate `rounded` for corner squares.

**Gradients are safe** as long as both stops stay dark. A gradient running from dark to light reintroduces the contrast problem at the light end. `linear-bl-tr` runs bottom-left to top-right and `linear-tl-br` runs top-left to bottom-right, as named.

## 3. The traps

These are the failures that do not show up in the file you get back.

**Quiet zone — handled, but check what produced the file.** The standard requires at least 4 empty modules on all four sides. **Current exports include it**, painted in the background colour, so a file from this toolchain can be placed directly without adding margin. Older files cannot: before `@frontsail-ai/qr-mcp` 0.2.0 the exports carried 0.18 modules for short content — effectively none — because the margin was integer-rounding slack rather than a design decision. If you are handed an existing QR image from anywhere else, measure before trusting it, and add clear space of at least four modules if it is missing. A missing quiet zone is the most common way a working code becomes unreadable once it is placed on a photo or a coloured panel.

**Transparent backgrounds inherit the surface.** A transparent export has no background of its own, so whatever it lands on becomes the light module. Measured: the same file decodes on white, light grey and mid grey, and fails on a near-black surface. Only choose a transparent background when you know the destination surface is light, and say so when you hand the file over. When in doubt, use an opaque background — it is immune to whatever sits underneath.

**Logos cost error-correction budget, but not the way people expect.** The code encodes at error-correction level Q (~25% recoverable) and the default logo hides about 10% of the dark modules. That fraction is constant regardless of payload length — the logo scales with the canvas, not with the module count — so "long content plus a logo" is not the special danger it is often described as. The real risks are stacking a logo with _other_ damage: a logo plus a poor quiet zone plus a small print size is what exhausts the budget. Keep the logo at the default size; if you need a bigger one, test the result.

**Size is the limiting factor.** Everything above matters less than physical size. Codes need roughly 2 pixels per module just to decode from a clean image, and far more from a camera at an angle. Fewer characters means fewer modules means each one is bigger at the same size.

**Verify anything unusual.** These thresholds come from a software decoder reading a clean image — no camera optics, motion blur, glare, angle or print gain. Real scanning is strictly harder. Treat every number here as a ceiling, and actually scan a test print for anything going to production.

## 4. Generate it

**If the `qr-code-generator` MCP server is available**, use its tools:

- `generate_qr_code` — returns SVG (280px, resolution-independent, prefer this) or PNG (560px), or writes to an absolute `output_path`.
- `create_share_link` — returns a link that reopens the design in the web editor, for handing to a human to tweak. Logos are not included in share links.

**If it is not available**, install it:

```bash
claude mcp add qr -- npx -y @frontsail-ai/qr-mcp
```

Or point the user at [qr-code-gen.frontsail.app](https://qr-code-gen.frontsail.app/) and build a share link for them by hand — the design travels in the URL fragment, so nothing is stored server-side.

Prefer SVG whenever the destination allows it: it stays sharp at any size, which directly addresses the size constraint above.

---

Measured thresholds and their sources: [`docs/plans/2026-08-01-qr-skill.md`](https://github.com/frontsail-ai/qr-code-generator/blob/master/docs/plans/2026-08-01-qr-skill.md). The harness that produces them is `packages/mcp/tests/scannability.test.ts`.
