import { useCallback, useState } from "react";
import { CustomizationPanel } from "./components/customization";
import {
  EmailForm,
  PhoneForm,
  TextForm,
  URLForm,
  VCardForm,
} from "./components/forms";
import { Header } from "./components/Header";
import { QRPreview } from "./components/QRPreview";
import { SavedConfigs } from "./components/SavedConfigs";
import { TypeSelector } from "./components/TypeSelector";
import { useSavedConfigs } from "./hooks/useSavedConfigs";
import type { Customization, FormDataMap, QRType, SavedConfig } from "./types";
import { DEFAULT_CUSTOMIZATION, DEFAULT_FORM_DATA } from "./utils/constants";

function App() {
  const [qrType, setQRType] = useState<QRType>("url");
  const [formData, setFormData] = useState<FormDataMap>(DEFAULT_FORM_DATA);
  const [customization, setCustomization] = useState<Customization>(
    DEFAULT_CUSTOMIZATION,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const { savedConfigs, saveConfig, deleteConfig, clearAllConfigs } =
    useSavedConfigs();

  const updateFormData = <K extends QRType>(type: K, data: FormDataMap[K]) => {
    setFormData((prev) => ({
      ...prev,
      [type]: data,
    }));
  };

  const handleSave = useCallback(() => {
    saveConfig({
      qrType,
      formData,
      customization,
    });
  }, [qrType, formData, customization, saveConfig]);

  const handleRestore = useCallback((config: SavedConfig) => {
    setQRType(config.qrType);
    setFormData(config.formData);
    setCustomization(config.customization);
  }, []);

  const renderForm = () => {
    switch (qrType) {
      case "url":
        return (
          <URLForm
            data={formData.url}
            onChange={(data) => updateFormData("url", data)}
          />
        );
      case "email":
        return (
          <EmailForm
            data={formData.email}
            onChange={(data) => updateFormData("email", data)}
          />
        );
      case "phone":
        return (
          <PhoneForm
            data={formData.phone}
            onChange={(data) => updateFormData("phone", data)}
          />
        );
      case "text":
        return (
          <TextForm
            data={formData.text}
            onChange={(data) => updateFormData("text", data)}
          />
        );
      case "vcard":
        return (
          <VCardForm
            data={formData.vcard}
            onChange={(data) => updateFormData("vcard", data)}
          />
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
    if (
      e.currentTarget === e.target ||
      !e.currentTarget.contains(e.relatedTarget as Node)
    ) {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left pane - History */}
        <aside
          className={`lg:flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 transition-all duration-300 ${
            sidebarOpen ? "lg:w-80" : "lg:w-0 lg:overflow-hidden"
          }`}
        >
          <div
            className={`p-4 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto transition-opacity duration-300 ${
              sidebarOpen ? "opacity-100" : "lg:opacity-0"
            }`}
          >
            <SavedConfigs
              configs={savedConfigs}
              onRestore={handleRestore}
              onDelete={deleteConfig}
              onClearAll={clearAllConfigs}
            />
          </div>
        </aside>

        {/* Main content */}
        <main
          className="flex-1 p-4 lg:p-6 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drop zone overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-gray-900/10 border-2 border-dashed border-gray-400 rounded-lg z-10 flex items-center justify-center pointer-events-none">
              <div className="bg-white px-6 py-4 rounded-lg shadow-lg text-center">
                <svg
                  className="w-12 h-12 mx-auto text-gray-400 mb-2"
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
                <p className="text-gray-700 font-medium">
                  Drop image to set as logo
                </p>
              </div>
            </div>
          )}

          <div className="max-w-lg mx-auto space-y-6">
            <QRPreview
              qrType={qrType}
              formData={formData}
              customization={customization}
              onSave={handleSave}
            />

            <TypeSelector value={qrType} onChange={setQRType} />

            <section className="bg-white rounded-xl p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Content
              </h2>
              {renderForm()}
            </section>

            <CustomizationPanel
              customization={customization}
              onChange={setCustomization}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
