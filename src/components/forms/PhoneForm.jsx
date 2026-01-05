export function PhoneForm({ data, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Phone Number
      </label>
      <input
        type="tel"
        value={data.number}
        onChange={(e) => onChange({ ...data, number: e.target.value })}
        placeholder="+1 234 567 8900"
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
      />
    </div>
  );
}
