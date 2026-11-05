"use client";

import { useState, type ReactNode } from "react";
import { formatDistanceStrict } from "date-fns";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Building2, Download, MessageSquare, Wrench } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNow } from "@/hooks/use-now";
import { errorMessage } from "@/lib/agent";
import { downloadFile } from "@/lib/download";
import {
  TICKET_STATUSES,
  TICKET_STATUS_FILTERS,
  type TicketListItem,
  type TicketStatus,
  type TicketStatusFilter,
  ticketsToCsv,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";
import {
  CategoryLabel,
  CreatedByMarker,
  PriorityBadge,
} from "./ticket-badges";

const STATUS_ITEMS = Object.fromEntries(
  Object.entries(TICKET_STATUSES).map(([k, s]) => [k, s.label]),
) as Record<TicketStatus, string>;

export function TicketsView() {
  const [filter, setFilter] = useState<TicketStatusFilter>("all");
  const now = useNow(60_000);

  // Unfiltered list drives the per-status counts; Convex dedupes it when filter is "all".
  const all = useQuery(api.tickets.list, {});
  const tickets = useQuery(
    api.tickets.list,
    filter === "all" ? {} : { status: filter },
  );

  const counts = all && {
    all: all.length,
    open: all.filter((t) => t.status === "open").length,
    in_progress: all.filter((t) => t.status === "in_progress").length,
    resolved: all.filter((t) => t.status === "resolved").length,
  };
  const aiCount = all?.filter((t) => t.createdBy === "agent").length;

  function exportCsv() {
    if (!tickets) return;
    const date = new Date().toISOString().slice(0, 10);
    // BOM so Excel opens umlauts (München, Köln…) correctly.
    downloadFile(`tickets-${filter}-${date}.csv`, "\uFEFF" + ticketsToCsv(tickets), "text/csv;charset=utf-8");
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight">Tickets</h1>
          {counts && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {counts.all}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {aiCount !== undefined && aiCount > 0 && (
            <p className="hidden text-xs text-muted-foreground sm:block">
              <span className="font-medium text-violet-700">{aiCount}</span>{" "}
              opened by the AI agent from tenant messages
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!tickets || tickets.length === 0}
            title="Download the tickets in this view as CSV"
          >
            <Download />
            Export CSV
          </Button>
        </div>
      </header>

      <div className="shrink-0 border-b px-3 py-2.5 md:px-5">
        <div
          role="tablist"
          aria-label="Filter by status"
          className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1"
        >
          {TICKET_STATUS_FILTERS.map((f) => {
            const active = filter === f.value;
            const count = counts?.[f.value];
            return (
              <button
                key={f.value}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900",
                )}
              >
                {f.value !== "all" && (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      TICKET_STATUSES[f.value].dot,
                    )}
                  />
                )}
                {f.label}
                {count !== undefined && (
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-white/70" : "text-zinc-400",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/40">
        {tickets === undefined ? (
          <TableSkeleton />
        ) : tickets.length === 0 ? (
          <EmptyState filtered={filter !== "all"} />
        ) : (
          <div className="p-3 md:p-5">
            <div className="overflow-hidden rounded-xl border bg-white shadow-xs">
              <Table className="min-w-[980px]">
                <TableHeader className="bg-zinc-50/80">
                  <TableRow className="hover:bg-transparent">
                    <Th className="w-[34%] pl-4">Ticket</Th>
                    <Th>Unit</Th>
                    <Th>Contact</Th>
                    <Th>Category</Th>
                    <Th>Priority</Th>
                    <Th>Created</Th>
                    <Th className="pr-4">Status</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TicketRow key={t._id} ticket={t} now={now} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Th({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <TableHead
      className={cn(
        "h-9 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function TicketRow({ ticket: t, now }: { ticket: TicketListItem; now: number }) {
  const setStatus = useMutation(api.tickets.setStatus);
  const resolved = t.status === "resolved";

  async function changeStatus(status: TicketStatus) {
    if (status === t.status) return;
    try {
      await setStatus({ ticketId: t._id, status });
      toast.success(`Ticket marked ${TICKET_STATUSES[status].label.toLowerCase()}`, {
        description: t.title,
      });
    } catch (err) {
      toast.error("Couldn't update ticket", { description: errorMessage(err) });
    }
  }

  const title = (
    <span
      className={cn(
        "text-[13px] font-medium",
        resolved ? "text-zinc-500" : "text-zinc-900",
      )}
    >
      {t.title}
    </span>
  );

  return (
    <TableRow className="group align-top">
      <TableCell className="max-w-0 py-3 pl-4 whitespace-normal">
        <div className="flex items-center gap-1.5">
          {t.conversationId ? (
            <Link
              href={`/inbox/${t.conversationId}`}
              className="min-w-0 truncate hover:underline"
              title="Open conversation"
            >
              {title}
            </Link>
          ) : (
            <span className="min-w-0 truncate">{title}</span>
          )}
          <CreatedByMarker createdBy={t.createdBy} compact />
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {t.description}
        </p>
      </TableCell>
      <TableCell className="py-3">
        {t.unitLabel || t.buildingName ? (
          <div className="text-[13px]">
            <div className="font-medium tabular-nums text-zinc-800">
              {t.unitLabel ? `Unit ${t.unitLabel}` : "—"}
            </div>
            {t.buildingName && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="size-3 shrink-0 text-zinc-400" />
                <span className="max-w-40 truncate">{t.buildingName}</span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-zinc-300">—</span>
        )}
      </TableCell>
      <TableCell className="py-3">
        {t.contactName ? (
          <div className="text-[13px] text-zinc-800">
            <div className="max-w-40 truncate">{t.contactName}</div>
            {t.conversationId && (
              <Link
                href={`/inbox/${t.conversationId}`}
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-zinc-900"
              >
                <MessageSquare className="size-3" />
                Conversation
              </Link>
            )}
          </div>
        ) : (
          <span className="text-zinc-300">—</span>
        )}
      </TableCell>
      <TableCell className="py-3">
        <CategoryLabel category={t.category} />
      </TableCell>
      <TableCell className="py-3">
        <PriorityBadge priority={t.priority} />
      </TableCell>
      <TableCell className="py-3">
        <div className="flex flex-col items-start gap-1">
          <CreatedByMarker createdBy={t.createdBy} />
          <span
            className="text-[11px] tabular-nums text-zinc-400"
            title={new Date(t._creationTime).toLocaleString()}
          >
            {formatRelative(t._creationTime, now)}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2.5 pr-4">
        <Select
          items={STATUS_ITEMS}
          value={t.status}
          onValueChange={(v) => v && changeStatus(v as TicketStatus)}
        >
          <SelectTrigger size="sm" className="h-7 w-36 bg-white text-xs">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                TICKET_STATUSES[t.status].dot,
              )}
            />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TICKET_STATUSES) as TicketStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                <span
                  className={cn("size-2 rounded-full", TICKET_STATUSES[s].dot)}
                />
                {TICKET_STATUSES[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}

function formatRelative(ts: number, now: number): string {
  if (now - ts < 60_000) return "just now";
  return formatDistanceStrict(ts, now, { addSuffix: true });
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <Wrench className="size-5" />
      </div>
      <p className="mt-3 text-sm font-medium">
        {filtered ? "No tickets with this status" : "No tickets yet"}
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {filtered
          ? "Try another filter."
          : "When a tenant reports a defect, the AI agent opens a maintenance ticket here."}
      </p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-3 md:p-5">
      <div className="space-y-px overflow-hidden rounded-xl border bg-white">
        <Skeleton className="h-9 rounded-none" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
