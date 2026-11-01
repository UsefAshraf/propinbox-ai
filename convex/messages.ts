import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { makePreview } from "./lib/normalize";
import { messageDoc } from "./lib/validators";

export const listByConversation = query({
  args: { conversationId: v.id("conversations") },
  returns: v.array(messageDoc),
  handler: async (ctx, { conversationId }) => {
    // by_conversation implicitly ends with _creationTime, so asc = oldest first.
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();
    return messages.filter((m) => m.status !== "discarded");
  },
});

export const sendStaffReply = mutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  returns: v.id("messages"),
  handler: async (ctx, { conversationId, body }) => {
    const text = body.trim();
    if (!text) throw new ConvexError("Reply can't be empty.");
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new ConvexError("Conversation not found.");

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      direction: "outbound",
      channel: conversation.channel,
      author: "staff",
      body: text,
      status: "sent",
      sentAt: now,
    });
    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      lastMessagePreview: makePreview(text),
      unread: false,
    });
    return messageId;
  },
});

export const approveDraft = mutation({
  args: { messageId: v.id("messages"), body: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { messageId, body }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new ConvexError("Message not found.");
    if (message.status !== "draft") {
      throw new ConvexError("Only draft replies can be approved — this one was already handled.");
    }
    const finalBody = body !== undefined ? body.trim() : message.body;
    if (!finalBody) throw new ConvexError("Reply can't be empty.");

    const now = Date.now();
    await ctx.db.patch(messageId, { status: "sent", body: finalBody, sentAt: now });

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) return null;

    const remaining = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", message.conversationId))
      .collect();
    const hasOtherDrafts = remaining.some((m) => m._id !== messageId && m.status === "draft");

    await ctx.db.patch(conversation._id, {
      lastMessageAt: now,
      lastMessagePreview: makePreview(finalBody),
      unread: false,
      ...(hasOtherDrafts ? {} : { status: "open" as const }),
    });
    return null;
  },
});

export const discardDraft = mutation({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new ConvexError("Message not found.");
    if (message.status !== "draft") {
      throw new ConvexError("Only draft replies can be discarded — this one was already handled.");
    }
    await ctx.db.patch(messageId, { status: "discarded" });
    // Drafts never touched the preview, so only the status changes.
    await ctx.db.patch(message.conversationId, { status: "needs_human" });
    return null;
  },
});
