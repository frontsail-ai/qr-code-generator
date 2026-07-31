import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { InputError } from "./design.ts";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/* The web app caps uploads at 2 MB; keep the same ceiling so a design that
   works here also works there. */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/* Accepts a data: URI as-is, or reads an absolute path and converts it.

   Relative paths are rejected on purpose: an MCP server is spawned by the
   client, so its working directory is not the user's and "./logo.png" would
   resolve somewhere surprising. Better to fail with an explanation than to
   read the wrong file or report a confusing ENOENT. */
export async function resolveLogo(logo: string | undefined): Promise<string | null> {
  if (!logo) return null;

  if (logo.startsWith("data:")) {
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(logo)) {
      throw new InputError(
        "logo looks like a data URI but is not a base64-encoded image. " +
          "Expected a value starting with data:image/<type>;base64,",
      );
    }
    return logo;
  }

  if (!isAbsolute(logo)) {
    throw new InputError(
      `logo must be a data: URI or an absolute file path; received "${logo}". ` +
        "This server runs with its own working directory, so relative paths are ambiguous.",
    );
  }

  const extension = logo.slice(logo.lastIndexOf(".")).toLowerCase();
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) {
    throw new InputError(
      `Unsupported logo file type "${extension}". Supported: ${Object.keys(MIME_BY_EXTENSION).join(", ")}.`,
    );
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(logo);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    throw new InputError(
      code === "ENOENT"
        ? `No file found at logo path "${logo}".`
        : `Could not read the logo at "${logo}": ${String(err)}`,
    );
  }

  if (bytes.byteLength > MAX_LOGO_BYTES) {
    throw new InputError(
      `The logo is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB; the limit is 2 MB ` +
        "(the same limit the web app enforces).",
    );
  }

  return `data:${mime};base64,${bytes.toString("base64")}`;
}
