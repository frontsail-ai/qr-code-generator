/* When the page last actually changed, for the sitemap's <lastmod> (#82).

   Google uses lastmod only while it stays verifiably accurate against the
   page itself, so the build date is the wrong answer: it moves on every
   deploy, including releases that only touch packages/mcp or skills/, and a
   lastmod that does not track reality trains crawlers to ignore it. The
   honest answer is the last commit that changed what the page serves.

   The generator (prerender.mjs) and the test that guards it (tests/
   crawler.spec.js) both read this module, so there is one definition of
   "the page changed", not two that can drift. */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** The files that produce the prerendered page: its shell, and the app whose
    server render fills it. Everything else in the repo can change without
    changing a crawler's copy of this page. */
export const PAGE_SOURCES = ["apps/web/index.html", "apps/web/src"];

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

/** Commit date (YYYY-MM-DD) of the last change to `path`, or null. */
function lastCommitDate(path) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", path], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

/** The page's last-modified date, or null where git history is unavailable
    (a shallow clone, a build image without git). Callers ship no <lastmod>
    rather than inventing one: no date beats a wrong date. */
export function pageLastModified() {
  const dates = PAGE_SOURCES.map(lastCommitDate)
    .filter((date) => date !== null)
    .sort();
  return dates.at(-1) ?? null;
}
