"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Braces,
  ChevronRight,
  Flag,
  Sparkles,
} from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { runProgressLabel, type AgentRun, type AgentStep } from "@/lib/agent";
import {
  RUN_STATUSES,
  ROOT_CAUSES,
  formatDuration,
  formatTokens,
  toolMeta,
  type ModelStep,
  type RootCause,
  type ToolStep,
} from "@/lib/runs";
import { cn } from "@/lib/utils";
import { JsonViewer } from "./json-viewer";
import { RunStatusBadge } from "./run-badges";
import { ToolSummary } from "./tool-summary";

export type Blame = {
  stepIndex: number;
  rootCause?: RootCause;
  note?: string;
  /** true while the reviewer is still editing (not saved yet). */
  draft?: boolean;
};

export function RunTimeline({
  run,
  blame,
  onBlame,
}: {
  run: AgentRun;
  blame: Blame | null;
  onBlame: (stepIndex: number) => void;
}) {
  const now = useNow(run.status === "running" ? 500 : 60_000);
  const running = run.status === "running";
  const stepsTotal = run.steps.reduce((sum, s) => sum + s.durationMs, 0);
  const elapsed = Math.max(0, now - run._creationTime);
  // Scale for the mini waterfall: the whole run (or what has elapsed so far while running).
  const total = Math.max(
    1,
    running ? Math.max(elapsed, stepsTotal) : (run.durationMs ?? stepsTotal),
  );

  const items: { step: AgentStep; index: number; start: number }[] = [];
  for (const [i, step] of run.steps.entries()) {
    const prev = items[i - 1];
    items.push({ step, index: i, start: prev ? prev.start + prev.step.durationMs : 0 });
  }

  return (
    <ol className="relative">
      {items.map(({ step, index, start }) => (
        <StepItem
          key={index}
          step={step}
          index={index}
          start={start}
          total={total}
          blame={blame?.stepIndex === index ? blame : null}
          onBlame={() => onBlame(index)}
          canBlame={!running}
        />
      ))}

      {running ? (
        <li className="relative flex gap-3 pb-1">
          <Rail>
            <span className="relative flex size-6 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-300 opacity-50" />
              <span className="relative flex size-6 items-center justify-center rounded-full bg-violet-100 text-violet-700 ring-1 ring-violet-300">
                <Sparkles className="size-3 animate-pulse" />
              </span>
            </span>
          </Rail>
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-dashed border-violet-300 bg-violet-50/50 px-3.5 py-2.5">
            <span className="pointer-events-none absolute inset-0 animate-agent-shimmer bg-linear-to-r from-transparent via-white/70 to-transparent motion-reduce:hidden" />
            <div className="relative flex items-center gap-2 text-xs">
              <span className="font-medium text-violet-900">
                {run.steps.at(-1)?.kind === "tool" || run.steps.length === 0
                  ? "Waiting for Claude…"
                  : runProgressLabel(run)}
              </span>
              <span className="ml-auto tabular-nums text-violet-600">
                {formatDuration(Math.max(0, elapsed - stepsTotal))}
              </span>
            </div>
          </div>
        </li>
      ) : (
        <li className="relative flex items-center gap-3">
          <Rail last>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full ring-4 ring-white",
                RUN_STATUSES[run.status].dot,
              )}
            >
              <span className="size-2 rounded-full bg-white" />
            </span>
          </Rail>
          <div className="flex items-center gap-2 py-1 text-xs text-zinc-500">
            <RunStatusBadge status={run.status} />
            <span>
              finished in{" "}
              <span className="font-medium tabular-nums text-zinc-700">
                {formatDuration(run.durationMs ?? stepsTotal)}
              </span>
            </span>
          </div>
        </li>
      )}
    </ol>
  );
}

function Rail({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className="relative flex w-6 shrink-0 justify-center">
      {!last && (
        <span className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-zinc-200" />
      )}
      <div className="relative pt-2.5">{children}</div>
    </div>
  );
}

