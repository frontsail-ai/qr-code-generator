import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    /* `no-alert` is a product decision, not style: native dialogs block the
       page and read as browser chrome next to the app's inline notes (see the
       `Note` primitive in apps/web/src/components/ui.tsx). */
    rules: { "vite-plus/prefer-vite-plus-imports": "error", "no-alert": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
