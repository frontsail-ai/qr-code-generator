import { PRESET_COLORS, GRADIENT_TYPES } from '../../utils/constants';

function ColorInput({ value, onChange, label }) {
  return (
    <div>
      {label && (
        <span className="block text-xs text-gray-500 mb-1">{label}</span>
      )}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {PRESET_COLORS.slice(0, 4).map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                value === color ? 'border-gray-900 ring-2 ring-gray-300' : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-300"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              onChange(val);
            }
          }}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function GradientPreview({ color1, color2, gradientType }) {
  let background;

  if (gradientType === 'none') {
    background = color1;
  } else if (gradientType === 'radial') {
    background = `radial-gradient(circle, ${color1} 0%, ${color2} 100%)`;
  } else if (gradientType === 'linear-bl-tr') {
    background = `linear-gradient(45deg, ${color1} 0%, ${color2} 100%)`;
  } else if (gradientType === 'linear-tl-br') {
    background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  }

  return (
    <div
      className="w-10 h-10 rounded-lg border border-gray-300 flex-shrink-0"
      style={{ background }}
      title="Color preview"
    />
  );
}

export function ForegroundColorPicker({
  color1,
  color2,
  gradientType,
  onColor1Change,
  onColor2Change,
  onGradientTypeChange
}) {
  const isGradient = gradientType !== 'none';

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Foreground Color
      </label>

      <div className="space-y-3">
        {/* Gradient type selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12">Type:</span>
          <div className="flex gap-1">
            {GRADIENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => onGradientTypeChange(type.value)}
                className={`px-2 py-1 text-sm rounded transition-colors cursor-pointer ${
                  gradientType === type.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={type.title || type.label}
              >
                {type.label}
              </button>
            ))}
          </div>
          <GradientPreview color1={color1} color2={color2} gradientType={gradientType} />
        </div>

        {/* Color 1 */}
        <ColorInput
          value={color1}
          onChange={onColor1Change}
          label={isGradient ? 'Start color' : undefined}
        />

        {/* Color 2 (only shown for gradients) */}
        {isGradient && (
          <ColorInput
            value={color2}
            onChange={onColor2Change}
            label="End color"
          />
        )}
      </div>
    </div>
  );
}
