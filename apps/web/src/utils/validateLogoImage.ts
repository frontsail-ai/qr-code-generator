/* Upload-time gate for logo files. The MIME label and size are metadata
   checks; the decode step is the load-bearing one — `file.type` comes from
   the filename, so a corrupt file sails through a label check and then hangs
   qr-code-styling's renderer forever (its browser `loadImage()` has no
   `onerror`, so the drawing promise never settles). Rejecting undecodable
   bytes here keeps them out of the render pipeline entirely. */

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export class LogoValidationError extends Error {}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new LogoValidationError("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

function decodes(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

/* Resolves with the data URL to store as `customization.logo`; rejects with
   a `LogoValidationError` whose message is user-readable. */
export async function validateLogoImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new LogoValidationError("Please upload an image file");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new LogoValidationError("File size must be under 2 MB");
  }

  const dataUrl = await readAsDataURL(file);
  if (!(await decodes(dataUrl))) {
    throw new LogoValidationError(
      "That file is not a readable image — it may be corrupt or mislabeled",
    );
  }
  return dataUrl;
}
