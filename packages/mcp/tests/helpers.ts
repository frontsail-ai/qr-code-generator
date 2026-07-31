import { createCanvas, loadImage } from "@napi-rs/canvas";

export const TEST_DATA = "https://qr-code-gen.frontsail.app/";

export interface PixelStats {
  width: number;
  height: number;
  total: number;
  zeroAlpha: number;
  opaque: number;
  /* Pixels matching the red mark in tests/fixtures/logo.png (#E0301E). A QR
     rendered from the default palette contains none, so a non-zero count is
     proof the logo actually rasterized rather than being silently dropped. */
  logoRed: number;
}

export async function inspectPng(png: Buffer): Promise<PixelStats> {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);

  let zeroAlpha = 0;
  let opaque = 0;
  let logoRed = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
    if (a === 0) zeroAlpha++;
    else if (a === 255) opaque++;
    if (a > 128 && r > 180 && g < 90 && b < 80) logoRed++;
  }

  return {
    width: image.width,
    height: image.height,
    total: data.length / 4,
    zeroAlpha,
    opaque,
    logoRed,
  };
}
