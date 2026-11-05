"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  ChevronRight,
  Clock,
  Coins,
  Cpu,
  Download,
  Hand,
  History,
  ListTree,
  Loader2,
  MessageSquare,
  PenLine,
  RotateCcw,
  ScrollText,
  SearchX,
  Ticket as TicketIcon,
  Zap,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/tickets/ticket-badges";
import { useNow } from "@/hooks/use-now";
import { downloadFile } from "@/lib/download";
import { errorMessage, runHref, type AgentRun } from "@/lib/agent";
import { CHANNELS } from "@/lib/inbox";
import {
  RUN_STATUSES,
  TRIGGERS,
  formatDuration,
  formatRelativeTime,
  formatTokens,
  runTokens,
  type ConversationRun,
  type RunDetail,
} from "@/lib/runs";
import { cn } from "@/lib/utils";
import { draftFromRun, FeedbackPanel, type FeedbackDraft } from "./feedback-panel";
import {
  ConfidenceMeter,
  ConfidencePill,
  FeedbackIcon,
  RunStatusBadge,
} from "./run-badges";
import { RunTimeline, type Blame } from "./run-timeline";

export function RunDetailView({ runId }: { runId: Id<"agentRuns"> }) {
  const data = useQuery(api.agentRuns.get, { runId });
  const conversationRuns = useQuery(
    api.agentRuns.forConversation,
    data ? { conversationId: data.run.conversationId } : "skip",
  );

  if (data === null) return <NotFound />;
  if (data === undefined) return <DetailSkeleton />;
  return (
    <Loaded
      key={data.run._id}
      data={data}
      conversationRuns={conversationRuns}
    />
  );
}

