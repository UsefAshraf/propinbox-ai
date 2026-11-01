import type { ReactNode } from "react";
import { Clock, Coins, ThumbsDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ROOT_CAUSES,
  ROOT_CAUSE_ORDER,
  RUN_STATUSES,
  formatDuration,
  formatPercent,
  formatTokens,
  type RunStats,
} from "@/lib/runs";
import { cn } from "@/lib/utils";

export function RunsStats({ stats }: { stats: RunStats | undefined }) {
  if (!stats) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_0.9fr_1.6fr]">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[124px] rounded-xl" />
        ))}
      </div>
    );
  }

  const finished = stats.drafted + stats.handoff + stats.failed;
  const segments = (["drafted", "handoff", "failed", "running"] as const).map((s) => ({
    status: s,
    count: stats[s],
  }));
  const causes = ROOT_CAUSE_ORDER.map((rc) => ({ rc, count: stats.rootCauses[rc] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxCause = Math.max(1, ...causes.map((c) => c.count));
  const diagnosed = causes.reduce((s, c) => s + c.count, 0);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_0.9fr_1.6fr]">
      {/* outcomes */}
      <Tile label="Runs" hint={`newest ${stats.total >= 500 ? 500 : stats.total}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{stats.total}</span>
          <span className="text-xs text-zinc-500">
            <span className="font-semibold text-amber-700">
              {formatPercent(stats.handoff, finished)}
            </span>{" "}
            handoff rate
          </span>
        </div>
        <div className="mt-2.5 flex h-1.5 gap-px overflow-hidden rounded-full bg-zinc-100">
          {segments.map(
            (s) =>
              s.count > 0 && (
                <div
                  key={s.status}
                  className={cn(RUN_STATUSES[s.status].bar, s.status === "running" && "animate-pulse")}
                  style={{ width: `${(s.count / Math.max(1, stats.total)) * 100}%` }}
                  title={`${RUN_STATUSES[s.status].label}: ${s.count}`}
                />
              ),
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          {segments.map((s) =>
            s.status === "running" && s.count === 0 ? null : (
              <span key={s.status} className="inline-flex items-center gap-1">
                <span className={cn("size-1.5 rounded-full", RUN_STATUSES[s.status].dot)} />
                {RUN_STATUSES[s.status].label}
                <span className="font-medium tabular-nums text-zinc-800">{s.count}</span>
              </span>
            ),
          )}
        </div>
      </Tile>

      {/* feedback */}
      <Tile label="Thumbs down" icon={<ThumbsDown className="size-3" />}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {stats.thumbsDown}
          </span>
          <span className="text-xs text-zinc-500">
            {formatPercent(stats.thumbsDown, finished)} of runs
          </span>
        </div>
        <div className="mt-2.5">
          {stats.unresolvedDown > 0 ? (
            <span className="inline-flex h-5 items-center gap-1.5 rounded-full bg-rose-50 px-2 text-[11px] font-medium text-rose-700 ring-1 ring-rose-600/20 ring-inset">
              <span className="size-1.5 rounded-full bg-rose-500" />
              {stats.unresolvedDown} unresolved
            </span>
          ) : (
            <span className="inline-flex h-5 items-center gap-1.5 rounded-full bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
              All resolved
            </span>
          )}
          {stats.thumbsDown - stats.unresolvedDown > 0 && (
            <span className="ml-2 text-[11px] text-zinc-400">
              {stats.thumbsDown - stats.unresolvedDown} fixed
            </span>
          )}
        </div>
      </Tile>

      {/* performance */}
      <Tile label="Per run">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-zinc-400" />
            <span className="text-lg font-semibold tracking-tight tabular-nums">
              {stats.avgDurationMs ? formatDuration(stats.avgDurationMs) : "—"}
            </span>
            <span className="text-[11px] text-zinc-400">avg duration</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="size-3.5 text-zinc-400" />
            <span className="text-lg font-semibold tracking-tight tabular-nums">
              {stats.avgTokens ? formatTokens(stats.avgTokens) : "—"}
            </span>
            <span className="text-[11px] text-zinc-400">avg tokens</span>
          </div>
        </div>
      </Tile>

      {/* root causes */}
      <Tile label="Why runs fail" hint={diagnosed ? `${diagnosed} diagnosed` : undefined}>
        {causes.length === 0 ? (
          <p className="pt-2 text-xs text-zinc-400">
            No diagnosed failures yet. Thumbs-down a run and pick a root cause.
          </p>
        ) : (
          <ul className="space-y-1">
            {causes.slice(0, 4).map(({ rc, count }) => (
              <li key={rc} className="flex items-center gap-2 text-xs" title={ROOT_CAUSES[rc].hint}>
                <span className="w-36 shrink-0 truncate text-zinc-600">{ROOT_CAUSES[rc].label}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-rose-400"
                    style={{ width: `${(count / maxCause) * 100}%` }}
                  />
                </span>
                <span className="w-5 text-right font-semibold tabular-nums text-zinc-800">
                  {count}
                </span>
              </li>
            ))}
            {causes.length > 4 && (
              <li className="text-[11px] text-zinc-400">
                +{causes.slice(4).reduce((s, c) => s + c.count, 0)} more across{" "}
                {causes.length - 4} other cause{causes.length - 4 === 1 ? "" : "s"}
              </li>
            )}
          </ul>
        )}
      </Tile>
    </div>
  );
}

function Tile({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 shadow-xs">
      <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
        {icon}
        {label}
        {hint && (
          <span className="ml-auto font-normal tracking-normal normal-case">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
