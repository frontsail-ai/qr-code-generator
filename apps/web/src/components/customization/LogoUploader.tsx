import { CircleAlert, ImageUp } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useRef } from "react";
import { Note } from "../ui";

interface LogoUploaderProps {
  value: string | null;
  /* Rejection message from the shared intake, or null. Covers files picked
     here and files dropped on the canvas alike — see `useLogoIntake`. */
  error: string | null;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
}

export function LogoUploader({ value, error, onFile, onRemove }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  /* A file dropped on the canvas is rejected over here in the inspector, which
     on a short viewport is scrolled out of sight — an unseen error is the
     silent failure this replaced. "nearest" keeps the nudge to the minimum,
     and the jump is instant: a rejection is the one thing the user is waiting
     on, so animating the panel toward it only delays the answer. */
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [error]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFile(e.target.files?.[0]);
    // Clear the input so re-picking the same (rejected) file fires onChange again
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)]">
        Logo — optional
      </span>

      {value ? (
        <>
          <div className="flex items-center gap-3 p-2.5 border border-[var(--border-hairline)] rounded-[2px] bg-[var(--paper-card)]">
            <span className="w-12 h-12 border border-[var(--ink-200)] rounded-[2px] bg-[var(--surface-sunken)] flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={value}
                alt="Logo preview"
                className="max-w-full max-h-full object-contain"
              />
            </span>
            <span className="flex-1 min-w-0 font-mono text-[10px] text-[var(--text-muted)]">
              Sits at 40% of the code area
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-[var(--signal-error-500)] bg-transparent border-none cursor-pointer px-2 py-1 rounded-[2px] transition-colors duration-[140ms] hover:bg-[var(--signal-error-50)]"
            >
              Remove
            </button>
          </div>
          <Note>A logo covers part of the code. Test a scan before you print.</Note>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-4 bg-transparent border-[1.5px] border-dashed border-[var(--ink-300)] rounded-[2px] cursor-pointer transition-colors duration-[140ms] hover:border-[var(--crease-500)] hover:bg-[var(--signal-info-50)]"
          >
            <ImageUp className="w-5 h-5 text-[var(--text-muted)]" aria-hidden />
            <span className="text-[13px] text-[var(--text-secondary)]">Click to upload logo</span>
            <span className="font-mono text-[10px] tracking-[0.04em] uppercase text-[var(--text-muted)]">
              PNG or JPG · under 2 MB
            </span>
          </button>
          <span className="hidden lg:block font-mono text-[10px] tracking-[0.04em] uppercase text-[var(--text-muted)]">
            Tip — drop an image anywhere on the page
          </span>
        </>
      )}

      {/* Sits outside the branch above: a bad file can arrive while a good logo
          is already set, and the rejection has to be visible either way */}
      {error && (
        <Note
          ref={errorRef}
          variant="error"
          icon={CircleAlert}
          role="alert"
          /* Clearance so scrolling it into view leaves it inside the panel
             rather than resting on the edge, where a fractional height spills
             it a sliver past the bottom of the window. */
          className="scroll-mb-2"
        >
          {error}
        </Note>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
