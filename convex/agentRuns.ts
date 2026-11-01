import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import schema, { channel } from "./schema";
import { normalizeEmail, normalizePhone } from "./lib/normalize";
import { buildingDoc, contactDoc, conversationDoc, messageDoc, unitDoc } from "./lib/validators";

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const runTable = schema.tables.agentRuns.validator;
export const agentRunDoc = runTable.extend({ _id: v.id("agentRuns"), _creationTime: v.number() });

const agentRunStatus = runTable.fields.status;
const trigger = v.union(v.literal("inbound"), v.literal("manual_rerun"));
const step = runTable.fields.steps.element;

/** A run still "running" after this long is assumed dead (action crashed / timed out). */
const STALE_RUN_MS = 10 * 60 * 1000;
const TRANSCRIPT_MESSAGES = 20;
const KB_BODY_LIMIT = 1500;
const KB_TITLE_SCAN_LIMIT = 500;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Convex values can't contain `undefined`; strip it (and anything non-JSON) from free-form values. */
function toStorable(value: unknown): unknown {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

// ---------------------------------------------------------------------------
// Public queries / mutations (UI)
// ---------------------------------------------------------------------------

export const latestForConversation = query({
  args: { conversationId: v.id("conversations") },
  returns: v.union(agentRunDoc, v.null()),
  handler: async (ctx, { conversationId }) => {
    return await ctx.db
      .query("agentRuns")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")
      .first();
  },
});

export const get = query({
  args: { runId: v.id("agentRuns") },
  returns: v.union(agentRunDoc, v.null()),
  handler: async (ctx, { runId }) => await ctx.db.get(runId),
});

export const list = query({
  args: { status: v.optional(agentRunStatus) },
  returns: v.array(
    agentRunDoc.extend({
      conversation: v.union(
        v.object({ _id: v.id("conversations"), displayName: v.string(), channel }),
        v.null(),
      ),
    }),
  ),
  handler: async (ctx, { status }) => {
    const runs = status
      ? await ctx.db
          .query("agentRuns")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(50)
      : await ctx.db.query("agentRuns").order("desc").take(50);
    const conversationIds = [...new Set(runs.map((r) => r.conversationId))];
    const conversations = new Map<Id<"conversations">, Doc<"conversations">>();
    await Promise.all(
      conversationIds.map(async (id) => {
        const c = await ctx.db.get(id);
        if (c) conversations.set(id, c);
      }),
    );
    return runs.map((run) => {
      const c = conversations.get(run.conversationId);
      return {
        ...run,
        conversation: c ? { _id: c._id, displayName: c.displayName, channel: c.channel } : null,
      };
    });
  },
});

export const rerun = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new ConvexError("Conversation not found.");

    const recentRuns = await ctx.db
      .query("agentRuns")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")
      .take(5);
    const now = Date.now();
    if (recentRuns.some((r) => r.status === "running" && now - r._creationTime < STALE_RUN_MS)) {
      throw new ConvexError("The agent is already working on this conversation.");
    }

    let triggerMessage: Doc<"messages"> | null = null;
    for await (const m of ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")) {
      if (m.direction === "inbound") {
        triggerMessage = m;
        break;
      }
    }
    if (!triggerMessage) throw new ConvexError("This conversation has no inbound message to answer.");

    await ctx.scheduler.runAfter(0, internal.agent.run, {
      conversationId,
      triggerMessageId: triggerMessage._id,
      trigger: "manual_rerun",
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Run lifecycle (internal, called by agent.run)
// ---------------------------------------------------------------------------

export const start = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    triggerMessageId: v.id("messages"),
    trigger,
    model: v.string(),
    systemPrompt: v.string(),
    input: v.string(),
  },
  returns: v.id("agentRuns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentRuns", { ...args, status: "running", steps: [] });
  },
});

export const appendStep = internalMutation({
  args: { runId: v.id("agentRuns"), step },
  returns: v.null(),
  handler: async (ctx, { runId, step }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new Error(`Agent run ${runId} not found`);
    const stored =
      step.kind === "tool"
        ? { ...step, args: toStorable(step.args), result: toStorable(step.result) }
        : step;
    await ctx.db.patch(runId, { steps: [...run.steps, stored] });
    return null;
  },
});

