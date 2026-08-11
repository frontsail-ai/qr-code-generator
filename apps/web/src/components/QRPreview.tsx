import { Download, FileCode, ScanLine, Share2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { RENDER_STALLED_ERROR, useQRCode } from "../hooks/useQRCode";
import type { Customization, FormDataMap, QRType } from "@frontsail/qr-core";
import { assessScanRisk, formatQRData, hasAnyContent, isTransparent } from "@frontsail/qr-core";
import { Badge, Button, IconButton, Note } from "./ui";

interface QRPreviewProps {
  qrType: QRType;
  formData: FormDataMap;
  customization: Customization;
  onSave?: () => void;
  onShare?: () => void;
  /* Whether this design is being kept anywhere — see `useDraft`. It is drawn
     here, beside the code, because that is where the user is looking when it
     stops being true; the history rail it concerns is collapsible on desktop
     and behind a drawer on mobile, which would make it a message nobody sees. */
  notice?: { variant: "warn" | "error"; message: string } | null;
}

export function QRPreview({
  qrType,
  formData,
  customization,
  onSave,
  onShare,
  notice,
}: QRPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
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
  /* `formatQRData` returns "" for two different situations, and only one of
     them is "you have not typed anything yet". The other is a form with
     content that its format cannot express — a phone number carrying an
     extension, say — and telling that user to "add some content" contradicts
     the field they are looking at. `hasAnyContent` is what separates the two;
     the MCP server has asked it since #54, and this is the app's other
     human-facing caller. */
  const unencodable = isEmpty && hasAnyContent(formData[qrType]);
  const exportLocked = isEmpty || !!error;
  // Follows the debounced options so the checkerboard and the QR flip together
  const transparentBg = isTransparent(debouncedOptions.backgroundColor);
  // Colour scannability heuristic — warns, never locks (thresholds are
  // measured under ideal conditions; see packages/core/src/scanRisk.ts)
  const scanRisk = useMemo(() => assessScanRisk(debouncedOptions), [debouncedOptions]);

  /* The column is anchored to the top of the canvas and grows downward, so on a
     short window its tail runs past the fold — and its tail is where the
     advisories and the export controls live. A warning nobody scrolls to is one
     nobody reads, and there is nothing on screen to suggest scrolling: at
     1280x640 this note sits at y643 with the page ending at 693 (#61).

     `block: "nearest"` scrolls the least it can and does nothing at all when
     the note is already on screen, which is every window taller than about
     700px. Scrolling the document moves the canvas; the inspector is sticky, so
     the field being typed into stays exactly where it was. Keyed on the message
     so a note that changes what it says is shown again, and one that merely
     re-renders is not. */
  const message = notice?.message;
  useEffect(() => {
    if (!message) return;
    noticeRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [message]);

  const errorMessage = error?.includes("code length overflow")
    ? "This content is too long to fit in a QR code. Shorten it to generate one."
    : error?.includes(RENDER_STALLED_ERROR)
      ? "The code never finished drawing — the logo image may be broken. Remove or replace it."
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

  const exportHint = exportLocked
    ? unencodable
      ? "Download unlocks once the content fits the format"
      : "Download unlocks when there is content to encode"
    : `PNG exports at 560 × 560 px · 2×${
        transparentBg ? " · transparent background" : ""
      } — downloading also saves to history`;

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
      className={`relative flex flex-col items-center gap-[18px] w-full ${
        isDesktop
          ? ""
          : "plico-grid -mx-4 w-auto self-stretch px-4 -mt-6 pt-5 pb-5 border-b border-[var(--border-hairline)]"
      }`}
    >
      {/* Dimension annotation — drafting-style */}
      {!isEmpty && !error && (
        <div className="hidden lg:flex w-[328px] items-center gap-2.5" aria-hidden>
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
        data-testid="qr-sheet"
        className={`bg-[var(--paper-card)] border-2 border-[var(--border-strong)] rounded-[2px] p-3 lg:p-6 shadow-[var(--shadow-md)] ${
          isEmpty || error ? "hidden" : ""
        }`}
      >
        <div
          ref={containerRef}
          className={`w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] [&_svg]:w-full [&_svg]:h-full ${
            transparentBg ? "plico-checker" : ""
          }`}
        />
      </div>
      {isEmpty && unencodable && (
        <div className="w-[328px] max-w-full aspect-square bg-[color-mix(in_srgb,var(--paper-card)_65%,transparent)] border-[1.5px] border-dashed border-[var(--signal-warn-500)] rounded-[2px] flex flex-col items-center justify-center gap-3 p-8 text-center">
          <ScanLine className="w-9 h-9 text-[var(--signal-warn-500)]" aria-hidden />
          <div className="text-[15px] font-semibold text-[var(--text-primary)]">
            This {typeLabel} cannot be encoded
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] leading-normal max-w-[260px]">
            {qrType === "phone" || qrType === "vcard"
              ? "A dial link holds digits, a leading +, * and #, and the separators - . ( ). Letters and extensions have no place to go."
              : "Some of this content cannot be written in this format. Check it for characters the format does not allow."}
          </p>
        </div>
      )}
      {isEmpty && !unencodable && (
        <div className="w-[328px] max-w-full aspect-square bg-[color-mix(in_srgb,var(--paper-card)_65%,transparent)] border-[1.5px] border-dashed border-[var(--ink-300)] rounded-[2px] flex flex-col items-center justify-center gap-3 p-8 text-center">
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
        <div className="w-[328px] max-w-full aspect-square bg-[var(--signal-error-50)] border-[1.5px] border-dashed border-[var(--signal-error-500)] rounded-[2px] flex flex-col items-center justify-center gap-3 p-8 text-center">
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

      {/* Colour scannability warning — advisory, exports stay unlocked */}
      {!isEmpty && !error && scanRisk && (
        <div className="flex items-start gap-2 w-[328px] max-w-full px-2.5 py-2 bg-[var(--signal-warn-50)] rounded-[2px]">
          <TriangleAlert
            className="w-3.5 h-3.5 text-[var(--signal-warn-500)] shrink-0 mt-px"
            aria-hidden
          />
          <span className="text-xs text-[var(--ink-700)] leading-[1.45]">{scanRisk.message}</span>
        </div>
      )}

      {/* Storage trouble — the design is fine, keeping it is not.

          An ordinary sibling, like every other advisory here. It used to hang
          out of flow to dodge the shift a vertically centred column produced,
          and #66 removed the centring that caused it — measured before and
          after, the hack was worth 6px of position and nothing else. */}
      {notice && (
        <Note
          ref={noticeRef}
          variant={notice.variant}
          role={notice.variant === "error" ? "alert" : "status"}
          /* Scroll margin so bringing it into view leaves it clear of the
             bottom edge rather than flush against it. It needs somewhere to go:
             the canvas carries matching bottom padding, because this note is
             the last thing in the column and a page cannot scroll past its own
             content.

             The consent banner is part of that clearance. `scrollIntoView`
             aligns against the viewport, which does not know the bottom of it
             is spoken for — so a flat margin parked this note in the one place
             it could not be read, and every geometric check still called it
             visible. `--consent-inset` is what the rest of the app uses to stay
             clear of the banner; it is 0 once the banner is answered, so this
             costs nothing after that. */
          className="w-[328px] max-w-full order-last scroll-mb-[calc(0.5rem+var(--consent-inset))]"
          data-testid="storage-notice"
        >
          {notice.message}
        </Note>
      )}

      {/* Export — a static block on desktop, a bar fixed to the bottom of the
          viewport on mobile. That bar is lifted by the consent inset because the
          banner is fixed down there too and sits above it: without the inset the
          banner covers the export bar outright on a phone, so a first-time
          visitor cannot see Download and a tap aimed at it lands on "Accept". */}
      {isDesktop ? (
        <div className="flex w-[328px] flex-col gap-2 mt-1.5">
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-muted)]">
            04 — Export
          </span>
          <div className="flex gap-2">{exportButtons}</div>
          {customization.logo ? (
            <span className="font-mono text-[11px] text-[var(--signal-warn-500)]">
              Logo is not included in shared links — files only
            </span>
          ) : (
            <span className="plico-measure text-[11px] text-[var(--text-muted)]">{exportHint}</span>
          )}
        </div>
      ) : (
        <div className="fixed bottom-[var(--consent-inset)] left-0 right-0 z-10 bg-[var(--surface-card)] border-t border-[var(--border-hairline)] px-4 py-3 flex gap-2 shadow-[0_-2px_6px_rgba(27,24,18,0.06)]">
          {exportButtons}
        </div>
      )}
    </section>
  );
}
