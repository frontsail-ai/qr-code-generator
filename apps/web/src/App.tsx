import { Check, ImagePlus, Link as LinkIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConsentBanner } from "./components/ConsentBanner";
import { CustomizationPanel } from "./components/customization";
import { EmailForm, PhoneForm, TextForm, URLForm, VCardForm } from "./components/forms";
import { Header } from "./components/Header";
import { QRPreview } from "./components/QRPreview";
import { SavedConfigs } from "./components/SavedConfigs";
import { TypeSelector } from "./components/TypeSelector";
import { SectionLabel } from "./components/ui";
import { useAnalyticsConsent } from "./hooks/useAnalyticsConsent";
import { useIsDesktop } from "./hooks/useMediaQuery";
import { useLogoIntake } from "./hooks/useLogoIntake";
import { useSavedConfigs } from "./hooks/useSavedConfigs";
import type { Customization, FormDataMap, QRType, SavedConfig } from "@frontsail/qr-core";
import {
  decodeDesignFromUrl,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_FORM_DATA,
  encodeDesignToUrl,
  formatQRData,
} from "@frontsail/qr-core";

// Decode shared design from URL hash once at module load (before React mounts).
// This avoids StrictMode double-mount issues where the hash would be consumed
// on the first mount and missing on the second.
const sharedDesign = decodeDesignFromUrl(window.location.hash);

// The core codec is DOM-free, so the browser supplies the link's own base
const shareBaseUrl = () => `${window.location.origin}${window.location.pathname}`;

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

  const { savedConfigs, saveConfig, deleteConfig, clearAllConfigs } = useSavedConfigs();
  const setLogo = useCallback((logo: string | null) => {
    setCustomization((prev) => ({ ...prev, logo }));
  }, []);
  const { error: logoError, acceptFile: acceptLogoFile, removeLogo } = useLogoIntake(setLogo);
  const { decision: consentDecision, setEnabled: setConsentEnabled } = useAnalyticsConsent();
  /* How much room the consent bar is currently stealing from the bottom of the
     viewport. Zero once it is dismissed. */
  const [consentInset, setConsentInset] = useState(0);
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

  /* The hash is a live input, not just a boot parameter. Opening a share link
     from a tab that already has the app in it only changes the fragment, so
     the browser reuses the document: nothing re-runs the module-scope decode
     above and nothing re-mounts, which would leave the shared design
     unapplied and its hash stranded in the address bar. Consuming it here on
     every `hashchange` makes a share link behave the same whether it opens
     cold or in place. */
  useEffect(() => {
    /* Reads the hash, strips it, and hands back whatever it encoded. The
       hash goes either way: a link that has been applied is stale, and one
       that fails to decode is junk. `search` is preserved — campaign
       parameters on a shared link are not ours to discard. */
    const consumeShareHash = () => {
      if (!window.location.hash.startsWith("#s=")) return null;
      const design = decodeDesignFromUrl(window.location.hash);
      history.replaceState(null, "", window.location.pathname + window.location.search);
      return design;
    };

    // A cold load's design was already decoded at module scope; drop its hash
    consumeShareHash();

    const handleHashChange = () => {
      const design = consumeShareHash();
      if (!design) return;
      setQRType(design.qrType);
      setFormData(design.formData);
      setCustomization(design.customization);
      // The design replaces what is on screen, so say so rather than swapping it silently
      showToast("copy", "Shared design loaded");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [showToast]);

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
    const url = encodeDesignToUrl(qrType, formData, customization, shareBaseUrl());
    void navigator.clipboard
      .writeText(url)
      .then(() => showToast("copy", "Link copied to clipboard"));
  }, [qrType, formData, customization, showToast]);

  const handleShareConfig = useCallback(
    (config: SavedConfig) => {
      const url = encodeDesignToUrl(
        config.qrType,
        config.formData,
        config.customization,
        shareBaseUrl(),
      );
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

  /* No type or size pre-filter here: the overlay above promised this file a
     home, so a rejection owes the same explanation the picker gives. The
     intake is the only thing allowed to decide. */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      void acceptLogoFile(e.dataTransfer.files[0]);
    },
    [acceptLogoFile],
  );

  const historyPane = (
    <SavedConfigs
      configs={savedConfigs}
      onRestore={handleRestore}
      onDelete={deleteConfig}
      onShare={handleShareConfig}
      onClearAll={clearAllConfigs}
      analyticsEnabled={consentDecision === "granted"}
      onAnalyticsChange={setConsentEnabled}
    />
  );

  return (
    <div
      className="min-h-screen bg-[var(--surface-page)] flex flex-col"
      style={{ "--consent-inset": `${consentInset}px` } as React.CSSProperties}
    >
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
            <div className="w-[264px] h-[calc(100vh-3.5rem-var(--consent-inset))] sticky top-14">
              {historyPane}
            </div>
          </aside>
        )}

        {/* Center canvas */}
        {/* The engineering grid covers the whole canvas on desktop; on mobile
            it stays behind the preview only (QRPreview draws it) so the
            controls below read against plain paper */}
        <main
          className={`${isDesktop ? "plico-grid" : "bg-[var(--surface-page)]"} flex-1 relative flex flex-col items-center lg:justify-center gap-[18px] min-w-0 px-4 py-6 lg:py-0 pb-[calc(6rem+var(--consent-inset))] lg:pb-[var(--consent-inset)]`}
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
              <CustomizationPanel
                customization={customization}
                onChange={setCustomization}
                logoError={logoError}
                onLogoFile={acceptLogoFile}
                onLogoRemove={removeLogo}
              />
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
            <div className="sticky top-14 h-[calc(100vh-3.5rem-var(--consent-inset))] overflow-y-auto p-5 flex flex-col gap-6">
              <div className="flex flex-col gap-2.5">
                <SectionLabel>01 — Type</SectionLabel>
                <TypeSelector value={qrType} onChange={setQRType} />
              </div>
              <div className="flex flex-col gap-2.5">
                <SectionLabel>02 — Content</SectionLabel>
                {renderForm()}
              </div>
              <CustomizationPanel
                customization={customization}
                onChange={setCustomization}
                logoError={logoError}
                onLogoFile={acceptLogoFile}
                onLogoRemove={removeLogo}
              />
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
              analyticsEnabled={consentDecision === "granted"}
              onAnalyticsChange={setConsentEnabled}
            />
          </div>
        </div>
      )}

      {/* Toast — lifted clear of the consent banner while that is on screen,
          which otherwise covers it on desktop (banner sits above at z-50) */}
      <div
        className={`fixed bottom-[calc(6rem+var(--consent-inset))] lg:bottom-[calc(1.5rem+var(--consent-inset))] left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 bg-[var(--ink-900)] text-[var(--paper-0)] text-[13px] font-medium rounded-[2px] shadow-[var(--shadow-lg)] flex items-center gap-2.5 transition-all duration-[220ms] ${
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

      {consentDecision === null && (
        <ConsentBanner
          onAccept={() => setConsentEnabled(true)}
          onDecline={() => setConsentEnabled(false)}
          onHeightChange={setConsentInset}
        />
      )}
    </div>
  );
}

export default App;
