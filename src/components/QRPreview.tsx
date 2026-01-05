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
}

export function QRPreview({
  qrType,
  formData,
  customization,
  onSave,
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
      </div>
    </section>
  );
}
