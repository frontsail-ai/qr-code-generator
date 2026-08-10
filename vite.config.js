import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    /* `no-alert` is a product decision, not style: native dialogs block the
       page and read as browser chrome next to the app's inline notes (see the
       `Note` primitive in apps/web/src/components/ui.tsx). */
    /* Web Storage has exactly one caller: apps/web/src/utils/safeStorage.ts,
       which reaches it through `window.` and so is the only file this rule
       lets past. Everywhere else the bare global is banned, because its
       failure mode is an exception that gets caught and logged while the UI
       goes on claiming the data was kept (#42). */
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "no-alert": "error",
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message: "Use apps/web/src/utils/safeStorage.ts — a failed write has to be reportable.",
        },
        {
          name: "sessionStorage",
          message: "Use apps/web/src/utils/safeStorage.ts — a failed write has to be reportable.",
        },
      ],
    },
    /* Playwright specs reach storage inside `page.evaluate`, which runs in the
       page rather than in the app — a different program that happens to be
       written in the same file. Setting a test's storage up is exactly how the
       rule above gets verified. */
    overrides: [{ files: ["**/tests/**"], rules: { "no-restricted-globals": "off" } }],
    options: { typeAware: true, typeCheck: true },
  },
});
