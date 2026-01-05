import { useRef, useMemo } from 'react';
import { useQRCode } from '../hooks/useQRCode';
import { useDebounce } from '../hooks/useDebounce';
import { formatQRData } from '../utils/qrDataFormatters';

export function QRPreview({ qrType, formData, customization }) {
  const containerRef = useRef(null);

  const qrData = useMemo(() => {
    return formatQRData(qrType, formData[qrType]);
  }, [qrType, formData]);

  const debouncedData = useDebounce(qrData, 300);
  const debouncedOptions = useDebounce(customization, 300);

  const { downloadPNG, downloadSVG } = useQRCode(
    containerRef,
    debouncedData,
    debouncedOptions
  );

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6">
      <div
        ref={containerRef}
        className="flex items-center justify-center mb-6"
        style={{ minHeight: 280 }}
      />

      <div className="flex gap-3">
        <button
          onClick={downloadPNG}
          className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Download PNG
        </button>
        <button
          onClick={downloadSVG}
          className="flex-1 px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Download SVG
        </button>
      </div>
    </section>
  );
}
