import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaMessage,
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  AGENT_TOOLS,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  MAX_MODEL_TURNS,
  MAX_TOKENS,
  SYSTEM_PROMPT,
  isTerminalTool,
  type CreateMaintenanceTicketInput,
  type DraftReplyInput,
  type GetUnitInfoInput,
  type HandoffToHumanInput,
  type LookupTenantInput,
  type SearchKnowledgeBaseInput,
} from "./lib/agentTools";

type Trigger = "inbound" | "manual_rerun";
type RunArgs = {
  conversationId: Id<"conversations">;
  triggerMessageId: Id<"messages">;
  trigger: Trigger;
};

/** How the run ended — maps 1:1 onto `agentRuns.finish`. */
type Outcome = {
  status: "drafted" | "handoff" | "failed";
  finalAnswer?: string;
  confidence?: number;
  handoffReason?: string;
  error?: string;
};

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

function config() {
  const effortEnv = process.env.AGENT_EFFORT as Effort | undefined;
  const threshold = Number(process.env.AGENT_CONFIDENCE_THRESHOLD);
  return {
    model: process.env.AGENT_MODEL?.trim() || DEFAULT_MODEL,
    effort: effortEnv && EFFORTS.includes(effortEnv) ? effortEnv : DEFAULT_EFFORT,
    threshold:
      Number.isFinite(threshold) && threshold >= 0 && threshold <= 1
        ? threshold
        : DEFAULT_CONFIDENCE_THRESHOLD,
  };
}

export const run = internalAction({
  args: {
    conversationId: v.id("conversations"),
    triggerMessageId: v.id("messages"),
    trigger: v.union(v.literal("inbound"), v.literal("manual_rerun")),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await runAgent(ctx, args);
    return null;
  },
});

async function runAgent(ctx: ActionCtx, args: RunArgs): Promise<void> {
  const startedAt = Date.now();
  const { model, effort, threshold } = config();

  const context = await ctx.runQuery(internal.agentRuns.getContext, {
    conversationId: args.conversationId,
    triggerMessageId: args.triggerMessageId,
  });
  if (!context) return; // conversation deleted before we got to it

  const input = renderInput(context, new Date(startedAt));
  const runId: Id<"agentRuns"> = await ctx.runMutation(internal.agentRuns.start, {
    ...args,
    model,
    systemPrompt: SYSTEM_PROMPT,
    input,
  });

  const totals = { inputTokens: 0, outputTokens: 0 };
  const finish = (outcome: Outcome) =>
    ctx.runMutation(internal.agentRuns.finish, {
      runId,
      ...outcome,
      durationMs: Date.now() - startedAt,
      ...totals,
    });

  if (!process.env.ANTHROPIC_API_KEY) {
    await finish({
      status: "failed",
      handoffReason: "Agent could not run",
      error: "ANTHROPIC_API_KEY is not set — run `npx convex env set ANTHROPIC_API_KEY ...`",
    });
    return;
  }

  try {
    const outcome = await toolLoop(ctx, { runId, model, effort, threshold, input, totals, args });
    await finish(outcome);
  } catch (err) {
    await finish({ status: "failed", handoffReason: "Agent error", error: describeError(err) });
  }
}

// ---------------------------------------------------------------------------
// The manual tool-use loop
// ---------------------------------------------------------------------------

type LoopParams = {
  runId: Id<"agentRuns">;
  model: string;
  effort: Effort;
  threshold: number;
  input: string;
  totals: { inputTokens: number; outputTokens: number };
  args: RunArgs;
};

