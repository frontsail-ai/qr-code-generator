import { ImagePlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConsentBanner } from "./components/ConsentBanner";
import { CustomizationPanel } from "./components/customization";
import { EmailForm, PhoneForm, TextForm, URLForm, VCardForm } from "./components/forms";
import { Header } from "./components/Header";
import { QRPreview } from "./components/QRPreview";
import { SavedConfigs } from "./components/SavedConfigs";
import { TypeSelector } from "./components/TypeSelector";
import { SectionLabel, Toast } from "./components/ui";
import { useAnalyticsConsent } from "./hooks/useAnalyticsConsent";
import { useDraft } from "./hooks/useDraft";
import { useIsDesktop } from "./hooks/useMediaQuery";
import { useLogoIntake } from "./hooks/useLogoIntake";
import { useSavedConfigs } from "./hooks/useSavedConfigs";
import { useToast } from "./hooks/useToast";
import { useUndo } from "./hooks/useUndo";
import type { FormDataMap, QRType, SaveConfigInput, SavedConfig } from "@frontsail/qr-core";
import { decodeDesignFromUrl, encodeDesignToUrl, formatQRData } from "@frontsail/qr-core";
import type { StorageFailure } from "./utils/safeStorage";

// Decode shared design from URL hash once at module load (before React mounts).
// This avoids StrictMode double-mount issues where the hash would be consumed
// on the first mount and missing on the second.
const sharedDesign = decodeDesignFromUrl(window.location.hash);

// The core codec is DOM-free, so the browser supplies the link's own base
const shareBaseUrl = () => `${window.location.origin}${window.location.pathname}`;

/* What a refused history write means for the user, in their terms. The design
   is still on screen and still downloadable; what is gone is the record of it. */
const SAVE_ERRORS: Record<StorageFailure, string> = {
  quota:
    "Browser storage is full, so this code was not added to history. The file still downloaded.",
  unavailable: "This browser is blocking storage, so history cannot keep this code.",
};

/* An undo gets its own wording because it fails at the worst possible moment —
   the user is already correcting a mistake, and "the file still downloaded" is
   no comfort when what they asked for was the design back. */
const UNDO_ERRORS: Record<StorageFailure, string> = {
  quota:
    "Browser storage is full, so that could not be put back. Delete a saved code and try again.",
  unavailable: "This browser is blocking storage, so that could not be put back.",
};

