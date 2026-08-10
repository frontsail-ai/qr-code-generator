import type { Customization } from "@frontsail/qr-core";
import { mapOptionsToQRConfig, quietZoneMargin } from "@frontsail/qr-core";
import QRCodeStyling from "qr-code-styling";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/* The symbol's module count is only known once the matrix is built, but the
   margin has to be passed to the constructor — so build once to measure and
   once to render. A bare construction is ~3ms and the preview is debounced.

   `_qr` is private. When a library upgrade removes it, quietZoneMargin falls
   back to a ratio that is safe at every version rather than silently emitting
   codes with no quiet zone; a unit test covers that path. */
function moduleCountOf(qr: QRCodeStyling): number | null {
  const inner = (qr as unknown as { _qr?: { getModuleCount?: () => number } })._qr;
  return typeof inner?.getModuleCount === "function" ? inner.getModuleCount() : null;
}

function buildWithQuietZone(
  size: number,
  type: "svg" | "canvas",
  data: string,
  options: Customization,
): QRCodeStyling {
  const base = { width: size, height: size, type, data, ...mapOptionsToQRConfig(options) } as const;
  const probe = new QRCodeStyling({ ...base });
  return new QRCodeStyling({ ...base, margin: quietZoneMargin(moduleCountOf(probe), size) });
}

interface UseQRCodeReturn {
  downloadPNG: () => void;
  downloadSVG: () => void;
  error: string | null;
}

/* Marker for async render failures, matched by the preview's error copy.
   qr-code-styling draws asynchronously after `append()`, and its browser
   image loader never settles on an undecodable logo (no `onerror` handler),
   so completion is watched via the public `getRawData()` — which awaits the
   internal drawing promise — raced against this timeout. */
export const RENDER_STALLED_ERROR = "qr render stalled";
const RENDER_TIMEOUT_MS = 3000;

export function useQRCode(
  containerRef: RefObject<HTMLDivElement | null>,
  data: string,
  options: Customization,
): UseQRCodeReturn {
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create/recreate QR code instance when data or options change
  // We recreate instead of update() because qr-code-styling doesn't properly
  // clear gradient settings on update, causing downloads to have wrong colors
  useEffect(() => {
    if (!containerRef.current) return;
    // Empty content renders nothing — the UI shows an empty state instead
    // of a placeholder QR, and export stays locked
    if (!data) {
      qrCodeRef.current = null;
      containerRef.current.innerHTML = "";
      setError(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // The constructor builds the QR matrix and throws a plain string
      // (not an Error) when the data exceeds QR capacity
      const qrCode = buildWithQuietZone(280, "svg", data, options);

      qrCodeRef.current = qrCode;
      containerRef.current.innerHTML = "";
      qrCode.append(containerRef.current);
      setError(null);

      // Drawing continues asynchronously after append(); a failure there
      // (e.g. a corrupt logo) would otherwise leave a blank-but-READY preview
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(RENDER_STALLED_ERROR), RENDER_TIMEOUT_MS);
      });
      Promise.race([qrCode.getRawData("svg"), timeout])
        .then(() => {
          if (timer !== undefined) clearTimeout(timer);
        })
        .catch((err) => {
          if (timer !== undefined) clearTimeout(timer);
          if (cancelled) return;
          qrCodeRef.current = null;
          setError(String(err));
        });
    } catch (err) {
      qrCodeRef.current = null;
      containerRef.current.innerHTML = "";
      setError(String(err));
    }
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [containerRef, data, options]);

  const downloadPNG = useCallback(() => {
    if (!data) return;
    // Create a high-res instance for download (qr-code-styling ignores width/height in download())
    try {
      const hiResQR = buildWithQuietZone(560, "canvas", data, options);
      void hiResQR.download({ name: "qr-code", extension: "png" });
    } catch {
      // The preview already shows the error; there is nothing to download
    }
  }, [data, options]);

  const downloadSVG = useCallback(() => {
    void qrCodeRef.current?.download({ name: "qr-code", extension: "svg" });
  }, []);

  return { downloadPNG, downloadSVG, error };
}