async function toolLoop(ctx: ActionCtx, p: LoopParams): Promise<Outcome> {
  const client = new Anthropic({ timeout: 120_000 });
  const messages: BetaMessageParam[] = [{ role: "user", content: p.input }];

  for (let turn = 1; turn <= MAX_MODEL_TURNS; turn++) {
    const t0 = Date.now();
    const response: BetaMessage = await client.beta.messages.create({
      model: p.model,
      max_tokens: MAX_TOKENS,
      // Cache breakpoint on the (byte-stable) system prompt caches tools + system.
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: AGENT_TOOLS,
      tool_choice: { type: "auto" },
      thinking: { type: "adaptive" },
      output_config: { effort: p.effort },
      messages,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    const usage = response.usage;
    const inputTokens =
      usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
    p.totals.inputTokens += inputTokens;
    p.totals.outputTokens += usage.output_tokens;
    const text = textOf(response.content);
    await ctx.runMutation(internal.agentRuns.appendStep, {
      runId: p.runId,
      step: {
        kind: "model",
        text,
        stopReason: response.stop_reason ?? "unknown",
        inputTokens,
        outputTokens: usage.output_tokens,
        durationMs: Date.now() - t0,
      },
    });

    if (response.stop_reason === "refusal") {
      const details = response.stop_details;
      const why = [details?.category, details?.explanation].filter(Boolean).join(": ");
      return {
        status: "handoff",
        handoffReason: "Model declined to answer",
        error: `Model refused${why ? ` (${why})` : ""}.`,
        finalAnswer: text || undefined,
      };
    }
    if (response.stop_reason === "max_tokens") {
      return {
        status: "failed",
        handoffReason: "Model output was cut off",
        error: `Model hit max_tokens (${MAX_TOKENS}).`,
      };
    }

    const toolUses = response.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      // Ended without a terminal tool: treat as a handoff and keep whatever it said.
      return {
        status: "handoff",
        handoffReason: "agent ended without calling a terminal tool",
        finalAnswer: text || undefined,
      };
    }

    // Run the regular tools first (in order), then the first terminal tool, if any.
    const regular = toolUses.filter((b) => !isTerminalTool(b.name));
    const terminal = toolUses.find((b) => isTerminalTool(b.name));

    const results: BetaToolResultBlockParam[] = [];
    for (const block of regular) {
      const { result, isError } = await executeTool(ctx, p, block);
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
        ...(isError ? { is_error: true } : {}),
      });
    }

    if (terminal) return await finishWithTerminal(ctx, p, terminal);

    // Pass the full assistant content back unchanged (thinking blocks included).
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: results });
  }

  return {
    status: "handoff",
    handoffReason: "step limit reached",
    error: `Agent did not finish within ${MAX_MODEL_TURNS} model turns.`,
  };
}

/** Executes one non-terminal tool and records it as a step. */
async function executeTool(
  ctx: ActionCtx,
  p: LoopParams,
  block: BetaToolUseBlock,
): Promise<{ result: unknown; isError: boolean }> {
  const t0 = Date.now();
  let result: unknown;
  let isError = false;
  try {
    result = await dispatchTool(ctx, p, block.name, block.input);
    isError = typeof result === "object" && result !== null && "error" in result;
  } catch (err) {
    result = { error: err instanceof Error ? err.message : String(err) };
    isError = true;
  }
  await ctx.runMutation(internal.agentRuns.appendStep, {
    runId: p.runId,
    step: { kind: "tool", name: block.name, args: block.input ?? null, result, isError, durationMs: Date.now() - t0 },
  });
  return { result, isError };
}

async function dispatchTool(ctx: ActionCtx, p: LoopParams, name: string, input: unknown): Promise<unknown> {
  const conversationId = p.args.conversationId;
  switch (name) {
    case "lookup_tenant": {
      const { query } = input as LookupTenantInput;
      return await ctx.runQuery(internal.agentRuns.toolLookupTenant, { conversationId, query: query ?? null });
    }
    case "get_unit_info": {
      const { unit_id } = input as GetUnitInfoInput;
      return await ctx.runQuery(internal.agentRuns.toolGetUnitInfo, { unitId: String(unit_id ?? "") });
    }
    case "search_knowledge_base": {
      const { query, category } = input as SearchKnowledgeBaseInput;
      return await ctx.runQuery(internal.agentRuns.toolSearchKnowledgeBase, {
        conversationId,
        query: String(query ?? ""),
        category: category ?? null,
      });
    }
    case "create_maintenance_ticket": {
      const t = input as CreateMaintenanceTicketInput;
      return await ctx.runMutation(internal.agentRuns.toolCreateTicket, {
        conversationId,
        runId: p.runId,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        unitId: t.unit_id ?? null,
      });
    }
    default:
      return { error: `Unknown tool "${name}".` };
  }
}