function App() {
  const {
    qrType,
    setQRType,
    formData,
    setFormData,
    customization,
    setCustomization,
    applyDesign,
    retryPersist,
    status: draftStatus,
  } = useDraft(sharedDesign);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { toast, toastVisible, showToast } = useToast();
  const { undoLabel, pushUndo, runUndo } = useUndo();

  const { savedConfigs, saveConfig, deleteConfig, clearAllConfigs, insertConfig, restoreConfigs } =
    useSavedConfigs();
  /* Sticky until the next mutation succeeds: a failed write is a standing fact
     about this browser, not a two-second event like a successful one. */
  const [historyError, setHistoryError] = useState<string | null>(null);
  const reportWrite = useCallback(
    (
      result: { ok: boolean; reason?: StorageFailure },
      messages: Record<StorageFailure, string> = SAVE_ERRORS,
    ) => {
      setHistoryError(result.ok ? null : messages[result.reason as StorageFailure]);
      return result.ok;
    },
    [],
  );
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

  /* What is on the canvas right now, kept in a ref rather than read from state
     by the handlers that need it. Three of the four things that overwrite a
     design (restore, a share link arriving, removing the logo) have to snapshot
     it first so "Undo" has somewhere to go back to; reading it through the
     closure instead would rebuild those handlers — and re-register the
     `hashchange` listener — on every keystroke. */
  const designRef = useRef<SaveConfigInput>({ qrType, formData, customization });
  useEffect(() => {
    designRef.current = { qrType, formData, customization };
  }, [qrType, formData, customization]);

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
      /* The design replaces what is on screen, so say so rather than swapping
         it silently — and hand back what it displaced. A link opened in a tab
         that already holds unsaved work is the one arrival the user did not
         choose the timing of. */
      const previous = designRef.current;
      applyDesign(design);
      pushUndo({
        kind: "share-load",
        text: "Shared design loaded",
        undo: () => applyDesign(previous),
      });
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [applyDesign, pushUndo]);

  const handleSave = useCallback(() => {
    // Only claim the save when there is something saved to claim
    if (!reportWrite(saveConfig({ qrType, formData, customization }))) return;
    showToast("save", "Saved to history");
    // Storage just proved it has room; a draft that failed earlier can go now
    retryPersist();
  }, [qrType, formData, customization, saveConfig, showToast, reportWrite, retryPersist]);

  /* Restoring is not destructive to history, but it is destructive to whatever
     was on the canvas — which, unlike a saved config, has no copy anywhere. */
  const handleRestore = useCallback(
    (config: SavedConfig) => {
      const previous = designRef.current;
      applyDesign(config);
      setDrawerOpen(false);
      /* Coalesced, an undo returns the canvas to what it held before the *first*
         restore — which is what someone clicking through several saved designs
         and then changing their mind actually wants back. */
      pushUndo({ kind: "restore", text: "Design restored", undo: () => applyDesign(previous) });
    },
    [applyDesign, pushUndo],
  );

  /* Removing history is also the one action that hands storage back, so a
     draft that did not fit before is worth attempting again after it. */
  const handleDelete = useCallback(
    (config: SavedConfig) => {
      const index = savedConfigs.findIndex((c) => c.id === config.id);
      // Nothing was deleted if the write bounced, so there is nothing to undo
      if (!reportWrite(deleteConfig(config.id))) return;
      retryPersist();
      pushUndo({
        kind: "delete",
        text: "Design deleted",
        pluralText: (count) => `${count} designs deleted`,
        undo: () => reportWrite(insertConfig(config, index), UNDO_ERRORS),
      });
    },
    [savedConfigs, deleteConfig, insertConfig, pushUndo, reportWrite, retryPersist],
  );

  const handleClearAll = useCallback(() => {
    const cleared = savedConfigs;
    if (!reportWrite(clearAllConfigs())) return;
    retryPersist();
    pushUndo({
      kind: "clear",
      text: `Cleared ${cleared.length} saved design${cleared.length === 1 ? "" : "s"}`,
      undo: () => reportWrite(restoreConfigs(cleared), UNDO_ERRORS),
    });
  }, [savedConfigs, clearAllConfigs, restoreConfigs, pushUndo, reportWrite, retryPersist]);

  /* The logo is the one input the app cannot reproduce for you: the file lives
     on your disk, and what the app holds is a data URL derived from it. Undo
     saves a trip back to the file picker. */
  const handleLogoRemove = useCallback(() => {
    const previous = designRef.current.customization.logo;
    removeLogo();
    if (!previous) return;
    pushUndo({ kind: "logo", text: "Logo removed", undo: () => setLogo(previous) });
  }, [removeLogo, setLogo, pushUndo]);

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

  /* One line about whether this design is being kept anywhere. The most recent
     failure wins: a history write the user just asked for outranks the standing
     state of the background draft. This is the `Note` channel, not the toast's
     action slot — a full disk is a condition to report, not an action to take
     back. */
  const notice = historyError
    ? { variant: "error" as const, message: historyError }
    : draftStatus
      ? { variant: draftStatus.variant, message: draftStatus.message }
      : null;

  const historyPane = (
    <SavedConfigs
      configs={savedConfigs}
      onRestore={handleRestore}
      onDelete={handleDelete}
      onShare={handleShareConfig}
      onClearAll={handleClearAll}
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
            notice={notice}
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
                onLogoRemove={handleLogoRemove}
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
                onLogoRemove={handleLogoRemove}
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
              onDelete={handleDelete}
              onShare={handleShareConfig}
              onClearAll={handleClearAll}
              onClose={() => setDrawerOpen(false)}
              analyticsEnabled={consentDecision === "granted"}
              onAnalyticsChange={setConsentEnabled}
            />
          </div>
        </div>
      )}

      <Toast toast={toast} toastVisible={toastVisible} undoLabel={undoLabel} onUndo={runUndo} />

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
