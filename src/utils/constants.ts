import type {
  CornerDotType,
  CornerSquareType,
  Customization,
  DotType,
  FormDataMap,
  GradientOption,
  QRTypeOption,
  StyleOption,
} from "../types";

export const DOT_TYPES: StyleOption<DotType>[] = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "dots", label: "Dots" },
  { value: "classy", label: "Classy" },
  { value: "classy-rounded", label: "Classy Rounded" },
  { value: "extra-rounded", label: "Extra Rounded" },
];

export const CORNER_SQUARE_TYPES: StyleOption<CornerSquareType>[] = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
  { value: "extra-rounded", label: "Rounded" },
];

export const CORNER_DOT_TYPES: StyleOption<CornerDotType>[] = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
];

export const QR_TYPES: QRTypeOption[] = [
  { value: "url", label: "URL", icon: "link" },
  { value: "email", label: "Email", icon: "mail" },
  { value: "phone", label: "Phone", icon: "phone" },
  { value: "text", label: "Text", icon: "type" },
  { value: "vcard", label: "vCard", icon: "user" },
];

export const PRESET_COLORS: string[] = [
  "#000000",
  "#FFFFFF",
  "#1E40AF",
  "#DC2626",
  "#16A34A",
  "#7C3AED",
  "#EA580C",
  "#0891B2",
];

export const GRADIENT_TYPES: GradientOption[] = [
  { value: "none", label: "Solid" },
  { value: "linear-bl-tr", label: "↗", title: "Bottom-left to top-right" },
  { value: "linear-tl-br", label: "↘", title: "Top-left to bottom-right" },
  { value: "radial", label: "◉", title: "Radial" },
];

export const DEFAULT_CUSTOMIZATION: Customization = {
  foregroundColor: "#000000",
  foregroundColor2: "#7C3AED",
  gradientType: "none",
  backgroundColor: "#FFFFFF",
  dotType: "square",
  cornerSquareType: "square",
  cornerDotType: "square",
  logo: null,
};

export const DEFAULT_FORM_DATA: FormDataMap = {
  url: { url: "" },
  email: { to: "", subject: "", body: "" },
  phone: { number: "" },
  text: { content: "" },
  vcard: {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    org: "",
    title: "",
    website: "",
  },
};
