import type { DotType } from "../../types";
import { DOT_TYPES } from "../../utils/constants";

interface DotStyleSelectorProps {
  value: DotType;
  onChange: (value: DotType) => void;
}

export function DotStyleSelector({ value, onChange }: DotStyleSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Dot Style
      </label>
      <div className="grid grid-cols-3 gap-2">
        {DOT_TYPES.map((type) => (
          <button
            type="button"
            key={type.value}
            onClick={() => onChange(type.value)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              value === type.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
}
