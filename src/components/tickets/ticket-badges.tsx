import { Sparkles, UserRound } from "lucide-react";
import {
  CATEGORIES,
  PRIORITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";

const pill =
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority;
  className?: string;
}) {
  const p = PRIORITIES[priority];
  return <span className={cn(pill, p.badge, className)}>{p.label}</span>;
}

export function TicketStatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  const s = TICKET_STATUSES[status];
  return (
    <span className={cn(pill, "gap-1.5", s.badge, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function CategoryLabel({
  category,
  className,
}: {
  category: TicketCategory;
  className?: string;
}) {
  const c = CATEGORIES[category];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs whitespace-nowrap text-zinc-600",
        className,
      )}
    >
      <Icon className="size-3 shrink-0 text-zinc-400" />
      {c.label}
    </span>
  );
}

/** "AI" / "Staff" origin marker. */
export function CreatedByMarker({
  createdBy,
  compact,
}: {
  createdBy: "agent" | "staff";
  compact?: boolean;
}) {
  if (createdBy === "agent") {
    return (
      <span
        className="inline-flex h-4.5 shrink-0 items-center gap-0.5 rounded bg-violet-50 px-1 text-[10px] font-semibold tracking-wide text-violet-700 ring-1 ring-violet-600/20 ring-inset"
        title="Created by the AI agent"
      >
        <Sparkles className="size-2.5" />
        AI
      </span>
    );
  }
  if (compact) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
      <UserRound className="size-3 text-zinc-400" />
      Staff
    </span>
  );
}
