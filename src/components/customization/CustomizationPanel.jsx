import { ColorPicker } from './ColorPicker';
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

      <ColorPicker
        label="Foreground Color"
        value={customization.foregroundColor}
        onChange={(value) => update('foregroundColor', value)}
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
