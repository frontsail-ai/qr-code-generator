import { useCallback, useState } from "react";
import { LogoValidationError, validateLogoImage } from "../utils/validateLogoImage";

/* Single owner of "this file wants to become the logo".

   Both entry points — the picker in the logo panel and a drop anywhere on the
   canvas — funnel through `acceptFile`, so the same rejected file produces the
   same message however it arrived. Validation was already shared
   (`validateLogoImage`); what was not was the answer to "and then what?", which
   is how one path ended up alerting and the other silently dropping the file on
   the floor. This hook decides whether the file is in and what to say when it
   is not; where that message is drawn is the caller's business. */
export function useLogoIntake(setLogo: (dataUrl: string | null) => void) {
  const [error, setError] = useState<string | null>(null);

  /* A drop or a picker dialog that yields no file is a cancelled gesture, not
     a rejection — say nothing and leave any existing message alone. */
  const acceptFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      try {
        setLogo(await validateLogoImage(file));
        setError(null);
      } catch (err) {
        setError(err instanceof LogoValidationError ? err.message : "Could not read the file");
      }
    },
    [setLogo],
  );

  const removeLogo = useCallback(() => {
    setLogo(null);
    setError(null);
  }, [setLogo]);

  return { error, acceptFile, removeLogo };
}
