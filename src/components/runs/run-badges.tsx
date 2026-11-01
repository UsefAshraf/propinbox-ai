import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { AgentRunStatus } from "@/lib/agent";
import { confidenceTone, formatConfidence } from "@/lib/agent";
import { RUN_STATUSES, toolMeta } from "@/lib/runs";
import { cn } from "@/lib/utils";

const pill =
  "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset";

export function RunStatusBadge({
  status,
  className,
}: {
  status: AgentRunStatus;
  className?: string;
}) {
  const s = RUN_STATUSES[status];
  const running = status === "running";
  return (
    <span className={cn(pill, s.badge, className)}>
      <span className="relative flex size-1.5">
        {running && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-70",
              s.dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", s.dot)} />
      </span>
      {s.label}
    </span>
  );
}

export function ToolChip({
  name,
  error,
  className,
}: {
  name: string;
  error?: boolean;
  className?: string;
}) {
  const t = toolMeta(name);
  const Icon = t.icon;
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 font-mono text-[10.5px] whitespace-nowrap ring-1 ring-inset",
        error ? "bg-rose-50 text-rose-700 ring-rose-600/25" : t.tone,
        className,
      )}
      title={t.label}
    >
      <Icon className="size-3 shrink-0" />
      {name}
    </span>
  );
}

export function ConfidencePill({ confidence }: { confidence: number | undefined }) {
  if (confidence === undefined) return <span className="text-zinc-300">—</span>;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset",
        confidenceTone(confidence),
      )}
    >
      {formatConfidence(confidence)}
    </span>
  );
}

/** Horizontal meter with a tick at the 0.7 handoff threshold. */
export function ConfidenceMeter({
  confidence,
  threshold = 0.7,
  className,
}: {
  confidence: number | undefined;
  threshold?: number;
  className?: string;
}) {
  const pct = confidence === undefined ? 0 : Math.max(0, Math.min(1, confidence)) * 100;
  const color =
    confidence === undefined
      ? "bg-zinc-300"
      : confidence >= 0.85
        ? "bg-emerald-500"
        : confidence >= threshold
          ? "bg-amber-500"
          : "bg-rose-500";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative h-1.5 w-24 overflow-visible rounded-full bg-zinc-200/80"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Confidence"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", color)}
          style={{ width: `${pct}%` }}
        />
        <span
          className="absolute -top-1 h-3.5 w-px bg-zinc-500"
          style={{ left: `${threshold * 100}%` }}
          title={`Handoff threshold ${Math.round(threshold * 100)}%`}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-zinc-800">
        {confidence === undefined ? "—" : formatConfidence(confidence)}
      </span>
    </div>
  );
}

export function FeedbackIcon({
  rating,
  resolved,
  className,
}: {
  rating: "up" | "down" | undefined | null;
  resolved?: boolean;
  className?: string;
}) {
  if (!rating) return <span className="text-zinc-300">—</span>;
  if (rating === "up") {
    return (
      <span title="Thumbs up" className={cn("inline-flex text-emerald-600", className)}>
        <ThumbsUp className="size-3.5" />
      </span>
    );
  }
  return (
    <span
      title={resolved ? "Thumbs down · resolved" : "Thumbs down · unresolved"}
      className={cn(
        "inline-flex items-center gap-1",
        resolved ? "text-zinc-400" : "text-rose-600",
        className,
      )}
    >
      <ThumbsDown className="size-3.5" />
      {!resolved && <span className="size-1.5 rounded-full bg-rose-500" />}
    </span>
  );
}
