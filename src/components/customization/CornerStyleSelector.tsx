import type { CornerDotType, CornerSquareType } from "../../types";
import { CORNER_DOT_TYPES, CORNER_SQUARE_TYPES } from "../../utils/constants";

interface CornerStyleSelectorProps {
  squareValue: CornerSquareType;
  dotValue: CornerDotType;
  onSquareChange: (value: CornerSquareType) => void;
  onDotChange: (value: CornerDotType) => void;
}

export function CornerStyleSelector({
  squareValue,
  dotValue,
  onSquareChange,
  onDotChange,
}: CornerStyleSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Corner Square Style
        </label>
        <div className="flex gap-2">
          {CORNER_SQUARE_TYPES.map((type) => (
            <button
              type="button"
              key={type.value}
              onClick={() => onSquareChange(type.value)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                squareValue === type.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Corner Dot Style
        </label>
        <div className="flex gap-2">
          {CORNER_DOT_TYPES.map((type) => (
            <button
              type="button"
              key={type.value}
              onClick={() => onDotChange(type.value)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                dotValue === type.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
