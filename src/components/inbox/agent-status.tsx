"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CornerDownLeft,
  Hand,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { runHref, runProgressLabel, type AgentRun } from "@/lib/agent";
import { cn } from "@/lib/utils";

/** Live "agent is working" row at the bottom of the thread while a run is `running`. */
export function AgentDraftingRow({ run }: { run: AgentRun }) {
  const now = useNow(1_000);
  const elapsed = Math.max(0, Math.floor((now - run._creationTime) / 1000));
  const label = runProgressLabel(run);
  const toolSteps = run.steps.filter((s) => s.kind === "tool").length;

  return (
    <div
      className="mt-3 ml-auto flex w-full max-w-[92%] animate-in justify-end fade-in-0 slide-in-from-bottom-1 md:max-w-[80%]"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-violet-200/80 bg-violet-50/70 py-2 pr-3.5 pl-2.5 shadow-xs">
        {/* soft shimmer sweeping across the pill */}
        <span className="pointer-events-none absolute inset-0 animate-agent-shimmer motion-reduce:hidden bg-linear-to-r from-transparent via-white/60 to-transparent" />
        <span className="relative flex size-6 items-center justify-center rounded-md bg-violet-500/15 text-violet-700">
          <Sparkles className="size-3.5 animate-pulse" />
        </span>
        <div className="relative min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-violet-950">
            AI agent is drafting a reply
            <TypingDots />
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-violet-700/80">
            <span key={label} className="truncate animate-in fade-in-0">
              {label}
            </span>
            <span className="text-violet-300">·</span>
            <span className="shrink-0 tabular-nums">
              {run.steps.length === 0
                ? "starting"
                : `${run.steps.length} step${run.steps.length === 1 ? "" : "s"}`}
              {toolSteps > 0 && ` · ${toolSteps} tool${toolSteps === 1 ? "" : "s"}`}
            </span>
            <span className="text-violet-300">·</span>
            <span className="shrink-0 tabular-nums">{elapsed}s</span>
          </div>
        </div>
        <Link
          href={runHref(run._id)}
          className="relative ml-1 shrink-0 rounded px-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100 hover:text-violet-900"
        >
          Watch
        </Link>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1 animate-bounce rounded-full bg-violet-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/** Banner above the composer when the agent gave up and a human must reply. */
export function AgentHandoffBanner({
  run,
  onUseSuggestion,
}: {
  run: AgentRun;
  onUseSuggestion: (text: string) => void;
}) {
  const [dismissedRunId, setDismissedRunId] = useState<string | null>(null);
  if (dismissedRunId === run._id) return null;

  const failed = run.status === "failed";
  const reason =
    (failed ? run.error : run.handoffReason) ??
    run.handoffReason ??
    run.error ??
    (failed ? "The run failed." : "No reason given.");
  const suggestion = run.finalAnswer?.trim();
  const Icon = failed ? AlertTriangle : Hand;

  return (
    <div className="shrink-0 bg-zinc-50/50 px-4 pb-3 md:px-8">
      <div
        className={cn(
          "mx-auto max-w-3xl animate-in rounded-xl border px-3.5 py-2.5 fade-in-0 slide-in-from-bottom-1",
          failed
            ? "border-rose-200 bg-rose-50/80"
            : "border-amber-200 bg-amber-50/80",
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-px flex size-5 shrink-0 items-center justify-center rounded-md",
              failed
                ? "bg-rose-500/15 text-rose-700"
                : "bg-amber-500/15 text-amber-700",
            )}
          >
            <Icon className="size-3" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-xs leading-relaxed",
                failed ? "text-rose-900" : "text-amber-900",
              )}
            >
              <span className="font-semibold">
                {failed ? "Agent failed" : "Agent handed off"}:
              </span>{" "}
              <span className="break-words">{reason}</span>
            </p>
            {suggestion && (
              <p
                className={cn(
                  "mt-1.5 line-clamp-2 border-l-2 pl-2 text-xs leading-relaxed text-zinc-600 italic",
                  failed ? "border-rose-200" : "border-amber-300",
                )}
                title={suggestion}
              >
                {suggestion}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {suggestion && (
                <Button
                  size="xs"
                  variant="outline"
                  className="bg-white"
                  onClick={() => onUseSuggestion(suggestion)}
                >
                  <CornerDownLeft />
                  Use suggestion
                </Button>
              )}
              <Button
                size="xs"
                variant="ghost"
                className={failed ? "text-rose-800" : "text-amber-800"}
                render={<Link href={runHref(run._id)} />}
                nativeButton={false}
              >
                View run
                <ArrowUpRight />
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissedRunId(run._id)}
            className={cn(
              "-mt-0.5 -mr-1 rounded p-1",
              failed
                ? "text-rose-400 hover:bg-rose-100 hover:text-rose-700"
                : "text-amber-500 hover:bg-amber-100 hover:text-amber-800",
            )}
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
