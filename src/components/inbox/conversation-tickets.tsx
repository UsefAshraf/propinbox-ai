"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CategoryLabel,
  CreatedByMarker,
  PriorityBadge,
  TicketStatusBadge,
} from "@/components/tickets/ticket-badges";
import { useNow } from "@/hooks/use-now";
import { formatListTime } from "@/lib/inbox";
import { PRIORITIES, TICKET_STATUSES } from "@/lib/tickets";

const statusOrder = Object.keys(TICKET_STATUSES);

/** Maintenance tickets for this conversation / the contact's unit. Live: the agent's new tickets pop in. */
export function ConversationTickets({
  conversationId,
}: {
  conversationId: Id<"conversations">;
}) {
  const tickets = useQuery(api.tickets.forConversation, { conversationId });
  const now = useNow(60_000);

  const sorted = tickets
    ?.slice()
    .sort(
      (a, b) =>
        statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) ||
        PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank ||
        b._creationTime - a._creationTime,
    );

  return (
    <section className="space-y-2.5 border-b px-5 py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
          Tickets
          {sorted && sorted.length > 0 && (
            <span className="ml-1.5 tabular-nums text-zinc-300">
              {sorted.length}
            </span>
          )}
        </h4>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-0.5 text-[11px] text-zinc-400 hover:text-zinc-700"
        >
          All tickets
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      {sorted === undefined ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No maintenance tickets for this contact or unit.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((t) => (
            <li
              key={t._id}
              className="animate-in rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2.5 fade-in-0 slide-in-from-top-1"
            >
              <div className="flex items-start gap-1.5">
                <p
                  className={
                    t.status === "resolved"
                      ? "min-w-0 flex-1 text-[13px] leading-snug font-medium text-zinc-500 line-through decoration-zinc-300"
                      : "min-w-0 flex-1 text-[13px] leading-snug font-medium text-zinc-900"
                  }
                >
                  {t.title}
                </p>
                <CreatedByMarker createdBy={t.createdBy} compact />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <PriorityBadge priority={t.priority} />
                <TicketStatusBadge status={t.status} />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <CategoryLabel category={t.category} className="text-[11px]" />
                <span className="text-[11px] tabular-nums text-zinc-400">
                  {formatListTime(t._creationTime, now)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
