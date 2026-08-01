import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    // @frontsail/qr-core is a devDependency precisely so that tsdown inlines it
    // (along with lz-string) instead of emitting an import the published
    // package could not resolve. Runtime deps stay external.
    //
    // `exports: true` is deliberately NOT set. It makes tsdown rewrite
    // package.json's `exports` and `bin` on every build, and the `bin` value it
    // writes — "./dist/index.mjs" — is one npm rejects: on publish npm drops the
    // entry entirely ("bin[qr-mcp] script name dist/index.mjs was invalid and
    // removed"), which silently breaks `npx @frontsail-ai/qr-mcp`. It only warns,
    // and only on publish, so a locally installed tarball looks fine. Both fields
    // are one line each; keeping them hand-written keeps them correct.
    entry: ["src/index.ts"],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
