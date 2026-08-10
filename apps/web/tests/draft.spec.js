import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/* A real PNG big enough to matter against a ~5 M character storage budget:
   175 KB of file becomes ~234 K characters of base64 once it is a data URL. */
const BIG_LOGO = readFileSync(
  new URL("../../../docs/screenshots/desktop-populated.png", import.meta.url),
);

const urlInput = (page) => page.getByPlaceholder("frontsail.ai");
const storageNotice = (page) => page.getByTestId("storage-notice");

/* Fills localStorage and then hands back roughly `freeChars` of room, so a
   test can put the app up against a real quota rather than a simulated one.

   The block sizes descend on purpose: filling in 64 K blocks alone stops as
   much as 64 K short of the limit, which is ample space for a draft — the test
   would then be asserting against storage that is merely large, not full. */
async function fillStorage(page, freeChars) {
  return page.evaluate((free) => {
    const blocks = [];
    let n = 0;

    for (const size of [64 * 1024, 1024, 64, 8]) {
      try {
        for (;;) {
          const key = `ballast-${n++}`;
          localStorage.setItem(key, "x".repeat(size));
          blocks.push({ key, size });
        }
      } catch {
        /* this size no longer fits; try a smaller one */
      }
    }

    let reclaimed = 0;
    for (const block of blocks.reverse()) {
      if (reclaimed >= free) break;
      if (block.size !== 64 * 1024) continue;
      localStorage.removeItem(block.key);
      reclaimed += block.size;
    }
    return reclaimed;
  }, freeChars);
}

/* The draft is written on a 500 ms trailing debounce; reloading before it has
   fired would test the timer, not the persistence. */
async function settleDraft(page) {
  await page.waitForTimeout(700);
}

