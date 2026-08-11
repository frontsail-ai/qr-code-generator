import { expect, test } from "@playwright/test";

/* The discovery section (#79): indexable words below the workspace. Two
   disciplines to hold at once — the section must be real, readable content,
   and it must never intrude on the workspace, which owns the first viewport. */

const aboutHeading = (page) => page.getByRole("heading", { name: "Why this generator" });

test.describe("About notes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("the workspace owns the first viewport; the notes begin below the fold", async ({
    page,
  }) => {
    // The 99% who came to make a QR code never see the section uninvited
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeInViewport();
    await expect(aboutHeading(page)).not.toBeInViewport();
  });

  test("scrolling reaches the notes, and every note is readable", async ({ page }) => {
    await aboutHeading(page).scrollIntoViewIfNeeded();
    await expect(aboutHeading(page)).toBeVisible();
    for (const title of [
      "Nothing leaves your machine",
      "Codes never expire",
      "Share links carry the design itself",
      "Scannability is measured, not guessed",
      "Works from your code and your agents",
      "Free, in the formats print shops want",
    ]) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "the source on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/frontsail-ai/qr-code-generator",
    );
  });

  test("the section never widens the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await aboutHeading(page).scrollIntoViewIfNeeded();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
  });

  test("a short window still gives the workspace its full height", async ({ page }) => {
    // The flex row must not be compressed by the section joining the column
    await page.setViewportSize({ width: 1280, height: 640 });
    await page.goto("/");
    const row = await page
      .getByRole("button", { name: "Download PNG" })
      .evaluate((el) => el.closest("main").parentElement.getBoundingClientRect().height);
    expect(row).toBeGreaterThanOrEqual(640 - 56 - 1);
  });
});
