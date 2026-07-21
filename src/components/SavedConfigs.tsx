import { QrCode, RotateCcw, Share2, Trash2, X } from "lucide-react";
import { useIsDesktop } from "../hooks/useMediaQuery";
import type { SavedConfig } from "../types";
import { formatQRData } from "../utils/qrDataFormatters";
import { relativeTime } from "../utils/relativeTime";
import { QRThumbnail } from "./QRThumbnail";
import { Badge, Button, IconButton } from "./ui";

function summarize(config: SavedConfig): string {
  const { qrType, formData } = config;
  switch (qrType) {
    case "url":
      return formData.url.url || "(empty)";
    case "email":
      return formData.email.to || "(empty)";
    case "phone":
      return formData.phone.number || "(empty)";
    case "text":
      return formData.text.content || "(empty)";
    case "vcard": {
      const v = formData.vcard;
      const name = [v.firstName, v.lastName].filter(Boolean).join(" ");
      return [name, v.org].filter(Boolean).join(" — ") || "(empty)";
    }
  }
}

interface ConfigCardProps {
  config: SavedConfig;
  onRestore: (config: SavedConfig) => void;
  onDelete: (id: string) => void;
  onShare: (config: SavedConfig) => void;
}

function ConfigCard({ config, onRestore, onDelete, onShare }: ConfigCardProps) {
  const data = formatQRData(config.qrType, config.formData[config.qrType]);
  const isDesktop = useIsDesktop();

  const meta = (
    <div className="flex gap-2.5">
      <QRThumbnail config={config} />
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--ink-600)]">
            {config.qrType === "vcard" ? "vCard" : config.qrType}
          </span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {relativeTime(config.timestamp)}
          </span>
        </div>
        <span
          className="font-mono text-xs text-[var(--ink-700)] whitespace-nowrap overflow-hidden text-ellipsis"
          title={data}
        >
          {summarize(config)}
        </span>
      </div>
    </div>
  );

  if (!isDesktop) {
    /* Touch has no hover — actions live in an always-visible footer row */
    return (
      <div
        data-testid="history-card"
        className="flex flex-col gap-2 p-2.5 bg-[var(--paper-card)] border border-[var(--ink-200)] rounded-[5px]"
      >
        {meta}
        <div className="flex items-center gap-1.5 border-t border-[var(--ink-100)] pt-2">
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => onRestore(config)}>
            Restore
          </Button>
          <span className="flex-1" />
          <IconButton
            icon={Share2}
            variant="outline"
            title="Copy shareable link"
            onClick={() => onShare(config)}
          />
          <IconButton
            icon={Trash2}
            variant="outline"
            title="Delete"
            onClick={() => onDelete(config.id)}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="history-card"
      className="group relative flex flex-col p-2.5 bg-[var(--paper-card)] border border-[var(--ink-200)] rounded-[5px] transition-all duration-[140ms] hover:border-[var(--ink-400)] hover:shadow-[var(--shadow-sm)]"
    >
      {meta}
      <div className="absolute top-1.5 right-1.5 flex opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-[140ms] gap-1 bg-[var(--paper-card)] p-0.5 border border-[var(--border-hairline)] rounded-[3px] shadow-[var(--shadow-sm)]">
        <IconButton icon={RotateCcw} size="sm" title="Restore" onClick={() => onRestore(config)} />
        <IconButton
          icon={Share2}
          size="sm"
          title="Copy shareable link"
          onClick={() => onShare(config)}
        />
        <IconButton icon={Trash2} size="sm" title="Delete" onClick={() => onDelete(config.id)} />
      </div>
    </div>
  );
}

interface SavedConfigsProps {
  configs: SavedConfig[];
  onRestore: (config: SavedConfig) => void;
  onDelete: (id: string) => void;
  onShare: (config: SavedConfig) => void;
  onClearAll: () => void;
  onClose?: () => void;
}

/* History rail content — rendered inside the desktop sidebar and the
   mobile drawer. The scroll region and footer live here; the shell
   (aside vs drawer) is the parent's concern. */
export function SavedConfigs({
  configs,
  onRestore,
  onDelete,
  onShare,
  onClearAll,
  onClose,
}: SavedConfigsProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <span className="flex items-center gap-2">
          <span className="plico-label">History</span>
          {configs.length > 0 && <Badge variant="neutral">{configs.length}</Badge>}
        </span>
        <span className="flex items-center gap-1">
          {configs.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-[var(--text-muted)] bg-transparent border-none cursor-pointer px-1.5 py-1 rounded-[2px] transition-colors duration-[140ms] hover:text-[var(--signal-error-500)] hover:bg-[var(--ink-100)]"
            >
              Clear all
            </button>
          )}
          {onClose && <IconButton icon={X} title="Close history" onClick={onClose} />}
        </span>
      </div>

      {configs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center gap-2.5 px-6 pt-8 text-center">
          <QrCode className="w-7 h-7 text-[var(--ink-300)]" aria-hidden />
          <p className="text-[13px] text-[var(--text-muted)] leading-normal">
            No saved codes yet. Downloading a code saves its settings here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-2">
          {configs.map((config) => (
            <ConfigCard
              key={config.id}
              config={config}
              onRestore={onRestore}
              onDelete={onDelete}
              onShare={onShare}
            />
          ))}
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-[var(--border-hairline)]">
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-muted)]">
          Saved in this browser only
        </span>
      </div>
    </div>
  );
}
