import QRCodeStyling from "qr-code-styling";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { Customization, GradientType } from "../types";

interface ColorStop {
  offset: number;
  color: string;
}

interface GradientConfig {
  type: "radial" | "linear";
  rotation?: number;
  colorStops: ColorStop[];
}

function buildGradient(
  gradientType: GradientType,
  color1: string,
  color2: string,
): GradientConfig | undefined {
  if (gradientType === "none") {
    return undefined;
  }

  const colorStops: ColorStop[] = [
    { offset: 0, color: color1 },
    { offset: 1, color: color2 },
  ];

  if (gradientType === "radial") {
    return {
      type: "radial",
      colorStops,
    };
  }

  // Linear gradients
  let rotation = 0;
  if (gradientType === "linear-bl-tr") {
    rotation = Math.PI / 4; // 45 degrees
  } else if (gradientType === "linear-tl-br") {
    rotation = (3 * Math.PI) / 4; // 135 degrees
  }

  return {
    type: "linear",
    rotation,
    colorStops,
  };
}

function mapOptionsToQRConfig(options: Customization) {
  const gradient = buildGradient(
    options.gradientType,
    options.foregroundColor,
    options.foregroundColor2,
  );

  // Must explicitly set gradient to undefined when solid, otherwise qr-code-styling keeps the old gradient
  const colorConfig = gradient
    ? { gradient, color: undefined }
    : { color: options.foregroundColor, gradient: undefined };

  return {
    dotsOptions: {
      ...colorConfig,
      type: options.dotType,
    },
    backgroundOptions: {
      color: options.backgroundColor,
    },
    cornersSquareOptions: {
      ...colorConfig,
      type: options.cornerSquareType,
    },
    cornersDotOptions: {
      ...colorConfig,
      type: options.cornerDotType,
    },
    image: options.logo || undefined,
    imageOptions: {
      crossOrigin: "anonymous" as const,
      margin: 8,
      imageSize: 0.4,
    },
  };
}

interface UseQRCodeReturn {
  downloadPNG: () => void;
  downloadSVG: () => void;
}

export function useQRCode(
  containerRef: RefObject<HTMLDivElement | null>,
  data: string,
  options: Customization,
): UseQRCodeReturn {
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  // Create/recreate QR code instance when data or options change
  // We recreate instead of update() because qr-code-styling doesn't properly
  // clear gradient settings on update, causing downloads to have wrong colors
  useEffect(() => {
    if (containerRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: 280,
        height: 280,
        type: "svg",
        data: data || "https://frontsail.ai",
        ...mapOptionsToQRConfig(options),
      });

      containerRef.current.innerHTML = "";
      qrCodeRef.current.append(containerRef.current);
    }
  }, [containerRef, data, options]);

  const downloadPNG = useCallback(() => {
    // Create a high-res instance for download (qr-code-styling ignores width/height in download())
    const hiResQR = new QRCodeStyling({
      width: 560,
      height: 560,
      type: "canvas",
      data: data || "https://frontsail.ai",
      ...mapOptionsToQRConfig(options),
    });
    hiResQR.download({ name: "qr-code", extension: "png" });
  }, [data, options]);

  const downloadSVG = useCallback(() => {
    qrCodeRef.current?.download({ name: "qr-code", extension: "svg" });
  }, []);

  return { downloadPNG, downloadSVG };
}
