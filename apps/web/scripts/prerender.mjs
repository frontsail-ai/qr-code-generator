/* Injects the server-rendered app into dist/index.html so crawlers that do
   not execute JavaScript still read the page (#78). Runs after `vp build`
   and the --ssr build of src/entry-server.tsx; browser-free on purpose, so
   the same chain works on CI and in Vercel's build image.

   Every check here fails the build loudly. A prerender that silently skips
   injection ships the old empty shell — plausible output, this project's
   characteristic bug. */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://qr-code-gen.frontsail.app/",
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;

/* jsdom does not implement matchMedia. Answer min-width queries as true so
   the prerender is the desktop layout — the fullest content surface. Real
   clients re-render to their own layout when React boots. */
window.matchMedia = (query) => ({
  matches: query.includes("min-width"),
  media: query,
  addEventListener() {},
  removeEventListener() {},
});

const { render } = await import(
  fileURLToPath(new URL("../dist-server/entry-server.js", import.meta.url))
);
const html = render();

if (html.length < 10_000 || !html.includes("QR Code Generator")) {
  throw new Error(
    `prerender produced implausible output (${html.length} chars, H1 ${html.includes("QR Code Generator") ? "present" : "MISSING"}) — refusing to ship it`,
  );
}

const indexPath = fileURLToPath(new URL("../dist/index.html", import.meta.url));
const shell = readFileSync(indexPath, "utf8");
const mount = '<div id="root"></div>';
if (!shell.includes(mount)) {
  throw new Error(`dist/index.html no longer contains ${mount} — prerender cannot inject`);
}

writeFileSync(indexPath, shell.replace(mount, `<div id="root">${html}</div>`));
console.log(`prerender: injected ${html.length} chars into dist/index.html`);

/* Second dist-finalisation duty (#82): stamp the sitemap's lastmod with the
   build date. The hand-written date froze at 2026-07-21 while the page kept
   changing — a lastmod that does not track reality trains crawlers to ignore
   it. Loud on a missing tag, same as everything else in this script. */
const sitemapPath = fileURLToPath(new URL("../dist/sitemap.xml", import.meta.url));
const sitemap = readFileSync(sitemapPath, "utf8");
if (!/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap)) {
  throw new Error("dist/sitemap.xml has no <lastmod> to stamp — update scripts/prerender.mjs");
}
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  sitemapPath,
  sitemap.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, `<lastmod>${today}</lastmod>`),
);
console.log(`prerender: stamped sitemap lastmod ${today}`);
