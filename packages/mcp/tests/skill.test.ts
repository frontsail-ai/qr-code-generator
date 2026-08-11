import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vite-plus/test";

/* The skill at skills/qr-code documents this MCP server for other agents.
   skills/ is deliberately not a workspace package (a package.json at the
   plugin root would make `claude plugin install` vendor the whole monorepo),
   so its consistency checks live here, next to the code they are coupled to. */

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const skillMd = read("../../../skills/qr-code/SKILL.md");
const plugin = JSON.parse(read("../../../skills/qr-code/.claude-plugin/plugin.json")) as {
  name: string;
  description: string;
  version: string;
};
const marketplace = JSON.parse(read("../../../.claude-plugin/marketplace.json")) as {
  plugins: { name: string; description: string }[];
};
const mcpManifest = JSON.parse(read("../package.json")) as { name: string };

const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---\n/);
const frontmatter = frontmatterMatch?.[1] ?? "";
const body = skillMd.slice(frontmatterMatch?.[0].length ?? 0);
const field = (name: string) => frontmatter.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];

describe("agentskills.io spec compliance", () => {
  // https://agentskills.io/specification — Codex and other agents parse the
  // same frontmatter, so the constraints here are portability, not style.
  test("name is spec-valid and matches its directory", () => {
    const name = field("name");
    expect(name).toBe("qr-code");
    expect(name!.length).toBeLessThanOrEqual(64);
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test("description is non-empty and within the 1024-char limit", () => {
    const description = field("description");
    expect(description).toBeDefined();
    expect(description!.length).toBeGreaterThan(0);
    expect(description!.length).toBeLessThanOrEqual(1024);
  });

  test("body stays under the 500 lines the spec recommends", () => {
    expect(body.split("\n").length).toBeLessThanOrEqual(500);
  });
});

describe("skill and manifests agree", () => {
  test("SKILL.md metadata.version matches plugin.json version", () => {
    // These are separate fields; the release checklist bumps both.
    const version = frontmatter.match(/^ {2}version: "(.+)"$/m)?.[1];
    expect(version).toBe(plugin.version);
  });

  test("plugin.json description matches its marketplace.json entry", () => {
    const entry = marketplace.plugins.find((p) => p.name === plugin.name);
    expect(entry?.description).toBe(plugin.description);
  });

  test("the install command the skill teaches names the real package", () => {
    expect(body).toContain(`npx -y ${mcpManifest.name}`);
  });
});
