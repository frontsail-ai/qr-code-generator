import type {
  EmailFormData,
  FormDataMap,
  PhoneFormData,
  QRType,
  TextFormData,
  URLFormData,
  VCardFormData,
} from "../types";

type FormatterMap = {
  [K in QRType]: (data: FormDataMap[K]) => string;
};

const formatters: FormatterMap = {
  url: (data: URLFormData) => {
    const url = (data.url || "").trim();
    if (!url) return "";
    if (!url.match(/^https?:\/\//i)) {
      return `https://${url}`;
    }
    return url;
  },

  email: (data: EmailFormData) => {
    const { to, subject, body } = data;
    if (!to) return "";
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const queryString = params.toString();
    return `mailto:${to}${queryString ? `?${queryString}` : ""}`;
  },

  phone: (data: PhoneFormData) => {
    const number = (data.number || "").replace(/\s+/g, "");
    return number ? `tel:${number}` : "";
  },

  text: (data: TextFormData) => data.content || "",

  vcard: (data: VCardFormData) => {
    const lines = ["BEGIN:VCARD", "VERSION:3.0"];

    if (data.firstName || data.lastName) {
      lines.push(`N:${data.lastName || ""};${data.firstName || ""}`);
      lines.push(
        `FN:${[data.firstName, data.lastName].filter(Boolean).join(" ")}`,
      );
    }

    if (data.org) lines.push(`ORG:${data.org}`);
    if (data.title) lines.push(`TITLE:${data.title}`);
    if (data.phone) lines.push(`TEL:${data.phone}`);
    if (data.email) lines.push(`EMAIL:${data.email}`);
    if (data.website) {
      const url = data.website.match(/^https?:\/\//i)
        ? data.website
        : `https://${data.website}`;
      lines.push(`URL:${url}`);
    }

    lines.push("END:VCARD");
    return lines.join("\n");
  },
};

export function formatQRData<K extends QRType>(
  type: K,
  data: FormDataMap[K],
): string {
  const formatter = formatters[type];
  return formatter ? formatter(data) : "";
}
