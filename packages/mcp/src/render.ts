import type { Customization } from "@frontsail/qr-core";
import { mapOptionsToQRConfig, quietZoneMargin } from "@frontsail/qr-core";
import * as napiCanvas from "@napi-rs/canvas";
import { Resvg } from "@resvg/resvg-js";
import { JSDOM } from "jsdom";
import QRCodeStyling from "qr-code-styling";
import { sanitizeForRasterizer } from "./sanitize.ts";

/* Match the web app: the preview and its SVG download are 280px, the PNG
   download is rendered at 560. */
export const SVG_SIZE = 280;
export const PNG_SIZE = 560;

const DEFAULT_TIMEOUT_MS = 15_000;

export class RenderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RenderError";
  }
}

interface RawSvgOptions {
  /* Always the napi canvas in production. Exposed only so a test can omit it
     and prove the timeout below actually fires — see the comment on it. */
  nodeCanvas?: unknown;
  timeoutMs?: number;
  size?: number;
}

/* Produces the SVG string exactly as qr-code-styling emits it.

   Two things here are load-bearing and must not be "simplified":

   1. `nodeCanvas` is always supplied. Without a canvas implementation the
      library's logo size-calculation awaits a `loadImage` that never resolves,
      so `getRawData` returns a promise that neither resolves nor rejects. In a
      stdio MCP server that is a tool call that hangs forever.
   2. The timeout. It is the backstop for (1) and for any future variant of it:
      an agent can act on an error, but not on silence. */
export async function renderRawSvg(
  customization: Customization,
  data: string,
  options: RawSvgOptions = {},
): Promise<string> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, size = SVG_SIZE } = options;
  /* Deliberately an `in` check rather than a default parameter: the timeout
     test passes `nodeCanvas: undefined` to simulate a missing canvas, and a
     default would quietly substitute the real one — making the test pass while
     exercising the wrong path. */
  const nodeCanvas = "nodeCanvas" in options ? options.nodeCanvas : napiCanvas;

  let qr: QRCodeStyling;
  try {
    const base = {
      jsdom: JSDOM,
      nodeCanvas,
      width: size,
      height: size,
      type: "svg",
      data,
      ...mapOptionsToQRConfig(customization),
    };
    /* Two passes: the symbol's module count is only known once the matrix is
       built, but the margin has to be passed to the constructor. See
       quietZoneMargin — ISO/IEC 18004 wants 4 modules of clear space, and the
       library supplies none by default. A bare construction is ~3ms.

       `_qr` is private; when it disappears, quietZoneMargin falls back to a
       ratio safe at every version rather than shipping no quiet zone. */
    const probe = new QRCodeStyling(base as ConstructorParameters<typeof QRCodeStyling>[0]);
    const moduleCount =
      typeof (probe as unknown as { _qr?: { getModuleCount?: () => number } })._qr
        ?.getModuleCount === "function"
        ? (probe as unknown as { _qr: { getModuleCount: () => number } })._qr.getModuleCount()
        : null;
    qr = new QRCodeStyling({
      ...base,
      margin: quietZoneMargin(moduleCount, size),
    } as ConstructorParameters<typeof QRCodeStyling>[0]);
  } catch (err) {
    // The constructor builds the QR matrix, and throws a bare string (not an
    // Error) when the content exceeds what a QR code can hold.
    throw new RenderError(describeQrFailure(err), err);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raw = await Promise.race([
      qr.getRawData("svg"),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new RenderError(
                `QR rendering timed out after ${timeoutMs}ms. This usually means the renderer ` +
                  `was constructed without a canvas implementation, which makes logo handling hang.`,
              ),
            ),
          timeoutMs,
        );
      }),
    ]);
    if (!raw) throw new RenderError("QR rendering produced no output.");
    return await toText(raw);
  } catch (err) {
    throw err instanceof RenderError ? err : new RenderError(describeQrFailure(err), err);
  } finally {
    clearTimeout(timer);
  }
}

/* getRawData hands back a Buffer under jsdom and a Blob in browser-like
   environments; accept either so this does not depend on which one the
   library picks. */
async function toText(raw: string | Buffer | Blob): Promise<string> {
  if (typeof raw === "string") return raw;
  if (Buffer.isBuffer(raw)) return raw.toString("utf8");
  return Buffer.from(new Uint8Array(await raw.arrayBuffer())).toString("utf8");
}

/* PNG never goes through the library's own canvas renderer. That path drops
   logos silently with node-canvas 2 and paints solid squares with the napi
   canvas — both produce a plausible file rather than an error, which is the
   worst possible failure for an agent. resvg on the sanitized SVG is the only
   pipeline that renders logos, gradients and real alpha correctly. */
export async function renderPng(
  customization: Customization,
  data: string,
  options: RawSvgOptions = {},
): Promise<Buffer> {
  const svg = await renderRawSvg(customization, data, options);
  try {
    const resvg = new Resvg(sanitizeForRasterizer(svg), {
      fitTo: { mode: "width", value: PNG_SIZE },
    });
    return Buffer.from(resvg.render().asPng());
  } catch (err) {
    throw new RenderError(`Failed to rasterize the QR code to PNG: ${errorText(err)}`, err);
  }
}

export async function renderSvg(
  customization: Customization,
  data: string,
  options: RawSvgOptions = {},
): Promise<string> {
  return renderRawSvg(customization, data, options);
}

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return String(err);
}

function describeQrFailure(err: unknown): string {
  const text = errorText(err);
  if (/code length overflow|big|overflow/i.test(text)) {
    return (
      `The content is too large to encode in a QR code (${text}). ` +
      `Shorten the content — vCards and long URLs with query strings are the usual causes.`
    );
  }
  return `Failed to render the QR code: ${text}`;
}
