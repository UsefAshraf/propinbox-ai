import type { FunctionReturnType } from "convex/server";
import {
  Bug,
  Droplets,
  Flame,
  Hammer,
  Plug,
  WashingMachine,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";

export type Ticket = Doc<"tickets">;
export type TicketStatus = Ticket["status"];
export type TicketPriority = Ticket["priority"];
export type TicketCategory = Ticket["category"];
export type TicketStatusFilter = TicketStatus | "all";

export type TicketListItem = FunctionReturnType<typeof api.tickets.list>[number];

export const TICKET_STATUSES: Record<
  TicketStatus,
  { label: string; dot: string; badge: string }
> = {
  open: {
    label: "Open",
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  in_progress: {
    label: "In progress",
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
  resolved: {
    label: "Resolved",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
};

export const TICKET_STATUS_FILTERS: {
  value: TicketStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

export const PRIORITIES: Record<
  TicketPriority,
  { label: string; badge: string; rank: number }
> = {
  urgent: {
    label: "Urgent",
    badge: "bg-red-50 text-red-700 ring-red-600/25",
    rank: 0,
  },
  high: {
    label: "High",
    badge: "bg-orange-50 text-orange-700 ring-orange-600/25",
    rank: 1,
  },
  medium: {
    label: "Medium",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/25",
    rank: 2,
  },
  low: {
    label: "Low",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    rank: 3,
  },
};

export const CATEGORIES: Record<
  TicketCategory,
  { label: string; icon: LucideIcon }
> = {
  plumbing: { label: "Plumbing", icon: Droplets },
  electrical: { label: "Electrical", icon: Plug },
  heating: { label: "Heating", icon: Flame },
  appliance: { label: "Appliance", icon: WashingMachine },
  structural: { label: "Structural", icon: Hammer },
  pest: { label: "Pest", icon: Bug },
  other: { label: "Other", icon: Wrench },
};

const CSV_COLUMNS: [header: string, value: (t: TicketListItem) => unknown][] = [
  ["id", (t) => t._id],
  ["created_at", (t) => new Date(t._creationTime).toISOString()],
  ["title", (t) => t.title],
  ["description", (t) => t.description],
  ["category", (t) => t.category],
  ["priority", (t) => t.priority],
  ["status", (t) => t.status],
  ["unit", (t) => t.unitLabel],
  ["building", (t) => t.buildingName],
  ["contact", (t) => t.contactName],
  ["created_by", (t) => t.createdBy],
];

/** Serialises tickets as RFC 4180 CSV (quoted fields, doubled quotes), ready for Excel / Sheets. */
export function ticketsToCsv(tickets: TicketListItem[]): string {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = tickets.map((t) => CSV_COLUMNS.map(([, value]) => cell(value(t))).join(","));
  return [CSV_COLUMNS.map(([header]) => header).join(","), ...rows].join("\r\n");
}
