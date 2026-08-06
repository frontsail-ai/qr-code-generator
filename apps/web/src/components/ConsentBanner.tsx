import { useLayoutEffect, useRef } from "react";
import { Button } from "./ui";

interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
  /** Reports the bar's rendered height so the layout can reserve room for it. */
  onHeightChange: (height: number) => void;
}

/**
 * Bottom bar asking for analytics consent.
 *
 * Non-blocking on purpose: the generator's whole pitch is that it works the
 * instant the page loads, and a modal that gates it would trade that away for a
 * higher consent rate. Decline carries the same visual weight as Accept, which
 * is both the honest presentation and what EU regulators expect.
 *
 * It overlays rather than joining the flex column because the desktop panes are
 * sized `h-[calc(100vh-3.5rem)]`; making the bar take part in layout would put
 * every one of those calcs out by its height. Instead it measures itself and
 * the panes pad by that much — see `--consent-inset` in App.
 */
export function ConsentBanner({ onAccept, onDecline, onHeightChange }: ConsentBannerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    /* Observed rather than measured once: the copy rewraps between breakpoints
       and on rotation, and a stale inset is a panel with its last row cut off. */
    const observer = new ResizeObserver(([entry]) => {
      onHeightChange(entry?.contentRect ? el.offsetHeight : 0);
    });
    observer.observe(el);
    onHeightChange(el.offsetHeight);
    return () => {
      observer.disconnect();
      onHeightChange(0);
    };
  }, [onHeightChange]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border-hairline)] bg-[var(--surface-card)] px-4 py-3 shadow-[0_-1px_0_rgba(27,24,18,0.04)]"
    >
      <div className="mx-auto flex max-w-[880px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-[13px] leading-snug text-[var(--text-secondary)]">
          Analytics helps us see which features get used. Your QR codes never leave your browser
          &mdash; and nothing loads unless you agree.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={onDecline}>
            Decline
          </Button>
          <Button variant="primary" size="sm" onClick={onAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
