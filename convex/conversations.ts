import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { channel, conversationStatus } from "./schema";
import { buildingDoc, contactDoc, conversationDoc, unitDoc } from "./lib/validators";

const LIST_LIMIT = 100;

const contactSummary = v.object({
  _id: v.id("contacts"),
  name: v.string(),
  role: v.union(v.literal("tenant"), v.literal("owner"), v.literal("vendor")),
  unitLabel: v.union(v.string(), v.null()),
  buildingName: v.union(v.string(), v.null()),
});

/** Fetch a set of docs by id once each (dedupes repeated ids). */
async function loadMany<T extends "contacts" | "units" | "buildings">(
  ctx: QueryCtx,
  ids: Iterable<Id<T>>,
): Promise<Map<Id<T>, Doc<T>>> {
  const unique = [...new Set(ids)];
  const docs = await Promise.all(unique.map((id) => ctx.db.get(id)));
  const map = new Map<Id<T>, Doc<T>>();
  docs.forEach((doc, i) => {
    if (doc) map.set(unique[i], doc as Doc<T>);
  });
  return map;
}

export const list = query({
  args: {
    status: v.optional(v.union(conversationStatus, v.literal("all"))),
    channel: v.optional(channel),
  },
  returns: v.array(conversationDoc.extend({ contact: v.union(contactSummary, v.null()) })),
  handler: async (ctx, args) => {
    const status = args.status ?? "all";
    let conversations =
      status === "all"
        ? await ctx.db
            .query("conversations")
            .withIndex("by_lastMessageAt")
            .order("desc")
            .take(LIST_LIMIT)
        : await ctx.db
            .query("conversations")
            .withIndex("by_status_lastMessageAt", (q) => q.eq("status", status))
            .order("desc")
            .take(LIST_LIMIT);

    if (args.channel) {
      conversations = conversations.filter((c) => c.channel === args.channel);
    }

    // Batch-join contact -> unit -> building.
    const contacts = await loadMany(
      ctx,
      conversations.flatMap((c) => (c.contactId ? [c.contactId] : [])),
    );
    const units = await loadMany(
      ctx,
      [...contacts.values()].flatMap((c) => (c.unitId ? [c.unitId] : [])),
    );
    const buildingIdFor = (contact: Doc<"contacts">) =>
      contact.buildingId ?? (contact.unitId ? units.get(contact.unitId)?.buildingId : undefined);
    const buildings = await loadMany(
      ctx,
      [...contacts.values()].flatMap((c) => {
        const id = buildingIdFor(c);
        return id ? [id] : [];
      }),
    );

    return conversations.map((conversation) => {
      const contact = conversation.contactId ? contacts.get(conversation.contactId) : undefined;
      if (!contact) return { ...conversation, contact: null };
      const unit = contact.unitId ? units.get(contact.unitId) : undefined;
      const buildingId = buildingIdFor(contact);
      const building = buildingId ? buildings.get(buildingId) : undefined;
      return {
        ...conversation,
        contact: {
          _id: contact._id,
          name: contact.name,
          role: contact.role,
          unitLabel: unit?.label ?? null,
          buildingName: building?.name ?? null,
        },
      };
    });
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  returns: v.union(
    v.object({
      conversation: conversationDoc,
      contact: v.union(
        contactDoc.extend({
          unit: v.union(unitDoc, v.null()),
          building: v.union(buildingDoc, v.null()),
        }),
        v.null(),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    const contact = conversation.contactId ? await ctx.db.get(conversation.contactId) : null;
    if (!contact) return { conversation, contact: null };
    const unit = contact.unitId ? await ctx.db.get(contact.unitId) : null;
    const buildingId = contact.buildingId ?? unit?.buildingId;
    const building = buildingId ? await ctx.db.get(buildingId) : null;
    return { conversation, contact: { ...contact, unit, building } };
  },
});

const STATUSES = ["open", "awaiting_approval", "needs_human", "closed"] as const;

export const counts = query({
  args: {},
  returns: v.object({
    all: v.number(),
    open: v.number(),
    awaiting_approval: v.number(),
    needs_human: v.number(),
    closed: v.number(),
  }),
  handler: async (ctx) => {
    // Data volume for conversations is small; iterating the index per status is fine.
    const result = { all: 0, open: 0, awaiting_approval: 0, needs_human: 0, closed: 0 };
    for (const status of STATUSES) {
      let n = 0;
      for await (const _ of ctx.db
        .query("conversations")
        .withIndex("by_status_lastMessageAt", (q) => q.eq("status", status))) {
        n++;
      }
      result[status] = n;
      result.all += n;
    }
    return result;
  },
});

export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new ConvexError("Conversation not found.");
    if (conversation.unread) await ctx.db.patch(conversationId, { unread: false });
    return null;
  },
});

export const setStatus = mutation({
  args: { conversationId: v.id("conversations"), status: conversationStatus },
  returns: v.null(),
  handler: async (ctx, { conversationId, status }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new ConvexError("Conversation not found.");
    await ctx.db.patch(conversationId, { status });
    return null;
  },
});
