import type { Customization, SavedConfig } from "../types";
import { QR_TYPES } from "../utils/constants";
import { formatQRData } from "../utils/qrDataFormatters";

function getColorStyle(customization: Customization): React.CSSProperties {
  const { foregroundColor, foregroundColor2, gradientType } = customization;

  if (gradientType === "none" || !gradientType) {
    return { backgroundColor: foregroundColor };
  }

  if (gradientType === "radial") {
    return {
      background: `radial-gradient(circle, ${foregroundColor} 0%, ${foregroundColor2} 100%)`,
    };
  }

  if (gradientType === "linear-bl-tr") {
    return {
      background: `linear-gradient(45deg, ${foregroundColor} 0%, ${foregroundColor2} 100%)`,
    };
  }

  if (gradientType === "linear-tl-br") {
    return {
      background: `linear-gradient(135deg, ${foregroundColor} 0%, ${foregroundColor2} 100%)`,
    };
  }

  return { backgroundColor: foregroundColor };
}

interface ConfigPreviewProps {
  config: SavedConfig;
  onRestore: (config: SavedConfig) => void;
  onDelete: (id: string) => void;
}

function ConfigPreview({ config, onRestore, onDelete }: ConfigPreviewProps) {
  const typeLabel =
    QR_TYPES.find((t) => t.value === config.qrType)?.label || config.qrType;
  const data = formatQRData(config.qrType, config.formData[config.qrType]);
  const displayData = data.length > 30 ? `${data.substring(0, 30)}...` : data;

  const formattedDate = new Date(config.timestamp).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const hasLogo = Boolean(config.customization.logo);
  const colorStyle = getColorStyle(config.customization);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-sm flex-shrink-0"
              style={colorStyle}
            />
            <span className="text-sm font-medium text-gray-900">
              {typeLabel}
            </span>
            {hasLogo && (
              <span className="flex-shrink-0" title="Has custom logo">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate mt-1" title={data}>
            {displayData || "(empty)"}
          </p>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {formattedDate}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onRestore(config)}
          className="flex-1 text-xs px-2 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={() => onDelete(config.id)}
          className="text-xs px-2 py-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface SavedConfigsProps {
  configs: SavedConfig[];
  onRestore: (config: SavedConfig) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function SavedConfigs({
  configs,
  onRestore,
  onDelete,
  onClearAll,
}: SavedConfigsProps) {
  if (configs.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">History</h2>
        <p className="text-sm text-gray-500">
          No saved configurations yet. Download a QR code to save its settings.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">History</h2>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-2">
        {configs.map((config) => (
          <ConfigPreview
            key={config.id}
            config={config}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
