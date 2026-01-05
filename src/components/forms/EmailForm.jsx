export function EmailForm({ data, onChange }) {
  const update = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          value={data.to}
          onChange={(e) => update("to", e.target.value)}
          placeholder="hello@frontsail.ai"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Subject <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={data.subject}
          onChange={(e) => update("subject", e.target.value)}
          placeholder="Email subject"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Message <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={data.body}
          onChange={(e) => update("body", e.target.value)}
          placeholder="Email body"
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow resize-none"
        />
      </div>
    </div>
  );
}
