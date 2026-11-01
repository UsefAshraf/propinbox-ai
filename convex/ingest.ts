import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { channel } from "./schema";
import { type Channel, makePreview, normalizeHandle } from "./lib/normalize";

export type ReceiveMessageArgs = {
  channel: Channel;
  from: string;
  fromName?: string;
  subject?: string;
  body: string;
};

/**
 * Core inbound-message logic shared by the webhook (`receiveMessage`) and the
 * "simulate incoming" button (`simulateIncoming`).
 */
export async function receiveMessageImpl(
  ctx: MutationCtx,
  args: ReceiveMessageArgs,
): Promise<{ conversationId: Id<"conversations">; messageId: Id<"messages"> }> {
  const body = args.body.trim();
  if (!body) throw new ConvexError("Message body can't be empty.");
  const handle = normalizeHandle(args.channel, args.from);
  if (!handle) throw new ConvexError("Sender address is invalid.");
  const fromName = args.fromName?.trim() || undefined;
  const subject = args.subject?.trim() || undefined;

  // Resolve the contact by normalised handle.
  const contact =
    args.channel === "email"
      ? await ctx.db
          .query("contacts")
          .withIndex("by_email", (q) => q.eq("email", handle))
          .first()
      : await ctx.db
          .query("contacts")
          .withIndex("by_phone", (q) => q.eq("phone", handle))
          .first();

  const displayName = contact?.name ?? fromName ?? handle;
  const now = Date.now();
  const preview = makePreview(body);

  // Thread onto an existing conversation for this channel + handle (newest one wins).
  const existing = await ctx.db
    .query("conversations")
    .withIndex("by_channel_handle", (q) => q.eq("channel", args.channel).eq("handle", handle))
    .order("desc")
    .first();

  let conversationId: Id<"conversations">;
  if (existing) {
    conversationId = existing._id;
    await ctx.db.patch(conversationId, {
      status: "open", // reopens closed conversations too
      unread: true,
      lastMessageAt: now,
      lastMessagePreview: preview,
      // Don't downgrade a known name to the raw handle when a later message lacks fromName.
      displayName: contact?.name ?? fromName ?? existing.displayName,
      ...(contact && !existing.contactId ? { contactId: contact._id } : {}),
      ...(subject && !existing.subject ? { subject } : {}),
    });
  } else {
    conversationId = await ctx.db.insert("conversations", {
      channel: args.channel,
      handle,
      contactId: contact?._id,
      displayName,
      subject,
      status: "open",
      lastMessageAt: now,
      lastMessagePreview: preview,
      unread: true,
    });
  }

  const messageId = await ctx.db.insert("messages", {
    conversationId,
    direction: "inbound",
    channel: args.channel,
    author: "contact",
    body,
    status: "received",
    sentAt: now,
  });

  // Let the agent draft a reply (kill switch: `npx convex env set AGENT_DISABLED true`).
  if (process.env.AGENT_DISABLED !== "true") {
    await ctx.scheduler.runAfter(0, internal.agent.run, {
      conversationId,
      triggerMessageId: messageId,
      trigger: "inbound",
    });
  }

  return { conversationId, messageId };
}

const receiveArgs = {
  channel,
  from: v.string(),
  fromName: v.optional(v.string()),
  subject: v.optional(v.string()),
  body: v.string(),
};

export const receiveMessage = internalMutation({
  args: receiveArgs,
  returns: v.object({ conversationId: v.id("conversations"), messageId: v.id("messages") }),
  handler: (ctx, args) => receiveMessageImpl(ctx, args),
});

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

type Template = { subject: string; body: string };

