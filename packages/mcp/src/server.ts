import { writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { encodeDesignToUrl, formatQRData, hasAnyContent } from "@frontsail/qr-core";
import type { FormDataMap } from "@frontsail/qr-core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { DesignInput } from "./design.ts";
import {
  contentSchema,
  customizationSchema,
  InputError,
  toCustomization,
  toFormData,
} from "./design.ts";
import { resolveLogo } from "./logo.ts";
import { PNG_SIZE, RenderError, renderPng, renderSvg, SVG_SIZE } from "./render.ts";

/* Share links must point at the deployed app — a link is only useful if the
   recipient's browser can open it. */
export const SHARE_BASE_URL = "https://qr-code-gen.frontsail.app/";

export const SERVER_NAME = "qr-code-generator";
export const SERVER_VERSION = "0.3.0";

function toolError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/* Every tool body runs through this. qr-code-styling throws bare strings
   rather than Errors, and an unhandled throw inside a stdio server surfaces to
   the agent as a transport-level failure with no useful message — so
   everything is normalized into a tool error the agent can read and act on. */
async function guard(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof InputError || err instanceof RenderError) return toolError(err.message);
    if (typeof err === "string") return toolError(`QR generation failed: ${err}`);
    if (err instanceof Error) return toolError(`QR generation failed: ${err.message}`);
    return toolError(`QR generation failed: ${String(err)}`);
  }
}

/* An empty payload has two causes, and naming the wrong one sends the caller
   looking in the wrong place: the form may hold nothing, or it may hold
   something no valid payload can represent — a phone number carrying an
   "ext." suffix, say. `verb` differs per tool ("encode" / "share"); the
   diagnosis does not. */
function encodeOrThrow(type: DesignInput["content_type"], formData: FormDataMap, verb: string) {
  const data = formatQRData(type, formData[type]);
  if (data) return data;
  throw new InputError(
    hasAnyContent(formData[type])
      ? `The ${type} content cannot be encoded as a ${type} payload. Check it for characters ` +
          `the format does not allow — a phone number, for instance, may hold only digits, a ` +
          `leading "+", "*", "#" and the separators "-.()".`
      : `The ${type} content is empty, so there is nothing to ${verb}.`,
  );
}

async function buildDesign(input: DesignInput) {
  const formData = toFormData(input);
  const logo = await resolveLogo(input.customization?.logo);
  const customization = toCustomization(input.customization, logo);
  const data = encodeOrThrow(input.content_type, formData, "encode");
  return { formData, customization, data };
}

export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    "generate_qr_code",
    {
      title: "Generate a QR code",
      description:
        "Generate a styled QR code identical to the one qr-code-gen.frontsail.app produces. " +
        `Returns SVG text (${SVG_SIZE}px) or a PNG image (${PNG_SIZE}px), or writes it to output_path. ` +
        "Output includes the 4-module quiet zone the QR standard requires, painted in the " +
        "background colour, so the file can be placed directly without adding margin.",
      inputSchema: {
        ...contentSchema,
        customization: customizationSchema.optional(),
        format: z
          .enum(["svg", "png"])
          .optional()
          .describe("Output format. Defaults to svg, which is resolution-independent."),
        output_path: z
          .string()
          .optional()
          .describe(
            "Absolute path to write the file to. When set, the file is written and the path " +
              "is returned instead of the image contents.",
          ),
      },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (input) =>
      guard(async () => {
        const { customization, data } = await buildDesign(input as DesignInput);
        const format = input.format ?? "svg";

        if (input.output_path !== undefined && !isAbsolute(input.output_path)) {
          throw new InputError(
            `output_path must be absolute; received "${input.output_path}". ` +
              "This server runs with its own working directory.",
          );
        }

        if (format === "png") {
          const png = await renderPng(customization, data);
          if (input.output_path) {
            await writeFile(input.output_path, png);
            return {
              content: [
                { type: "text", text: `Wrote a ${PNG_SIZE}px PNG to ${input.output_path}` },
              ],
            };
          }
          return {
            content: [{ type: "image", data: png.toString("base64"), mimeType: "image/png" }],
          };
        }

        const svg = await renderSvg(customization, data);
        if (input.output_path) {
          await writeFile(input.output_path, svg, "utf8");
          return {
            content: [{ type: "text", text: `Wrote a ${SVG_SIZE}px SVG to ${input.output_path}` }],
          };
        }
        return { content: [{ type: "text", text: svg }] };
      }),
  );

  server.registerTool(
    "create_share_link",
    {
      title: "Create a shareable design link",
      description:
        "Encode a QR design into a qr-code-gen.frontsail.app link that reopens it in the web " +
        "editor. The design travels in the URL fragment; nothing is stored server-side. " +
        "Logos are not included, matching the web app.",
      inputSchema: {
        ...contentSchema,
        customization: customizationSchema.optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (input) =>
      guard(async () => {
        const design = input as DesignInput;
        const formData = toFormData(design);
        // Deliberately no logo: encodeDesignToUrl strips it, and resolving a
        // file path here would only produce bytes that get discarded.
        const customization = toCustomization(design.customization, null);
        encodeOrThrow(design.content_type, formData, "share");
        const url = encodeDesignToUrl(design.content_type, formData, customization, SHARE_BASE_URL);
        return { content: [{ type: "text", text: url }] };
      }),
  );

  return server;
}
