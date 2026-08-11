import { expect, test } from "@playwright/test";

/* The header says "Runs entirely in your browser" and the notes say nothing
   leaves your machine. These tests make that a measured property instead of
   marketing copy (#81): before consent, the page talks to no one — not even
   for a font — and the brand fonts still actually load, because the failure
   mode that created this rule was fonts silently falling back (the mid-file
   @import incident documented in index.html). */

test.describe("Self-hosted fonts and the quiet network", () => {
  test("before consent, the page makes no request off its own origin", async ({ page }) => {
    const offOrigin = [];
    page.on("request", (request) => {
      if (!new URL(request.url()).host.startsWith("localhost")) {
        offOrigin.push(request.url());
      }
    });

    await page.goto("/");
    // Exercise the app a little: type, render a QR, open the dialog
    await page.getByPlaceholder("frontsail.ai").fill("quiet-network.example");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Agent setup" }).click();
    await page.keyboard.press("Escape");

    expect(offOrigin, "every request must stay on-origin until consent is given").toEqual([]);
  });

  test("IBM Plex genuinely loads from our origin — no silent fallback", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => ({
      sans: document.fonts.check('16px "IBM Plex Sans"'),
      mono: document.fonts.check('16px "IBM Plex Mono"'),
    }));
    expect(loaded.sans, "IBM Plex Sans must be loaded").toBe(true);
    expect(loaded.mono, "IBM Plex Mono must be loaded").toBe(true);
  });
});
