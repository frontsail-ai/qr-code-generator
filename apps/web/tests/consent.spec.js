import { expect, test } from "@playwright/test";

/* These run against `vp dev`, where analytics is inert by design — so they
   cover the consent *contract* (what is shown, what is stored, what is never
   fetched) rather than GA itself. The "no tag in dev" assertion is the one that
   protects the Playwright suite from writing bot pageviews into the property if
   the environment gate is ever loosened. */

const STORAGE_KEY = "qr-analytics-consent";
const banner = (page) => page.getByRole("region", { name: "Analytics consent" });
const readDecision = (page) => page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
const gtagScriptCount = (page) => page.locator('script[src*="googletagmanager.com"]').count();

test.describe("Analytics consent", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows the banner when no decision has been recorded", async ({ page }) => {
    await expect(banner(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
    expect(await readDecision(page)).toBeNull();
  });

  test("never loads the tag before a decision", async ({ page }) => {
    expect(await gtagScriptCount(page)).toBe(0);
  });

  test("accepting dismisses the banner and records consent", async ({ page }) => {
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(banner(page)).toBeHidden();
    expect(await readDecision(page)).toBe("granted");
  });

  test("declining dismisses the banner and records refusal", async ({ page }) => {
    await page.getByRole("button", { name: "Decline" }).click();
    await expect(banner(page)).toBeHidden();
    expect(await readDecision(page)).toBe("denied");
  });

  test("remembers acceptance across a reload", async ({ page }) => {
    await page.getByRole("button", { name: "Accept" }).click();
    await page.reload();
    await expect(banner(page)).toBeHidden();
    expect(await readDecision(page)).toBe("granted");
  });

  test("remembers refusal across a reload", async ({ page }) => {
    await page.getByRole("button", { name: "Decline" }).click();
    await page.reload();
    await expect(banner(page)).toBeHidden();
    expect(await readDecision(page)).toBe("denied");
  });

  test("declining never loads the tag", async ({ page }) => {
    await page.getByRole("button", { name: "Decline" }).click();
    await page.reload();
    expect(await gtagScriptCount(page)).toBe(0);
  });

  test("does not block the generator while it is on screen", async ({ page }) => {
    await expect(banner(page)).toBeVisible();
    await page.getByPlaceholder("frontsail.ai").fill("github.com");
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeEnabled();
  });
});

test.describe("Analytics toggle", () => {
  const toggle = (page) => page.getByRole("switch", { name: "Analytics" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("reflects the banner decision", async ({ page }) => {
    await expect(toggle(page)).toHaveAttribute("aria-checked", "false");
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true");
  });

  test("withdraws consent after it was granted", async ({ page }) => {
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true");

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-checked", "false");
    expect(await readDecision(page)).toBe("denied");
  });

  test("withdrawal survives a reload and keeps the tag out", async ({ page }) => {
    await page.getByRole("button", { name: "Accept" }).click();
    await toggle(page).click();
    await page.reload();

    await expect(toggle(page)).toHaveAttribute("aria-checked", "false");
    expect(await readDecision(page)).toBe("denied");
    expect(await gtagScriptCount(page)).toBe(0);
  });

  test("re-grants consent without bringing the banner back", async ({ page }) => {
    await page.getByRole("button", { name: "Decline" }).click();
    await expect(banner(page)).toBeHidden();

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true");
    expect(await readDecision(page)).toBe("granted");
    await expect(banner(page)).toBeHidden();
  });
});
