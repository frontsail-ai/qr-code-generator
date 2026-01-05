export function URLForm({ data, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Website URL
      </label>
      <input
        type="url"
        value={data.url}
        onChange={(e) => onChange({ ...data, url: e.target.value })}
        placeholder="frontsail.ai"
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
      />
    </div>
  );
}
