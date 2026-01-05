import { useState } from 'react';
import { Header } from './components/Header';
import { QRPreview } from './components/QRPreview';
import { TypeSelector } from './components/TypeSelector';
import { URLForm, EmailForm, PhoneForm, TextForm, VCardForm } from './components/forms';
import { CustomizationPanel } from './components/customization';
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

  const updateFormData = (type, data) => {
    setFormData((prev) => ({
      ...prev,
      [type]: data
    }));
  };

  const FormComponent = formComponents[qrType];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        <QRPreview
          qrType={qrType}
          formData={formData}
          customization={customization}
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
      </main>
    </div>
  );
}

export default App;
