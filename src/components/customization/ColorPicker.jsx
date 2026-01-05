import { PRESET_COLORS } from "../../utils/constants";

export function ColorPicker({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => onChange(color)}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                value === color
                  ? "border-gray-900 ring-2 ring-gray-300"
                  : "border-gray-200"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              onChange(val);
            }
          }}
          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
