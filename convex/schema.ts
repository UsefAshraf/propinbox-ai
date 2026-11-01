import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const channel = v.union(
  v.literal("email"),
  v.literal("whatsapp"),
  v.literal("phone"),
);

export const conversationStatus = v.union(
  v.literal("open"), // new / unhandled
  v.literal("awaiting_approval"), // agent drafted a reply, human must approve
  v.literal("needs_human"), // agent handed off
  v.literal("closed"),
);

export const messageStatus = v.union(
  v.literal("received"), // inbound from contact
  v.literal("draft"), // outbound written by the agent, not yet sent
  v.literal("sent"), // outbound, approved / written by staff
  v.literal("discarded"), // rejected draft
);

export default defineSchema({
  buildings: defineTable({
    name: v.string(),
    street: v.string(),
    postalCode: v.string(),
    city: v.string(),
    yearBuilt: v.optional(v.number()),
    externalId: v.optional(v.string()), // id from CSV import, used for upserts
  }).index("by_externalId", ["externalId"]),

  units: defineTable({
    buildingId: v.id("buildings"),
    label: v.string(), // e.g. "3B"
    floor: v.number(),
    rooms: v.number(),
    sizeSqm: v.number(),
    rentCents: v.number(),
    externalId: v.optional(v.string()),
  })
    .index("by_building", ["buildingId"])
    .index("by_externalId", ["externalId"]),

  contacts: defineTable({
    name: v.string(),
    role: v.union(v.literal("tenant"), v.literal("owner"), v.literal("vendor")),
    email: v.optional(v.string()), // stored lowercased
    phone: v.optional(v.string()), // stored E.164, e.g. +4915112345678 (also used for WhatsApp)
    unitId: v.optional(v.id("units")),
    buildingId: v.optional(v.id("buildings")),
    moveInDate: v.optional(v.string()), // ISO date
    externalId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_unit", ["unitId"])
    .index("by_externalId", ["externalId"])
    .searchIndex("search_name", { searchField: "name" }),

  conversations: defineTable({
    channel,
    // Raw sender address on that channel (email address or E.164 phone). Used to thread
    // new inbound messages onto an existing conversation.
    handle: v.string(),
    contactId: v.optional(v.id("contacts")), // unset when the sender is unknown
    displayName: v.string(),
    subject: v.optional(v.string()),
    status: conversationStatus,
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
    unread: v.boolean(),
  })
    .index("by_lastMessageAt", ["lastMessageAt"])
    .index("by_status_lastMessageAt", ["status", "lastMessageAt"])
    .index("by_channel_handle", ["channel", "handle"])
    .index("by_contact", ["contactId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    channel,
    author: v.union(v.literal("contact"), v.literal("agent"), v.literal("staff")),
    body: v.string(),
    status: messageStatus,
    agentRunId: v.optional(v.id("agentRuns")),
    sentAt: v.optional(v.number()),
  }).index("by_conversation", ["conversationId"]),

  tickets: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("heating"),
      v.literal("appliance"),
      v.literal("structural"),
      v.literal("pest"),
      v.literal("other"),
    ),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved")),
    unitId: v.optional(v.id("units")),
    contactId: v.optional(v.id("contacts")),
    conversationId: v.optional(v.id("conversations")),
    createdBy: v.union(v.literal("agent"), v.literal("staff")),
    agentRunId: v.optional(v.id("agentRuns")),
  })
    .index("by_status", ["status"])
    .index("by_unit", ["unitId"])
    .index("by_conversation", ["conversationId"]),

  knowledgeBase: defineTable({
    title: v.string(),
    body: v.string(),
    category: v.union(v.literal("house_rules"), v.literal("faq"), v.literal("procedures")),
    buildingId: v.optional(v.id("buildings")), // unset = applies to all buildings
  }).searchIndex("search_body", {
    searchField: "body",
    filterFields: ["category", "buildingId"],
  }),

  agentRuns: defineTable({
    conversationId: v.id("conversations"),
    triggerMessageId: v.id("messages"),
    status: v.union(
      v.literal("running"),
      v.literal("drafted"), // produced a draft reply
      v.literal("handoff"), // handed off to a human
      v.literal("failed"),
    ),
    model: v.string(),
    systemPrompt: v.string(),
    input: v.string(), // conversation transcript given to the model
    steps: v.array(
      v.union(
        v.object({
          kind: v.literal("model"),
          text: v.string(),
          stopReason: v.string(),
          inputTokens: v.number(),
          outputTokens: v.number(),
          durationMs: v.number(),
        }),
        v.object({
          kind: v.literal("tool"),
          name: v.string(),
          args: v.any(),
          result: v.any(),
          isError: v.boolean(),
          durationMs: v.number(),
        }),
      ),
    ),
    finalAnswer: v.optional(v.string()),
    confidence: v.optional(v.number()), // 0..1, self-reported
    handoffReason: v.optional(v.string()),
    error: v.optional(v.string()),
    draftMessageId: v.optional(v.id("messages")),
    durationMs: v.optional(v.number()),
    feedback: v.optional(
      v.object({
        rating: v.union(v.literal("up"), v.literal("down")),
        note: v.optional(v.string()),
        stepIndex: v.optional(v.number()), // which step the reviewer blames
        at: v.number(),
      }),
    ),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_status", ["status"]),

  importJobs: defineTable({
    fileName: v.string(),
    storageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    totalRows: v.number(),
    processedRows: v.number(),
    insertedRows: v.number(),
    errorCount: v.number(),
    errors: v.array(v.object({ row: v.number(), message: v.string() })), // capped
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  }),
});
