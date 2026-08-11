import { expect, test } from "@playwright/test";
import { expectUnobstructed } from "./support/reachability";

/* The agent-setup dialog is the app's first modal — a native <dialog> in the
   top layer. These tests pin the four things the platform is trusted with
   (focus containment, Escape, focus restore, painting above everything) and
   the one thing it must not do: spend a pending take-back on the way out. */

const trigger = (page) => page.getByRole("button", { name: "Agent setup" });
const dialog = (page) => page.getByRole("dialog", { name: "Use it from your agent" });

/* Same shape the Undo suite seeds (qr-generator.spec.js) — through storage,
   not the save path, because a debounce per entry buys these tests nothing. */
async function seedHistory(page, urls) {
  await page.evaluate((urls) => {
    localStorage.setItem(
      "qr-saved-configs",
      JSON.stringify(
        urls.map((url, i) => ({
          id: `seed-${i}`,
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          qrType: "url",
          formData: {
            url: { url },
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
          },
          customization: {
            foregroundColor: "#1B1812",
            foregroundColor2: "#2C4A8A",
            gradientType: "none",
            backgroundColor: "#FFFFFF",
            dotType: "square",
            cornerSquareType: "square",
            cornerDotType: "square",
            logo: null,
          },
        })),
      ),
    );
  }, urls);
  await page.reload();
}

const storedUrls = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("qr-saved-configs") ?? "[]").map((c) => c.formData.url.url),
  );

test.describe("Agent setup", () => {
  /* An HTML <dialog> must never register as a native browser dialog — that is
     half the reason it is allowed to exist under the no-alert rule. */
  let nativeDialogs = [];

  test.beforeEach(async ({ page }) => {
    nativeDialogs = [];
    page.on("dialog", async (dlg) => {
      nativeDialogs.push(dlg.message());
      await dlg.dismiss();
    });
    await page.goto("/");
  });

  test.afterEach(() => {
    expect(nativeDialogs, "the app must not open native dialogs").toEqual([]);
  });

  test("the trigger is reachable and opens the dialog", async ({ page }) => {
    await expectUnobstructed(page, trigger(page), "the Agent setup trigger");
    await trigger(page).click();
    await expect(dialog(page)).toBeVisible();
  });

  test("everything the user must read or click sits unobstructed in the top layer", async ({
    page,
  }) => {
    await trigger(page).click();
    await expectUnobstructed(
      page,
      page.getByRole("heading", { name: "Use it from your agent" }),
      "the dialog heading",
    );
    for (const name of ["Claude Code", "OpenAI Codex", "Any agent"]) {
      await expectUnobstructed(
        page,
        page.getByRole("button", { name: `Copy ${name} commands` }),
        `the ${name} copy button`,
      );
    }
    await expectUnobstructed(
      page,
      page.getByRole("button", { name: "Close", exact: true }),
      "the close button",
    );
  });

  /* Focus restore through a conditional unmount is the least-standardised
     behaviour in the design, so it gets its own test. */
  test("the close button closes the dialog and hands focus back", async ({ page }) => {
    await trigger(page).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
  });

  test("Escape closes the dialog and hands focus back", async ({ page }) => {
    await trigger(page).click();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
  });

  /* The load-bearing test: Escape aimed at the dialog must not be spent on
     the take-back underneath it (AGENTS.md — no destructive action costs
     another its take-back, and closing a dialog is not destructive). */
  test("Escape closes the dialog and a pending undo survives it", async ({ page }) => {
    await seedHistory(page, ["keep.example", "other.example"]);

    await page.getByTestId("history-card").first().hover();
    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    expect(await storedUrls(page)).toEqual(["other.example"]);
    await expect(page.getByTestId("undo-tray")).toContainText("Design deleted");

    await trigger(page).click();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);

    // The offer is still there, and still works
    await expect(page.getByTestId("undo-tray")).toContainText("Design deleted");
    await page.getByTestId("undo-take").click();
    expect(await storedUrls(page)).toEqual(["keep.example", "other.example"]);
  });

  test("an open dialog holds the undo clock", async ({ page }) => {
    await seedHistory(page, ["held.example"]);

    await page.getByTestId("history-card").first().hover();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await trigger(page).click();
    // The modal makes the Undo button inert, so the drain must not run
    await expect(page.getByTestId("undo-tray")).toContainText("Held");
    expect(await page.getByTestId("undo-drain").evaluate((el) => el.style.animationPlayState)).toBe(
      "paused",
    );

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("undo-tray")).not.toContainText("Held");
  });

  test("copy writes the section's commands and confirms on the button", async ({ page }) => {
    await page.evaluate(() => {
      window.__copiedCommands = null;
      navigator.clipboard.writeText = (text) => {
        window.__copiedCommands = text;
        return Promise.resolve();
      };
    });

    await trigger(page).click();
    await page.getByRole("button", { name: "Copy Claude Code commands" }).click();

    await expect
      .poll(() => page.evaluate(() => window.__copiedCommands))
      .toBe(
        [
          "claude plugin marketplace add frontsail-ai/qr-code-generator",
          "claude plugin install qr-code-generator@frontsail-qr",
          "claude mcp add qr -- npx -y @frontsail-ai/qr-mcp",
        ].join("\n"),
      );
    await expect(page.getByRole("button", { name: "Copy Claude Code commands" })).toContainText(
      "Copied",
    );
  });

  test("a refused copy is reported where the user acted", async ({ page }) => {
    await page.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error("denied"));
    });

    await trigger(page).click();
    await page.getByRole("button", { name: "Copy OpenAI Codex commands" }).click();

    await expect(dialog(page).getByRole("alert")).toContainText("Copy failed");
  });

  test("long commands scroll inside their block, never the page", async ({ page }) => {
    // 640px is the narrowest width where the trigger exists
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto("/");
    await trigger(page).click();

    const overflows = await page
      .getByText("$skill-installer", { exact: false })
      .evaluate((line) => {
        const block = line.parentElement;
        return {
          block: block.scrollWidth > block.clientWidth,
          page: document.documentElement.scrollWidth,
        };
      });
    expect(overflows.block, "the command block should scroll horizontally").toBe(true);
    expect(overflows.page, "the page itself must not grow sideways").toBeLessThanOrEqual(640);
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("open, copy and Escape all still function", async ({ page }) => {
      await page.evaluate(() => {
        navigator.clipboard.writeText = () => Promise.resolve();
      });
      await trigger(page).click();
      await expect(dialog(page)).toBeVisible();
      await page.getByRole("button", { name: "Copy Any agent commands" }).click();
      await expect(page.getByRole("button", { name: "Copy Any agent commands" })).toContainText(
        "Copied",
      );
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toHaveCount(0);
    });
  });
});
