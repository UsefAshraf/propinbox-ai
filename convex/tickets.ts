import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";

const ticketFields = schema.tables.tickets.validator;
const ticketStatus = ticketFields.fields.status;

const ticketWithNames = ticketFields.extend({
  _id: v.id("tickets"),
  _creationTime: v.number(),
  unitLabel: v.union(v.string(), v.null()),
  buildingName: v.union(v.string(), v.null()),
  contactName: v.union(v.string(), v.null()),
});

/** Joins unit label, building name and contact name onto tickets (each doc fetched once). */
async function withNames(ctx: QueryCtx, tickets: Doc<"tickets">[]) {
  const cache = new Map<string, Promise<unknown>>();
  const load = <T extends "units" | "buildings" | "contacts">(
    id: Id<T> | undefined,
  ): Promise<Doc<T> | null> => {
    if (!id) return Promise.resolve(null);
    if (!cache.has(id)) cache.set(id, ctx.db.get(id));
    return cache.get(id) as Promise<Doc<T> | null>;
  };
  return await Promise.all(
    tickets.map(async (t) => {
      const unit = await load(t.unitId);
      const building = await load(unit?.buildingId);
      const contact = await load(t.contactId);
      return {
        ...t,
        unitLabel: unit?.label ?? null,
        buildingName: building?.name ?? null,
        contactName: contact?.name ?? null,
      };
    }),
  );
}

export const list = query({
  args: { status: v.optional(ticketStatus) },
  returns: v.array(ticketWithNames),
  handler: async (ctx, { status }) => {
    const tickets = status
      ? await ctx.db
          .query("tickets")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(100)
      : await ctx.db.query("tickets").order("desc").take(100);
    return await withNames(ctx, tickets);
  },
});

export const forConversation = query({
  args: { conversationId: v.id("conversations") },
  returns: v.array(ticketWithNames),
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return [];
    const linked = await ctx.db
      .query("tickets")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();

    const contact = conversation.contactId ? await ctx.db.get(conversation.contactId) : null;
    const forUnit = contact?.unitId
      ? await ctx.db
          .query("tickets")
          .withIndex("by_unit", (q) => q.eq("unitId", contact.unitId))
          .order("desc")
          .take(50)
      : [];

    const byId = new Map<Id<"tickets">, Doc<"tickets">>();
    for (const t of [...linked, ...forUnit]) byId.set(t._id, t);
    const tickets = [...byId.values()].sort((a, b) => b._creationTime - a._creationTime);
    return await withNames(ctx, tickets);
  },
});

export const setStatus = mutation({
  args: { ticketId: v.id("tickets"), status: ticketStatus },
  returns: v.null(),
  handler: async (ctx, { ticketId, status }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new ConvexError("Ticket not found.");
    await ctx.db.patch(ticketId, { status });
    return null;
  },
});
