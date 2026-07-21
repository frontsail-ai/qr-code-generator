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
  { value: "classy-rounded", label: "Classy Rnd" },
  { value: "extra-rounded", label: "Extra Rnd" },
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

// Plico-tuned palettes: ink instead of pure black, muted technical hues.
export const PRESET_COLORS: string[] = [
  "#1B1812",
  "#FFFFFF",
  "#7A7263",
  "#2C4A8A",
  "#2C7A8A",
  "#2F7D5B",
  "#5B4A8A",
  "#8A3A6B",
  "#A63D30",
  "#A9702F",
];

// Background presets favor warm papers alongside the deep hues
export const BG_PRESET_COLORS: string[] = [
  "#1B1812",
  "#FFFFFF",
  "#F7F3E9",
  "#F6EEDD",
  "#E3ECFB",
  "#2C4A8A",
  "#2C7A8A",
  "#2F7D5B",
  "#5B4A8A",
  "#A63D30",
];

export const GRADIENT_TYPES: GradientOption[] = [
  { value: "none", label: "Solid" },
  { value: "linear-bl-tr", label: "↗", title: "Bottom-left to top-right" },
  { value: "linear-tl-br", label: "↘", title: "Top-left to bottom-right" },
  { value: "radial", label: "◉", title: "Radial" },
];

export const DEFAULT_CUSTOMIZATION: Customization = {
  foregroundColor: "#1B1812",
  foregroundColor2: "#2C4A8A",
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