function Loaded({
  data,
  conversationRuns,
}: {
  data: RunDetail;
  conversationRuns: ConversationRun[] | undefined;
}) {
  const { run, conversation } = data;
  const router = useRouter();
  const now = useNow(run.status === "running" ? 1_000 : 30_000);
  const rerunAgent = useMutation(api.agentRuns.rerun);
  const [rerunning, setRerunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FeedbackDraft>(() => draftFromRun(run));
  // Run ids that existed when "Re-run" was clicked; the first new one is opened automatically.
  const knownRunIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const known = knownRunIds.current;
    if (!known || !conversationRuns) return;
    const fresh = conversationRuns.find((r) => !known.has(r._id));
    if (fresh) {
      knownRunIds.current = null;
      router.push(runHref(fresh._id));
    }
  }, [conversationRuns, router]);

  const running = run.status === "running";
  const anyRunning = conversationRuns?.some((r) => r.status === "running") ?? running;
  const duration = run.durationMs ?? (running ? now - run._creationTime : undefined);
  const tokens = runTokens(run);

  async function rerun() {
    if (!conversation) return;
    setRerunning(true);
    knownRunIds.current = new Set((conversationRuns ?? []).map((r) => r._id));
    try {
      await rerunAgent({ conversationId: conversation._id });
      toast.success("Agent re-run started", {
        description: "Opening the new run as soon as it starts…",
      });
    } catch (err) {
      knownRunIds.current = null;
      toast.error("Couldn't re-run the agent", { description: errorMessage(err) });
    } finally {
      setRerunning(false);
    }
  }

  /** Downloads the full trace (run + linked messages/tickets) as JSON, e.g. for a bug report or eval set. */
  function exportTrace() {
    const trace = { exportedAt: new Date().toISOString(), ...data };
    downloadFile(`agent-run-${run._id}.json`, JSON.stringify(trace, null, 2), "application/json");
  }

  function startEdit(stepIndex?: number) {
    setDraft({ ...draftFromRun(run), ...(stepIndex !== undefined ? { stepIndex } : {}) });
    setEditing(true);
  }

  function blameStep(index: number) {
    if (editing) {
      setDraft((d) => ({ ...d, stepIndex: d.stepIndex === index ? undefined : index }));
    } else {
      startEdit(index);
    }
    // On narrow screens the review panel sits below the timeline — bring it into view.
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      requestAnimationFrame(() =>
        document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  function jumpToStep(index: number) {
    document
      .getElementById(`step-${index}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const savedDown = run.feedback?.rating === "down" ? run.feedback : null;
  const blame: Blame | null = editing
    ? draft.stepIndex !== undefined
      ? {
          stepIndex: draft.stepIndex,
          rootCause: draft.rootCause,
          note: draft.note.trim() || undefined,
          draft: true,
        }
      : null
    : savedDown?.stepIndex !== undefined
      ? { stepIndex: savedDown.stepIndex, rootCause: savedDown.rootCause, note: savedDown.note }
      : null;

  const ChannelIcon = conversation ? CHANNELS[conversation.channel].icon : MessageSquare;

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-5">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/runs" aria-label="Back to agent runs" />}
          nativeButton={false}
        >
          <ArrowLeft />
        </Button>
        <nav className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link href="/runs" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Agent runs
          </Link>
          <ChevronRight className="hidden size-3.5 text-zinc-300 sm:inline" />
          <span className="flex min-w-0 items-center gap-1.5 font-semibold">
            <ChannelIcon
              className={cn(
                "size-3.5 shrink-0",
                conversation ? CHANNELS[conversation.channel].className : "text-zinc-400",
              )}
            />
            <span className="truncate">{conversation?.displayName ?? "Unknown conversation"}</span>
          </span>
          <span className="hidden shrink-0 font-mono text-[11px] text-zinc-400 md:inline">
            {run._id.slice(-8)}
          </span>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {conversation && (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/inbox/${conversation._id}`} />}
              nativeButton={false}
            >
              <MessageSquare />
              <span className="hidden sm:inline">Open conversation</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={exportTrace}
            title="Download this run's full trace as JSON"
          >
            <Download />
            <span className="hidden sm:inline">Export trace</span>
          </Button>
          <Button
            size="sm"
            onClick={rerun}
            disabled={!conversation || rerunning || anyRunning}
            title={anyRunning ? "A run for this conversation is in progress" : "Run the agent again on the latest message"}
          >
            {rerunning || anyRunning ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            <span className="hidden sm:inline">{anyRunning ? "Running…" : "Re-run agent"}</span>
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/40">
        <div className="mx-auto max-w-6xl space-y-4 p-3 md:p-5">
          {/* summary */}
          <section className="rounded-xl border bg-white px-4 py-3.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <RunStatusBadge status={run.status} />
              <h1 className="text-[15px] font-semibold tracking-tight">
                {running ? "Agent is working…" : outcomeTitle(run)}
              </h1>
              {run.feedback && (
                <FeedbackIcon rating={run.feedback.rating} resolved={run.feedback.resolved} className="ml-1" />
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-7">
              <Metric icon={Cpu} label="Model">
                <span className="font-mono text-xs">{run.model}</span>
              </Metric>
              <Metric icon={Zap} label="Trigger">
                {TRIGGERS[run.trigger ?? "inbound"].label}
              </Metric>
              <Metric icon={Clock} label="Started">
                <span title={new Date(run._creationTime).toLocaleString()}>
                  {format(run._creationTime, "d MMM, HH:mm:ss")}
                </span>
              </Metric>
              <Metric icon={History} label="Duration">
                <span className={cn(running && "text-violet-700")}>{formatDuration(duration)}</span>
              </Metric>
              <Metric icon={Coins} label="Tokens">
                <span title={`${run.inputTokens ?? 0} in · ${run.outputTokens ?? 0} out`}>
                  {formatTokens(tokens)}
                  {tokens !== undefined && (
                    <span className="ml-1 text-[11px] font-normal text-zinc-400">
                      {formatTokens(run.inputTokens)} / {formatTokens(run.outputTokens)}
                    </span>
                  )}
                </span>
              </Metric>
              <Metric icon={ListTree} label="Steps">
                {run.steps.length}
                <span className="ml-1 text-[11px] font-normal text-zinc-400">
                  {run.steps.filter((s) => s.kind === "tool").length} tools
                </span>
              </Metric>
              <Metric icon={Bot} label="Confidence">
                <ConfidenceMeter confidence={run.confidence} />
              </Metric>
            </dl>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-4">
              <OutcomeCard data={data} />
              <InputSection run={run} triggerMessage={data.triggerMessage} />

              <section>
                <div className="mb-2.5 flex items-baseline gap-2 px-1">
                  <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Timeline
                  </h2>
                  <span className="text-xs text-zinc-400">
                    {run.steps.length} step{run.steps.length === 1 ? "" : "s"}
                    {!running && " · click “Blame” on the step that went wrong"}
                  </span>
                </div>
                {run.steps.length === 0 && !running ? (
                  <div className="rounded-xl border border-dashed bg-white px-4 py-8 text-center text-xs text-muted-foreground">
                    This run recorded no steps
                    {run.error ? " — it failed before calling Claude." : "."}
                  </div>
                ) : (
                  <RunTimeline run={run} blame={blame} onBlame={blameStep} />
                )}
              </section>
            </div>

            <aside className="min-w-0 space-y-4 xl:sticky xl:top-0 xl:self-start">
              <FeedbackPanel
                run={run}
                editing={editing}
                draft={draft}
                onDraftChange={setDraft}
                onStartEdit={() => startEdit()}
                onDone={() => setEditing(false)}
                onJumpToStep={jumpToStep}
              />
              <OtherRuns runs={conversationRuns} currentId={run._id} now={now} />
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function outcomeTitle(run: AgentRun): string {
  switch (run.status) {
    case "drafted":
      return "Drafted a reply";
    case "handoff":
      return "Handed off to a human";
    case "failed":
      return "Run failed";
    default:
      return "Running";
  }
}

function Metric({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium tabular-nums text-zinc-900">
        {children}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------

const DRAFT_STATE: Record<Doc<"messages">["status"], { label: string; className: string }> = {
  draft: { label: "Awaiting approval", className: "bg-amber-50 text-amber-800 ring-amber-600/25" },
  sent: { label: "Sent", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  discarded: { label: "Discarded", className: "bg-zinc-100 text-zinc-600 ring-zinc-500/20" },
  received: { label: "Received", className: "bg-zinc-100 text-zinc-600 ring-zinc-500/20" },
};

function OutcomeCard({ data }: { data: RunDetail }) {
  const { run, draftMessage, tickets, conversation } = data;
  if (run.status === "running") return null;

  const conversationHref = conversation ? `/inbox/${conversation._id}` : null;
  const tone =
    run.status === "drafted"
      ? { border: "border-emerald-200", head: "bg-emerald-50/70 text-emerald-900", icon: PenLine, iconTone: "bg-emerald-500/15 text-emerald-700" }
      : run.status === "handoff"
        ? { border: "border-amber-200", head: "bg-amber-50/70 text-amber-900", icon: Hand, iconTone: "bg-amber-500/15 text-amber-700" }
        : { border: "border-rose-200", head: "bg-rose-50/70 text-rose-900", icon: AlertTriangle, iconTone: "bg-rose-500/15 text-rose-700" };
  const Icon = tone.icon;
  const reply = run.finalAnswer?.trim();

  return (
    <section className={cn("overflow-hidden rounded-xl border bg-white shadow-xs", tone.border)}>
      <div className={cn("flex items-center gap-2 px-3.5 py-2", tone.head)}>
        <span className={cn("flex size-5 items-center justify-center rounded-md", tone.iconTone)}>
          <Icon className="size-3" />
        </span>
        <span className="text-xs font-semibold">
          {run.status === "drafted" ? "Drafted reply" : run.status === "handoff" ? "Handoff" : "Error"}
        </span>
        {run.status === "drafted" && run.confidence !== undefined && (
          <ConfidencePill confidence={run.confidence} />
        )}
        {draftMessage && (
          <span
            className={cn(
              "ml-auto inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ring-1 ring-inset",
              DRAFT_STATE[draftMessage.status].className,
            )}
          >
            {DRAFT_STATE[draftMessage.status].label}
          </span>
        )}
        {conversationHref && (draftMessage || run.status !== "drafted") && (
          <Link
            href={conversationHref}
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 rounded px-1 text-[11px] font-medium opacity-80 hover:opacity-100",
              !draftMessage && "ml-auto",
            )}
          >
            {draftMessage ? "View draft" : "Open conversation"}
            <ArrowUpRight className="size-3" />
          </Link>
        )}
      </div>
      <div className="space-y-2.5 px-3.5 py-3">
        {run.status === "handoff" && (
          <p className="text-[13px] font-medium text-amber-900">
            {run.handoffReason ?? "No reason given."}
          </p>
        )}
        {run.status === "failed" && (
          <pre className="overflow-x-auto rounded-lg bg-rose-50 px-3 py-2 font-mono text-xs whitespace-pre-wrap text-rose-800">
            {run.error ?? "Unknown error."}
          </pre>
        )}
        {reply && (
          <div>
            {run.status !== "drafted" && (
              <div className="mb-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
                Suggested reply
              </div>
            )}
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-zinc-800">
              {reply}
            </p>
            {draftMessage && draftMessage.status === "sent" && draftMessage.body.trim() !== reply && (
              <p className="mt-2 text-[11px] text-zinc-500">
                Edited by staff before sending.
              </p>
            )}
          </div>
        )}
        {tickets.length > 0 && (
          <div className="border-t pt-2.5">
            <div className="mb-1.5 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
              Tickets created by this run
            </div>
            <ul className="space-y-1">
              {tickets.map((t) => (
                <li key={t._id}>
                  <Link
                    href="/tickets"
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-zinc-50"
                  >
                    <TicketIcon className="size-3.5 shrink-0 text-orange-500" />
                    <span className="truncate font-medium text-zinc-800">{t.title}</span>
                    <PriorityBadge priority={t.priority} className="ml-auto" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function InputSection({
  run,
  triggerMessage,
}: {
  run: AgentRun;
  triggerMessage: Doc<"messages"> | null;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
      <div className="flex items-center gap-2 border-b px-3.5 py-2">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Input</h2>
      </div>
      {triggerMessage && (
        <div className="border-b px-3.5 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <MessageSquare className="size-3" />
            Triggered by inbound message ·{" "}
            {format(triggerMessage._creationTime, "d MMM, HH:mm")}
          </div>
          <p className="line-clamp-4 text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-700">
            {triggerMessage.body}
          </p>
        </div>
      )}
      <Disclosure
        icon={ScrollText}
        label="Conversation transcript"
        meta={`${run.input.length.toLocaleString()} chars`}
      >
        <pre className="max-h-[28rem] overflow-auto rounded-lg bg-zinc-50 px-3 py-2.5 font-mono text-[11.5px] leading-5 whitespace-pre-wrap text-zinc-700">
          {run.input}
        </pre>
      </Disclosure>
      <Disclosure
        icon={Bot}
        label="System prompt"
        meta={`${run.systemPrompt.length.toLocaleString()} chars`}
        className="border-t"
      >
        <pre className="max-h-[28rem] overflow-auto rounded-lg bg-zinc-50 px-3 py-2.5 font-mono text-[11.5px] leading-5 whitespace-pre-wrap text-zinc-700">
          {run.systemPrompt}
        </pre>
      </Disclosure>
    </section>
  );
}

function Disclosure({
  icon: Icon,
  label,
  meta,
  defaultOpen = false,
  className,
  children,
}: {
  icon: typeof Clock;
  label: string;
  meta?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <ChevronRight className={cn("size-3.5 text-zinc-400 transition-transform", open && "rotate-90")} />
        <Icon className="size-3.5 text-zinc-400" />
        {label}
        {meta && <span className="ml-auto font-normal tabular-nums text-zinc-400">{meta}</span>}
      </button>
      {open && <div className="px-3.5 pb-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Other runs of this conversation
// ---------------------------------------------------------------------------

function OtherRuns({
  runs,
  currentId,
  now,
}: {
  runs: ConversationRun[] | undefined;
  currentId: string;
  now: number;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Runs for this conversation
        </h3>
        {runs && <span className="ml-auto text-xs tabular-nums text-zinc-400">{runs.length}</span>}
      </div>
      {runs === undefined ? (
        <div className="space-y-2 p-3.5">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : (
        <ol className="max-h-80 overflow-y-auto p-1.5">
          {runs.map((r, i) => {
            const current = r._id === currentId;
            const attempt = runs.length - i;
            return (
              <li key={r._id}>
                <Link
                  href={runHref(r._id)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
                    current ? "bg-zinc-100 ring-1 ring-zinc-200" : "hover:bg-zinc-50",
                  )}
                >
                  <span className="w-5 text-[11px] font-semibold tabular-nums text-zinc-400">
                    #{attempt}
                  </span>
                  <span className={cn("size-2 shrink-0 rounded-full", RUN_STATUSES[r.status].dot, r.status === "running" && "animate-pulse")} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate", current ? "font-semibold text-zinc-900" : "font-medium text-zinc-700")}>
                      {RUN_STATUSES[r.status].label}
                      <span className="ml-1 font-normal text-zinc-400">
                        · {TRIGGERS[r.trigger ?? "inbound"].short}
                      </span>
                    </span>
                    <span className="block text-[11px] tabular-nums text-zinc-400">
                      {formatRelativeTime(r._creationTime, now)}
                    </span>
                  </span>
                  {r.confidence !== undefined && <ConfidencePill confidence={r.confidence} />}
                  <FeedbackIcon rating={r.feedbackRating} resolved />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <SearchX className="size-5" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">Run not found</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          It may have been deleted, e.g. by re-seeding the database.
        </p>
      </div>
      <Button size="sm" render={<Link href="/runs" />} nativeButton={false}>
        All agent runs
      </Button>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="ml-auto h-7 w-28" />
      </header>
      <div className="mx-auto w-full max-w-6xl space-y-4 p-5">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-xl" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </main>
  );
}
