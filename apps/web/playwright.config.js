import { defineConfig, devices } from "@playwright/test";

/* A dedicated port, not Vite's 5173 default: that one is contested by other
   projects on a dev machine, and `reuseExistingServer` would then silently
   point the whole suite at someone else's app. Always start our own. */
/* When 5177 itself is taken on a dev machine, override with QR_E2E_PORT
   rather than reusing whatever is squatting there. */
const PORT = Number(process.env.QR_E2E_PORT ?? 5177);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `vp dev --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
  },
});
