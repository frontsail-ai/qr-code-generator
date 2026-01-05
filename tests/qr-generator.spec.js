import { test, expect } from '@playwright/test';

test.describe('QR Code Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Page Load', () => {
    test('should display the header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'QR Code Generator' })).toBeVisible();
    });

    test('should display QR preview with download buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Download PNG' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Download SVG' })).toBeVisible();
    });

    test('should display all QR type tabs', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'URL' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Phone' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Text' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'vCard' })).toBeVisible();
    });

    test('should have URL tab selected by default', async ({ page }) => {
      const urlButton = page.getByRole('button', { name: 'URL' });
      await expect(urlButton).toHaveClass(/bg-gray-900/);
    });
  });

  test.describe('URL QR Code', () => {
    test('should show URL input field', async ({ page }) => {
      await expect(page.getByPlaceholder('example.com')).toBeVisible();
    });

    test('should generate QR code when URL is entered', async ({ page }) => {
      const input = page.getByPlaceholder('example.com');
      await input.fill('github.com');

      // Wait for debounce and QR update
      await page.waitForTimeout(400);

      // QR code should be rendered (SVG element inside the preview)
      const qrPreview = page.locator('section').first();
      await expect(qrPreview.locator('svg')).toBeVisible();
    });
  });

  test.describe('Email QR Code', () => {
    test('should switch to email form', async ({ page }) => {
      await page.getByRole('button', { name: 'Email' }).click();

      await expect(page.getByPlaceholder('recipient@example.com')).toBeVisible();
      await expect(page.getByPlaceholder('Email subject')).toBeVisible();
      await expect(page.getByPlaceholder('Email body')).toBeVisible();
    });

    test('should generate QR code with email data', async ({ page }) => {
      await page.getByRole('button', { name: 'Email' }).click();

      await page.getByPlaceholder('recipient@example.com').fill('test@example.com');
      await page.getByPlaceholder('Email subject').fill('Hello');
      await page.getByPlaceholder('Email body').fill('This is a test');

      await page.waitForTimeout(400);

      const qrPreview = page.locator('section').first();
      await expect(qrPreview.locator('svg')).toBeVisible();
    });
  });

  test.describe('Phone QR Code', () => {
    test('should switch to phone form', async ({ page }) => {
      await page.getByRole('button', { name: 'Phone' }).click();

      await expect(page.getByPlaceholder('+1 234 567 8900')).toBeVisible();
    });

    test('should generate QR code with phone number', async ({ page }) => {
      await page.getByRole('button', { name: 'Phone' }).click();

      await page.getByPlaceholder('+1 234 567 8900').fill('+1234567890');

      await page.waitForTimeout(400);

      const qrPreview = page.locator('section').first();
      await expect(qrPreview.locator('svg')).toBeVisible();
    });
  });

  test.describe('Text QR Code', () => {
    test('should switch to text form with character counter', async ({ page }) => {
      await page.getByRole('button', { name: 'Text' }).click();

      await expect(page.getByPlaceholder('Enter any text...')).toBeVisible();
      await expect(page.getByText('0 / 1000')).toBeVisible();
    });

    test('should update character counter', async ({ page }) => {
      await page.getByRole('button', { name: 'Text' }).click();

      await page.getByPlaceholder('Enter any text...').fill('Hello World');

      await expect(page.getByText('11 / 1000')).toBeVisible();
    });
  });

  test.describe('vCard QR Code', () => {
    test('should switch to vCard form with all fields', async ({ page }) => {
      await page.getByRole('button', { name: 'vCard' }).click();

      await expect(page.getByRole('textbox', { name: 'John', exact: true })).toBeVisible();
      await expect(page.getByPlaceholder('Doe')).toBeVisible();
      await expect(page.getByPlaceholder('+1 234 567 8900')).toBeVisible();
      await expect(page.getByPlaceholder('john@example.com')).toBeVisible();
      await expect(page.getByPlaceholder('Company Inc.')).toBeVisible();
      await expect(page.getByPlaceholder('Manager')).toBeVisible();
      await expect(page.locator('input[placeholder="example.com"]')).toBeVisible();
    });

    test('should generate QR code with vCard data', async ({ page }) => {
      await page.getByRole('button', { name: 'vCard' }).click();

      await page.getByRole('textbox', { name: 'John', exact: true }).fill('Jane');
      await page.getByPlaceholder('Doe').fill('Smith');
      await page.getByPlaceholder('john@example.com').fill('jane@company.com');

      await page.waitForTimeout(400);

      const qrPreview = page.locator('section').first();
      await expect(qrPreview.locator('svg')).toBeVisible();
    });
  });

  test.describe('Color Customization', () => {
    test('should display color preset buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: '#000000' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: '#DC2626' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: '#7C3AED' }).first()).toBeVisible();
    });

    test('should change foreground color when preset clicked', async ({ page }) => {
      // Click purple color preset (first set is foreground)
      await page.getByRole('button', { name: '#7C3AED' }).first().click();

      // Check that the hex input updated
      const hexInput = page.locator('input[type="text"]').first();
      await expect(hexInput).toHaveValue('#7C3AED');
    });

    test('should have separate foreground and background color sections', async ({ page }) => {
      await expect(page.getByText('Foreground Color')).toBeVisible();
      await expect(page.getByText('Background Color')).toBeVisible();
    });
  });

  test.describe('Dot Style Customization', () => {
    test('should display all dot style options', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Square', exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Rounded', exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Dots', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Classy', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Classy Rounded', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Extra Rounded', exact: true })).toBeVisible();
    });

    test('should change dot style when clicked', async ({ page }) => {
      const roundedButton = page.getByRole('button', { name: 'Rounded' }).first();
      await roundedButton.click();

      await expect(roundedButton).toHaveClass(/bg-gray-900/);
    });
  });

  test.describe('Corner Style Customization', () => {
    test('should display corner square style options', async ({ page }) => {
      await expect(page.getByText('Corner Square Style')).toBeVisible();
      await expect(page.getByText('Corner Dot Style')).toBeVisible();
    });

    test('should change corner square style', async ({ page }) => {
      // Find the Dot button in corner square section
      const cornerSection = page.locator('text=Corner Square Style').locator('..');
      const dotButton = cornerSection.getByRole('button', { name: 'Dot' });
      await dotButton.click();

      await expect(dotButton).toHaveClass(/bg-gray-900/);
    });
  });

  test.describe('Logo Upload', () => {
    test('should display logo upload area', async ({ page }) => {
      await expect(page.getByText('Logo (optional)')).toBeVisible();
      await expect(page.getByText('Click to upload logo')).toBeVisible();
      await expect(page.getByText('PNG, JPG up to 2MB')).toBeVisible();
    });

    test('should have hidden file input', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeHidden();
    });
  });

  test.describe('Type Persistence', () => {
    test('should preserve form data when switching between types', async ({ page }) => {
      // Enter URL
      await page.getByPlaceholder('example.com').fill('mywebsite.com');

      // Switch to Email
      await page.getByRole('button', { name: 'Email' }).click();
      await page.getByPlaceholder('recipient@example.com').fill('test@test.com');

      // Switch back to URL
      await page.getByRole('button', { name: 'URL' }).click();

      // URL should still have the value
      await expect(page.getByPlaceholder('example.com')).toHaveValue('mywebsite.com');

      // Switch to Email again
      await page.getByRole('button', { name: 'Email' }).click();

      // Email should still have the value
      await expect(page.getByPlaceholder('recipient@example.com')).toHaveValue('test@test.com');
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display single column layout on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // All sections should be visible and stacked
      await expect(page.getByRole('heading', { name: 'QR Code Generator' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Download PNG' })).toBeVisible();
      await expect(page.getByText('Content')).toBeVisible();
      await expect(page.getByText('Customize')).toBeVisible();
    });
  });

  test.describe('Saved Configurations', () => {
    test.beforeEach(async ({ page }) => {
      // Clear localStorage before each test
      await page.evaluate(() => localStorage.clear());
      await page.reload();
    });

    test('should display empty saved configs message initially', async ({ page }) => {
      await expect(page.getByText('History')).toBeVisible();
      await expect(page.getByText('No saved configurations yet')).toBeVisible();
    });

    test('should save configuration when downloading PNG', async ({ page }) => {
      // Enter a URL
      await page.getByPlaceholder('example.com').fill('test-url.com');

      // Wait for debounce
      await page.waitForTimeout(400);

      // Click download (this should save the config)
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download PNG' }).click();
      await downloadPromise;

      // Should now show the saved config
      await expect(page.getByText('No saved configurations yet')).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();
    });

    test('should save configuration when downloading SVG', async ({ page }) => {
      // Enter a URL
      await page.getByPlaceholder('example.com').fill('svg-test.com');

      // Wait for debounce
      await page.waitForTimeout(400);

      // Click download SVG
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download SVG' }).click();
      await downloadPromise;

      // Should now show the saved config
      await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();
    });

    test('should restore saved configuration', async ({ page }) => {
      // Create a config with specific settings
      await page.getByPlaceholder('example.com').fill('restore-test.com');
      await page.getByRole('button', { name: '#DC2626' }).first().click(); // Red color

      await page.waitForTimeout(400);

      // Save by downloading
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download PNG' }).click();
      await downloadPromise;

      // Clear the form
      await page.getByPlaceholder('example.com').fill('different-url.com');
      await page.getByRole('button', { name: '#000000' }).first().click(); // Black color

      // Restore the saved config
      await page.getByRole('button', { name: 'Restore' }).click();

      // Check values are restored
      await expect(page.getByPlaceholder('example.com')).toHaveValue('restore-test.com');
    });

    test('should delete saved configuration', async ({ page }) => {
      // Create a saved config
      await page.getByPlaceholder('example.com').fill('delete-test.com');
      await page.waitForTimeout(400);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download PNG' }).click();
      await downloadPromise;

      // Verify config is saved
      await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();

      // Delete the config
      await page.getByRole('button', { name: 'Delete' }).click();

      // Should show empty message again
      await expect(page.getByText('No saved configurations yet')).toBeVisible();
    });

    test('should clear all saved configurations', async ({ page }) => {
      // Create multiple saved configs
      await page.getByPlaceholder('example.com').fill('first.com');
      await page.waitForTimeout(400);
      let downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download PNG' }).click();
      await downloadPromise;

      await page.getByPlaceholder('example.com').fill('second.com');
      await page.waitForTimeout(400);
      downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download PNG' }).click();
      await downloadPromise;

      // Should have multiple restore buttons
      await expect(page.getByRole('button', { name: 'Restore' })).toHaveCount(2);

      // Clear all
      await page.getByRole('button', { name: 'Clear all' }).click();

      // Should show empty message
      await expect(page.getByText('No saved configurations yet')).toBeVisible();
    });

    test('should persist saved configs across page reloads', async ({ page }) => {
      // Create a saved config
      await page.getByPlaceholder('example.com').fill('persist-test.com');
      await page.waitForTimeout(400);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download PNG' }).click();
      await downloadPromise;

      // Wait for React state update and localStorage write
      await page.waitForTimeout(100);

      // Verify config was saved before reload
      await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();

      // Reload the page (don't clear localStorage this time)
      await page.reload();

      // Config should still be there
      await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();
    });
  });
});