/** Records the terminal tool call as a step and turns it into the run outcome. */
async function finishWithTerminal(
  ctx: ActionCtx,
  p: LoopParams,
  block: BetaToolUseBlock,
): Promise<Outcome> {
  let outcome: Outcome;
  if (block.name === "draft_reply") {
    const { reply, confidence, reasoning } = block.input as DraftReplyInput;
    const conf = Math.min(1, Math.max(0, Number(confidence) || 0));
    const body = String(reply ?? "").trim();
    if (!body) {
      outcome = { status: "handoff", handoffReason: "Agent produced an empty reply", confidence: conf };
    } else if (conf < p.threshold) {
      outcome = {
        status: "handoff",
        finalAnswer: body,
        confidence: conf,
        handoffReason: `Low confidence (${conf.toFixed(2)} < ${p.threshold}): ${reasoning}`,
      };
    } else {
      outcome = { status: "drafted", finalAnswer: body, confidence: conf };
    }
  } else {
    const { reason, summary, suggested_reply } = block.input as HandoffToHumanInput;
    outcome = {
      status: "handoff",
      handoffReason: summary ? `${reason}\n\nSummary: ${summary}` : reason,
      finalAnswer: suggested_reply?.trim() || undefined,
    };
  }

  await ctx.runMutation(internal.agentRuns.appendStep, {
    runId: p.runId,
    step: {
      kind: "tool",
      name: block.name,
      args: block.input ?? null,
      result: { outcome: outcome.status, ...(outcome.handoffReason ? { handoff_reason: outcome.handoffReason } : {}) },
      isError: false,
      durationMs: 0,
    },
  });
  return outcome;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function textOf(content: BetaContentBlock[]): string {
  return content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n")
    .trim();
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Anthropic rejected the API key (401). Check ANTHROPIC_API_KEY in the Convex env.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Anthropic rate limit hit (429) — try Re-run in a minute.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error${err.status ? ` ${err.status}` : ""}: ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

type AgentContext = {
  conversation: Doc<"conversations">;
  contact: Doc<"contacts"> | null;
  unit: Doc<"units"> | null;
  building: Doc<"buildings"> | null;
  messages: Doc<"messages">[];
  triggerMessageId: Id<"messages">;
};

/** Renders the first user message: today's date, sender basics and the transcript. */
function renderInput(c: AgentContext, now: Date): string {
  const { conversation, contact } = c;
  const lines: string[] = [];
  lines.push(`Today is ${WEEKDAYS[now.getUTCDay()]}, ${now.toISOString().slice(0, 10)}.`);
  lines.push("");
  lines.push(`Channel: ${conversation.channel}`);
  if (conversation.subject) lines.push(`Subject: ${conversation.subject}`);
  if (contact) {
    lines.push(`Sender: ${contact.name} (known ${contact.role}, ${conversation.channel} handle ${conversation.handle})`);
  } else {
    lines.push(
      `Sender: unknown sender — ${conversation.channel} handle ${conversation.handle}` +
        (conversation.displayName !== conversation.handle ? `, calls themselves "${conversation.displayName}"` : ""),
    );
  }
  lines.push("");
  lines.push(`Conversation (oldest first, last ${c.messages.length} messages):`);
  for (const m of c.messages) {
    const who =
      m.direction === "inbound"
        ? "SENDER"
        : m.author === "agent"
          ? "PROPERTY TEAM (agent draft, approved)"
          : "PROPERTY TEAM (staff)";
    const marker = m._id === c.triggerMessageId ? "  <-- reply to this message" : "";
    const body = m.body.length > 2000 ? `${m.body.slice(0, 1999)}…` : m.body;
    lines.push("");
    lines.push(`[${formatTime(m.sentAt ?? m._creationTime)}] ${who}:${marker}`);
    lines.push(body);
  }
  lines.push("");
  lines.push("Prepare the reply to the latest sender message. Remember to finish with draft_reply or handoff_to_human.");
  return lines.join("\n");
}
