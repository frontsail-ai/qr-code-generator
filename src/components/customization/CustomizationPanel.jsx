import { ColorPicker } from './ColorPicker';
import { ForegroundColorPicker } from './ForegroundColorPicker';
import { DotStyleSelector } from './DotStyleSelector';
import { CornerStyleSelector } from './CornerStyleSelector';
import { LogoUploader } from './LogoUploader';

export function CustomizationPanel({ customization, onChange }) {
  const update = (field, value) => {
    onChange({ ...customization, [field]: value });
  };

  return (
    <section className="bg-white rounded-xl p-4 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Customize</h2>

      <ForegroundColorPicker
        color1={customization.foregroundColor}
        color2={customization.foregroundColor2}
        gradientType={customization.gradientType}
        onColor1Change={(value) => update('foregroundColor', value)}
        onColor2Change={(value) => update('foregroundColor2', value)}
        onGradientTypeChange={(value) => update('gradientType', value)}
      />

      <ColorPicker
        label="Background Color"
        value={customization.backgroundColor}
        onChange={(value) => update('backgroundColor', value)}
      />

      <DotStyleSelector
        value={customization.dotType}
        onChange={(value) => update('dotType', value)}
      />

      <CornerStyleSelector
        squareValue={customization.cornerSquareType}
        dotValue={customization.cornerDotType}
        onSquareChange={(value) => update('cornerSquareType', value)}
        onDotChange={(value) => update('cornerDotType', value)}
      />

      <LogoUploader
        value={customization.logo}
        onChange={(value) => update('logo', value)}
      />
    </section>
  );
}
