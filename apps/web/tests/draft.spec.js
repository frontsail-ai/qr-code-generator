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

  /* The draft is written on a trailing debounce, which is a window where the
     design exists only in memory. A reload waits it out; a crash does not. */
  test.describe("Leaving in a hurry", () => {
    test("keeps the last edit when the page goes away mid-debounce", async ({ page }) => {
      await urlInput(page).fill("typed-and-gone.example");
      // Well inside the debounce — nothing has been written yet
      await page.waitForTimeout(120);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));

      const written = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) => k.startsWith("qr-draft:"));
        return key ? JSON.parse(localStorage.getItem(key)).formData.url.url : null;
      });
      expect(written).toBe("typed-and-gone.example");

      await page.reload();
      await expect(urlInput(page)).toHaveValue("typed-and-gone.example");
    });
  });

  test.describe("Telling the user", () => {
    test("says when it put a design back, and offers a way to start over", async ({ page }) => {
      await urlInput(page).fill("restored-design.example");
      await settleDraft(page);
      await page.reload();

      const toast = page.getByTestId("toast");
      await expect(toast).toContainText("Picked up where you left off");
      await expect(toast).toBeInViewport();

      // Taking the offer is the only route back to a blank canvas
      await page.getByRole("button", { name: "Undo" }).click();
      await expect(urlInput(page)).toHaveValue("");
      await expect(page.getByText("Nothing to encode yet")).toBeVisible();

      // Starting over is destructive too, so it hands back what it cleared
      await expect(page.getByTestId("toast")).toContainText("Started a new design");
      await page.getByRole("button", { name: "Undo" }).click();
      await expect(urlInput(page)).toHaveValue("restored-design.example");
      await settleDraft(page);
      await page.reload();
      await expect(urlInput(page)).toHaveValue("restored-design.example");
    });

    test("says nothing on a first visit, when nothing was restored", async ({ page }) => {
      await urlInput(page).fill("first-visit.example");
      await page.waitForTimeout(800);
      await expect(page.getByTestId("toast")).not.toContainText("Picked up where you left off");
    });
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

    /* Duplicating a tab clones `sessionStorage`, so the twin boots holding the
       original's id. Without the roll-call the two write the same slot and the
       original reloads into the twin's design — the exact collision per-tab
       slots were chosen to avoid. */
    test("a duplicated tab takes a slot of its own instead of sharing one", async ({
      context,
      page,
    }) => {
      await urlInput(page).fill("original-tab.example");
      await settleDraft(page);
      const clonedId = await page.evaluate(() => sessionStorage.getItem("qr-tab-id"));

      /* Hand the twin the cloned id once and boot it, the way duplicating a
         tab does — not on every navigation, which would undo the re-key the
         moment we reload to check it. */
      const twin = await context.newPage();
      await twin.goto("/");
      await twin.evaluate((id) => sessionStorage.setItem("qr-tab-id", id), clonedId);
      await twin.reload();
      await expect(urlInput(twin)).toHaveValue("original-tab.example");
      // Give the roll-call time to notice the collision and re-key
      await twin.waitForTimeout(600);
      await urlInput(twin).fill("twin-tab.example");
      await settleDraft(twin);

      await page.reload();
      await expect(urlInput(page)).toHaveValue("original-tab.example");
      await twin.reload();
      await expect(urlInput(twin)).toHaveValue("twin-tab.example");

      await twin.close();
    });

    /* The slot cap bounds abandoned drafts. It used to bound live ones too. */
    test("a new tab does not evict an open tab's draft to stay under the cap", async ({
      context,
      page,
    }) => {
      await urlInput(page).fill("oldest-but-open.example");
      await settleDraft(page);

      const others = [];
      for (let i = 0; i < 5; i++) {
        const tab = await context.newPage();
        await tab.goto("/");
        await tab.waitForTimeout(400);
        await urlInput(tab).fill(`filler-${i}.example`);
        await settleDraft(tab);
        others.push(tab);
      }

      // The oldest tab is still open, so its draft is not the cap's business
      await page.reload();
      await expect(urlInput(page)).toHaveValue("oldest-but-open.example");
      for (const tab of others) await tab.close();
    });
  });

  /* The whole history list is rewritten on every save, so anything this build
     drops on the way in is erased on the way out. A newer build's entry — a
     rolled-back deploy, a cached bundle, two tabs across a release — must
     survive a version of the app that cannot render it. */
  test.describe("History written by another version", () => {
    const seedWithForeign = (page) =>
      page.evaluate(() => {
        const blank = {
          email: { to: "", subject: "", body: "" },
          phone: { number: "" },
          text: { content: "" },
          vcard: {
            firstName: "",
            lastName: "",
            phone: "",
            email: "",
            org: "",
            title: "",
            website: "",
          },
        };
        localStorage.setItem(
          "qr-saved-configs",
          JSON.stringify([
            {
              id: "known",
              timestamp: new Date().toISOString(),
              qrType: "url",
              formData: { url: { url: "readable.example" }, ...blank },
              customization: {},
            },
            // A QR type this build has never heard of
            {
              id: "from-the-future",
              timestamp: new Date().toISOString(),
              qrType: "wifi",
              formData: { wifi: { ssid: "home" }, ...blank },
              customization: {},
            },
          ]),
        );
      });

    const storedIds = (page) =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("qr-saved-configs") ?? "[]").map((c) => c.id),
      );

    test("skips what it cannot read without deleting it", async ({ page }) => {
      await seedWithForeign(page);
      await page.reload();

      // Not rendered — this build has no idea how to draw it
      await expect(page.getByTestId("history-card")).toHaveCount(1);

      // ...and an ordinary save does not take it down with the rewrite
      await urlInput(page).fill("an-ordinary-save.example");
      await page.waitForTimeout(400);
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await download;
      await expect.poll(() => storedIds(page)).toContain("from-the-future");

      // Nor does deleting the entries this build can see
      await page.getByTestId("history-card").first().hover();
      await page.getByRole("button", { name: "Delete" }).first().click();
      await expect.poll(() => storedIds(page)).toContain("from-the-future");
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

    /* The notice arrives while the user is reaching for Download. On desktop
       the column is vertically centred, so anything added to the flow moves
       that button by half the height it added — which is how a warning about
       losing work ends up making you misclick. */
    test("appears without moving the button the user is reaching for", async ({ page }) => {
      await urlInput(page).fill("no-shift.example");
      await settleDraft(page);
      const before = await page.getByRole("button", { name: "Download PNG" }).boundingBox();

      await fillStorage(page, 0);
      await urlInput(page).fill("no-shift-grown.example");
      await settleDraft(page);

      await expect(storageNotice(page)).toBeVisible();
      const after = await page.getByRole("button", { name: "Download PNG" }).boundingBox();
      expect(after.y).toBe(before.y);
      await expect(storageNotice(page)).toBeInViewport();
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
