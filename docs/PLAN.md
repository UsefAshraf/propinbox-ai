# PropInbox — Build Plan

## Phases

| # | Phase | Scope | Status |
|---|-------|-------|--------|
| 1 | Foundation + Live inbox | Schema, seed data, inbox UI (list + thread), HTTP webhook, "simulate incoming message" | done |
| 2 | AI agent + draft flow | Scheduled action calling Claude with tools (`lookup_tenant`, `get_unit_info`, `search_knowledge_base`, `create_maintenance_ticket`), draft reply → Approve / Edit, low-confidence handoff | done (needs live key test) |
| 3 | Agent debug view | Every run stored (input, each tool call with args + result, final answer); run timeline UI; thumbs-down with note + blamed step | todo |
| 4 | CSV import | Upload 5,000+ row CSV of buildings/units/tenants, batch processing with scheduled functions, live progress bar, error rows | todo |
| 5 | Ship | Deploy (Vercel + Convex cloud), README with architecture diagram + index rationale + "what I'd do next", demo video | todo |

Priority if time runs short: 1 → 2 → 3 shipped and deployed beats a half-done 4.

## Phase 1 API contract

All files under `convex/`. Types come from `convex/schema.ts`.

### `conversations.ts`
- `list` — query `{ status?: ConversationStatus | "all", channel?: Channel }` →
  `Array<Doc<"conversations"> & { contact: ContactSummary | null }>`, newest `lastMessageAt` first, max 100.
  `ContactSummary = { _id, name, role, unitLabel: string | null, buildingName: string | null }`
- `get` — query `{ conversationId }` → `{ conversation: Doc<"conversations">, contact: ContactDetail | null } | null`
  `ContactDetail = Doc<"contacts"> & { unit: Doc<"units"> | null, building: Doc<"buildings"> | null }`
- `counts` — query `{}` → `{ all, open, awaiting_approval, needs_human, closed }` (numbers, for filter badges)
- `markRead` — mutation `{ conversationId }`
- `setStatus` — mutation `{ conversationId, status: ConversationStatus }`

### `messages.ts`
- `listByConversation` — query `{ conversationId }` → `Doc<"messages">[]` oldest first, excluding `discarded`
- `sendStaffReply` — mutation `{ conversationId, body }` → inserts outbound / staff / sent, updates conversation preview + `lastMessageAt`
- `approveDraft` — mutation `{ messageId, body?: string }` → draft becomes `sent` (body replaced if edited), `sentAt` set, conversation status → `open` if no other drafts
- `discardDraft` — mutation `{ messageId }` → status `discarded`, conversation status → `needs_human`

### `ingest.ts`
- `receiveMessage` — internalMutation `{ channel, from, fromName?, subject?, body }` → `{ conversationId, messageId }`.
  Normalises `from` (lowercase email / E.164 phone), resolves contact via `by_email` / `by_phone`,
  threads onto existing conversation via `by_channel_handle` (reopens if closed), inserts inbound message,
  sets `unread: true`, `status: "open"`, preview, `lastMessageAt`. Phase 2 will schedule the agent here.
- `simulateIncoming` — mutation `{ contactId?, channel?, body? }` → `{ conversationId }`. Picks a random
  tenant + realistic tenant message when not given, then uses the same code path as the webhook.

### `http.ts`
- `POST /webhooks/incoming-message` JSON `{ channel, from, fromName?, subject?, body }`
  → `200 { conversationId, messageId }` | `400 { error }` | `401` when `WEBHOOK_SECRET` env is set and
  `x-webhook-secret` header doesn't match.
- `GET /health` → `200 ok`

### `seed.ts`
- `run` — internalMutation `{ reset?: boolean }`; `npx convex run seed:run` (add `'{"reset": true}'` to wipe first).
  Deterministic faker data: ~8 buildings, ~60 units, ~70 contacts (mostly tenants, some vendors),
  ~15 conversations across all channels and statuses (incl. one with an agent draft), a few tickets,
  ~20 knowledge base articles (house rules, FAQs, procedures).

## Phase 2 API contract

### Agent design
- Manual tool-use loop (not the SDK tool runner) inside a Convex action, so every model turn and tool call
  is persisted as a step **as it happens** — the debug view (Phase 3) updates live.
- Model `claude-opus-5-5` (override with env `AGENT_MODEL`), `output_config.effort: "low"` (override `AGENT_EFFORT`),
  adaptive thinking (always on for this model), server-side refusal fallback (`fallbacks: "default"`).
- Tools: `lookup_tenant`, `get_unit_info`, `search_knowledge_base`, `create_maintenance_ticket`, plus two
  terminal tools the agent must end with: `draft_reply { reply, confidence (0..1), reasoning }` and
  `handoff_to_human { reason, summary, suggested_reply? }`. `strict: true` on all tools.
- Handoff rules: explicit `handoff_to_human`, or `draft_reply` with confidence < `AGENT_CONFIDENCE_THRESHOLD`
  (default 0.7), or loop limit (8 model turns), or any error (incl. missing `ANTHROPIC_API_KEY`) → run status
  `handoff`/`failed`, conversation status `needs_human`, no draft message.
- Success → inbound conversation gets an outbound `draft` message (`author: "agent"`, `agentRunId`), older
  pending drafts in that conversation are discarded, conversation status `awaiting_approval`.

### `agent.ts` (action, may be `"use node"` if the SDK needs it)
- `run` — internalAction `{ conversationId, triggerMessageId, trigger: "inbound" | "manual_rerun" }`.
  Scheduled from `ingest.receiveMessageImpl` via `ctx.scheduler.runAfter(0, internal.agent.run, ...)`.

### `agentRuns.ts`
- internal: `start`, `appendStep`, `finish` (mutations), `getContext` (query: conversation, contact, unit,
  building, last ~20 messages) and tool backends (`toolLookupTenant`, `toolGetUnitInfo`,
  `toolSearchKnowledgeBase`, `toolCreateTicket`).
- `latestForConversation` — query `{ conversationId }` → `Doc<"agentRuns"> | null` (newest run).
- `get` — query `{ runId }` → `Doc<"agentRuns"> | null`.
- `list` — query `{ status?: AgentRunStatus }` → newest 50 runs, each with `conversation: { _id, displayName, channel } | null`.
- `rerun` — mutation `{ conversationId }` → schedules `agent.run` on the latest inbound message
  (`trigger: "manual_rerun"`); throws if a run for that conversation is already `running`.

### `tickets.ts`
- `list` — query `{ status?: TicketStatus }` → newest 100 tickets with `unitLabel`, `buildingName`, `contactName`.
- `forConversation` — query `{ conversationId }` → tickets linked to the conversation or the contact's unit.
- `setStatus` — mutation `{ ticketId, status }`.

## Local dev

```bash
npm install
CONVEX_AGENT_MODE=anonymous npx convex dev   # local backend, no login (or `npx convex dev` with an account)
npx convex run seed:run
npm run dev
```
