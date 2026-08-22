import { expect, test } from "@playwright/test";
import { pageLastModified } from "../scripts/lastmod.mjs";

/* What a crawler that does not execute JavaScript sees (#78). This project
   runs with javaScriptEnabled: false against the built output — the same
   artifact Vercel deploys — so a regression that empties dist/index.html
   turns CI red instead of quietly deindexing the site.

   Every guard against "the app broke silently" lives in the chromium
   project; this suite only cares that the words exist before React does. */

test.describe("A crawler without JavaScript", () => {
  test("reads the page's actual words in the raw HTML", async ({ request }) => {
    // No browser rendering at all — the bytes the crawler downloads.
    const response = await request.get("/");
    expect(response.ok()).toBe(true);
    const html = await response.text();

    const body = html.slice(html.indexOf("<body"));
    expect(body, "the H1 must exist outside <head>").toContain("QR Code Generator");
    expect(body).toContain("Runs entirely in your browser");
    expect(body).toContain("Nothing to encode yet");

    // The discovery section (#79) — the page's indexable words
    expect(body).toContain("Why this generator");
    expect(body).toContain("Codes never expire");
    expect(body).toContain("no sign-up, no watermark");

    // Attribution links must reach the no-JS HTML: they are the link graph's
    // only path from the tool to the hub and the products.
    expect(body).toContain('href="https://frontsail.ai"');
    expect(body).toContain('href="https://frontsail.app"');

    // The SERP snippet (#80): inside Google's ~160-char display budget, and
    // still carrying the claims that earn the click.
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1];
    expect(description, "meta description must exist").toBeTruthy();
    expect(description.length, "Google truncates around 160 chars").toBeLessThanOrEqual(160);
    expect(description.toLowerCase()).toContain("free");
    expect(description).toContain("MCP");
  });

  test("the sitemap's lastmod is when the page changed, not when it built", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);
    const lastmod = (await response.text()).match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1];
    // Two dates this must never be: the hand-written one that froze at
    // 2026-07-21, and today's, which a build-date stamp produces on deploys
    // the page had no part in. Both read as fresh to a crawler and are how a
    // site teaches Google to stop trusting its lastmod. The generator and
    // this test read the same definition, so they cannot drift apart; where
    // git history is unavailable (a shallow clone) both say "no date", and
    // the entry ships without one rather than lying.
    expect(lastmod ?? null).toBe(pageLastModified());
  });

  test("sees a styled, readable page without executing a line of JS", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "QR Code Generator" })).toBeVisible();
    await expect(page.getByText("Nothing to encode yet")).toBeVisible();
    // The prerender answers min-width queries as true, so the crawler gets
    // the desktop layout — the fullest content surface.
    await expect(page.getByText("Runs entirely in your browser", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Why this generator" })).toBeVisible();
  });
});
