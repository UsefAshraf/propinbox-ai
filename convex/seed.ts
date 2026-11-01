import { fakerDE as faker } from "@faker-js/faker";
import { v } from "convex/values";
import type { Id, TableNames } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import {
  BUILDINGS,
  CONVERSATIONS,
  EXTRA_TICKETS,
  KNOWLEDGE_BASE,
  STAFF_NAMES,
  type ConversationScript,
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
    const fill = (text: string, vars: Record<string, string>) =>
      text.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);

    let messageCount = 0;
    const conversationIds: Id<"conversations">[] = [];
    let ticketCount = 0;

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
      const lastReal = [...msgs].reverse().find((m) => m.from !== "agent");
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

      for (const m of msgs) {
        await ctx.db.insert("messages", {
          conversationId,
          direction: m.from === "contact" ? "inbound" : "outbound",
          channel: script.channel,
          author: m.from,
          body: m.body,
          status: m.from === "contact" ? "received" : m.from === "agent" ? "draft" : "sent",
          // sentAt doubles as "received at" for inbound messages; drafts have none yet.
          sentAt: m.from === "agent" ? undefined : m.at,
        });
        messageCount++;
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
      },
    };
  },
});
