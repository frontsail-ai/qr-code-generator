import type {
  CornerDotType,
  CornerSquareType,
  Customization,
  DotType,
  GradientType,
} from "@frontsail/qr-core";
import { SectionLabel } from "../ui";
import { ColorPicker } from "./ColorPicker";
import { CornerStyleSelector } from "./CornerStyleSelector";
import { DotStyleSelector } from "./DotStyleSelector";
import { ForegroundColorPicker } from "./ForegroundColorPicker";
import { LogoUploader } from "./LogoUploader";

interface CustomizationPanelProps {
  customization: Customization;
  onChange: (customization: Customization) => void;
  /* The logo does not travel with the rest of the customization: a file has to
     be validated before it can become one, and both this panel and the canvas
     drop zone feed the same intake, which owns the outcome. */
  logoError: string | null;
  onLogoFile: (file: File | undefined) => void;
  onLogoRemove: () => void;
}

export function CustomizationPanel({
  customization,
  onChange,
  logoError,
  onLogoFile,
  onLogoRemove,
}: CustomizationPanelProps) {
  const update = <K extends keyof Customization>(field: K, value: Customization[K]) => {
    onChange({ ...customization, [field]: value });
  };

  return (
    <section className="flex flex-col gap-3.5">
      <SectionLabel>03 — Style</SectionLabel>

      <ForegroundColorPicker
        color1={customization.foregroundColor}
        color2={customization.foregroundColor2}
        gradientType={customization.gradientType}
        onColor1Change={(value: string) => update("foregroundColor", value)}
        onColor2Change={(value: string) => update("foregroundColor2", value)}
        onGradientTypeChange={(value: GradientType) => update("gradientType", value)}
      />

      <ColorPicker
        label="Background"
        value={customization.backgroundColor}
        onChange={(value: string) => update("backgroundColor", value)}
        allowTransparent
      />

      <DotStyleSelector
        value={customization.dotType}
        onChange={(value: DotType) => update("dotType", value)}
      />

      <CornerStyleSelector
        squareValue={customization.cornerSquareType}
        dotValue={customization.cornerDotType}
        onSquareChange={(value: CornerSquareType) => update("cornerSquareType", value)}
        onDotChange={(value: CornerDotType) => update("cornerDotType", value)}
      />

      <LogoUploader
        value={customization.logo}
        error={logoError}
        onFile={onLogoFile}
        onRemove={onLogoRemove}
      />
    </section>
  );
}
