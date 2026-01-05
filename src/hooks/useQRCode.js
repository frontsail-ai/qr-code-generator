import { useRef, useEffect, useCallback } from 'react';
import QRCodeStyling from 'qr-code-styling';

function mapOptionsToQRConfig(options) {
  return {
    dotsOptions: {
      color: options.foregroundColor,
      type: options.dotType
    },
    backgroundOptions: {
      color: options.backgroundColor
    },
    cornersSquareOptions: {
      color: options.foregroundColor,
      type: options.cornerSquareType
    },
    cornersDotOptions: {
      color: options.foregroundColor,
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
  const isInitializedRef = useRef(false);

  // Initialize QR code instance
  useEffect(() => {
    if (!isInitializedRef.current && containerRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: 280,
        height: 280,
        type: 'svg',
        data: data || 'https://example.com',
        ...mapOptionsToQRConfig(options)
      });

      containerRef.current.innerHTML = '';
      qrCodeRef.current.append(containerRef.current);
      isInitializedRef.current = true;
    }
  }, [containerRef]);

  // Update QR code when data or options change
  useEffect(() => {
    if (qrCodeRef.current && isInitializedRef.current) {
      qrCodeRef.current.update({
        data: data || 'https://example.com',
        ...mapOptionsToQRConfig(options)
      });
    }
  }, [data, options]);

  const downloadPNG = useCallback(() => {
    qrCodeRef.current?.download({ name: 'qr-code', extension: 'png' });
  }, []);

  const downloadSVG = useCallback(() => {
    qrCodeRef.current?.download({ name: 'qr-code', extension: 'svg' });
  }, []);

  return { downloadPNG, downloadSVG };
}
