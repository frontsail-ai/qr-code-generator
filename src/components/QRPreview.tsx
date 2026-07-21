import { Download, FileCode, ScanLine, Share2 } from "lucide-react";
import { useMemo, useRef } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { useQRCode } from "../hooks/useQRCode";
import type { Customization, FormDataMap, QRType } from "../types";
import { formatQRData } from "../utils/qrDataFormatters";
import { Badge, Button, IconButton } from "./ui";

interface QRPreviewProps {
  qrType: QRType;
  formData: FormDataMap;
  customization: Customization;
  onSave?: () => void;
  onShare?: () => void;
}

export function QRPreview({ qrType, formData, customization, onSave, onShare }: QRPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  const qrData = useMemo(() => {
    return formatQRData(qrType, formData[qrType]);
  }, [qrType, formData]);

  const debouncedData = useDebounce(qrData, 300);
  const debouncedOptions = useDebounce(customization, 300);

  const { downloadPNG, downloadSVG, error } = useQRCode(
    containerRef,
    debouncedData,
    debouncedOptions,
  );

  const isEmpty = !debouncedData;
  const exportLocked = isEmpty || !!error;

  const errorMessage = error?.includes("code length overflow")
    ? "This content is too long to fit in a QR code. Shorten it to generate one."
    : "Couldn't generate a QR code for this content.";

  const handleDownloadPNG = () => {
    downloadPNG();
    onSave?.();
  };

  const handleDownloadSVG = () => {
    downloadSVG();
    onSave?.();
  };

  const typeLabel = qrType === "vcard" ? "vCard" : qrType.toUpperCase();

  const exportButtons = (
    <>
      <div className="flex-1">
        <Button icon={Download} fullWidth disabled={exportLocked} onClick={handleDownloadPNG}>
          Download PNG
        </Button>
      </div>
      {isDesktop ? (
        <Button variant="secondary" disabled={exportLocked} onClick={handleDownloadSVG}>
          Download SVG
        </Button>
      ) : (
        <IconButton
          icon={FileCode}
          variant="outline"
          size="lg"
          title="Download SVG"
          disabled={exportLocked}
          onClick={handleDownloadSVG}
        />
      )}
      <IconButton
        icon={Share2}
        variant="outline"
        size="lg"
        title={
          customization.logo
            ? "Copy shareable link — logo not included in link"
            : "Copy shareable link"
        }
        disabled={exportLocked}
        onClick={onShare}
      />
    </>
  );

  return (
    <section
      className={`flex flex-col items-center gap-[18px] w-full ${
        isDesktop
          ? ""
          : "plico-grid -mx-4 w-auto self-stretch px-4 -mt-6 pt-5 pb-5 border-b border-[var(--border-hairline)]"
      }`}
    >
      {/* Dimension annotation — drafting-style */}
      {!isEmpty && !error && (
        <div className="hidden lg:flex w-[344px] items-center gap-2.5" aria-hidden>
          <span className="relative flex-1 h-px bg-[var(--ink-400)]">
            <span className="absolute left-0 -top-[3px] w-px h-[7px] bg-[var(--ink-400)]" />
          </span>
          <span className="plico-measure text-[11px] text-[var(--dimension-line)]">280 × 280</span>
          <span className="relative flex-1 h-px bg-[var(--ink-400)]">
            <span className="absolute right-0 -top-[3px] w-px h-[7px] bg-[var(--ink-400)]" />
          </span>
        </div>
      )}

      {/* The sheet — the QR container stays mounted across states so the
          generation effect always has a live DOM node to append into */}
      <div
        className={`bg-[var(--paper-card)] border-2 border-[var(--border-strong)] rounded-[2px] p-4 lg:p-8 shadow-[var(--shadow-md)] ${
          isEmpty || error ? "hidden" : ""
        }`}
      >
        <div
          ref={containerRef}
          className="w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] [&_svg]:w-full [&_svg]:h-full"
        />
      </div>
      {isEmpty && (
        <div className="w-[344px] max-w-full aspect-square bg-[color-mix(in_srgb,var(--paper-card)_65%,transparent)] border-[1.5px] border-dashed border-[var(--ink-300)] rounded-[2px] flex flex-col items-center justify-center gap-3 p-8 text-center">
          <ScanLine className="w-9 h-9 text-[var(--ink-300)]" aria-hidden />
          <div className="text-[15px] font-semibold text-[var(--text-primary)]">
            Nothing to encode yet
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] leading-normal max-w-[240px]">
            Add some content and the code draws itself. Export unlocks when there is content.
          </p>
        </div>
      )}
      {!isEmpty && error && (
        <div className="w-[344px] max-w-full aspect-square bg-[var(--signal-error-50)] border-[1.5px] border-dashed border-[var(--signal-error-500)] rounded-[2px] flex flex-col items-center justify-center gap-3 p-8 text-center">
          <ScanLine className="w-9 h-9 text-[var(--signal-error-500)]" aria-hidden />
          <p className="text-[13px] text-[var(--ink-700)] leading-normal max-w-[240px]">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Live data readout */}
      {!isEmpty && !error && (
        <div className="flex items-center gap-2.5 max-w-full px-4">
          <Badge variant="solid-ink">{typeLabel}</Badge>
          <span className="font-mono text-[13px] text-[var(--ink-700)] whitespace-nowrap overflow-hidden text-ellipsis">
            {debouncedData}
          </span>
          <span className="plico-measure text-[11px] text-[var(--text-muted)] whitespace-nowrap">
            · {debouncedData.length} chars
          </span>
        </div>
      )}

      {/* Export — static block on desktop */}
      {isDesktop ? (
        <div className="flex w-[344px] flex-col gap-2 mt-1.5">
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-muted)]">
            04 — Export
          </span>
          <div className="flex gap-2">{exportButtons}</div>
          {customization.logo ? (
            <span className="font-mono text-[11px] text-[var(--signal-warn-500)]">
              Logo is not included in shared links — files only
            </span>
          ) : (
            <span className="plico-measure text-[11px] text-[var(--text-muted)]">
              {exportLocked
                ? "Download unlocks when there is content to encode"
                : "PNG exports at 560 × 560 px · 2× — downloading also saves to history"}
            </span>
          )}
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-[var(--surface-card)] border-t border-[var(--border-hairline)] px-4 py-3 flex gap-2 shadow-[0_-2px_6px_rgba(27,24,18,0.06)]">
          {exportButtons}
        </div>
      )}
    </section>
  );
}
