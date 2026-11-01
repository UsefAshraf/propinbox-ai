import { ConvexError } from "convex/values";
import type { Doc } from "@convex/_generated/dataModel";

export type AgentRun = Doc<"agentRuns">;
export type AgentRunStatus = AgentRun["status"];
export type AgentStep = AgentRun["steps"][number];

/** Present-tense progress label for each agent tool, shown while a run is live. */
const TOOL_PROGRESS: Record<string, string> = {
  lookup_tenant: "Looking up tenant…",
  get_unit_info: "Checking unit…",
  search_knowledge_base: "Searching knowledge base…",
  create_maintenance_ticket: "Creating maintenance ticket…",
  draft_reply: "Writing the reply…",
  handoff_to_human: "Handing off to a human…",
};

export function toolProgressLabel(name: string): string {
  return (
    TOOL_PROGRESS[name] ??
    `Running ${name.replace(/_/g, " ")}…`
  );
}

/** What the agent is doing right now, derived from the last persisted step. */
export function runProgressLabel(run: AgentRun): string {
  const last = run.steps.at(-1);
  if (!last) return "Reading the conversation…";
  if (last.kind === "tool") return toolProgressLabel(last.name);
  // A model turn just finished; the next tool call (or final answer) is in flight.
  return "Thinking…";
}

export function runHref(runId: string): string {
  return `/runs/${runId}`;
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/** Tone for a 0..1 confidence score — matches the default 0.7 handoff threshold. */
export function confidenceTone(confidence: number): string {
  if (confidence >= 0.85) return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  if (confidence >= 0.7) return "bg-amber-50 text-amber-800 ring-amber-600/25";
  return "bg-rose-50 text-rose-700 ring-rose-600/20";
}

/** User-facing message for a failed Convex call (ConvexError data, else Error.message). */
export function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    const data: unknown = err.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message: unknown }).message);
    }
    return JSON.stringify(data);
  }
  return err instanceof Error ? err.message : String(err);
}