const TEMPLATES: Template[] = [
  {
    subject: "Leaking kitchen tap",
    body: "Hi, the kitchen tap in my flat has been dripping constantly since yesterday and it's getting worse. Could you send someone to fix it?",
  },
  {
    subject: "Heating not working",
    body: "Hello, the radiators in my living room and bedroom are completely cold even though the thermostat is on 5. It's freezing in here. Can someone take a look as soon as possible?",
  },
  {
    subject: "Noise from upstairs",
    body: "Hi, my upstairs neighbours have been playing loud music past midnight several nights this week. What are the quiet hours in our building, and can you remind them?",
  },
  {
    subject: "Rubbish collection day",
    body: "Quick question: which day is the rubbish and recycling collected? And where should I put cardboard boxes?",
  },
  {
    subject: "Bike storage",
    body: "Hello, is there a bike storage room in the building? I just bought a new bike and don't want to leave it outside. How do I get access?",
  },
  {
    subject: "Rent payment question",
    body: "Hi, I changed banks this month. Which account should I transfer the rent to, and by what day of the month does it need to arrive?",
  },
  {
    subject: "Lost my key",
    body: "Hi, I'm afraid I lost my front door key yesterday. How can I get a replacement and how much will it cost?",
  },
  {
    subject: "Mould in the bathroom",
    body: "Hello, there are black mould spots appearing on the ceiling and around the window in my bathroom. I air the room every day. Could someone come and check it?",
  },
  {
    subject: "Intercom broken",
    body: "Hi, the intercom in my flat stopped working — I can't hear visitors or open the main door for them. Couriers keep leaving without delivering. Can this be repaired?",
  },
  {
    subject: "Are pets allowed?",
    body: "Hello, I'm thinking about adopting a cat. Are pets allowed in my flat, or do I need permission first?",
  },
  {
    subject: "Subletting my room",
    body: "Hi, I'll be abroad for work for four months. Am I allowed to sublet my flat during that time, and what do I need to do?",
  },
  {
    subject: "Move-out notice period",
    body: "Hello, I'm planning to move out later this year. What is the notice period for my lease and do I need to send the notice in writing?",
  },
  {
    subject: "Laundry room hours",
    body: "Hi, what are the opening hours of the washing machine room in the basement? Can I do laundry on Sundays?",
  },
  {
    subject: "Broken window latch",
    body: "Hi, the latch on my bedroom window broke and the window won't close properly anymore. It's letting in cold air. Could you arrange a repair?",
  },
  {
    subject: "Light out in the stairwell",
    body: "Hello, the light in the stairwell on the 2nd floor has been out for a few days and it's really dark in the evenings. Can someone replace the bulb?",
  },
  {
    subject: "Parking space",
    body: "Hi, are there any parking spaces available to rent in the courtyard or garage? I'd be interested if one is free.",
  },
];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function channelsFor(contact: Doc<"contacts">): Channel[] {
  const out: Channel[] = [];
  if (contact.email) out.push("email");
  if (contact.phone) out.push("whatsapp", "phone");
  return out;
}

export const simulateIncoming = mutation({
  args: {
    contactId: v.optional(v.id("contacts")),
    channel: v.optional(channel),
    body: v.optional(v.string()),
  },
  returns: v.object({ conversationId: v.id("conversations") }),
  handler: async (ctx, args) => {
    let contact: Doc<"contacts"> | null;
    if (args.contactId) {
      contact = await ctx.db.get(args.contactId);
      if (!contact) throw new ConvexError("Contact not found.");
    } else {
      // No role index; contacts are few in Phase 1, so scan a bounded slice.
      const candidates = (await ctx.db.query("contacts").take(200)).filter(
        (c) => c.role === "tenant" && (c.email || c.phone),
      );
      if (candidates.length === 0) {
        throw new ConvexError(
          "No tenant contacts found. Seed the database first: npx convex run seed:run",
        );
      }
      contact = pick(candidates);
    }

    const available = channelsFor(contact);
    if (available.length === 0) {
      throw new ConvexError(`${contact.name} has no email or phone number to message from.`);
    }
    // Use the requested channel if the contact supports it, otherwise fall back.
    const chosenChannel: Channel =
      args.channel && available.includes(args.channel) ? args.channel : pick(available);
    const from = chosenChannel === "email" ? contact.email! : contact.phone!;

    const template = pick(TEMPLATES);
    const body = args.body?.trim() || template.body;
    const subject =
      chosenChannel === "email" ? (args.body?.trim() ? "Message from tenant" : template.subject) : undefined;

    const { conversationId } = await receiveMessageImpl(ctx, {
      channel: chosenChannel,
      from,
      fromName: contact.name,
      subject,
      body,
    });
    return { conversationId };
  },
});
