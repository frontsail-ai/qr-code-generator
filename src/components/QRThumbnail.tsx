import { useRef } from "react";
import { useQRCode } from "../hooks/useQRCode";
import type { SavedConfig } from "../types";
import { formatQRData } from "../utils/qrDataFormatters";

/* 44px mini QR for history cards. qr-code-styling renders at a fixed
   280px, so the thumbnail scales that down with a CSS transform. */
export function QRThumbnail({ config }: { config: SavedConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const data = formatQRData(config.qrType, config.formData[config.qrType]);

  useQRCode(containerRef, data, config.customization);

  return (
    <div
      className="w-11 h-11 shrink-0 border border-[var(--ink-100)] bg-white overflow-hidden"
      aria-hidden
    >
      <div
        ref={containerRef}
        className="w-[280px] h-[280px] origin-top-left"
        style={{ transform: "scale(0.1571)" }}
      />
    </div>
  );
}
