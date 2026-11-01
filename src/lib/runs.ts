import type { FunctionReturnType } from "convex/server";
import {
  BookOpen,
  Building2,
  Hand,
  PenLine,
  UserSearch,
  Wrench,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import type { api } from "@convex/_generated/api";
import type { AgentRun, AgentRunStatus, AgentStep } from "@/lib/agent";

export type RunFeedback = NonNullable<AgentRun["feedback"]>;
export type RootCause = NonNullable<RunFeedback["rootCause"]>;
export type FeedbackRating = RunFeedback["rating"];
export type ModelStep = Extract<AgentStep, { kind: "model" }>;
export type ToolStep = Extract<AgentStep, { kind: "tool" }>;

export type RunListItem = FunctionReturnType<typeof api.agentRuns.list>[number];
export type RunDetail = NonNullable<FunctionReturnType<typeof api.agentRuns.get>>;
export type RunStats = FunctionReturnType<typeof api.agentRuns.stats>;
export type ConversationRun = FunctionReturnType<
  typeof api.agentRuns.forConversation
>[number];

export type RunStatusFilter = AgentRunStatus | "all";
export type RunFeedbackFilter = "any" | "unresolved" | "down" | "up";

export const RUN_STATUSES: Record<
  AgentRunStatus,
  { label: string; dot: string; badge: string; bar: string }
> = {
  running: {
    label: "Running",
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700 ring-violet-600/20",
    bar: "bg-violet-500",
  },
  drafted: {
    label: "Drafted",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    bar: "bg-emerald-500",
  },
  handoff: {
    label: "Handoff",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/25",
    bar: "bg-amber-500",
  },
  failed: {
    label: "Failed",
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
    bar: "bg-rose-500",
  },
};

export const RUN_STATUS_FILTERS: { value: RunStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "drafted", label: "Drafted" },
  { value: "handoff", label: "Handoff" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
];

export const ROOT_CAUSES: Record<
  RootCause,
  { label: string; hint: string; fix: string }
> = {
  retrieval_miss: {
    label: "Retrieval miss",
    hint: "The knowledge-base search didn't surface the right article.",
    fix: "Tune the search query guidance or the article wording.",
  },
  missing_knowledge: {
    label: "Missing knowledge",
    hint: "The answer isn't in the knowledge base at all.",
    fix: "Write the missing article.",
  },
  wrong_tool: {
    label: "Wrong tool",
    hint: "Called the wrong tool, or skipped one it needed.",
    fix: "Clarify tool descriptions / system prompt.",
  },
  bad_tool_args: {
    label: "Bad tool arguments",
    hint: "Right tool, but called with the wrong arguments.",
    fix: "Tighten the tool's input schema or examples.",
  },
  reasoning: {
    label: "Reasoning",
    hint: "Had the right facts but drew the wrong conclusion.",
    fix: "Add a rule or example to the system prompt.",
  },
  should_have_handed_off: {
    label: "Should have handed off",
    hint: "Answered something a human should have handled.",
    fix: "Sharpen the handoff rules.",
  },
  tone: {
    label: "Tone / wording",
    hint: "Content was fine, but the wording or tone was off.",
    fix: "Adjust the style guidance.",
  },
  other: {
    label: "Other",
    hint: "Something else — describe it in the note.",
    fix: "",
  },
};

export const ROOT_CAUSE_ORDER = Object.keys(ROOT_CAUSES) as RootCause[];

export const TERMINAL_TOOLS = new Set(["draft_reply", "handoff_to_human"]);

export const TOOLS: Record<
  string,
  { label: string; icon: LucideIcon; tone: string; chip: string }
> = {
  lookup_tenant: {
    label: "Lookup tenant",
    icon: UserSearch,
    tone: "bg-sky-50 text-sky-700 ring-sky-600/20",
    chip: "text-sky-700",
  },
  get_unit_info: {
    label: "Get unit info",
    icon: Building2,
    tone: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    chip: "text-indigo-700",
  },
  search_knowledge_base: {
    label: "Search knowledge base",
    icon: BookOpen,
    tone: "bg-teal-50 text-teal-700 ring-teal-600/20",
    chip: "text-teal-700",
  },
  create_maintenance_ticket: {
    label: "Create maintenance ticket",
    icon: Wrench,
    tone: "bg-orange-50 text-orange-700 ring-orange-600/20",
    chip: "text-orange-700",
  },
  draft_reply: {
    label: "Draft reply",
    icon: PenLine,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    chip: "text-emerald-700",
  },
  handoff_to_human: {
    label: "Hand off to human",
    icon: Hand,
    tone: "bg-amber-50 text-amber-800 ring-amber-600/25",
    chip: "text-amber-800",
  },
};

export function toolMeta(name: string) {
  return (
    TOOLS[name] ?? {
      label: name.replace(/_/g, " "),
      icon: Puzzle,
      tone: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
      chip: "text-zinc-700",
    }
  );
}

export function formatDuration(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

export function formatTokens(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  if (n < 1000) return String(Math.round(n));
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

export function runTokens(run: {
  inputTokens?: number;
  outputTokens?: number;
}): number | undefined {
  if (run.inputTokens === undefined && run.outputTokens === undefined) return undefined;
  return (run.inputTokens ?? 0) + (run.outputTokens ?? 0);
}

export function formatPercent(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

/** Plain object guard for free-form tool args / results. */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** One-line description of a step, used in the blame selector and tooltips. */
export function stepLabel(step: AgentStep, index: number): string {
  if (step.kind === "model") {
    return `#${index + 1} · Claude turn (${step.stopReason})`;
  }
  return `#${index + 1} · ${step.name}${step.isError ? " (error)" : ""}`;
}

export function formatRelativeTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  if (diff < 45_000) return "just now";
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(diff / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(diff / 86_400_000);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export const TRIGGERS = {
  inbound: { label: "Inbound", short: "inbound" },
  manual_rerun: { label: "Re-run", short: "re-run" },
} as const;
