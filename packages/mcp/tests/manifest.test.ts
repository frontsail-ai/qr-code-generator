import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vite-plus/test";
import { SERVER_VERSION } from "../src/server.ts";

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  name: string;
  version: string;
  bin: Record<string, string>;
  files: string[];
  exports: Record<string, unknown>;
  publishConfig?: { access?: string };
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe("publishable manifest", () => {
  test("is named for the owned npm scope", () => {
    expect(manifest.name).toBe("@frontsail-ai/qr-mcp");
  });

  /* Regression guard for a silent release blocker. With `"./dist/index.mjs"`,
     npm strips the whole entry on publish — "bin[qr-mcp] script name
     dist/index.mjs was invalid and removed" — and `npx @frontsail-ai/qr-mcp`
     then does nothing. It only warns, and only on publish: a locally installed
     tarball links the bin correctly either way, so this cannot be caught by
     installing what you packed.

     Note `exports` has the opposite rule and *must* keep the "./" prefix. */
  test("bin path has no ./ prefix, which npm would strip on publish", () => {
    expect(Object.keys(manifest.bin)).toEqual(["qr-mcp"]);
    for (const target of Object.values(manifest.bin)) {
      expect(target.startsWith("./")).toBe(false);
      expect(target).toBe("dist/index.mjs");
    }
  });

  test("exports keeps the ./ prefix the spec requires", () => {
    expect(manifest.exports["."]).toBe("./dist/index.mjs");
  });

  test("ships only the built artifact and its docs", () => {
    expect([...manifest.files].sort()).toEqual(["README.md", "dist"]);
  });

  test("publishes publicly — scoped packages default to restricted", () => {
    expect(manifest.publishConfig?.access).toBe("public");
  });

  test("the version the handshake reports matches the package version", () => {
    // These are separate constants; the release checklist bumps both.
    expect(SERVER_VERSION).toBe(manifest.version);
  });

  test("core is a devDependency so it gets bundled, not published as a dep", () => {
    expect(manifest.devDependencies["@frontsail/qr-core"]).toBeDefined();
    expect(manifest.dependencies["@frontsail/qr-core"]).toBeUndefined();
  });

  test("node-canvas is not a dependency and must never become one", () => {
    // It carries a postinstall npm is moving to block, and segfaults under Bun.
    expect(manifest.dependencies["canvas"]).toBeUndefined();
    expect(manifest.devDependencies["canvas"]).toBeUndefined();
  });
});
