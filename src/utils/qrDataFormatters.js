const formatters = {
  url: (data) => {
    const url = (data.url || "").trim();
    if (!url) return "";
    if (!url.match(/^https?:\/\//i)) {
      return `https://${url}`;
    }
    return url;
  },

  email: (data) => {
    const { to, subject, body } = data;
    if (!to) return "";
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const queryString = params.toString();
    return `mailto:${to}${queryString ? `?${queryString}` : ""}`;
  },

  phone: (data) => {
    const number = (data.number || "").replace(/\s+/g, "");
    return number ? `tel:${number}` : "";
  },

  text: (data) => data.content || "",

  vcard: (data) => {
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

export function formatQRData(type, data) {
  return formatters[type]?.(data) || "";
}
