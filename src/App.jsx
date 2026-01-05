import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { QRPreview } from './components/QRPreview';
import { TypeSelector } from './components/TypeSelector';
import { URLForm, EmailForm, PhoneForm, TextForm, VCardForm } from './components/forms';
import { CustomizationPanel } from './components/customization';
import { SavedConfigs } from './components/SavedConfigs';
import { useSavedConfigs } from './hooks/useSavedConfigs';
import { DEFAULT_CUSTOMIZATION, DEFAULT_FORM_DATA } from './utils/constants';

const formComponents = {
  url: URLForm,
  email: EmailForm,
  phone: PhoneForm,
  text: TextForm,
  vcard: VCardForm
};

function App() {
  const [qrType, setQRType] = useState('url');
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [customization, setCustomization] = useState(DEFAULT_CUSTOMIZATION);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { savedConfigs, saveConfig, deleteConfig, clearAllConfigs } = useSavedConfigs();

  const updateFormData = (type, data) => {
    setFormData((prev) => ({
      ...prev,
      [type]: data
    }));
  };

  const handleSave = useCallback(() => {
    saveConfig({
      qrType,
      formData,
      customization
    });
  }, [qrType, formData, customization, saveConfig]);

  const handleRestore = useCallback((config) => {
    setQRType(config.qrType);
    setFormData(config.formData);
    setCustomization(config.customization);
  }, []);

  const FormComponent = formComponents[qrType];

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left pane - History */}
        <aside
          className={`lg:flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 transition-all duration-300 ${
            sidebarOpen ? 'lg:w-80' : 'lg:w-0 lg:overflow-hidden'
          }`}
        >
          <div
            className={`p-4 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto transition-opacity duration-300 ${
              sidebarOpen ? 'opacity-100' : 'lg:opacity-0'
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
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-lg mx-auto space-y-6">
            <QRPreview
              qrType={qrType}
              formData={formData}
              customization={customization}
              onSave={handleSave}
            />

            <TypeSelector
              value={qrType}
              onChange={setQRType}
            />

            <section className="bg-white rounded-xl p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
              <FormComponent
                data={formData[qrType]}
                onChange={(data) => updateFormData(qrType, data)}
              />
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
