"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Flag,
  Loader2,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, type AgentRun } from "@/lib/agent";
import {
  ROOT_CAUSES,
  ROOT_CAUSE_ORDER,
  stepLabel,
  type RootCause,
} from "@/lib/runs";
import { cn } from "@/lib/utils";

export type FeedbackDraft = {
  rootCause?: RootCause;
  stepIndex?: number;
  note: string;
};

export function draftFromRun(run: AgentRun): FeedbackDraft {
  const f = run.feedback?.rating === "down" ? run.feedback : undefined;
  return { rootCause: f?.rootCause, stepIndex: f?.stepIndex, note: f?.note ?? "" };
}

export function FeedbackPanel({
  run,
  editing,
  draft,
  onDraftChange,
  onStartEdit,
  onDone,
  onJumpToStep,
}: {
  run: AgentRun;
  editing: boolean;
  draft: FeedbackDraft;
  onDraftChange: (draft: FeedbackDraft) => void;
  onStartEdit: () => void;
  onDone: () => void;
  onJumpToStep: (index: number) => void;
}) {
  const submitFeedback = useMutation(api.agentRuns.submitFeedback);
  const clearFeedback = useMutation(api.agentRuns.clearFeedback);
  const setResolved = useMutation(api.agentRuns.setFeedbackResolved);
  const [pending, setPending] = useState<null | "up" | "down" | "clear" | "resolve">(null);

  const feedback = run.feedback;
  const running = run.status === "running";

  async function act<T>(kind: NonNullable<typeof pending>, fn: () => Promise<T>, ok: string, desc?: string) {
    setPending(kind);
    try {
      await fn();
      toast.success(ok, desc ? { description: desc } : undefined);
      return true;
    } catch (err) {
      toast.error("Couldn't save feedback", { description: errorMessage(err) });
      return false;
    } finally {
      setPending(null);
    }
  }

  async function thumbsUp() {
    await act("up", () => submitFeedback({ runId: run._id, rating: "up" }), "Marked as a good run");
    onDone();
  }

  async function submitDown() {
    const ok = await act(
      "down",
      () =>
        submitFeedback({
          runId: run._id,
          rating: "down",
          rootCause: draft.rootCause,
          stepIndex: draft.stepIndex,
          note: draft.note.trim() || undefined,
        }),
      "Feedback saved",
      draft.rootCause
        ? `Root cause: ${ROOT_CAUSES[draft.rootCause].label}${
            draft.stepIndex !== undefined ? ` · step #${draft.stepIndex + 1}` : ""
          }`
        : undefined,
    );
    if (ok) onDone();
  }

  async function clear() {
    const ok = await act("clear", () => clearFeedback({ runId: run._id }), "Feedback cleared");
    if (ok) onDone();
  }

  async function toggleResolved(resolved: boolean) {
    await act(
      "resolve",
      () => setResolved({ runId: run._id, resolved }),
      resolved ? "Marked resolved" : "Marked unresolved",
      resolved ? "The fix has shipped for this failure." : undefined,
    );
  }

  return (
    <section
      id="feedback"
      className={cn(
        "scroll-mt-20 overflow-hidden rounded-xl border bg-white shadow-xs",
        editing || feedback?.rating === "down" ? "border-rose-200" : "border-zinc-200/80",
      )}
    >
      <div className="flex items-center gap-2 border-b border-inherit px-3.5 py-2.5">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Review
        </h3>
        {feedback?.rating === "down" && !editing && (
          <span
            className={cn(
              "ml-auto inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium ring-1 ring-inset",
              feedback.resolved
                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                : "bg-rose-50 text-rose-700 ring-rose-600/20",
            )}
          >
            {feedback.resolved ? "Resolved" : "Unresolved"}
          </span>
        )}
      </div>

      {editing ? (
        <EditForm
          run={run}
          draft={draft}
          onDraftChange={onDraftChange}
          pending={pending === "down"}
          onSubmit={submitDown}
          onCancel={onDone}
        />
      ) : !feedback ? (
        <div className="p-3.5">
          <p className="text-[13px] text-zinc-600">
            {running ? "Review this run once it finishes." : "Was this run correct?"}
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={thumbsUp}
              disabled={running || pending !== null}
              className="hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              {pending === "up" ? <Loader2 className="animate-spin" /> : <ThumbsUp />}
              Good
            </Button>
            <Button
              variant="outline"
              onClick={onStartEdit}
              disabled={running || pending !== null}
              className="hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
            >
              <ThumbsDown />
              Bad
            </Button>
          </div>
        </div>
      ) : feedback.rating === "up" ? (
        <div className="p-3.5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-emerald-800">
            <span className="flex size-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/20 ring-inset">
              <ThumbsUp className="size-3.5" />
            </span>
            Marked as a good run
          </div>
          <div className="mt-2.5 flex gap-1.5">
            <Button size="xs" variant="outline" onClick={onStartEdit} disabled={pending !== null}>
              <ThumbsDown />
              Change to bad
            </Button>
            <Button size="xs" variant="ghost" onClick={clear} disabled={pending !== null} className="text-zinc-500">
              {pending === "clear" ? <Loader2 className="animate-spin" /> : <X />}
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 p-3.5">
          <div className="flex items-start gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 ring-1 ring-rose-600/20 ring-inset">
              <ThumbsDown className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-zinc-900">
                {feedback.rootCause ? ROOT_CAUSES[feedback.rootCause].label : "Thumbs down"}
              </div>
              {feedback.rootCause && (
                <p className="text-xs text-zinc-500">{ROOT_CAUSES[feedback.rootCause].hint}</p>
              )}
            </div>
          </div>
          {feedback.stepIndex !== undefined && run.steps[feedback.stepIndex] && (
            <button
              type="button"
              onClick={() => onJumpToStep(feedback.stepIndex!)}
              className="flex w-full items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1.5 text-left text-xs font-medium text-rose-800 ring-1 ring-rose-600/15 ring-inset hover:bg-rose-100"
            >
              <Flag className="size-3 shrink-0" />
              <span className="truncate">
                Blamed {stepLabel(run.steps[feedback.stepIndex], feedback.stepIndex)}
              </span>
              <span className="ml-auto shrink-0 text-rose-600">Jump →</span>
            </button>
          )}
          {feedback.note && (
            <p className="border-l-2 border-rose-200 pl-2 text-xs leading-relaxed break-words whitespace-pre-wrap text-zinc-700">
              {feedback.note}
            </p>
          )}
          {feedback.rootCause && ROOT_CAUSES[feedback.rootCause].fix && !feedback.resolved && (
            <p className="text-[11px] text-zinc-500">
              <span className="font-medium text-zinc-600">Likely fix:</span>{" "}
              {ROOT_CAUSES[feedback.rootCause].fix}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Button
              size="xs"
              variant={feedback.resolved ? "outline" : "default"}
              onClick={() => toggleResolved(!feedback.resolved)}
              disabled={pending !== null}
              className={cn(!feedback.resolved && "bg-emerald-600 text-white hover:bg-emerald-700")}
            >
              {pending === "resolve" ? (
                <Loader2 className="animate-spin" />
              ) : feedback.resolved ? (
                <Circle />
              ) : (
                <CheckCircle2 />
              )}
              {feedback.resolved ? "Reopen" : "Mark resolved"}
            </Button>
            <Button size="xs" variant="outline" onClick={onStartEdit} disabled={pending !== null}>
              <Pencil />
              Edit
            </Button>
            <Button size="xs" variant="ghost" onClick={clear} disabled={pending !== null} className="text-zinc-500">
              {pending === "clear" ? <Loader2 className="animate-spin" /> : <X />}
              Clear
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

const NO_STEP = "none";

function EditForm({
  run,
  draft,
  onDraftChange,
  pending,
  onSubmit,
  onCancel,
}: {
  run: AgentRun;
  draft: FeedbackDraft;
  onDraftChange: (draft: FeedbackDraft) => void;
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const stepItems: Record<string, string> = { [NO_STEP]: "No specific step" };
  run.steps.forEach((s, i) => {
    stepItems[String(i)] = stepLabel(s, i);
  });

  return (
    <form
      className="space-y-3.5 p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.rootCause) onSubmit();
      }}
    >
      <div className="flex items-center gap-2 text-[13px] font-medium text-rose-800">
        <ThumbsDown className="size-3.5" />
        What went wrong?
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
          Root cause
        </legend>
        <div className="space-y-1" role="radiogroup">
          {ROOT_CAUSE_ORDER.map((rc) => {
            const checked = draft.rootCause === rc;
            return (
              <label
                key={rc}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
                  checked
                    ? "border-rose-300 bg-rose-50/70"
                    : "border-transparent hover:bg-zinc-50",
                )}
              >
                <input
                  type="radio"
                  name="rootCause"
                  value={rc}
                  checked={checked}
                  onChange={() => onDraftChange({ ...draft, rootCause: rc })}
                  className="mt-0.5 accent-rose-600"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-zinc-900">
                    {ROOT_CAUSES[rc].label}
                  </span>
                  <span className="block text-[11px] leading-snug text-zinc-500">
                    {ROOT_CAUSES[rc].hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
            Blamed step
          </span>
          <span className="text-[10px] text-zinc-400">or click “Blame” on a step</span>
        </div>
        <Select
          items={stepItems}
          value={draft.stepIndex === undefined ? NO_STEP : String(draft.stepIndex)}
          onValueChange={(v) =>
            onDraftChange({
              ...draft,
              stepIndex: v === null || v === NO_STEP ? undefined : Number(v),
            })
          }
        >
          <SelectTrigger size="sm" className="w-full bg-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(stepItems).map(([value, label]) => (
              <SelectItem key={value} value={value} className="font-mono text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label
          htmlFor="feedback-note"
          className="mb-1.5 block text-[11px] font-semibold tracking-wide text-zinc-400 uppercase"
        >
          Note
        </label>
        <Textarea
          id="feedback-note"
          value={draft.note}
          onChange={(e) => onDraftChange({ ...draft, note: e.target.value })}
          placeholder="e.g. Searched for “bins” instead of “rubbish collection” and missed the article with the real pickup days."
          className="min-h-20 resize-y bg-white text-xs leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.rootCause) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="submit"
          size="sm"
          disabled={pending || !draft.rootCause}
          className="bg-rose-600 text-white hover:bg-rose-700"
        >
          {pending ? <Loader2 className="animate-spin" /> : <ThumbsDown />}
          Save feedback
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        {!draft.rootCause && (
          <span className="ml-auto text-[11px] text-zinc-400">Pick a root cause</span>
        )}
      </div>
    </form>
  );
}
