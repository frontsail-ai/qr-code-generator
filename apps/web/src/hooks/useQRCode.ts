import type { Customization } from "@frontsail/qr-core";
import { mapOptionsToQRConfig } from "@frontsail/qr-core";
import QRCodeStyling from "qr-code-styling";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseQRCodeReturn {
  downloadPNG: () => void;
  downloadSVG: () => void;
  error: string | null;
}

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
    if (containerRef.current) {
      // Empty content renders nothing — the UI shows an empty state instead
      // of a placeholder QR, and export stays locked
      if (!data) {
        qrCodeRef.current = null;
        containerRef.current.innerHTML = "";
        setError(null);
        return;
      }
      try {
        // The constructor builds the QR matrix and throws a plain string
        // (not an Error) when the data exceeds QR capacity
        const qrCode = new QRCodeStyling({
          width: 280,
          height: 280,
          type: "svg",
          data,
          ...mapOptionsToQRConfig(options),
        });

        qrCodeRef.current = qrCode;
        containerRef.current.innerHTML = "";
        qrCode.append(containerRef.current);
        setError(null);
      } catch (err) {
        qrCodeRef.current = null;
        containerRef.current.innerHTML = "";
        setError(String(err));
      }
    }
  }, [containerRef, data, options]);

  const downloadPNG = useCallback(() => {
    if (!data) return;
    // Create a high-res instance for download (qr-code-styling ignores width/height in download())
    try {
      const hiResQR = new QRCodeStyling({
        width: 560,
        height: 560,
        type: "canvas",
        data,
        ...mapOptionsToQRConfig(options),
      });
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
