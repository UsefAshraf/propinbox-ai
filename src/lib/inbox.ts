import type { FunctionReturnType } from "convex/server";
import {
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isSameYear,
} from "date-fns";
import { Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import type { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";

export type Channel = Doc<"conversations">["channel"];
export type ConversationStatus = Doc<"conversations">["status"];
export type StatusFilter = ConversationStatus | "all";
export type ContactRole = Doc<"contacts">["role"];

export type ConversationListItem = FunctionReturnType<
  typeof api.conversations.list
>[number];
export type ConversationDetail = NonNullable<
  FunctionReturnType<typeof api.conversations.get>
>;
export type ContactDetail = NonNullable<ConversationDetail["contact"]>;

export const CHANNELS: Record<
  Channel,
  { label: string; icon: LucideIcon; className: string }
> = {
  email: { label: "Email", icon: Mail, className: "text-sky-600" },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    className: "text-emerald-600",
  },
  phone: { label: "Phone", icon: Phone, className: "text-violet-600" },
};

export const STATUSES: Record<
  ConversationStatus,
  { label: string; dot: string; badge: string }
> = {
  open: {
    label: "Open",
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  awaiting_approval: {
    label: "Awaiting approval",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/25",
  },
  needs_human: {
    label: "Needs human",
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
  },
  closed: {
    label: "Closed",
    dot: "bg-zinc-400",
    badge: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  },
};

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "awaiting_approval", label: "Awaiting approval" },
  { value: "needs_human", label: "Needs human" },
  { value: "closed", label: "Closed" },
];

export const ROLE_LABELS: Record<ContactRole, string> = {
  tenant: "Tenant",
  owner: "Owner",
  vendor: "Vendor",
};

export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_TONES = [
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-800",
  "bg-orange-100 text-orange-800",
];

/** Stable pastel tone per name so avatars are recognisable across panes. */
export function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function formatEur(cents: number): string {
  return eur.format(cents / 100);
}

/** Compact inbox timestamp: "now", "5m", "3h", "Tue", "12 Mar", "12 Mar 2024". */
export function formatListTime(ts: number, now: number): string {
  const minutes = differenceInMinutes(now, ts);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  const days = differenceInCalendarDays(now, ts);
  if (days < 7) return format(ts, "EEE");
  return isSameYear(ts, now) ? format(ts, "d MMM") : format(ts, "d MMM yyyy");
}

export function formatDayDivider(ts: number, now: number): string {
  const days = differenceInCalendarDays(now, ts);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return isSameYear(ts, now)
    ? format(ts, "EEEE, d MMMM")
    : format(ts, "d MMMM yyyy");
}
