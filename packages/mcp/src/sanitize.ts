/* qr-code-styling emits gradient and clip-path references as `url('#id')`.
   That is valid SVG, and browsers honour it, but resvg does not resolve the
   quoted form — it silently paints a solid square instead of the QR. Rewrite
   to the unquoted form before rasterizing.

   This runs on the PNG path only. The SVG a caller receives is left exactly as
   the library produced it, which is what keeps it byte-identical to the file
   the web app downloads. */
export function sanitizeForRasterizer(svg: string): string {
  return svg.replace(/url\('(#[^']*)'\)/g, "url($1)");
}

/* The library numbers the ids it generates with a per-process instance counter
   — the trailing `-<n>` in `clip-path-dot-color-3` or
   `clip-path-corners-square-color-0-1-3`. The counter depends on how many QR
   instances the process has built, so it differs between the browser (which
   builds a preview first) and a fresh Node process, and even between two
   renders in the same process.

   Normalizing it lets the parity test compare everything that matters. The
   match is anchored to the syntactic position of an id — `id="…"`, `url(#…)`,
   `href="#…"` — because a naive substring replace would mistake the row and
   column indices inside an id for the counter whenever the counter happens to
   be 0. */
export function canonicalizeIds(svg: string): string {
  return svg.replace(
    /(id="|url\('?#|href="#)([A-Za-z0-9-]+)/g,
    (_match, prefix: string, id: string) => prefix + id.replace(/-\d+$/, "-N"),
  );
}
