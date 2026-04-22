import { useMemo, useRef } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { useQRCode } from "../hooks/useQRCode";
import type { Customization, FormDataMap, QRType } from "../types";
import { formatQRData } from "../utils/qrDataFormatters";

interface QRPreviewProps {
  qrType: QRType;
  formData: FormDataMap;
  customization: Customization;
  onSave?: () => void;
  onShare?: () => void;
}

export function QRPreview({
  qrType,
  formData,
  customization,
  onSave,
  onShare,
}: QRPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const qrData = useMemo(() => {
    return formatQRData(qrType, formData[qrType]);
  }, [qrType, formData]);

  const debouncedData = useDebounce(qrData, 300);
  const debouncedOptions = useDebounce(customization, 300);

  const { downloadPNG, downloadSVG } = useQRCode(
    containerRef,
    debouncedData,
    debouncedOptions,
  );

  const handleDownloadPNG = () => {
    downloadPNG();
    onSave?.();
  };

  const handleDownloadSVG = () => {
    downloadSVG();
    onSave?.();
  };

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6">
      <div
        ref={containerRef}
        className="flex items-center justify-center mb-6"
        style={{ minHeight: 280 }}
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDownloadPNG}
          className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={handleDownloadSVG}
          className="flex-1 px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Download SVG
        </button>
        <button
          type="button"
          onClick={onShare}
          className="px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-1.5"
          title={customization.logo ? "Logo not included in link" : "Copy shareable link"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
      </div>
    </section>
  );
}
