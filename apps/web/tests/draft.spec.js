import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { expectUnobstructed } from "./support/reachability.js";

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
  /* The hook keeps an in-memory record of what it last wrote, so it can skip
     re-serialising a design that has not changed. That record is a belief about
     a store this tab does not own: another tab's sweep takes slots, the browser
     evicts under pressure, and the user can clear site data with the tab open.
     Believing it without checking meant the draft was never written again for
     the rest of the session, silently, with the work still on screen (#65). */
  test.describe("When the stored draft disappears underneath it", () => {
    const draftKey = (page) =>
      page.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith("qr-draft:")) ?? null);

    test("writes it again, without waiting for the design to change", async ({ context, page }) => {
      await urlInput(page).fill("still-on-screen.example");
      await settleDraft(page);
      const key = await draftKey(page);
      expect(key).not.toBe(null);

      /* Taken by another document, which is how it actually goes — a sweep in
         another tab, or the user clearing site data. Deleting it from this page
         would raise no `storage` event, because a document is not told about
         its own writes. */
      const elsewhere = await context.newPage();
      await elsewhere.goto("/");
      await elsewhere.evaluate((k) => localStorage.removeItem(k), key);
      await elsewhere.close();

      /* No further edit: the design is the same one the hook believes it has
         already written, which is exactly the case that used to be skipped. */
      await expect.poll(() => draftKey(page), { timeout: 4000 }).not.toBe(null);

      await page.reload();
      await expect(urlInput(page)).toHaveValue("still-on-screen.example");
    });

    /* Site data cleared from the browser's own settings raises no event in an
       open tab, so nothing re-arms the write. The way out is the last chance to
       notice, and it takes it. */
    test("writes it on the way out when nothing announced the loss", async ({ page }) => {
      await urlInput(page).fill("quietly-lost.example");
      await settleDraft(page);
      await page.evaluate(() => {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith("qr-draft:")) localStorage.removeItem(k);
        }
      });

      await page.reload();
      await expect(urlInput(page)).toHaveValue("quietly-lost.example");
    });

    test("still flushes on the way out when the slot went missing", async ({ page }) => {
      await urlInput(page).fill("flush-after-loss.example");
      await settleDraft(page);
      await page.evaluate(() => {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("qr-draft:")) localStorage.removeItem(key);
        }
        // Freeze the debounce so only the pagehide flush can write
        window.setTimeout = () => 0;
      });
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));

      expect(await draftKey(page)).not.toBe(null);
    });

    /* A tab that cannot answer the roll-call — throttled, frozen, or simply a
       browser without BroadcastChannel — looks abandoned to every other tab. */
    test("recovers when another tab sweeps the slot away", async ({ context, page }) => {
      const sleeper = await context.newPage();
      await sleeper.addInitScript(() => {
        delete window.BroadcastChannel;
      });
      await sleeper.goto("/");
      await urlInput(sleeper).fill("the-sleepers-work.example");
      await settleDraft(sleeper);
      const own = await sleeper.evaluate(() => sessionStorage.getItem("qr-tab-id"));

      // Left open long enough that the sweep treats it as abandoned
      await sleeper.evaluate((id) => {
        const key = `qr-draft:${id}`;
        const record = JSON.parse(localStorage.getItem(key));
        record.updatedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
        localStorage.setItem(key, JSON.stringify(record));
      }, own);

      await page.reload();
      await page.waitForTimeout(600);

      // The sleeper is still open and still holding work nobody else has
      await expect
        .poll(() => sleeper.evaluate((id) => !!localStorage.getItem(`qr-draft:${id}`), own), {
          timeout: 4000,
        })
        .toBe(true);
      await sleeper.reload();
      await expect(urlInput(sleeper)).toHaveValue("the-sleepers-work.example");
      await sleeper.close();
    });
  });

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

      const tray = page.getByTestId("undo-tray");
      await expect(tray).toContainText("Picked up where you left off");
      await expect(tray).toBeInViewport({ ratio: 1 });

      // Taking the offer is the only route back to a blank canvas
      await page.getByTestId("undo-take").click();
      await expect(urlInput(page)).toHaveValue("");
      await expect(page.getByText("Nothing to encode yet")).toBeVisible();

      // Starting over is destructive too, so it hands back what it cleared
      await expect(page.getByTestId("undo-tray")).toContainText("Started a new design");
      await page.getByTestId("undo-take").click();
      await expect(urlInput(page)).toHaveValue("restored-design.example");
      await settleDraft(page);
      await page.reload();
      await expect(urlInput(page)).toHaveValue("restored-design.example");
    });

    test("says nothing on a first visit, when nothing was restored", async ({ page }) => {
      await urlInput(page).fill("first-visit.example");
      await page.waitForTimeout(800);
      /* Idle is genuinely nothing — no tray, not an empty one */
      await expect(page.getByTestId("undo-tray")).toHaveCount(0);
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
      await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
      await settleDraft(page);

      await page.reload();

      await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
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

    /* The entries to carry over are whatever is unreadable *now*. Remembering
       them from boot meant that clearing site data and then saving wrote them
       back — restoring entries the user had just deleted (#65). */
    test("does not write back an entry that is no longer there", async ({ page }) => {
      await seedWithForeign(page);
      await page.reload();

      await page.evaluate(() => localStorage.clear());

      await urlInput(page).fill("after-the-wipe.example");
      await page.waitForTimeout(400);
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await download;

      await expect.poll(() => storedIds(page)).not.toContain("from-the-future");
    });

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
      await page.getByRole("button", { name: "Delete", exact: true }).first().click();
      await expect.poll(() => storedIds(page)).toContain("from-the-future");
    });
  });

  /* Each of these is a place where the state was right and the user could not
     act on it: a control under another control, a control off the edge of the
     screen, text under the contrast floor, or a message describing a different
     situation than the one on screen. */
  test.describe("Reachability", () => {
    test("Clear all is not answered by the double-click that asked it", async ({ page }) => {
      for (const name of ["one.example", "two.example", "three.example"]) {
        await urlInput(page).fill(name);
        await page.waitForTimeout(400);
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: "Download PNG" }).click();
        await download;
      }
      await expect(page.getByTestId("history-card")).toHaveCount(3);

      const clearAll = page.getByRole("button", { name: "Clear all" });
      const box = await clearAll.boundingBox();
      await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);

      // Armed by the first click, and not fired by the second
      await expect(
        page.getByRole("button", { name: "Confirm clearing all history" }),
      ).toBeVisible();
      await expect(page.getByTestId("history-card")).toHaveCount(3);

      // A click the user aimed at the question still answers it
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: "Confirm clearing all history" }).click();
      await expect(page.getByTestId("history-card")).toHaveCount(0);
    });

    test("the export bar is not buried under the consent banner on a phone", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");
      await urlInput(page).fill("mobile-export.example");
      await page.waitForTimeout(500);

      await expect(page.getByRole("region", { name: "Analytics consent" })).toBeVisible();
      await expectUnobstructed(
        page,
        page.getByRole("button", { name: "Download PNG" }),
        "Download",
      );
    });

    test("every QR type is on screen on a phone", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");
      for (const type of ["URL", "Email", "Phone", "Text", "vCard"]) {
        await expect(page.getByRole("button", { name: type, exact: true })).toBeInViewport({
          ratio: 1,
        });
      }
      await page.getByRole("button", { name: "vCard", exact: true }).click();
      await expect(page.getByPlaceholder("John", { exact: true })).toBeVisible();
    });

    test("muted text clears the contrast floor", async ({ page }) => {
      await urlInput(page).fill("contrast.example");
      await page.waitForTimeout(500);

      const ratio = await page.evaluate(() => {
        const counter = [...document.querySelectorAll("span")].find((s) =>
          s.textContent.trim().endsWith("chars"),
        );
        const relative = (rgb) => {
          const [r, g, b] = rgb
            .match(/\d+/g)
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              const s = v / 255;
              return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const style = getComputedStyle(counter);
        let node = counter;
        let background = style.backgroundColor;
        while (background === "rgba(0, 0, 0, 0)" && node.parentElement) {
          node = node.parentElement;
          background = getComputedStyle(node).backgroundColor;
        }
        const [light, dark] = [relative(style.color), relative(background)].sort((a, b) => b - a);
        return (light + 0.05) / (dark + 0.05);
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    test("says a number cannot be encoded rather than asking for content", async ({ page }) => {
      await page.getByRole("button", { name: "Phone", exact: true }).click();
      await page.getByPlaceholder("+1 234 567 8900").fill("555 ext. 89");
      await page.waitForTimeout(500);

      await expect(page.getByText("This PHONE cannot be encoded")).toBeVisible();
      await expect(page.getByText(/Letters and extensions have no place to go/)).toBeVisible();
      // The old message asked for content that is already there
      await expect(page.getByText("Nothing to encode yet")).toBeHidden();
      await expect(page.getByRole("button", { name: "Download PNG" })).toBeDisabled();

      // ...and a number it can express still works
      await page.getByPlaceholder("+1 234 567 8900").fill("+1 234 567 8900");
      await page.waitForTimeout(500);
      await expect(page.getByText("This PHONE cannot be encoded")).toBeHidden();
      await expect(page.getByRole("button", { name: "Download PNG" })).toBeEnabled();
    });
  });

  /* The canvas column is anchored to the top and grows downward, so on a window
     shorter than the column its tail runs off the bottom — and the tail is
     where the advisories and the export controls live. 1280x640 is an ordinary
     1366x768 laptop once browser chrome is taken off (#61). */
  test.describe("On a window too short for the column", () => {
    const SHORT = { width: 1280, height: 640 };

    test("brings the warning on screen instead of leaving it past the fold", async ({ page }) => {
      await page.setViewportSize(SHORT);
      await fillStorage(page, 0);
      await urlInput(page).fill("short-window.example");
      await settleDraft(page);

      /* Unobstructed, not merely in the viewport. The bare geometric form
         passes on a single visible pixel, and passes just as happily on a note
         lying underneath the consent banner. */
      await expectUnobstructed(page, storageNotice(page), "the storage notice");
      // The advice is "download it to keep it", so that has to be reachable too
      await expectUnobstructed(
        page,
        page.getByRole("button", { name: "Download PNG" }),
        "Download",
      );
    });

    /* The banner is fixed to the bottom of the window, which is exactly where
       scrolling something into view puts it. Every geometric check called this
       visible while the banner covered it outright. */
    test("clears the consent banner, which sits where it would otherwise land", async ({
      page,
    }) => {
      await page.setViewportSize(SHORT);
      // No dismissal: this is a first visit, banner still up
      await expect(page.getByRole("region", { name: "Analytics consent" })).toBeVisible();
      await fillStorage(page, 0);
      await urlInput(page).fill("banner-still-up.example");
      await settleDraft(page);

      await expectUnobstructed(page, storageNotice(page), "the storage notice");
    });

    test("keeps both on screen when a second advisory is already there", async ({ page }) => {
      await page.setViewportSize(SHORT);
      // White on white — the colour warning takes its own slice of the column
      await page.getByRole("button", { name: "#FFFFFF" }).first().click();
      await fillStorage(page, 0);
      await urlInput(page).fill("two-advisories.example");
      await settleDraft(page);

      await expect(page.getByText(/scan/i).first()).toBeVisible();
      await expectUnobstructed(page, storageNotice(page), "the storage notice");
      await expectUnobstructed(
        page,
        page.getByRole("button", { name: "Download PNG" }),
        "Download",
      );
    });

    /* Scrolling the document moves the canvas; the inspector is sticky, so the
       field being typed into must not move underneath the cursor. */
    test("does not move the field being typed into", async ({ page }) => {
      await page.setViewportSize(SHORT);
      const before = await urlInput(page).boundingBox();

      await fillStorage(page, 0);
      await urlInput(page).fill("field-stays-put.example");
      await settleDraft(page);

      const after = await urlInput(page).boundingBox();
      expect(Math.round(after.y)).toBe(Math.round(before.y));
    });

    test("leaves a tall window alone", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await fillStorage(page, 0);
      await urlInput(page).fill("tall-window.example");
      await settleDraft(page);

      await expectUnobstructed(page, storageNotice(page), "the storage notice");
      // Nothing to scroll to, so nothing scrolled
      expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0);
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
      await expect(storageNotice(page)).toBeInViewport({ ratio: 1 });
      await expect(storageNotice(page)).toHaveText(/storage is full/i);
      await expect(storageNotice(page)).toHaveAttribute("role", "alert");
    });

    /* The notice arrives while the user is reaching for Download, and must not
       reflow the column underneath it — that is how a warning about losing work
       ends up making you misclick.

       Measured in page coordinates, not viewport ones. The page may well scroll
       when the note appears, to lift it clear of the fold and of the consent
       banner, and that moves every viewport coordinate on the canvas at once
       without anything having reflowed. What must not change is where the
       button sits in the document. */
    const pageY = async (locator, page) => {
      const box = await locator.boundingBox();
      return Math.round(box.y + (await page.evaluate(() => window.scrollY)));
    };

    test("appears without moving the button the user is reaching for", async ({ page }) => {
      await urlInput(page).fill("no-shift.example");
      await settleDraft(page);
      const before = await pageY(page.getByRole("button", { name: "Download PNG" }), page);

      await fillStorage(page, 0);
      await urlInput(page).fill("no-shift-grown.example");
      await settleDraft(page);

      await expect(storageNotice(page)).toBeVisible();
      const after = await pageY(page.getByRole("button", { name: "Download PNG" }), page);
      expect(after).toBe(before);
      await expectUnobstructed(page, storageNotice(page), "the storage notice");
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
      await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
      await settleDraft(page);

      await expect(storageNotice(page)).toBeVisible();
      await expect(storageNotice(page)).toHaveText(/logo won't come back/i);

      await page.reload();

      // The design came back; the app explains what did not come with it
      await expect(urlInput(page)).toHaveValue("logo-too-big.example");
      await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeHidden();
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
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page.getByTestId("history-card")).toHaveCount(0);

      // Something else claims the room the delete just freed
      await fillStorage(page, 0);
      await page.getByTestId("undo-take").click();

      await expect(storageNotice(page)).toBeVisible();
      await expect(storageNotice(page)).toBeInViewport({ ratio: 1 });
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
