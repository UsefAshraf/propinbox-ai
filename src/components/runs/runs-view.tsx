"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Bot, ChevronRight, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNow } from "@/hooks/use-now";
import { runHref } from "@/lib/agent";
import { CHANNELS } from "@/lib/inbox";
import {
  RUN_STATUSES,
  RUN_STATUS_FILTERS,
  formatDuration,
  formatRelativeTime,
  formatTokens,
  runTokens,
  type RunFeedbackFilter,
  type RunListItem,
  type RunStatusFilter,
} from "@/lib/runs";
import { cn } from "@/lib/utils";
import { ConfidencePill, FeedbackIcon, RunStatusBadge, ToolChip } from "./run-badges";
import { RunsStats } from "./runs-stats";

const FEEDBACK_FILTERS: { value: RunFeedbackFilter; label: string; icon?: ReactNode }[] = [
  { value: "any", label: "Any" },
  { value: "unresolved", label: "Unresolved", icon: <ThumbsDown className="size-3 text-rose-500" /> },
  { value: "down", label: "All", icon: <ThumbsDown className="size-3" /> },
  { value: "up", label: "Good", icon: <ThumbsUp className="size-3" /> },
];

export function RunsView() {
  const [status, setStatus] = useState<RunStatusFilter>("all");
  const [feedback, setFeedback] = useState<RunFeedbackFilter>("any");
  const now = useNow(1_000);

  const stats = useQuery(api.agentRuns.stats, {});
  const runs = useQuery(api.agentRuns.list, {
    status: status === "all" ? undefined : status,
    feedback: feedback === "any" ? undefined : feedback,
  });

  const filterKey = `${status}:${feedback}`;
  const filtered = status !== "all" || feedback !== "any";

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight">Agent runs</h1>
          {stats && (
            <span className="text-xs tabular-nums text-muted-foreground">{stats.total}</span>
          )}
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Every run is traced step by step — open one to see why the agent did what it did.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/40">
        <div className="space-y-4 p-3 md:p-5">
          <RunsStats stats={stats} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="Filter by status"
              className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1"
            >
              {RUN_STATUS_FILTERS.map((f) => {
                const active = status === f.value;
                const count = !stats ? undefined : f.value === "all" ? stats.total : stats[f.value];
                if (f.value === "running" && !count && !active) return null;
                return (
                  <button
                    key={f.value}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatus(f.value)}
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
                          RUN_STATUSES[f.value].dot,
                          f.value === "running" && "animate-pulse",
                        )}
                      />
                    )}
                    {f.label}
                    {count !== undefined && (
                      <span className={cn("tabular-nums", active ? "text-white/70" : "text-zinc-400")}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-400">Feedback</span>
              <div
                role="radiogroup"
                aria-label="Filter by feedback"
                className="inline-flex rounded-lg border bg-white p-0.5 shadow-xs"
              >
                {FEEDBACK_FILTERS.map((f) => {
                  const active = feedback === f.value;
                  return (
                    <button
                      key={f.value}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFeedback(f.value)}
                      className={cn(
                        "inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors",
                        active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-900",
                      )}
                    >
                      {f.icon}
                      {f.label}
                      {f.value === "unresolved" && !!stats?.unresolvedDown && (
                        <span className="rounded-full bg-rose-100 px-1 text-[10px] font-semibold tabular-nums text-rose-700">
                          {stats.unresolvedDown}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {runs === undefined ? (
            <TableSkeleton />
          ) : runs.length === 0 ? (
            <EmptyState filtered={filtered} />
          ) : (
            <RunsTable key={filterKey} runs={runs} now={now} />
          )}
        </div>
      </div>
    </main>
  );
}

function RunsTable({ runs, now }: { runs: RunListItem[]; now: number }) {
  const router = useRouter();
  // Runs present on first render don't flash; ones that stream in later do.
  const [initialIds] = useState(() => new Set(runs.map((r) => r._id)));

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-xs">
      <Table className="min-w-[1040px]">
        <TableHeader className="bg-zinc-50/80">
          <TableRow className="hover:bg-transparent">
            <Th className="w-24 pl-4">Time</Th>
            <Th className="w-52">Conversation</Th>
            <Th className="w-28">Status</Th>
            <Th>Tool calls</Th>
            <Th className="w-24">Confidence</Th>
            <Th className="w-20 text-right">Duration</Th>
            <Th className="w-20 text-right">Tokens</Th>
            <Th className="w-20">Trigger</Th>
            <Th className="w-20 pr-4">Feedback</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((r) => {
            const channel = r.conversation ? CHANNELS[r.conversation.channel] : null;
            const ChannelIcon = channel?.icon ?? Bot;
            const running = r.status === "running";
            const duration = r.durationMs ?? (running ? now - r._creationTime : undefined);
            const href = runHref(r._id);
            return (
              <TableRow
                key={r._id}
                tabIndex={0}
                onClick={() => router.push(href)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(href);
                }}
                className={cn(
                  "group cursor-pointer focus-visible:bg-zinc-50 focus-visible:outline-none",
                  !initialIds.has(r._id) && "animate-row-flash",
                  r.feedback?.rating === "down" && !r.feedback.resolved && "bg-rose-50/30",
                )}
              >
                <TableCell className="py-2.5 pl-4">
                  <span
                    className="text-xs tabular-nums text-zinc-500"
                    title={new Date(r._creationTime).toLocaleString()}
                  >
                    {formatRelativeTime(r._creationTime, now)}
                  </span>
                </TableCell>
                <TableCell className="max-w-0 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <ChannelIcon className={cn("size-3.5 shrink-0", channel?.className ?? "text-zinc-400")} />
                    <span className="truncate text-[13px] font-medium text-zinc-900">
                      {r.conversation?.displayName ?? "Unknown"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  <RunStatusBadge status={r.status} />
                </TableCell>
                <TableCell className="max-w-0 py-2.5">
                  <div className="flex items-center gap-1 overflow-hidden">
                    {r.toolNames.length === 0 ? (
                      <span className="text-xs text-zinc-300">{running ? "…" : "no tools"}</span>
                    ) : (
                      r.toolNames.map((name, i) => (
                        <span key={i} className="flex shrink-0 items-center gap-1">
                          {i > 0 && <ChevronRight className="size-3 text-zinc-300" />}
                          <ToolChip name={name} />
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  <ConfidencePill confidence={r.confidence} />
                </TableCell>
                <TableCell
                  className={cn(
                    "py-2.5 text-right text-xs tabular-nums",
                    running ? "text-violet-700" : "text-zinc-700",
                  )}
                >
                  {formatDuration(duration)}
                </TableCell>
                <TableCell className="py-2.5 text-right text-xs tabular-nums text-zinc-700">
                  {formatTokens(runTokens(r))}
                </TableCell>
                <TableCell className="py-2.5">
                  {r.trigger === "manual_rerun" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-sky-700">
                      <RotateCcw className="size-3" />
                      re-run
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">inbound</span>
                  )}
                </TableCell>
                <TableCell className="py-2.5 pr-4">
                  <div className="flex items-center justify-between">
                    <FeedbackIcon rating={r.feedback?.rating} resolved={r.feedback?.resolved} />
                    <ChevronRight className="size-3.5 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function Th({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <TableHead
      className={cn("h-9 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase", className)}
    >
      {children}
    </TableHead>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-white px-6 py-20 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <Bot className="size-5" />
      </div>
      <p className="mt-3 text-sm font-medium">
        {filtered ? "No runs match these filters" : "No agent runs yet"}
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {filtered
          ? "Try another status or feedback filter."
          : "When a tenant message arrives, the AI agent runs and every step shows up here live."}
      </p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-px overflow-hidden rounded-xl border bg-white">
      <Skeleton className="h-9 rounded-none" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <div className="flex flex-1 gap-1.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-10" />
        </div>
      ))}
    </div>
  );
}
