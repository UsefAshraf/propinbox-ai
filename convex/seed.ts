import { fakerDE as faker } from "@faker-js/faker";
import { v } from "convex/values";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { createTicketImpl, getUnitInfoImpl, lookupTenantImpl, searchKnowledgeBaseImpl } from "./agentRuns";
import { DEFAULT_CONFIDENCE_THRESHOLD, DEFAULT_MODEL, SYSTEM_PROMPT } from "./lib/agentTools";
import {
  BUILDINGS,
  CONVERSATIONS,
  EXTRA_TICKETS,
  KNOWLEDGE_BASE,
  STAFF_NAMES,
  type ConversationScript,
  type DemoRun,
  type ScriptMessage,
} from "./seedData";

// npx convex run seed:run                  -> seeds an empty deployment
// npx convex run seed:run '{"reset": true}' -> wipes all app tables first

const APP_TABLES: TableNames[] = [
  "messages",
  "tickets",
  "agentRuns",
  "conversations",
  "contacts",
  "units",
  "buildings",
  "knowledgeBase",
  "importJobs",
];

// Net cold rent per sqm in cents, roughly by city.
const RENT_PER_SQM_CENTS: Record<string, number> = {
  Berlin: 1450,
  Hamburg: 1500,
  München: 2100,
  Köln: 1350,
  "Frankfurt am Main": 1700,
  Leipzig: 850,
  Stuttgart: 1550,
  Dresden: 1000,
};

// Unit indices (in creation order) that are left vacant. 21 is in the Schillerhaus (München),
// which matches the unknown sender asking about a free apartment there.
const VACANT_UNIT_INDICES = new Set([5, 21, 30, 44, 58]);
// Units that get a second tenant (partner / flatmate) as a separate contact.
const CO_TENANT_UNIT_INDICES = [1, 9, 14, 26, 40, 50];

const EMAIL_PROVIDERS = ["gmx.de", "web.de", "t-online.de", "gmail.com", "posteo.de", "outlook.de", "freenet.de"];
const MOBILE_PREFIXES = ["151", "152", "157", "159", "170", "171", "172", "173", "175", "176", "177", "178", "179"];

const VENDORS = [
  { trade: "Sanitär & Heizung", kind: "Plumbing" },
  { trade: "Elektrotechnik", kind: "Electrician" },
  { trade: "Schlüsseldienst", kind: "Locksmith" },
  { trade: "Heizungsbau", kind: "Heating" },
  { trade: "Gebäudereinigung", kind: "Cleaning" },
];

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function unitLabel(floor: number, side: "links" | "rechts"): string {
  return floor === 0 ? `EG ${side}` : `${floor}.OG ${side}`;
}

function preview(body: string): string {
  return body.replace(/\s+/g, " ").trim().slice(0, 120);
}

function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);
}

// ---------------------------------------------------------------- demo agent runs

type PendingDemoRun = {
  conversationId: Id<"conversations">;
  run: DemoRun;
  vars: Record<string, string>;
  messages: (ScriptMessage & { at: number; id: Id<"messages"> })[];
};

/** Index of the message that triggered the run (see ConversationScript.demoRun). */
function triggerIndex(demo: PendingDemoRun): number {
  const firstAgent = demo.messages.findIndex((m) => m.from === "agent");
  const end = firstAgent === -1 ? demo.messages.length : firstAgent;
  for (let i = end - 1; i >= 0; i--) if (demo.messages[i].from === "contact") return i;
  throw new Error("Demo run has no triggering contact message");
}

