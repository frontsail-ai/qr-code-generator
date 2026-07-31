import type { Customization, GradientType } from "./types";

interface ColorStop {
  offset: number;
  color: string;
}

interface GradientConfig {
  type: "radial" | "linear";
  rotation?: number;
  colorStops: ColorStop[];
}

export function buildGradient(
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

export function mapOptionsToQRConfig(options: Customization) {
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
      // "transparent" is a valid fill, so the backdrop rect is still drawn but
      // carries zero alpha — the SVG and the canvas-rasterized PNG both keep it
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
