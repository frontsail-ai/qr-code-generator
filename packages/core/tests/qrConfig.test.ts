import { describe, expect, test } from "vite-plus/test";
import { DEFAULT_CUSTOMIZATION, TRANSPARENT } from "../src/constants";
import { buildGradient, mapOptionsToQRConfig } from "../src/qrConfig";

describe("buildGradient", () => {
  test("is undefined for a solid fill", () => {
    expect(buildGradient("none", "#000000", "#FFFFFF")).toBeUndefined();
  });

  test("maps radial without a rotation", () => {
    expect(buildGradient("radial", "#000000", "#FFFFFF")).toEqual({
      type: "radial",
      colorStops: [
        { offset: 0, color: "#000000" },
        { offset: 1, color: "#FFFFFF" },
      ],
    });
  });

  test("maps bottom-left to top-right to a 45° rotation", () => {
    expect(buildGradient("linear-bl-tr", "#000000", "#FFFFFF")).toEqual({
      type: "linear",
      rotation: Math.PI / 4,
      colorStops: [
        { offset: 0, color: "#000000" },
        { offset: 1, color: "#FFFFFF" },
      ],
    });
  });

  test("maps top-left to bottom-right to a 135° rotation", () => {
    const gradient = buildGradient("linear-tl-br", "#000000", "#FFFFFF");
    expect(gradient?.type).toBe("linear");
    expect(gradient?.rotation).toBe((3 * Math.PI) / 4);
  });
});

describe("mapOptionsToQRConfig", () => {
  test("sets a flat color and clears the gradient for a solid fill", () => {
    const config = mapOptionsToQRConfig(DEFAULT_CUSTOMIZATION);

    // qr-code-styling keeps a stale gradient unless it is explicitly undefined
    for (const section of [
      config.dotsOptions,
      config.cornersSquareOptions,
      config.cornersDotOptions,
    ]) {
      expect(section.color).toBe(DEFAULT_CUSTOMIZATION.foregroundColor);
      expect(section.gradient).toBeUndefined();
    }
  });

  test("sets the gradient and clears the color when a gradient is selected", () => {
    const config = mapOptionsToQRConfig({
      ...DEFAULT_CUSTOMIZATION,
      gradientType: "linear-bl-tr",
      foregroundColor: "#1B1812",
      foregroundColor2: "#2C4A8A",
    });

    expect(config.dotsOptions.color).toBeUndefined();
    expect(config.dotsOptions.gradient).toEqual({
      type: "linear",
      rotation: Math.PI / 4,
      colorStops: [
        { offset: 0, color: "#1B1812" },
        { offset: 1, color: "#2C4A8A" },
      ],
    });
  });

  test("carries the shape choices through", () => {
    const config = mapOptionsToQRConfig({
      ...DEFAULT_CUSTOMIZATION,
      dotType: "classy-rounded",
      cornerSquareType: "extra-rounded",
      cornerDotType: "dot",
    });

    expect(config.dotsOptions.type).toBe("classy-rounded");
    expect(config.cornersSquareOptions.type).toBe("extra-rounded");
    expect(config.cornersDotOptions.type).toBe("dot");
  });

  test("passes the transparent sentinel straight to the background fill", () => {
    const config = mapOptionsToQRConfig({
      ...DEFAULT_CUSTOMIZATION,
      backgroundColor: TRANSPARENT,
    });

    expect(config.backgroundOptions.color).toBe(TRANSPARENT);
  });

  test("omits the image when there is no logo", () => {
    expect(mapOptionsToQRConfig(DEFAULT_CUSTOMIZATION).image).toBeUndefined();
    expect(
      mapOptionsToQRConfig({ ...DEFAULT_CUSTOMIZATION, logo: "data:image/png;base64,AAAA" }).image,
    ).toBe("data:image/png;base64,AAAA");
  });
});
