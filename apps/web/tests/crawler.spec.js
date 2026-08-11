import { expect, test } from "@playwright/test";

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
  });

  test("sees a styled, readable page without executing a line of JS", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "QR Code Generator" })).toBeVisible();
    await expect(page.getByText("Nothing to encode yet")).toBeVisible();
    // The prerender answers min-width queries as true, so the crawler gets
    // the desktop layout — the fullest content surface.
    await expect(page.getByText("Runs entirely in your browser")).toBeVisible();
  });
});