function StepItem({
  step,
  index,
  start,
  total,
  blame,
  onBlame,
  canBlame,
}: {
  step: AgentStep;
  index: number;
  start: number;
  total: number;
  blame: Blame | null;
  onBlame: () => void;
  canBlame: boolean;
}) {
  const isTool = step.kind === "tool";
  const error = isTool && step.isError;
  const blamed = blame !== null;
  const meta = isTool ? toolMeta(step.name) : null;
  const Icon = meta?.icon ?? Sparkles;

  return (
    <li id={`step-${index}`} className="group/step relative flex scroll-mt-24 gap-3 pb-3">
      <Rail>
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums ring-4 ring-white",
            blamed
              ? "bg-rose-600 text-white"
              : error
                ? "bg-rose-100 text-rose-700 ring-rose-50"
                : isTool
                  ? "bg-white text-zinc-600 shadow-xs outline-1 outline-zinc-200"
                  : "bg-zinc-900 text-white",
          )}
        >
          {index + 1}
        </span>
      </Rail>

      <div
        className={cn(
          "min-w-0 flex-1 overflow-hidden rounded-xl border bg-white shadow-xs transition-shadow",
          blamed
            ? cn(
                "border-rose-300 ring-2 ring-rose-500/20",
                blame.draft && "border-dashed",
              )
            : error
              ? "border-rose-200"
              : "border-zinc-200/80",
        )}
      >
        {/* header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3.5 pt-2.5 pb-2",
            blamed && "bg-rose-50/60",
          )}
        >
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
              error
                ? "bg-rose-50 text-rose-700 ring-rose-600/20"
                : isTool
                  ? meta!.tone
                  : "bg-violet-50 text-violet-700 ring-violet-600/20",
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
            {isTool ? (
              <>
                <span className="font-mono text-[12.5px] font-medium text-zinc-900">
                  {step.name}
                </span>
                {error && (
                  <span className="inline-flex h-4.5 items-center gap-1 rounded bg-rose-100 px-1.5 text-[10px] font-semibold text-rose-700">
                    <AlertTriangle className="size-2.5" />
                    ERROR
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-[13px] font-semibold text-zinc-900">Claude</span>
                <span className="rounded bg-zinc-100 px-1.5 py-px font-mono text-[10px] text-zinc-500">
                  {step.stopReason}
                </span>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[11px] tabular-nums text-zinc-500">
            {!isTool && (
              <span className="hidden items-center gap-2 sm:flex" title="Input / output tokens">
                <span className="inline-flex items-center gap-0.5">
                  <ArrowDownToLine className="size-3 text-zinc-400" />
                  {formatTokens(step.inputTokens)}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <ArrowUpFromLine className="size-3 text-zinc-400" />
                  {formatTokens(step.outputTokens)}
                </span>
              </span>
            )}
            <span className="w-12 text-right font-medium text-zinc-700">
              {formatDuration(step.durationMs)}
            </span>
          </div>
          {canBlame && (
            <button
              type="button"
              onClick={onBlame}
              className={cn(
                "inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-opacity",
                blamed
                  ? "bg-rose-600 text-white"
                  : "text-zinc-400 opacity-100 hover:bg-rose-50 hover:text-rose-700 md:opacity-0 md:group-hover/step:opacity-100 focus-visible:opacity-100",
              )}
              title="Blame this step for a bad outcome"
            >
              <Flag className="size-3" />
              <span className="hidden sm:inline">{blamed ? "Blamed" : "Blame"}</span>
            </button>
          )}
        </div>

        {/* waterfall */}
        <div className="relative mx-3.5 h-1 rounded-full bg-zinc-100">
          <div
            className={cn(
              "absolute inset-y-0 min-w-[3px] rounded-full",
              blamed || error ? "bg-rose-400" : isTool ? "bg-sky-400" : "bg-violet-400",
            )}
            style={{
              left: `${Math.min(100, (start / total) * 100)}%`,
              width: `${Math.min(100, (step.durationMs / total) * 100)}%`,
            }}
          />
        </div>

        <div className="space-y-2.5 px-3.5 pt-2.5 pb-3">
          {isTool ? <ToolBody step={step} /> : <ModelBody step={step} />}
        </div>

        {blamed && (
          <div className="flex items-start gap-2 border-t border-rose-200 bg-rose-50 px-3.5 py-2.5">
            <Flag className="mt-0.5 size-3.5 shrink-0 text-rose-600" />
            <div className="min-w-0 text-xs leading-relaxed text-rose-900">
              <span className="font-semibold">
                {blame.draft ? "Blaming this step" : "This step caused the bad answer"}
              </span>
              {blame.rootCause && (
                <span className="ml-1.5 inline-flex h-4.5 items-center rounded bg-rose-100 px-1.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-600/20 ring-inset">
                  {ROOT_CAUSES[blame.rootCause].label}
                </span>
              )}
              {blame.note && (
                <p className="mt-1 break-words whitespace-pre-wrap text-rose-800">
                  “{blame.note}”
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function ModelBody({ step }: { step: ModelStep }) {
  const text = step.text.trim();
  if (!text) {
    return (
      <p className="text-xs text-zinc-400 italic">
        No text — went straight to a tool call.
      </p>
    );
  }
  return (
    <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap text-zinc-700">
      {text}
    </p>
  );
}

function ToolBody({ step }: { step: ToolStep }) {
  const [open, setOpen] = useState<{ args: boolean; result: boolean }>({
    args: false,
    result: step.isError,
  });
  return (
    <>
      <ToolSummary step={step} />
      <div className="flex flex-wrap gap-1.5">
        <JsonToggle
          label="Arguments"
          open={open.args}
          onClick={() => setOpen((o) => ({ ...o, args: !o.args }))}
        />
        <JsonToggle
          label="Result"
          open={open.result}
          error={step.isError}
          onClick={() => setOpen((o) => ({ ...o, result: !o.result }))}
        />
      </div>
      {open.args && (
        <div>
          <SectionLabel>Arguments</SectionLabel>
          <JsonViewer value={step.args} />
        </div>
      )}
      {open.result && (
        <div>
          <SectionLabel>Result</SectionLabel>
          <JsonViewer
            value={step.result}
            className={step.isError ? "border-rose-200 bg-rose-50/40" : undefined}
          />
        </div>
      )}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
      {children}
    </div>
  );
}

function JsonToggle({
  label,
  open,
  error,
  onClick,
}: {
  label: string;
  open: boolean;
  error?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium transition-colors",
        open
          ? "border-zinc-300 bg-zinc-100 text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800",
        error && "border-rose-200 text-rose-700",
      )}
    >
      <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} />
      <Braces className="size-3" />
      {label}
    </button>
  );
}
