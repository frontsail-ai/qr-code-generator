import { useRef, useEffect, useCallback } from 'react';
import QRCodeStyling from 'qr-code-styling';

function buildGradient(gradientType, color1, color2) {
  if (gradientType === 'none') {
    return undefined;
  }

  const colorStops = [
    { offset: 0, color: color1 },
    { offset: 1, color: color2 }
  ];

  if (gradientType === 'radial') {
    return {
      type: 'radial',
      colorStops
    };
  }

  // Linear gradients
  let rotation = 0;
  if (gradientType === 'linear-bl-tr') {
    rotation = Math.PI / 4; // 45 degrees
  } else if (gradientType === 'linear-tl-br') {
    rotation = (3 * Math.PI) / 4; // 135 degrees
  }

  return {
    type: 'linear',
    rotation,
    colorStops
  };
}

function mapOptionsToQRConfig(options) {
  const gradient = buildGradient(
    options.gradientType,
    options.foregroundColor,
    options.foregroundColor2
  );

  // Must explicitly set gradient to undefined when solid, otherwise qr-code-styling keeps the old gradient
  const colorConfig = gradient
    ? { gradient, color: undefined }
    : { color: options.foregroundColor, gradient: undefined };

  return {
    dotsOptions: {
      ...colorConfig,
      type: options.dotType
    },
    backgroundOptions: {
      color: options.backgroundColor
    },
    cornersSquareOptions: {
      ...colorConfig,
      type: options.cornerSquareType
    },
    cornersDotOptions: {
      ...colorConfig,
      type: options.cornerDotType
    },
    image: options.logo || undefined,
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 8,
      imageSize: 0.4
    }
  };
}

export function useQRCode(containerRef, data, options) {
  const qrCodeRef = useRef(null);

  // Create/recreate QR code instance when data or options change
  // We recreate instead of update() because qr-code-styling doesn't properly
  // clear gradient settings on update, causing downloads to have wrong colors
  useEffect(() => {
    if (containerRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: 280,
        height: 280,
        type: 'svg',
        data: data || 'https://example.com',
        ...mapOptionsToQRConfig(options)
      });

      containerRef.current.innerHTML = '';
      qrCodeRef.current.append(containerRef.current);
    }
  }, [containerRef, data, options]);

  const downloadPNG = useCallback(() => {
    qrCodeRef.current?.download({ name: 'qr-code', extension: 'png' });
  }, []);

  const downloadSVG = useCallback(() => {
    qrCodeRef.current?.download({ name: 'qr-code', extension: 'svg' });
  }, []);

  return { downloadPNG, downloadSVG };
}
