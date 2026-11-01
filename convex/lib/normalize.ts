// Helpers for normalising sender handles so inbound messages thread consistently
// and match contacts (contacts store emails lowercased and phones in E.164).

export type Channel = "email" | "whatsapp" | "phone";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Best-effort E.164 normalisation:
 *  - strip everything except digits and a leading "+"
 *  - "00..." -> "+..."
 *  - "0..."  -> assume Germany, "+49..."
 *  - bare digits -> "+" prefix
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (hasPlus) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+49${digits.slice(1)}`;
  return `+${digits}`;
}

export function normalizeHandle(channel: Channel, raw: string): string {
  return channel === "email" ? normalizeEmail(raw) : normalizePhone(raw);
}

export const PREVIEW_LENGTH = 120;

export function makePreview(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1)}…` : flat;
}
