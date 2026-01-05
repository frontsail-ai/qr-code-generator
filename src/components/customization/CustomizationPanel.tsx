import type {
  CornerDotType,
  CornerSquareType,
  Customization,
  DotType,
  GradientType,
} from "../../types";
import { ColorPicker } from "./ColorPicker";
import { CornerStyleSelector } from "./CornerStyleSelector";
import { DotStyleSelector } from "./DotStyleSelector";
import { ForegroundColorPicker } from "./ForegroundColorPicker";
import { LogoUploader } from "./LogoUploader";

interface CustomizationPanelProps {
  customization: Customization;
  onChange: (customization: Customization) => void;
}

export function CustomizationPanel({
  customization,
  onChange,
}: CustomizationPanelProps) {
  const update = <K extends keyof Customization>(
    field: K,
    value: Customization[K],
  ) => {
    onChange({ ...customization, [field]: value });
  };

  return (
    <section className="bg-white rounded-xl p-4 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Customize</h2>

      <ForegroundColorPicker
        color1={customization.foregroundColor}
        color2={customization.foregroundColor2}
        gradientType={customization.gradientType}
        onColor1Change={(value: string) => update("foregroundColor", value)}
        onColor2Change={(value: string) => update("foregroundColor2", value)}
        onGradientTypeChange={(value: GradientType) =>
          update("gradientType", value)
        }
      />

      <ColorPicker
        label="Background Color"
        value={customization.backgroundColor}
        onChange={(value: string) => update("backgroundColor", value)}
      />

      <DotStyleSelector
        value={customization.dotType}
        onChange={(value: DotType) => update("dotType", value)}
      />

      <CornerStyleSelector
        squareValue={customization.cornerSquareType}
        dotValue={customization.cornerDotType}
        onSquareChange={(value: CornerSquareType) =>
          update("cornerSquareType", value)
        }
        onDotChange={(value: CornerDotType) => update("cornerDotType", value)}
      />

      <LogoUploader
        value={customization.logo}
        onChange={(value: string | null) => update("logo", value)}
      />
    </section>
  );
}
