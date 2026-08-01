import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";

/* Exercises the built artifact over a real stdio transport, with the SDK's own
   client — the same path `npx -y @frontsail-ai/qr-mcp` takes. The package's test
   script runs `vp pack` first so dist/ is present and current. */
const SERVER_ENTRY = fileURLToPath(new URL("../dist/index.mjs", import.meta.url));
const LOGO_PATH = fileURLToPath(new URL("./fixtures/logo.png", import.meta.url));

let client: Client;
let workDir: string;

interface TextBlock {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}
const blocks = (result: unknown): TextBlock[] => (result as { content: TextBlock[] }).content ?? [];
const firstText = (result: unknown): string => blocks(result)[0]?.text ?? "";
const isSvg = (text: string): boolean =>
  text.trimStart().startsWith("<?xml") && text.includes("<svg");
const isError = (result: unknown): boolean => Boolean((result as { isError?: boolean }).isError);

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), "qr-mcp-test-"));
  client = new Client({ name: "qr-mcp-test", version: "0.0.0" });
  await client.connect(
    new StdioClientTransport({ command: process.execPath, args: [SERVER_ENTRY] }),
  );
}, 60_000);

afterAll(async () => {
  await client?.close();
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

describe("tool discovery", () => {
  test("advertises both tools with input schemas", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["create_share_link", "generate_qr_code"]);

    const generate = tools.find((t) => t.name === "generate_qr_code");
    expect(generate).toBeDefined();
    const schema = generate!.inputSchema as { properties?: Record<string, unknown> };
    const properties = Object.keys(schema.properties ?? {});
    expect(properties).toContain("content_type");
    expect(properties).toContain("customization");
    expect(properties).toContain("format");
    expect(properties).toContain("output_path");
  });
});

describe("generate_qr_code", () => {
  test("returns SVG text by default", async () => {
    const result = await client.callTool({
      name: "generate_qr_code",
      arguments: { content_type: "url", url: { url: "https://example.com" } },
    });
    expect(isError(result)).toBe(false);
    expect(isSvg(firstText(result))).toBe(true);
  });

  test("returns a base64 PNG image block when asked for png", async () => {
    const result = await client.callTool({
      name: "generate_qr_code",
      arguments: { content_type: "text", text: { content: "hello" }, format: "png" },
    });
    const [block] = blocks(result);
    expect(block?.type).toBe("image");
    expect(block?.mimeType).toBe("image/png");
    expect(
      Buffer.from(block?.data ?? "", "base64")
        .subarray(1, 4)
        .toString("ascii"),
    ).toBe("PNG");
  });

  test("honours customization, including the transparent background", async () => {
    const result = await client.callTool({
      name: "generate_qr_code",
      arguments: {
        content_type: "url",
        url: { url: "example.com" },
        customization: {
          background_color: "transparent",
          gradient_type: "radial",
          foreground_color: "#2C4A8A",
          dot_type: "dots",
        },
      },
    });
    const svg = firstText(result);
    expect(svg).toContain('fill="transparent"');
    expect(svg).toContain("<radialGradient");
  });

  test("writes to output_path and returns the path", async () => {
    const target = join(workDir, "out.svg");
    const result = await client.callTool({
      name: "generate_qr_code",
      arguments: { content_type: "url", url: { url: "example.com" }, output_path: target },
    });
    expect(isError(result)).toBe(false);
    expect(firstText(result)).toContain(target);
    expect(isSvg(readFileSync(target, "utf8"))).toBe(true);
  });

  test("accepts a logo given as an absolute path", async () => {
    const result = await client.callTool({
      name: "generate_qr_code",
      arguments: {
        content_type: "url",
        url: { url: "example.com" },
        customization: { logo: LOGO_PATH },
      },
    });
    expect(isError(result)).toBe(false);
    expect(firstText(result)).toContain("<image");
  });
});

describe("create_share_link", () => {
  test("returns a production share URL", async () => {
    const result = await client.callTool({
      name: "create_share_link",
      arguments: {
        content_type: "url",
        url: { url: "https://example.com" },
        customization: { dot_type: "dots" },
      },
    });
    const url = firstText(result);
    expect(url.startsWith("https://qr-code-gen.frontsail.app/#s=")).toBe(true);
  });

  test("excludes the logo, like the web app", async () => {
    const withLogo = await client.callTool({
      name: "create_share_link",
      arguments: {
        content_type: "url",
        url: { url: "https://example.com" },
        customization: { logo: LOGO_PATH },
      },
    });
    const without = await client.callTool({
      name: "create_share_link",
      arguments: { content_type: "url", url: { url: "https://example.com" } },
    });
    expect(firstText(withLogo)).toBe(firstText(without));
  });
});

describe("error handling", () => {
  test("a missing content object is a tool error, not a crash", async () => {
    const result = await client.callTool({
      name: "generate_qr_code",
      arguments: { content_type: "vcard" },
    });
    expect(isError(result)).toBe(true);
    expect(firstText(result)).toMatch(/vcard/);
  });

  test("content over QR capacity reports an actionable message", async () => {
    const result = await client.callTool({
      name: "generate_qr_code",
      arguments: { content_type: "text", text: { content: "x".repeat(10_000) } },
    });
    expect(isError(result)).toBe(true);
    expect(firstText(result)).toMatch(/too large/i);
  });

  test("a relative output_path is rejected with an explanation", async () => {
    const result = await client.callTool({
      name: "generate_qr_code",
      arguments: { content_type: "url", url: { url: "example.com" }, output_path: "out.svg" },
    });
    expect(isError(result)).toBe(true);
    expect(firstText(result)).toMatch(/absolute/i);
  });

  test("the server survives an error and still answers the next call", async () => {
    await client.callTool({ name: "generate_qr_code", arguments: { content_type: "vcard" } });
    const result = await client.callTool({
      name: "generate_qr_code",
      arguments: { content_type: "url", url: { url: "example.com" } },
    });
    expect(isError(result)).toBe(false);
    expect(isSvg(firstText(result))).toBe(true);
  });
});
