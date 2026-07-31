import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    // @frontsail/qr-core is a devDependency precisely so that tsdown inlines it
    // (along with lz-string) instead of emitting an import the published
    // package could not resolve. Runtime deps stay external.
    exports: true,
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
