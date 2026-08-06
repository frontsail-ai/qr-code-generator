import { useCallback, useState } from "react";
import { type ConsentDecision, readConsent, setConsent } from "../analytics";

interface UseAnalyticsConsentReturn {
  /** `null` until the visitor answers — that is what puts the banner on screen. */
  decision: ConsentDecision | null;
  setEnabled: (enabled: boolean) => void;
}

/**
 * Owns the consent decision for the session.
 *
 * Read lazily on mount rather than in an effect: a returning visitor who
 * already answered should never see the banner flash before it is dismissed.
 */
export function useAnalyticsConsent(): UseAnalyticsConsentReturn {
  const [decision, setDecision] = useState<ConsentDecision | null>(readConsent);

  const setEnabled = useCallback((enabled: boolean) => {
    setConsent(enabled);
    setDecision(enabled ? "granted" : "denied");
  }, []);

  return { decision, setEnabled };
}
