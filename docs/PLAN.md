# PropInbox — Build Plan

## Phases

| # | Phase | Scope | Status |
|---|-------|-------|--------|
| 1 | Foundation + Live inbox | Schema, seed data, inbox UI (list + thread), HTTP webhook, "simulate incoming message" | done |
| 2 | AI agent + draft flow | Scheduled action calling Claude with tools (`lookup_tenant`, `get_unit_info`, `search_knowledge_base`, `create_maintenance_ticket`), draft reply → Approve / Edit, low-confidence handoff | done (needs live key test) |
| 3 | Agent debug view | Every run stored (input, each tool call with args + result, final answer); run timeline UI; thumbs-down with note + blamed step | done |
| 4 | CSV import | Upload 5,000+ row CSV of buildings/units/tenants, batch processing with scheduled functions, live progress bar, error rows | in progress |
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

## Phase 3 API contract

### `agentRuns.ts` additions
- `submitFeedback` — mutation `{ runId, rating: "up" | "down", note?: string, stepIndex?: number, rootCause?: RootCause }`
  → sets `feedback` (`at: Date.now()`, `resolved: false` for down). Validates `stepIndex` is within `steps`.
  Up-vote clears note/stepIndex/rootCause. Calling again overwrites.
- `clearFeedback` — mutation `{ runId }`.
- `setFeedbackResolved` — mutation `{ runId, resolved: boolean }` (only when rating is down).
- `list` — extend args to `{ status?: AgentRunStatus, feedback?: "down" | "up" | "unresolved" }` (uses
  `by_feedback_rating` for feedback filters, newest first, max 50). Each item additionally gets
  `toolNames: string[]` (non-terminal tools in call order), `stepCount`, so the list doesn't need full steps.
- `stats` — query `{}` → `{ total, drafted, handoff, failed, running, thumbsDown, unresolvedDown, avgDurationMs,
  avgTokens, rootCauses: Record<RootCause, number> }` over the newest 500 runs.
- `forConversation` — query `{ conversationId }` → all runs for that conversation, newest first
  (id, status, trigger, confidence, `_creationTime`, feedback rating) — for "other runs of this conversation".
- `get` — extend the return to `{ run, conversation: { _id, displayName, channel, status } | null,
  triggerMessage: Doc<"messages"> | null, draftMessage: Doc<"messages"> | null,
  tickets: Doc<"tickets">[] (created by this run) } | null`.

### Seeded demo runs (`seed.ts`)
Realistic `agentRuns` with full step traces so the debug view is demo-able without an API key:
one clean `drafted` run (lookup → unit → KB → draft, linked to a seeded draft), one `drafted` run that
created an urgent ticket, one `handoff` (rent reduction request), and one bad answer with
`feedback: { rating: "down", rootCause: "retrieval_miss", stepIndex: <the KB search step>, note }`
where the KB search used a poor query and the reply stated wrong rubbish collection days.

## Phase 4 API contract

### CSV format (one flat file, one row per unit; tenant columns empty = vacant unit)
`building_id,building_name,street,postal_code,city,year_built,unit_id,unit_label,floor,rooms,size_sqm,rent_eur,tenant_id,tenant_name,tenant_email,tenant_phone,move_in_date`
- `*_id` columns are source ids → stored as `externalId` and used for **upserts** (re-importing the same file
  updates instead of duplicating). Buildings repeat across rows; first occurrence wins per batch, later rows update.
- Sample: `public/sample-data/properties-5000.csv` (~5,200 rows, ~2% deliberately invalid rows: missing
  names, bad email, negative size, non-numeric rent, bad date, unknown city format…), generated
  deterministically by `scripts/generate-csv.mjs` (`npm run generate:csv`). Fake data only.

### Processing (`convex/imports.ts`)
- `generateUploadUrl` — mutation `{}` → upload URL (Convex file storage).
- `start` — mutation `{ storageId, fileName }` → `Id<"importJobs">`; creates job (`pending`) and schedules
  `processChunk` with `offset: 0`.
- `processChunk` — internalAction `{ jobId, offset }`: reads the file from storage, parses the CSV (RFC 4180
  quoting, BOM, CRLF), sets `totalRows` on first chunk (`processing`), validates rows `[offset, offset+CHUNK)`
  (CHUNK = 250), calls `applyChunk`, then **schedules itself** for the next offset (a chain of scheduled
  functions, so no single function hits Convex time/size limits and progress is visible between chunks).
  Header errors / unreadable file → job `failed`.
- `applyChunk` — internalMutation `{ jobId, rows: ValidRow[], errors: {row, message}[], processed }`:
  upserts buildings → units → contacts (role tenant) by `externalId` (indexes `by_externalId`), increments
  `processedRows`, `insertedRows`, `errorCount`, appends errors (cap 200 stored), marks `completed` +
  `finishedAt` on the last chunk.
- `cancel` — mutation `{ jobId }` → status `failed` with a "cancelled" error; `processChunk` stops when it sees it.
- `list` — query `{}` → newest 20 jobs (without the `errors` array). `get` — query `{ jobId }` → full job.
- Row numbers in errors are 1-based CSV line numbers (header = line 1).

## Local dev

```bash
npm install
CONVEX_AGENT_MODE=anonymous npx convex dev   # local backend, no login (or `npx convex dev` with an account)
npx convex run seed:run
npm run dev
```
