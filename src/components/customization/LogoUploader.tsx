import { ImageUp, TriangleAlert } from "lucide-react";
import type { ChangeEvent } from "react";
import { useRef } from "react";

interface LogoUploaderProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
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
              onClick={handleRemove}
              className="text-xs text-[var(--signal-error-500)] bg-transparent border-none cursor-pointer px-2 py-1 rounded-[2px] transition-colors duration-[140ms] hover:bg-[var(--signal-error-50)]"
            >
              Remove
            </button>
          </div>
          <div className="flex items-start gap-2 px-2.5 py-2 bg-[var(--signal-warn-50)] rounded-[2px]">
            <TriangleAlert
              className="w-3.5 h-3.5 text-[var(--signal-warn-500)] shrink-0 mt-px"
              aria-hidden
            />
            <span className="text-xs text-[var(--ink-700)] leading-[1.45]">
              A logo covers part of the code. Test a scan before you print.
            </span>
          </div>
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