function triggerOf(demo: PendingDemoRun) {
  return demo.messages[triggerIndex(demo)];
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TRANSCRIPT_MESSAGES = 20;

/** Same format as `renderInput` in agent.ts (kept in sync by hand; agent.ts pulls in the SDK). */
function renderInput(
  conversation: Doc<"conversations">,
  contact: Doc<"contacts"> | null,
  messages: PendingDemoRun["messages"],
  triggerId: Id<"messages">,
  now: Date,
): string {
  const formatTime = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";
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
  lines.push(`Conversation (oldest first, last ${messages.length} messages):`);
  for (const m of messages) {
    const who =
      m.from === "contact"
        ? "SENDER"
        : m.from === "agent"
          ? "PROPERTY TEAM (agent draft, approved)"
          : "PROPERTY TEAM (staff)";
    const marker = m.id === triggerId ? "  <-- reply to this message" : "";
    const body = m.body.length > 2000 ? `${m.body.slice(0, 1999)}…` : m.body;
    lines.push("");
    lines.push(`[${formatTime(m.at)}] ${who}:${marker}`);
    lines.push(body);
  }
  lines.push("");
  lines.push("Prepare the reply to the latest sender message. Remember to finish with draft_reply or handoff_to_human.");
  return lines.join("\n");
}

/** Convex values can't contain `undefined` (mirrors agentRuns.appendStep). */
function toStorable(value: unknown): unknown {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

/**
 * Replays a scripted run the way agent.ts would record it: same model id, system prompt,
 * rendered input and step shapes, with tool results produced by the real tool backends.
 */
async function seedDemoRun(ctx: MutationCtx, demo: PendingDemoRun, now: number) {
  const { conversationId, run: spec, vars } = demo;
  const conversation = (await ctx.db.get(conversationId))!;
  const contact = conversation.contactId ? await ctx.db.get(conversation.contactId) : null;
  const ti = triggerIndex(demo);
  const trigger = demo.messages[ti];
  const draft = demo.messages.find((m) => m.from === "agent");
  const startedAt = trigger.at + 2400; // scheduled right after the inbound message
  // Transcript as getContext builds it: up to the trigger, no pending drafts, last 20.
  const transcript = demo.messages
    .slice(0, ti + 1)
    .filter((m) => !(m.from === "agent" && !m.sent))
    .slice(-TRANSCRIPT_MESSAGES);

  const runId = await ctx.db.insert("agentRuns", {
    conversationId,
    triggerMessageId: trigger.id,
    trigger: "inbound",
    status: "running",
    model: DEFAULT_MODEL,
    systemPrompt: SYSTEM_PROMPT,
    input: renderInput(conversation, contact, transcript, trigger.id, new Date(startedAt)),
    steps: [],
  });

  const steps: Doc<"agentRuns">["steps"] = [];
  let senderUnitId: string | null = null;
  let ticketsCreated = 0;
  let outcome:
    | { status: "drafted" | "handoff"; finalAnswer?: string; confidence?: number; handoffReason?: string }
    | undefined;

  for (const turn of spec.turns) {
    steps.push({
      kind: "model",
      text: fill(turn.text, vars),
      stopReason: "tool_use",
      inputTokens: turn.inputTokens,
      outputTokens: turn.outputTokens,
      durationMs: turn.durationMs,
    });
    for (const call of turn.tools) {
      let args: Record<string, unknown>;
      let result: unknown;
      let durationMs = 0;
      switch (call.name) {
        case "lookup_tenant": {
          args = { query: call.query };
          const r = await lookupTenantImpl(ctx, { conversationId, query: call.query });
          if ("contacts" in r && r.contacts) senderUnitId = r.contacts.find((c) => c.is_sender)?.unit_id ?? null;
          result = r;
          durationMs = call.durationMs;
          break;
        }
        case "get_unit_info": {
          if (!senderUnitId) throw new Error("Demo run: get_unit_info before lookup_tenant found a unit");
          args = { unit_id: senderUnitId };
          result = await getUnitInfoImpl(ctx, { unitId: senderUnitId });
          durationMs = call.durationMs;
          break;
        }
        case "search_knowledge_base": {
          args = { query: call.query, category: call.category };
          result = await searchKnowledgeBaseImpl(ctx, { conversationId, query: call.query, category: call.category });
          durationMs = call.durationMs;
          break;
        }
        case "create_maintenance_ticket": {
          const title = fill(call.title, vars);
          const description = fill(call.description, vars);
          args = { title, description, category: call.category, priority: call.priority, unit_id: null };
          result = await createTicketImpl(ctx, {
            conversationId,
            runId,
            title,
            description,
            category: call.category,
            priority: call.priority,
            unitId: null,
          });
          ticketsCreated++;
          durationMs = call.durationMs;
          break;
        }
        case "draft_reply": {
          const reply = call.reply !== undefined ? fill(call.reply, vars) : draft?.body;
          if (!reply) throw new Error("Demo run: draft_reply without a reply or agent message");
          const reasoning = fill(call.reasoning, vars);
          args = { reply, confidence: call.confidence, reasoning };
          outcome =
            call.confidence < DEFAULT_CONFIDENCE_THRESHOLD
              ? {
                  status: "handoff",
                  finalAnswer: reply,
                  confidence: call.confidence,
                  handoffReason: `Low confidence (${call.confidence.toFixed(2)} < ${DEFAULT_CONFIDENCE_THRESHOLD}): ${reasoning}`,
                }
              : { status: "drafted", finalAnswer: reply, confidence: call.confidence };
          break;
        }
        case "handoff_to_human": {
          const reason = fill(call.reason, vars);
          const summary = fill(call.summary, vars);
          const suggested = call.suggested_reply === null ? null : fill(call.suggested_reply, vars);
          args = { reason, summary, suggested_reply: suggested };
          outcome = {
            status: "handoff",
            handoffReason: summary ? `${reason}\n\nSummary: ${summary}` : reason,
            finalAnswer: suggested?.trim() || undefined,
          };
          break;
        }
      }
      if (call.name === "draft_reply" || call.name === "handoff_to_human") {
        // Terminal step, recorded exactly like agent.finishWithTerminal does.
        result = { outcome: outcome!.status, ...(outcome!.handoffReason ? { handoff_reason: outcome!.handoffReason } : {}) };
      }
      const isError = typeof result === "object" && result !== null && "error" in result;
      steps.push({ kind: "tool", name: call.name, args: toStorable(args), result: toStorable(result), isError, durationMs });
    }
  }
  if (!outcome) throw new Error("Demo run must end with a terminal tool");

  let draftMessageId: Id<"messages"> | undefined;
  if (outcome.status === "drafted") {
    if (!draft) throw new Error("Drafted demo run needs an agent message in the script");
    draftMessageId = draft.id;
    await ctx.db.patch(draft.id, { agentRunId: runId });
  }

  let feedback: Doc<"agentRuns">["feedback"];
  if (spec.feedback) {
    const f = spec.feedback;
    const stepIndex = f.blameTool ? steps.findIndex((s) => s.kind === "tool" && s.name === f.blameTool) : -1;
    feedback =
      f.rating === "up"
        ? { rating: "up", at: now - f.hoursAgo * 3600_000 }
        : {
            rating: "down",
            ...(f.note ? { note: f.note } : {}),
            ...(stepIndex >= 0 ? { stepIndex } : {}),
            ...(f.rootCause ? { rootCause: f.rootCause } : {}),
            resolved: f.resolved ?? false,
            at: now - Math.round(f.hoursAgo * 3600_000),
          };
  }

  // Wall time = model + tool time plus ~90 ms of Convex mutation round-trips per step.
  const stepTime = steps.reduce((sum, s) => sum + s.durationMs, 0);
  await ctx.db.patch(runId, {
    status: outcome.status,
    finalAnswer: outcome.finalAnswer,
    confidence: outcome.confidence,
    handoffReason: outcome.handoffReason,
    draftMessageId,
    durationMs: stepTime + steps.length * 90 + 140,
    inputTokens: spec.turns.reduce((sum, t) => sum + t.inputTokens, 0),
    outputTokens: spec.turns.reduce((sum, t) => sum + t.outputTokens, 0),
    steps,
    feedback,
  });
  return { ticketsCreated };
}

async function wipe(ctx: MutationCtx) {
  const deleted: Record<string, number> = {};
  for (const table of APP_TABLES) {
    const docs = await ctx.db.query(table).collect();
    for (const doc of docs) await ctx.db.delete(doc._id);
    deleted[table] = docs.length;
  }
  return deleted;
}

export const run = internalMutation({
  args: { reset: v.optional(v.boolean()) },
  handler: async (ctx, { reset }) => {
    const hasData =
      (await ctx.db.query("buildings").first()) !== null ||
      (await ctx.db.query("conversations").first()) !== null ||
      (await ctx.db.query("knowledgeBase").first()) !== null;
    if (hasData && !reset) {
      return {
        skipped: true,
        message: 'Data already exists. Run with \'{"reset": true}\' to wipe and reseed.',
      };
    }
    const deleted = hasData ? await wipe(ctx) : {};

    faker.seed(42);
    const now = Date.now();
    const usedEmails = new Set<string>();
    const usedPhones = new Set<string>(["+4917623458810"]); // reserved for the unknown sender

    const makeEmail = (first: string, last: string) => {
      for (;;) {
        const sep = faker.helpers.arrayElement([".", "_", ""]);
        const suffix = faker.datatype.boolean(0.4) ? String(faker.number.int({ min: 1, max: 99 })) : "";
        const email = `${slug(first)}${sep}${slug(last)}${suffix}@${faker.helpers.arrayElement(EMAIL_PROVIDERS)}`;
        if (!usedEmails.has(email)) {
          usedEmails.add(email);
          return email;
        }
      }
    };
    const makePhone = () => {
      for (;;) {
        const prefix = faker.helpers.arrayElement(MOBILE_PREFIXES);
        const phone = `+49${prefix}${faker.string.numeric(["170", "171", "172", "173"].includes(prefix) ? 7 : 8)}`;
        if (!usedPhones.has(phone)) {
          usedPhones.add(phone);
          return phone;
        }
      }
    };

    // ------------------------------------------------------------ buildings + units
    const buildingIds: Id<"buildings">[] = [];
    const units: { id: Id<"units">; buildingIndex: number; label: string }[] = [];
    for (const [bi, b] of BUILDINGS.entries()) {
      const buildingId = await ctx.db.insert("buildings", {
        name: b.name,
        street: b.street,
        postalCode: b.postalCode,
        city: b.city,
        yearBuilt: b.yearBuilt,
      });
      buildingIds.push(buildingId);
      for (let floor = 0; floor <= b.floors; floor++) {
        for (const side of ["links", "rechts"] as const) {
          const sizeSqm = faker.number.int({ min: 30, max: 120 });
          const rooms = sizeSqm < 42 ? 1 : sizeSqm < 62 ? 2 : sizeSqm < 88 ? 3 : 4;
          const perSqm = RENT_PER_SQM_CENTS[b.city] ?? 1200;
          const rentCents = Math.round((sizeSqm * perSqm * faker.number.float({ min: 0.9, max: 1.1 })) / 100) * 100;
          const label = unitLabel(floor, side);
          const id = await ctx.db.insert("units", { buildingId, label, floor, rooms, sizeSqm, rentCents });
          units.push({ id, buildingIndex: bi, label });
        }
      }
    }

    // ------------------------------------------------------------ contacts
    type Tenant = { id: Id<"contacts">; name: string; first: string; last: string; email: string; phone: string; unitIndex: number };
    const tenants: Tenant[] = [];
    const insertTenant = async (unitIndex: number) => {
      const u = units[unitIndex];
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const name = `${first} ${last}`;
      const email = makeEmail(first, last);
      const phone = makePhone();
      const earliest = Math.max(BUILDINGS[u.buildingIndex].yearBuilt + 1, 2006);
      const moveInDate = faker.date
        .between({ from: `${earliest}-01-01`, to: "2026-09-01" })
        .toISOString()
        .slice(0, 10);
      const id = await ctx.db.insert("contacts", {
        name,
        role: "tenant",
        email,
        phone,
        unitId: u.id,
        buildingId: buildingIds[u.buildingIndex],
        moveInDate,
      });
      tenants.push({ id, name, first, last, email, phone, unitIndex });
    };
    for (let ui = 0; ui < units.length; ui++) {
      if (!VACANT_UNIT_INDICES.has(ui)) await insertTenant(ui);
    }
    const primaryTenantCount = tenants.length;
    for (const ui of CO_TENANT_UNIT_INDICES) await insertTenant(ui);

    const owners: { id: Id<"contacts">; name: string; first: string; last: string; buildingIndex: number }[] = [];
    for (const buildingIndex of [0, 1, 3, 6]) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const name = `${first} ${last}`;
      const id = await ctx.db.insert("contacts", {
        name,
        role: "owner",
        email: makeEmail(first, last),
        phone: makePhone(),
        buildingId: buildingIds[buildingIndex],
      });
      owners.push({ id, name, first, last, buildingIndex });
    }

    for (const vendor of VENDORS) {
      const last = faker.person.lastName();
      await ctx.db.insert("contacts", {
        name: `${vendor.trade} ${last} GmbH`,
        role: "vendor",
        email: `${slug(vendor.kind)}@${slug(last)}-${slug(vendor.trade)}.de`,
        phone: makePhone(),
      });
    }

    // ------------------------------------------------------------ conversations + messages
    let messageCount = 0;
    const conversationIds: Id<"conversations">[] = [];
    let ticketCount = 0;
    const demoRuns: PendingDemoRun[] = [];

    for (const [ci, script] of CONVERSATIONS.entries()) {
      const staff = STAFF_NAMES[ci % STAFF_NAMES.length];
      let contactId: Id<"contacts"> | undefined;
      let displayName: string;
      let handle: string;
      let unitId: Id<"units"> | undefined;
      let vars: Record<string, string> = { staff, staffFirst: staff.split(" ")[0] };

      const sender = script.sender;
      if (sender.kind === "tenant") {
        if (sender.index >= primaryTenantCount) throw new Error(`Script ${ci}: tenant index out of range`);
        const t = tenants[sender.index];
        const u = units[t.unitIndex];
        const b = BUILDINGS[u.buildingIndex];
        contactId = t.id;
        unitId = u.id;
        displayName = t.name;
        handle = script.channel === "email" ? t.email : t.phone;
        vars = { ...vars, first: t.first, last: t.last, name: t.name, unit: u.label, building: b.name, street: b.street, city: b.city };
      } else if (sender.kind === "owner") {
        const o = owners[sender.index];
        const b = BUILDINGS[o.buildingIndex];
        const contact = (await ctx.db.get(o.id))!;
        contactId = o.id;
        displayName = o.name;
        handle = script.channel === "email" ? contact.email! : contact.phone!;
        vars = { ...vars, first: o.first, last: o.last, name: o.name, unit: "", building: b.name, street: b.street, city: b.city };
      } else {
        displayName = sender.name ?? sender.handle;
        handle = sender.handle;
      }

      const msgs = script.messages.map((m) => ({
        ...m,
        at: now - Math.round(m.hoursAgo * 3600 * 1000),
        body: fill(m.body, vars),
      }));
      const lastReal = [...msgs].reverse().find((m) => m.from !== "agent" || m.sent);
      if (!lastReal) throw new Error(`Script ${ci} has no non-draft message`);

      const conversationId = await ctx.db.insert("conversations", {
        channel: script.channel,
        handle,
        contactId,
        displayName,
        subject: script.subject,
        status: script.status,
        lastMessageAt: lastReal.at,
        lastMessagePreview: preview(lastReal.body),
        unread: script.unread,
      });
      conversationIds.push(conversationId);

      const messageIds: Id<"messages">[] = [];
      for (const m of msgs) {
        const isDraft = m.from === "agent" && !m.sent;
        messageIds.push(
          await ctx.db.insert("messages", {
            conversationId,
            direction: m.from === "contact" ? "inbound" : "outbound",
            channel: script.channel,
            author: m.from,
            body: m.body,
            status: m.from === "contact" ? "received" : isDraft ? "draft" : "sent",
            // sentAt doubles as "received at" for inbound messages; drafts have none yet.
            sentAt: isDraft ? undefined : m.at,
          }),
        );
        messageCount++;
      }
      if (script.demoRun) {
        demoRuns.push({ conversationId, run: script.demoRun, vars, messages: msgs.map((m, i) => ({ ...m, id: messageIds[i] })) });
      }

      if (script.ticket) {
        await ctx.db.insert("tickets", {
          ...script.ticket,
          unitId,
          contactId,
          conversationId,
          createdBy: "staff",
        });
        ticketCount++;
      }
    }

    for (const t of EXTRA_TICKETS) {
      const tenant = tenants[t.tenantIndex];
      const { tenantIndex: _ignored, ...ticket } = t;
      await ctx.db.insert("tickets", {
        ...ticket,
        unitId: units[tenant.unitIndex].id,
        contactId: tenant.id,
        createdBy: "staff",
      });
      ticketCount++;
    }

    // ------------------------------------------------------------ knowledge base
    for (const article of KNOWLEDGE_BASE) {
      await ctx.db.insert("knowledgeBase", {
        title: article.title,
        body: article.body,
        category: article.category,
        buildingId: article.buildingIndex === undefined ? undefined : buildingIds[article.buildingIndex],
      });
    }

    // ------------------------------------------------------------ demo agent runs
    // After the KB so the replayed knowledge-base searches see the articles. Oldest first,
    // so _creationTime order matches the story order.
    demoRuns.sort((a, b) => triggerOf(a).at - triggerOf(b).at);
    for (const demo of demoRuns) {
      const { ticketsCreated } = await seedDemoRun(ctx, demo, now);
      ticketCount += ticketsCreated;
    }

    const statusCounts: Record<ConversationScript["status"], number> = {
      open: 0,
      awaiting_approval: 0,
      needs_human: 0,
      closed: 0,
    };
    for (const c of CONVERSATIONS) statusCounts[c.status]++;

    return {
      skipped: false,
      deleted,
      counts: {
        buildings: buildingIds.length,
        units: units.length,
        vacantUnits: VACANT_UNIT_INDICES.size,
        contacts: tenants.length + owners.length + VENDORS.length,
        tenants: tenants.length,
        owners: owners.length,
        vendors: VENDORS.length,
        conversations: conversationIds.length,
        conversationsByStatus: statusCounts,
        messages: messageCount,
        tickets: ticketCount,
        knowledgeBase: KNOWLEDGE_BASE.length,
        agentRuns: demoRuns.length,
      },
    };
  },
});
