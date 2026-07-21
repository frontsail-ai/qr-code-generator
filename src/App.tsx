import { Check, ImagePlus, Link as LinkIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CustomizationPanel } from "./components/customization";
import { EmailForm, PhoneForm, TextForm, URLForm, VCardForm } from "./components/forms";
import { Header } from "./components/Header";
import { QRPreview } from "./components/QRPreview";
import { SavedConfigs } from "./components/SavedConfigs";
import { TypeSelector } from "./components/TypeSelector";
import { SectionLabel } from "./components/ui";
import { useIsDesktop } from "./hooks/useMediaQuery";
import { useSavedConfigs } from "./hooks/useSavedConfigs";
import type { Customization, FormDataMap, QRType, SavedConfig } from "./types";
import { DEFAULT_CUSTOMIZATION, DEFAULT_FORM_DATA } from "./utils/constants";
import { formatQRData } from "./utils/qrDataFormatters";
import { decodeDesignFromUrl, encodeDesignToUrl } from "./utils/shareUrl";

// Decode shared design from URL hash once at module load (before React mounts).
// This avoids StrictMode double-mount issues where the hash would be consumed
// on the first mount and missing on the second.
const sharedDesign = decodeDesignFromUrl();

type ToastKind = "copy" | "save";

function App() {
  const [qrType, setQRType] = useState<QRType>(sharedDesign?.qrType ?? "url");
  const [formData, setFormData] = useState<FormDataMap>(
    sharedDesign?.formData ?? DEFAULT_FORM_DATA,
  );
  const [customization, setCustomization] = useState<Customization>(
    sharedDesign?.customization ?? DEFAULT_CUSTOMIZATION,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; text: string } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (window.location.hash.startsWith("#s=")) {
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const { savedConfigs, saveConfig, deleteConfig, clearAllConfigs } = useSavedConfigs();
  const isDesktop = useIsDesktop();

  const hasContent = useMemo(
    () => formatQRData(qrType, formData[qrType]) !== "",
    [qrType, formData],
  );

  const updateFormData = <K extends QRType>(type: K, data: FormDataMap[K]) => {
    setFormData((prev) => ({
      ...prev,
      [type]: data,
    }));
  };

  const showToast = useCallback((kind: ToastKind, text: string) => {
    setToast({ kind, text });
    setToastVisible(true);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 2000);
  }, []);

  const handleSave = useCallback(() => {
    saveConfig({
      qrType,
      formData,
      customization,
    });
    showToast("save", "Saved to history");
  }, [qrType, formData, customization, saveConfig, showToast]);

  const handleRestore = useCallback((config: SavedConfig) => {
    setQRType(config.qrType);
    setFormData(config.formData);
    setCustomization(config.customization);
    setDrawerOpen(false);
  }, []);

  const handleShare = useCallback(() => {
    const url = encodeDesignToUrl(qrType, formData, customization);
    void navigator.clipboard
      .writeText(url)
      .then(() => showToast("copy", "Link copied to clipboard"));
  }, [qrType, formData, customization, showToast]);

  const handleShareConfig = useCallback(
    (config: SavedConfig) => {
      const url = encodeDesignToUrl(config.qrType, config.formData, config.customization);
      void navigator.clipboard
        .writeText(url)
        .then(() => showToast("copy", "Link copied to clipboard"));
    },
    [showToast],
  );

  const renderForm = () => {
    switch (qrType) {
      case "url":
        return <URLForm data={formData.url} onChange={(data) => updateFormData("url", data)} />;
      case "email":
        return (
          <EmailForm data={formData.email} onChange={(data) => updateFormData("email", data)} />
        );
      case "phone":
        return (
          <PhoneForm data={formData.phone} onChange={(data) => updateFormData("phone", data)} />
        );
      case "text":
        return <TextForm data={formData.text} onChange={(data) => updateFormData("text", data)} />;
      case "vcard":
        return (
          <VCardForm data={formData.vcard} onChange={(data) => updateFormData("vcard", data)} />
        );
    }
  };

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only hide if leaving the main area entirely
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomization((prev) => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  const historyPane = (
    <SavedConfigs
      configs={savedConfigs}
      onRestore={handleRestore}
      onDelete={deleteConfig}
      onShare={handleShareConfig}
      onClearAll={clearAllConfigs}
    />
  );

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex flex-col">
      <Header
        onToggleSidebar={toggleSidebar}
        sidebarOpen={sidebarOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        hasContent={hasContent}
      />

      <div className="flex-1 flex min-h-0">
        {/* History rail — desktop */}
        {isDesktop && (
          <aside
            className={`flex flex-col shrink-0 bg-[var(--surface-card)] border-r border-[var(--border-hairline)] overflow-hidden transition-all duration-[220ms] ${
              sidebarOpen ? "w-[264px]" : "w-0 border-r-0"
            }`}
          >
            <div className="w-[264px] h-[calc(100vh-3.5rem)] sticky top-14">{historyPane}</div>
          </aside>
        )}

        {/* Center canvas */}
        <main
          className="plico-grid flex-1 relative flex flex-col items-center lg:justify-center gap-[18px] min-w-0 px-4 py-6 lg:py-0 pb-24 lg:pb-0"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <QRPreview
            qrType={qrType}
            formData={formData}
            customization={customization}
            onSave={handleSave}
            onShare={handleShare}
          />

          {/* Mobile-only: type + content + style, stacked under the preview */}
          {!isDesktop && (
            <div className="w-full max-w-lg flex flex-col gap-5">
              <TypeSelector value={qrType} onChange={setQRType} />
              <div className="flex flex-col gap-2.5">
                <SectionLabel>02 — Content</SectionLabel>
                {renderForm()}
              </div>
              <CustomizationPanel customization={customization} onChange={setCustomization} />
            </div>
          )}

          {/* Drop zone overlay */}
          {isDraggingOver && (
            <div className="absolute inset-3 border-2 border-dashed border-[var(--crease-500)] rounded-[2px] bg-[color-mix(in_srgb,var(--crease-500)_7%,transparent)] z-10 flex items-center justify-center pointer-events-none">
              <div className="bg-[var(--paper-card)] border border-[var(--border-hairline)] rounded-[5px] shadow-[var(--shadow-lg)] px-7 py-5 flex flex-col items-center gap-2">
                <ImagePlus className="w-6 h-6 text-[var(--crease-500)]" aria-hidden />
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Drop image to set as logo
                </div>
                <span className="font-mono text-[10px] tracking-[0.04em] uppercase text-[var(--text-muted)]">
                  PNG or JPG · under 2 MB
                </span>
              </div>
            </div>
          )}
        </main>

        {/* Inspector — desktop */}
        {isDesktop && (
          <aside className="w-[320px] shrink-0 bg-[var(--surface-card)] border-l border-[var(--border-hairline)]">
            <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-5 flex flex-col gap-6">
              <div className="flex flex-col gap-2.5">
                <SectionLabel>01 — Type</SectionLabel>
                <TypeSelector value={qrType} onChange={setQRType} />
              </div>
              <div className="flex flex-col gap-2.5">
                <SectionLabel>02 — Content</SectionLabel>
                {renderForm()}
              </div>
              <CustomizationPanel customization={customization} onChange={setCustomization} />
            </div>
          </aside>
        )}
      </div>

      {/* History drawer — mobile */}
      {!isDesktop && drawerOpen && (
        <div className="fixed inset-0 z-20">
          <button
            type="button"
            aria-label="Dismiss history"
            className="absolute inset-0 bg-[rgba(27,24,18,0.45)] border-none cursor-pointer"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute top-0 bottom-0 left-0 w-[320px] max-w-[85vw] bg-[var(--surface-card)] shadow-[var(--shadow-lg)] flex flex-col">
            <SavedConfigs
              configs={savedConfigs}
              onRestore={handleRestore}
              onDelete={deleteConfig}
              onShare={handleShareConfig}
              onClearAll={clearAllConfigs}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        className={`fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 bg-[var(--ink-900)] text-[var(--paper-0)] text-[13px] font-medium rounded-[2px] shadow-[var(--shadow-lg)] flex items-center gap-2.5 transition-all duration-[220ms] ${
          toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        {toast?.kind === "copy" ? (
          <LinkIcon className="w-[15px] h-[15px]" aria-hidden />
        ) : (
          <Check className="w-[15px] h-[15px]" aria-hidden />
        )}
        {toast?.text}
      </div>
    </div>
  );
}

export default App;
