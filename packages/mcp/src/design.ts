import type {
  CornerDotType,
  CornerSquareType,
  Customization,
  DotType,
  FormDataMap,
  GradientType,
  QRType,
} from "@frontsail/qr-core";
import {
  CORNER_DOT_TYPES,
  CORNER_SQUARE_TYPES,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_FORM_DATA,
  DOT_TYPES,
  GRADIENT_TYPES,
  QR_TYPES,
  TRANSPARENT,
} from "@frontsail/qr-core";
import { z } from "zod";

/* Every enum below is derived from core's own option lists rather than
   retyped. The MCP surface then cannot drift from what the web app offers —
   adding a dot style in core exposes it here automatically, and removing one
   removes it here too. */
function values<T extends string>(options: readonly { value: T }[]): [T, ...T[]] {
  return options.map((o) => o.value) as [T, ...T[]];
}

export const QR_TYPE_VALUES = values<QRType>(QR_TYPES);
const DOT_TYPE_VALUES = values<DotType>(DOT_TYPES);
const CORNER_SQUARE_VALUES = values<CornerSquareType>(CORNER_SQUARE_TYPES);
const CORNER_DOT_VALUES = values<CornerDotType>(CORNER_DOT_TYPES);
const GRADIENT_VALUES = values<GradientType>(GRADIENT_TYPES);

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const hexColor = z
  .string()
  .regex(HEX_COLOR, "Must be a hex color such as #1B1812, #FFF or #1B1812FF.");

/* Background alone accepts the sentinel the web app uses for "no background".
   It travels through share links and history like any other color. */
const backgroundColor = z.union([
  z.literal(TRANSPARENT),
  z.string().regex(HEX_COLOR, `Must be a hex color such as #FFFFFF, or "${TRANSPARENT}".`),
]);

export const customizationSchema = z
  .object({
    foreground_color: hexColor.optional().describe("QR dot color. Default #1B1812."),
    foreground_color_2: hexColor
      .optional()
      .describe("Second gradient stop. Only used when gradient_type is not 'none'."),
    gradient_type: z
      .enum(GRADIENT_VALUES)
      .optional()
      .describe(
        "Foreground gradient. Anything other than 'none' also uses foreground_color_2, which " +
          "falls back to its default if you do not set it. Heads-up on the two linear values: " +
          "their names are rotated relative to what actually renders — 'linear-bl-tr' renders " +
          "top-left to bottom-right, and 'linear-tl-br' renders top-right to bottom-left. The " +
          "names are kept because they are encoded in existing share links.",
      ),
    background_color: backgroundColor
      .optional()
      .describe(`Background color, or "${TRANSPARENT}" for a transparent backdrop.`),
    dot_type: z.enum(DOT_TYPE_VALUES).optional().describe("Shape of the QR dots."),
    corner_square_type: z
      .enum(CORNER_SQUARE_VALUES)
      .optional()
      .describe(
        "Finder-square shape. Note 'extra-rounded' is the value the web app's picker labels " +
          "simply 'Rounded'; there is no separate 'rounded' value for corner squares.",
      ),
    corner_dot_type: z.enum(CORNER_DOT_VALUES).optional().describe("Finder-dot shape."),
    logo: z
      .string()
      .optional()
      .describe(
        "Logo to overlay in the center: a data: URI, or an absolute path to a local image file. " +
          "Excluded from share links.",
      ),
  })
  .describe("Visual options. Every field is optional and falls back to the web app's default.");

export const contentSchema = {
  content_type: z.enum(QR_TYPE_VALUES).describe("What the QR code encodes."),
  url: z
    .object({ url: z.string().min(1) })
    .optional()
    .describe("Required when content_type is 'url'. A bare host gets an https:// prefix."),
  email: z
    .object({
      to: z.string().min(1),
      subject: z.string().optional(),
      body: z.string().optional(),
    })
    .optional()
    .describe("Required when content_type is 'email'."),
  phone: z
    .object({ number: z.string().min(1) })
    .optional()
    .describe("Required when content_type is 'phone'."),
  text: z
    .object({ content: z.string().min(1) })
    .optional()
    .describe("Required when content_type is 'text'."),
  vcard: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      org: z.string().optional(),
      title: z.string().optional(),
      website: z.string().optional(),
    })
    .optional()
    .describe("Required when content_type is 'vcard'. At least one field must be filled."),
};

export interface DesignInput {
  content_type: QRType;
  url?: { url: string };
  email?: { to: string; subject?: string; body?: string };
  phone?: { number: string };
  text?: { content: string };
  vcard?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    org?: string;
    title?: string;
    website?: string;
  };
  customization?: z.infer<typeof customizationSchema>;
}

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

/* Builds the full FormDataMap core expects: the requested type filled from the
   caller's input, every other type left at its default. */
export function toFormData(input: DesignInput): FormDataMap {
  const type = input.content_type;
  const provided = input[type];
  if (!provided) {
    throw new InputError(
      `content_type is "${type}" but no "${type}" object was provided. ` +
        `Pass the ${type} fields under a "${type}" key.`,
    );
  }

  if (type === "vcard") {
    const vcard = provided as NonNullable<DesignInput["vcard"]>;
    if (!Object.values(vcard).some((v) => typeof v === "string" && v.trim() !== "")) {
      throw new InputError("vcard was provided but every field is empty. Fill at least one.");
    }
  }

  return {
    ...DEFAULT_FORM_DATA,
    [type]: { ...DEFAULT_FORM_DATA[type], ...provided },
  };
}

export function toCustomization(
  input: DesignInput["customization"],
  logo: string | null = null,
): Customization {
  return {
    ...DEFAULT_CUSTOMIZATION,
    ...(input?.foreground_color ? { foregroundColor: input.foreground_color } : {}),
    ...(input?.foreground_color_2 ? { foregroundColor2: input.foreground_color_2 } : {}),
    ...(input?.gradient_type ? { gradientType: input.gradient_type } : {}),
    ...(input?.background_color ? { backgroundColor: input.background_color } : {}),
    ...(input?.dot_type ? { dotType: input.dot_type } : {}),
    ...(input?.corner_square_type ? { cornerSquareType: input.corner_square_type } : {}),
    ...(input?.corner_dot_type ? { cornerDotType: input.corner_dot_type } : {}),
    logo,
  };
}