test.describe("Working draft", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("Survives a reload", () => {
    test("keeps the content and the style of the design in progress", async ({ page }) => {
      await urlInput(page).fill("unsaved-work.example");
      await page.getByRole("button", { name: "Dots" }).click();
      await page.getByRole("button", { name: "#A63D30" }).first().click();
      await settleDraft(page);

      await page.reload();

      await expect(urlInput(page)).toHaveValue("unsaved-work.example");
      await expect(page.getByRole("button", { name: "Dots" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.locator('input[value="A63D30"]')).toBeVisible();
      // The code itself is back, not just the controls
      await expect(page.getByText("Nothing to encode yet")).toBeHidden();
    });

    test("keeps content typed under a type the user has moved away from", async ({ page }) => {
      await page.getByRole("button", { name: "Email" }).click();
      await page.getByPlaceholder("hello@frontsail.ai").fill("draft@example.com");
      await page.getByRole("button", { name: "Text" }).click();
      await settleDraft(page);

      await page.reload();

      // The type the user left on comes back...
      await expect(page.getByRole("button", { name: "Text" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      // ...and so does the form they had filled in before switching away
      await page.getByRole("button", { name: "Email" }).click();
      await expect(page.getByPlaceholder("hello@frontsail.ai")).toHaveValue("draft@example.com");
    });

    test("keeps a logo that was uploaded but never downloaded", async ({ page }) => {
      await urlInput(page).fill("logo-draft.example");
      await page.locator('input[type="file"]').setInputFiles({
        name: "logo.png",
        mimeType: "image/png",
        buffer: BIG_LOGO,
      });
      await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
      await settleDraft(page);

      await page.reload();

      await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
      await expect(storageNotice(page)).toBeHidden();
    });

    /* The hash is stripped from the address bar as the design is applied, so
       before this the design existed only in memory and a reload had nothing
       to go back to — not even the link that had just delivered it. */
    test("keeps a design that arrived as a share link", async ({ page }) => {
      await urlInput(page).fill("shared-then-reloaded.example");
      await page.getByRole("button", { name: "#A63D30" }).first().click();
      await page.waitForTimeout(400);

      await page.evaluate(() => {
        window.__copiedLink = null;
        navigator.clipboard.writeText = (text) => {
          window.__copiedLink = text;
          return Promise.resolve();
        };
      });
      await page.getByRole("button", { name: "Copy shareable link", exact: true }).click();
      const link = await page.evaluate(() => window.__copiedLink);

      // Arrive at the link cold, in a browser that has never seen this design
      await page.evaluate(() => localStorage.clear());
      await page.goto(link);
      await expect(urlInput(page)).toHaveValue("shared-then-reloaded.example");
      expect(page.url()).not.toContain("#s=");
      await settleDraft(page);

      await page.reload();

      await expect(urlInput(page)).toHaveValue("shared-then-reloaded.example");
      await expect(page.locator('input[value="A63D30"]')).toBeVisible();
    });

    test("keeps a design restored from history and then edited", async ({ page }) => {
      await urlInput(page).fill("from-history.example");
      await page.waitForTimeout(400);
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await download;

      await urlInput(page).fill("edited-after-restore.example");
      await settleDraft(page);

      await page.reload();

      await expect(urlInput(page)).toHaveValue("edited-after-restore.example");
    });
  });

  test.describe("Two tabs", () => {
    test("a second tab does not take over the first tab's draft", async ({ context, page }) => {
      await urlInput(page).fill("first-tab.example");
      await settleDraft(page);

      const second = await context.newPage();
      await second.goto("/");
      // Opening it shows the work in progress...
      await expect(urlInput(second)).toHaveValue("first-tab.example");

      // ...and editing there is that tab's business alone
      await urlInput(second).fill("second-tab.example");
      await settleDraft(second);

      await page.reload();
      await expect(urlInput(page)).toHaveValue("first-tab.example");

      await second.reload();
      await expect(urlInput(second)).toHaveValue("second-tab.example");

      await second.close();
    });

    test("a tab opened later picks up the most recent draft", async ({ context, page }) => {
      await urlInput(page).fill("older.example");
      await settleDraft(page);

      const second = await context.newPage();
      await second.goto("/");
      await urlInput(second).fill("newer.example");
      await settleDraft(second);

      const third = await context.newPage();
      await third.goto("/");
      await expect(urlInput(third)).toHaveValue("newer.example");

      await second.close();
      await third.close();
    });
  });

  /* Storage that silently refuses to store is the failure this whole feature
     exists to stop, so it has to be loud in the place the user is looking. */
  test.describe("When storage is full", () => {
    test("says the design will not be restored", async ({ page }) => {
      await fillStorage(page, 0);

      await urlInput(page).fill("no-room.example");
      await settleDraft(page);

      await expect(storageNotice(page)).toBeVisible();
      await expect(storageNotice(page)).toBeInViewport();
      await expect(storageNotice(page)).toHaveText(/storage is full/i);
      await expect(storageNotice(page)).toHaveAttribute("role", "alert");
    });

    test("keeps the design when only the logo does not fit", async ({ page }) => {
      // Room for a design, nowhere near enough for a 234 K character logo
      await fillStorage(page, 64 * 1024);

      await urlInput(page).fill("logo-too-big.example");
      await page.locator('input[type="file"]').setInputFiles({
        name: "logo.png",
        mimeType: "image/png",
        buffer: BIG_LOGO,
      });
      await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
      await settleDraft(page);

      await expect(storageNotice(page)).toBeVisible();
      await expect(storageNotice(page)).toHaveText(/logo won't come back/i);

      await page.reload();

      // The design came back; the app explains what did not come with it
      await expect(urlInput(page)).toHaveValue("logo-too-big.example");
      await expect(page.getByRole("button", { name: "Remove" })).toBeHidden();
      await expect(storageNotice(page)).toHaveText(/logo could not be restored/i);
    });

    /* Downloading also saves to history. It used to say so either way: the
       write threw, the catch logged, and the toast and the sidebar both
       reported a save that had not happened until the next reload disagreed. */
    test("does not claim a history save it could not make", async ({ page }) => {
      await urlInput(page).fill("history-full.example");
      await page.waitForTimeout(400);
      await fillStorage(page, 0);

      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await download;

      await expect(page.getByText("Saved to history")).toBeHidden();
      await expect(storageNotice(page)).toBeVisible();
      await expect(storageNotice(page)).toHaveText(/not added to history/i);
      // Nothing was listed either, so the sidebar and storage still agree
      await expect(page.getByTestId("history-card")).toHaveCount(0);
      await expect(page.getByText("No saved codes yet")).toBeVisible();
    });

    /* The undo offered after a delete writes the entry back, so it can be
       refused like any other write — and it is refused at the worst moment,
       with the user already correcting a mistake. Saying nothing here would
       put the take-back exactly where the original bug was. */
    test("says so when an undo cannot be written back", async ({ page }) => {
      await urlInput(page).fill("undo-nowrite.example");
      await page.waitForTimeout(400);
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await download;
      await expect(page.getByTestId("history-card")).toHaveCount(1);

      await page.getByTestId("history-card").first().hover();
      await page.getByRole("button", { name: "Delete" }).click();
      await expect(page.getByTestId("history-card")).toHaveCount(0);

      // Something else claims the room the delete just freed
      await fillStorage(page, 0);
      await page.getByRole("button", { name: "Undo" }).click();

      await expect(storageNotice(page)).toBeVisible();
      await expect(storageNotice(page)).toBeInViewport();
      await expect(storageNotice(page)).toHaveText(/could not be put back/i);
      // And the sidebar still agrees with storage rather than with the offer
      await expect(page.getByTestId("history-card")).toHaveCount(0);
    });

    /* The retry matters as much as the warning: a warning that outlives the
       condition it describes teaches people to ignore it. */
    test("saves to history and picks the draft back up once there is room", async ({ page }) => {
      await urlInput(page).fill("room-again.example");
      await page.waitForTimeout(400);
      await fillStorage(page, 0);

      let download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await download;
      await expect(storageNotice(page)).toBeVisible();

      await page.evaluate(() => {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("ballast-")) localStorage.removeItem(key);
        }
      });

      download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await download;

      await expect(page.getByTestId("history-card")).toHaveCount(1);
      await expect(storageNotice(page)).toBeHidden();

      /* The retry is the only thing that writes the draft here — nothing has
         changed the design since the write that failed — so it still owes the
         debounce before a reload can find it. */
      await settleDraft(page);
      await page.reload();
      await expect(urlInput(page)).toHaveValue("room-again.example");
    });
  });
});
