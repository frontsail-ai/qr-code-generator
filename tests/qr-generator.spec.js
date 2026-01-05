import { test, expect } from "@playwright/test";

test.describe("QR Code Generator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("Page Load", () => {
    test("should display the header", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "QR Code Generator" }),
      ).toBeVisible();
    });

    test("should display QR preview with download buttons", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: "Download PNG" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Download SVG" }),
      ).toBeVisible();
    });

    test("should display all QR type tabs", async ({ page }) => {
      await expect(page.getByRole("button", { name: "URL" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Email" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Phone" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Text" })).toBeVisible();
      await expect(page.getByRole("button", { name: "vCard" })).toBeVisible();
    });

    test("should have URL tab selected by default", async ({ page }) => {
      const urlButton = page.getByRole("button", { name: "URL" });
      await expect(urlButton).toHaveClass(/bg-gray-900/);
    });
  });

  test.describe("URL QR Code", () => {
    test("should show URL input field", async ({ page }) => {
      await expect(page.getByPlaceholder("frontsail.ai")).toBeVisible();
    });

    test("should generate QR code when URL is entered", async ({ page }) => {
      const input = page.getByPlaceholder("frontsail.ai");
      await input.fill("github.com");

      // Wait for debounce and QR update
      await page.waitForTimeout(400);

      // QR code should be rendered (SVG element inside the preview)
      const qrPreview = page.locator("section").first();
      await expect(qrPreview.locator("svg")).toBeVisible();
    });
  });

  test.describe("Email QR Code", () => {
    test("should switch to email form", async ({ page }) => {
      await page.getByRole("button", { name: "Email" }).click();

      await expect(page.getByPlaceholder("hello@frontsail.ai")).toBeVisible();
      await expect(page.getByPlaceholder("Email subject")).toBeVisible();
      await expect(page.getByPlaceholder("Email body")).toBeVisible();
    });

    test("should generate QR code with email data", async ({ page }) => {
      await page.getByRole("button", { name: "Email" }).click();

      await page
        .getByPlaceholder("hello@frontsail.ai")
        .fill("test@frontsail.ai");
      await page.getByPlaceholder("Email subject").fill("Hello");
      await page.getByPlaceholder("Email body").fill("This is a test");

      await page.waitForTimeout(400);

      const qrPreview = page.locator("section").first();
      await expect(qrPreview.locator("svg")).toBeVisible();
    });
  });

  test.describe("Phone QR Code", () => {
    test("should switch to phone form", async ({ page }) => {
      await page.getByRole("button", { name: "Phone" }).click();

      await expect(page.getByPlaceholder("+1 234 567 8900")).toBeVisible();
    });

    test("should generate QR code with phone number", async ({ page }) => {
      await page.getByRole("button", { name: "Phone" }).click();

      await page.getByPlaceholder("+1 234 567 8900").fill("+1234567890");

      await page.waitForTimeout(400);

      const qrPreview = page.locator("section").first();
      await expect(qrPreview.locator("svg")).toBeVisible();
    });
  });

  test.describe("Text QR Code", () => {
    test("should switch to text form with character counter", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Text" }).click();

      await expect(page.getByPlaceholder("Enter any text...")).toBeVisible();
      await expect(page.getByText("0 / 1000")).toBeVisible();
    });

    test("should update character counter", async ({ page }) => {
      await page.getByRole("button", { name: "Text" }).click();

      await page.getByPlaceholder("Enter any text...").fill("Hello World");

      await expect(page.getByText("11 / 1000")).toBeVisible();
    });
  });

  test.describe("vCard QR Code", () => {
    test("should switch to vCard form with all fields", async ({ page }) => {
      await page.getByRole("button", { name: "vCard" }).click();

      await expect(
        page.getByRole("textbox", { name: "John", exact: true }),
      ).toBeVisible();
      await expect(page.getByPlaceholder("Doe")).toBeVisible();
      await expect(page.getByPlaceholder("+1 234 567 8900")).toBeVisible();
      await expect(page.getByPlaceholder("john@frontsail.ai")).toBeVisible();
      await expect(page.getByPlaceholder("Company Inc.")).toBeVisible();
      await expect(page.getByPlaceholder("Manager")).toBeVisible();
      await expect(
        page.locator('input[placeholder="frontsail.ai"]'),
      ).toBeVisible();
    });

    test("should generate QR code with vCard data", async ({ page }) => {
      await page.getByRole("button", { name: "vCard" }).click();

      await page
        .getByRole("textbox", { name: "John", exact: true })
        .fill("Jane");
      await page.getByPlaceholder("Doe").fill("Smith");
      await page.getByPlaceholder("john@frontsail.ai").fill("jane@company.com");

      await page.waitForTimeout(400);

      const qrPreview = page.locator("section").first();
      await expect(qrPreview.locator("svg")).toBeVisible();
    });
  });

  test.describe("Color Customization", () => {
    test("should display color preset buttons", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "#000000" }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "#DC2626" }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "#7C3AED" }).first(),
      ).toBeVisible();
    });

    test("should change foreground color when preset clicked", async ({
      page,
    }) => {
      // Click red color preset (first set is foreground)
      await page.getByRole("button", { name: "#DC2626" }).first().click();

      // Check that the hex input updated
      const hexInput = page.locator('input[type="text"]').first();
      await expect(hexInput).toHaveValue("#DC2626");
    });

    test("should have separate foreground and background color sections", async ({
      page,
    }) => {
      await expect(page.getByText("Foreground Color")).toBeVisible();
      await expect(page.getByText("Background Color")).toBeVisible();
    });
  });

  test.describe("Gradient Customization", () => {
    test("should display gradient type options", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Solid" })).toBeVisible();
      await expect(page.getByRole("button", { name: "↗" })).toBeVisible();
      await expect(page.getByRole("button", { name: "↘" })).toBeVisible();
      await expect(page.getByRole("button", { name: "◉" })).toBeVisible();
    });

    test("should show second color picker when gradient is selected", async ({
      page,
    }) => {
      // Initially should not show end color label
      await expect(page.getByText("End color")).not.toBeVisible();

      // Click linear gradient option
      await page.getByRole("button", { name: "↗" }).click();

      // Should now show start and end color labels
      await expect(page.getByText("Start color")).toBeVisible();
      await expect(page.getByText("End color")).toBeVisible();
    });

    test("should hide second color when switching back to solid", async ({
      page,
    }) => {
      // Select gradient
      await page.getByRole("button", { name: "↗" }).click();
      await expect(page.getByText("End color")).toBeVisible();

      // Switch back to solid
      await page.getByRole("button", { name: "Solid" }).click();
      await expect(page.getByText("End color")).not.toBeVisible();
    });

    test("should select radial gradient option", async ({ page }) => {
      const radialButton = page.getByRole("button", { name: "◉" });
      await radialButton.click();

      await expect(radialButton).toHaveClass(/bg-gray-900/);
      await expect(page.getByText("End color")).toBeVisible();
    });
  });

  test.describe("Gradient Restore", () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
    });

    test("should restore solid color configuration", async ({ page }) => {
      // Set a solid red color
      await page.getByRole("button", { name: "#DC2626" }).first().click();
      await page.getByPlaceholder("frontsail.ai").fill("solid-color-test.com");
      await page.waitForTimeout(400);

      // Save by downloading
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Change to different color
      await page.getByRole("button", { name: "#1E40AF" }).first().click();

      // Restore saved config
      await page.getByRole("button", { name: "Restore" }).click();

      // Verify color is restored
      const hexInput = page.locator('input[type="text"]').first();
      await expect(hexInput).toHaveValue("#DC2626");

      // Verify solid mode is selected
      const solidButton = page.getByRole("button", { name: "Solid" });
      await expect(solidButton).toHaveClass(/bg-gray-900/);
    });

    test("should restore gradient configuration", async ({ page }) => {
      // Set a gradient
      await page.getByRole("button", { name: "↗" }).click();
      await page.getByRole("button", { name: "#DC2626" }).first().click(); // Start color
      await page.getByRole("button", { name: "#1E40AF" }).nth(1).click(); // End color
      await page.getByPlaceholder("frontsail.ai").fill("gradient-test.com");
      await page.waitForTimeout(400);

      // Save by downloading
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Change to solid color
      await page.getByRole("button", { name: "Solid" }).click();
      await page.getByRole("button", { name: "#000000" }).first().click();

      // Restore saved config
      await page.getByRole("button", { name: "Restore" }).click();

      // Verify gradient mode is restored
      const gradientButton = page.getByRole("button", { name: "↗" });
      await expect(gradientButton).toHaveClass(/bg-gray-900/);

      // Verify both colors are restored
      await expect(page.getByText("Start color")).toBeVisible();
      await expect(page.getByText("End color")).toBeVisible();

      // Check start color
      const hexInputs = page.locator('input[type="text"]');
      await expect(hexInputs.first()).toHaveValue("#DC2626");
    });
  });

  test.describe("Dot Style Customization", () => {
    test("should display all dot style options", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Square", exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Rounded", exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Dots", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Classy", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Classy Rounded", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Extra Rounded", exact: true }),
      ).toBeVisible();
    });

    test("should change dot style when clicked", async ({ page }) => {
      const roundedButton = page
        .getByRole("button", { name: "Rounded" })
        .first();
      await roundedButton.click();

      await expect(roundedButton).toHaveClass(/bg-gray-900/);
    });
  });

  test.describe("Corner Style Customization", () => {
    test("should display corner square style options", async ({ page }) => {
      await expect(page.getByText("Corner Square Style")).toBeVisible();
      await expect(page.getByText("Corner Dot Style")).toBeVisible();
    });

    test("should change corner square style", async ({ page }) => {
      // Find the Dot button in corner square section
      const cornerSection = page
        .locator("text=Corner Square Style")
        .locator("..");
      const dotButton = cornerSection.getByRole("button", { name: "Dot" });
      await dotButton.click();

      await expect(dotButton).toHaveClass(/bg-gray-900/);
    });
  });

  test.describe("Logo Upload", () => {
    test("should display logo upload area", async ({ page }) => {
      await expect(page.getByText("Logo (optional)")).toBeVisible();
      await expect(page.getByText("Click to upload logo")).toBeVisible();
      await expect(page.getByText("PNG, JPG up to 2MB")).toBeVisible();
    });

    test("should have hidden file input", async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeHidden();
    });
  });

  test.describe("Type Persistence", () => {
    test("should preserve form data when switching between types", async ({
      page,
    }) => {
      // Enter URL
      await page.getByPlaceholder("frontsail.ai").fill("mywebsite.com");

      // Switch to Email
      await page.getByRole("button", { name: "Email" }).click();
      await page.getByPlaceholder("hello@frontsail.ai").fill("test@test.com");

      // Switch back to URL
      await page.getByRole("button", { name: "URL" }).click();

      // URL should still have the value
      await expect(page.getByPlaceholder("frontsail.ai")).toHaveValue(
        "mywebsite.com",
      );

      // Switch to Email again
      await page.getByRole("button", { name: "Email" }).click();

      // Email should still have the value
      await expect(page.getByPlaceholder("hello@frontsail.ai")).toHaveValue(
        "test@test.com",
      );
    });
  });

  test.describe("Responsive Layout", () => {
    test("should display single column layout on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // All sections should be visible and stacked
      await expect(
        page.getByRole("heading", { name: "QR Code Generator" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Download PNG" }),
      ).toBeVisible();
      await expect(page.getByText("Content")).toBeVisible();
      await expect(page.getByText("Customize")).toBeVisible();
    });
  });

  test.describe("Saved Configurations", () => {
    test.beforeEach(async ({ page }) => {
      // Clear localStorage before each test
      await page.evaluate(() => localStorage.clear());
      await page.reload();
    });

    test("should display empty saved configs message initially", async ({
      page,
    }) => {
      await expect(page.getByText("History")).toBeVisible();
      await expect(page.getByText("No saved configurations yet")).toBeVisible();
    });

    test("should save configuration when downloading PNG", async ({ page }) => {
      // Enter a URL
      await page.getByPlaceholder("frontsail.ai").fill("test-url.com");

      // Wait for debounce
      await page.waitForTimeout(400);

      // Click download (this should save the config)
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Should now show the saved config
      await expect(
        page.getByText("No saved configurations yet"),
      ).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
    });

    test("should save configuration when downloading SVG", async ({ page }) => {
      // Enter a URL
      await page.getByPlaceholder("frontsail.ai").fill("svg-test.com");

      // Wait for debounce
      await page.waitForTimeout(400);

      // Click download SVG
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download SVG" }).click();
      await downloadPromise;

      // Should now show the saved config
      await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
    });

    test("should restore saved configuration", async ({ page }) => {
      // Create a config with specific settings
      await page.getByPlaceholder("frontsail.ai").fill("restore-test.com");
      await page.getByRole("button", { name: "#DC2626" }).first().click(); // Red color

      await page.waitForTimeout(400);

      // Save by downloading
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Clear the form
      await page.getByPlaceholder("frontsail.ai").fill("different-url.com");
      await page.getByRole("button", { name: "#000000" }).first().click(); // Black color

      // Restore the saved config
      await page.getByRole("button", { name: "Restore" }).click();

      // Check values are restored
      await expect(page.getByPlaceholder("frontsail.ai")).toHaveValue(
        "restore-test.com",
      );
    });

    test("should delete saved configuration", async ({ page }) => {
      // Create a saved config
      await page.getByPlaceholder("frontsail.ai").fill("delete-test.com");
      await page.waitForTimeout(400);

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Verify config is saved
      await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();

      // Delete the config
      await page.getByRole("button", { name: "Delete" }).click();

      // Should show empty message again
      await expect(page.getByText("No saved configurations yet")).toBeVisible();
    });

    test("should clear all saved configurations", async ({ page }) => {
      // Create multiple saved configs
      await page.getByPlaceholder("frontsail.ai").fill("first.com");
      await page.waitForTimeout(400);
      let downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      await page.getByPlaceholder("frontsail.ai").fill("second.com");
      await page.waitForTimeout(400);
      downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Should have multiple restore buttons
      await expect(page.getByRole("button", { name: "Restore" })).toHaveCount(
        2,
      );

      // Clear all
      await page.getByRole("button", { name: "Clear all" }).click();

      // Should show empty message
      await expect(page.getByText("No saved configurations yet")).toBeVisible();
    });

    test("should persist saved configs across page reloads", async ({
      page,
    }) => {
      // Create a saved config
      await page.getByPlaceholder("frontsail.ai").fill("persist-test.com");
      await page.waitForTimeout(400);

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Wait for React state update and localStorage write
      await page.waitForTimeout(100);

      // Verify config was saved before reload
      await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();

      // Reload the page (don't clear localStorage this time)
      await page.reload();

      // Config should still be there
      await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
    });

    test("should not create duplicate entry when restoring and downloading unchanged config", async ({
      page,
    }) => {
      // Create a saved config
      await page.getByPlaceholder("frontsail.ai").fill("no-duplicate.com");
      await page.getByRole("button", { name: "#DC2626" }).first().click();
      await page.waitForTimeout(400);

      let downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Should have 1 saved config
      await expect(page.getByRole("button", { name: "Restore" })).toHaveCount(
        1,
      );

      // Make some other change to the form
      await page.getByPlaceholder("frontsail.ai").fill("other-url.com");
      await page.getByRole("button", { name: "#000000" }).first().click();

      // Restore the saved config
      await page.getByRole("button", { name: "Restore" }).click();

      // Download again without making any changes
      await page.waitForTimeout(400);
      downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Should still have only 1 saved config (no duplicate created)
      await expect(page.getByRole("button", { name: "Restore" })).toHaveCount(
        1,
      );
    });

    test("should create new entry when restoring and downloading modified config", async ({
      page,
    }) => {
      // Create a saved config
      await page.getByPlaceholder("frontsail.ai").fill("original-url.com");
      await page.waitForTimeout(400);

      let downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Should have 1 saved config
      await expect(page.getByRole("button", { name: "Restore" })).toHaveCount(
        1,
      );

      // Restore, then modify
      await page.getByRole("button", { name: "Restore" }).click();
      await page.getByPlaceholder("frontsail.ai").fill("modified-url.com");

      // Download the modified config
      await page.waitForTimeout(400);
      downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG" }).click();
      await downloadPromise;

      // Should now have 2 saved configs (new entry for modified config)
      await expect(page.getByRole("button", { name: "Restore" })).toHaveCount(
        2,
      );
    });
  });
});