export const finish = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    status: v.union(v.literal("drafted"), v.literal("handoff"), v.literal("failed")),
    finalAnswer: v.optional(v.string()),
    confidence: v.optional(v.number()),
    handoffReason: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { runId, ...result }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new Error(`Agent run ${runId} not found`);
    const conversation = await ctx.db.get(run.conversationId);

    // If a newer run for this conversation exists (e.g. the tenant sent another message
    // while we were working), don't let this older run overwrite the conversation state.
    const newest = await ctx.db
      .query("agentRuns")
      .withIndex("by_conversation", (q) => q.eq("conversationId", run.conversationId))
      .order("desc")
      .first();
    const superseded = newest !== null && newest._id !== runId;

    let draftMessageId: Id<"messages"> | undefined;
    let error = result.error;
    if (!conversation) {
      error = error ?? "Conversation was deleted while the agent was running.";
    } else if (superseded) {
      error = error ?? "Superseded by a newer agent run; conversation left unchanged.";
    } else if (result.status === "drafted" && result.finalAnswer) {
      // Replace any older pending drafts with this one.
      const pending = await ctx.db
        .query("messages")
        .withIndex("by_conversation_status", (q) =>
          q.eq("conversationId", conversation._id).eq("status", "draft"),
        )
        .collect();
      for (const m of pending) await ctx.db.patch(m._id, { status: "discarded" });

      draftMessageId = await ctx.db.insert("messages", {
        conversationId: conversation._id,
        direction: "outbound",
        channel: conversation.channel,
        author: "agent",
        body: result.finalAnswer,
        status: "draft",
        agentRunId: runId,
      });
      // Drafts don't touch the preview / lastMessageAt (see messages.discardDraft).
      await ctx.db.patch(conversation._id, { status: "awaiting_approval" });
    } else {
      await ctx.db.patch(conversation._id, { status: "needs_human" });
    }

    await ctx.db.patch(runId, {
      status: result.status,
      finalAnswer: result.finalAnswer,
      confidence: result.confidence,
      handoffReason: result.handoffReason,
      error,
      draftMessageId,
      durationMs: result.durationMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Context for the model
// ---------------------------------------------------------------------------

async function senderContact(ctx: QueryCtx, conversation: Doc<"conversations">) {
  return conversation.contactId ? await ctx.db.get(conversation.contactId) : null;
}

async function unitAndBuilding(ctx: QueryCtx, contact: Doc<"contacts"> | null) {
  const unit = contact?.unitId ? await ctx.db.get(contact.unitId) : null;
  const buildingId = contact?.buildingId ?? unit?.buildingId;
  const building = buildingId ? await ctx.db.get(buildingId) : null;
  return { unit, building };
}

export const getContext = internalQuery({
  args: { conversationId: v.id("conversations"), triggerMessageId: v.id("messages") },
  returns: v.union(
    v.object({
      conversation: conversationDoc,
      contact: v.union(contactDoc, v.null()),
      unit: v.union(unitDoc, v.null()),
      building: v.union(buildingDoc, v.null()),
      messages: v.array(messageDoc),
      triggerMessageId: v.id("messages"),
    }),
    v.null(),
  ),
  handler: async (ctx, { conversationId, triggerMessageId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    const trigger = await ctx.db.get(triggerMessageId);
    const contact = await senderContact(ctx, conversation);
    const { unit, building } = await unitAndBuilding(ctx, contact);

    // Newest first, skipping discarded drafts and pending drafts (they'll be replaced),
    // and anything that arrived after the trigger message.
    const cutoff = trigger?._creationTime ?? Number.POSITIVE_INFINITY;
    const messages: Doc<"messages">[] = [];
    for await (const m of ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")) {
      if (m._creationTime > cutoff) continue;
      if (m.status === "discarded" || m.status === "draft") continue;
      messages.push(m);
      if (messages.length >= TRANSCRIPT_MESSAGES) break;
    }
    messages.reverse();
    return { conversation, contact, unit, building, messages, triggerMessageId };
  },
});

// ---------------------------------------------------------------------------
// Tool backends. Each returns a plain JSON object; an `error` key marks a tool error.
// ---------------------------------------------------------------------------

async function contactSummary(
  ctx: QueryCtx,
  contact: Doc<"contacts">,
  senderId: Id<"contacts"> | undefined,
) {
  const { unit, building } = await unitAndBuilding(ctx, contact);
  return {
    contact_id: contact._id,
    is_sender: contact._id === senderId,
    name: contact.name,
    role: contact.role,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    move_in_date: contact.moveInDate ?? null,
    unit_id: unit?._id ?? null,
    unit_label: unit?.label ?? null,
    building_id: building?._id ?? null,
    building_name: building?.name ?? null,
    building_address: building ? `${building.street}, ${building.postalCode} ${building.city}` : null,
  };
}

const PHONE_LIKE = /^[+\d][\d\s()/.-]{5,}$/;

export const toolLookupTenant = internalQuery({
  args: { conversationId: v.id("conversations"), query: v.union(v.string(), v.null()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return { error: "Conversation not found." };
    const senderId = conversation.contactId;
    const q = args.query?.trim() ?? "";

    let matches: Doc<"contacts">[] = [];
    let searchedBy: string;
    if (!q) {
      searchedBy = "sender";
      const sender = await senderContact(ctx, conversation);
      if (!sender) {
        return {
          found: false,
          searched_by: searchedBy,
          note: `The sender (${conversation.channel}: ${conversation.handle}, display name "${conversation.displayName}") is not a known contact.`,
        };
      }
      matches = [sender];
    } else if (q.includes("@")) {
      searchedBy = "email";
      matches = await ctx.db
        .query("contacts")
        .withIndex("by_email", (x) => x.eq("email", normalizeEmail(q)))
        .take(5);
    } else if (PHONE_LIKE.test(q)) {
      searchedBy = "phone";
      matches = await ctx.db
        .query("contacts")
        .withIndex("by_phone", (x) => x.eq("phone", normalizePhone(q)))
        .take(5);
    } else {
      searchedBy = "name";
      matches = await ctx.db
        .query("contacts")
        .withSearchIndex("search_name", (x) => x.search("name", q))
        .take(5);
    }

    if (matches.length === 0) return { found: false, searched_by: searchedBy, query: q };
    return {
      found: true,
      searched_by: searchedBy,
      contacts: await Promise.all(matches.map((c) => contactSummary(ctx, c, senderId))),
    };
  },
});

function ticketSummary(t: Doc<"tickets">) {
  return {
    ticket_id: t._id,
    title: t.title,
    description: truncate(t.description, 400),
    category: t.category,
    priority: t.priority,
    status: t.status,
    created_at: new Date(t._creationTime).toISOString().slice(0, 10),
    created_by: t.createdBy,
  };
}

export const toolGetUnitInfo = internalQuery({
  args: { unitId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const unitId = ctx.db.normalizeId("units", args.unitId.trim());
    if (!unitId) return { error: `"${args.unitId}" is not a valid unit id. Use unit_id from lookup_tenant.` };
    const unit = await ctx.db.get(unitId);
    if (!unit) return { error: `Unit ${args.unitId} not found.` };
    const building = await ctx.db.get(unit.buildingId);
    const tenants = await ctx.db
      .query("contacts")
      .withIndex("by_unit", (q) => q.eq("unitId", unitId))
      .take(10);
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_unit", (q) => q.eq("unitId", unitId))
      .order("desc")
      .take(50);
    const openTickets = tickets.filter((t) => t.status !== "resolved");
    return {
      unit: {
        unit_id: unit._id,
        label: unit.label,
        floor: unit.floor,
        rooms: unit.rooms,
        size_sqm: unit.sizeSqm,
        rent_eur: unit.rentCents / 100,
      },
      building: building
        ? {
            building_id: building._id,
            name: building.name,
            address: `${building.street}, ${building.postalCode} ${building.city}`,
            year_built: building.yearBuilt ?? null,
          }
        : null,
      tenants: tenants.map((c) => ({
        contact_id: c._id,
        name: c.name,
        role: c.role,
        move_in_date: c.moveInDate ?? null,
      })),
      open_tickets: openTickets.map(ticketSummary),
    };
  },
});

export const toolSearchKnowledgeBase = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    query: v.string(),
    category: v.union(schema.tables.knowledgeBase.validator.fields.category, v.null()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (!q) return { error: "query must not be empty." };
    const conversation = await ctx.db.get(args.conversationId);
    const contact = conversation ? await senderContact(ctx, conversation) : null;
    const { building } = await unitAndBuilding(ctx, contact);
    const category = args.category;

    const hits = await ctx.db
      .query("knowledgeBase")
      .withSearchIndex("search_body", (s) =>
        category ? s.search("body", q).eq("category", category) : s.search("body", q),
      )
      .take(15);

    // The search index only covers `body`; titles often hold the key word ("Rubbish ...").
    // The KB is small, so a bounded scan for title matches is cheap. Title hits rank first.
    const words = q.toLowerCase().split(/\W+/).filter((w) => w.length >= 3);
    const titleHits =
      words.length === 0
        ? []
        : (await ctx.db.query("knowledgeBase").take(KB_TITLE_SCAN_LIMIT)).filter(
            (a) =>
              (!category || a.category === category) &&
              a.title
                .toLowerCase()
                .split(/\W+/)
                .some((t) => words.some((w) => t.startsWith(w))),
          );

    const seen = new Set<Id<"knowledgeBase">>();
    // Global articles always apply; building-specific ones only to that building's tenants.
    const applicable = [...titleHits, ...hits]
      .filter((a) => !seen.has(a._id) && (seen.add(a._id), true))
      .filter((a) => !a.buildingId || a.buildingId === building?._id)
      .slice(0, 5);

    const buildingNames = new Map<Id<"buildings">, string>();
    for (const a of applicable) {
      if (a.buildingId && !buildingNames.has(a.buildingId)) {
        const b = await ctx.db.get(a.buildingId);
        buildingNames.set(a.buildingId, b?.name ?? "unknown building");
      }
    }

    return {
      query: q,
      category,
      result_count: applicable.length,
      ...(applicable.length === 0
        ? { note: "No matching articles. Try other keywords; if nothing applies, do not guess — hand off." }
        : {}),
      results: applicable.map((a) => ({
        article_id: a._id,
        title: a.title,
        category: a.category,
        scope: a.buildingId ? `building: ${buildingNames.get(a.buildingId)}` : "global",
        body: truncate(a.body, KB_BODY_LIMIT),
      })),
    };
  },
});

export const toolCreateTicket = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    runId: v.id("agentRuns"),
    title: v.string(),
    description: v.string(),
    category: schema.tables.tickets.validator.fields.category,
    priority: schema.tables.tickets.validator.fields.priority,
    unitId: v.union(v.string(), v.null()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return { error: "Conversation not found." };
    const contact = await senderContact(ctx, conversation);

    let unitId: Id<"units"> | undefined;
    if (args.unitId?.trim()) {
      const normalized = ctx.db.normalizeId("units", args.unitId.trim());
      if (!normalized || !(await ctx.db.get(normalized))) {
        return { error: `"${args.unitId}" is not a valid unit id. Use unit_id from lookup_tenant, or null.` };
      }
      unitId = normalized;
    } else {
      unitId = contact?.unitId;
    }
    const title = args.title.trim();
    const description = args.description.trim();
    if (!title || !description) return { error: "title and description must not be empty." };

    const ticketId = await ctx.db.insert("tickets", {
      title,
      description,
      category: args.category,
      priority: args.priority,
      status: "open",
      unitId,
      contactId: contact?._id,
      conversationId: conversation._id,
      createdBy: "agent",
      agentRunId: args.runId,
    });

    const unit = unitId ? await ctx.db.get(unitId) : null;
    const building = unit ? await ctx.db.get(unit.buildingId) : null;
    return {
      created: true,
      ticket_id: ticketId,
      title,
      category: args.category,
      priority: args.priority,
      status: "open",
      unit_label: unit?.label ?? null,
      building_name: building?.name ?? null,
      ...(unitId ? {} : { note: "Ticket has no unit attached (sender has no known unit)." }),
    };
  },
});
