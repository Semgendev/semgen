import { z } from "zod";

// "Mes couleurs": "#RRGGBB", newest first, at most 24 (also enforced by the database).
export const MAX_CUSTOM_COLORS = 24;
export const customColorsSchema = z
  .array(z.string().regex(/^#[0-9A-F]{6}$/, "6 digit hex in capitals"))
  .max(MAX_CUSTOM_COLORS);
