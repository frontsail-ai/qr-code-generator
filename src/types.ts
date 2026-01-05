// QR Type definitions
export type QRType = "url" | "email" | "phone" | "text" | "vcard";

export interface QRTypeOption {
  value: QRType;
  label: string;
  icon: string;
}

// Dot and corner style types
export type DotType =
  | "square"
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "extra-rounded";

export type CornerSquareType = "square" | "dot" | "extra-rounded";

export type CornerDotType = "square" | "dot";

export type GradientType = "none" | "linear-bl-tr" | "linear-tl-br" | "radial";

export interface StyleOption<T extends string> {
  value: T;
  label: string;
}

export interface GradientOption {
  value: GradientType;
  label: string;
  title?: string;
}

// Form data types
export interface URLFormData {
  url: string;
}

export interface EmailFormData {
  to: string;
  subject: string;
  body: string;
}

export interface PhoneFormData {
  number: string;
}

export interface TextFormData {
  content: string;
}

export interface VCardFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  org: string;
  title: string;
  website: string;
}

export interface FormDataMap {
  url: URLFormData;
  email: EmailFormData;
  phone: PhoneFormData;
  text: TextFormData;
  vcard: VCardFormData;
}

// Customization types
export interface Customization {
  foregroundColor: string;
  foregroundColor2: string;
  gradientType: GradientType;
  backgroundColor: string;
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
  logo: string | null;
}

// Saved configuration types
export interface SavedConfig {
  id: string;
  timestamp: string;
  qrType: QRType;
  formData: FormDataMap;
  customization: Customization;
}

export interface SaveConfigInput {
  qrType: QRType;
  formData: FormDataMap;
  customization: Customization;
}

// Component prop types
export interface FormComponentProps<T> {
  data: T;
  onChange: (data: T) => void;
}
