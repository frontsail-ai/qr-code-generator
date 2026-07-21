import type { FormComponentProps, TextFormData } from "../../types";

export function TextForm({ data, onChange }: FormComponentProps<TextFormData>) {
  // Byte capacity of a version-40 QR code at error correction level "Q",
  // the qr-code-styling default; beyond this the QR cannot be generated
  const maxLength = 1663;
  const charCount = data.content?.length || 0;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="block text-sm font-medium text-gray-700">
          Text Content
        </label>
        <span
          className={`text-xs ${charCount > maxLength ? "text-red-500" : "text-gray-400"}`}
        >
          {charCount} / {maxLength}
        </span>
      </div>
      <textarea
        value={data.content}
        onChange={(e) => onChange({ ...data, content: e.target.value })}
        placeholder="Enter any text..."
        rows={5}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow resize-none"
      />
      {charCount > maxLength && (
        <p className="text-xs text-red-500 mt-1">
          Too long to fit in a QR code
        </p>
      )}
    </div>
  );
}
