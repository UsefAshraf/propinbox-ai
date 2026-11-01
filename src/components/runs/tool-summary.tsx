import type { ReactNode } from "react";
import { AlertTriangle, FileText, Search, UserRound } from "lucide-react";
import { PriorityBadge } from "@/components/tickets/ticket-badges";
import { formatConfidence } from "@/lib/agent";
import { asRecord, str, type ToolStep } from "@/lib/runs";
import { PRIORITIES, type TicketPriority } from "@/lib/tickets";
import { cn } from "@/lib/utils";

/** Human-readable gist of a tool call, shown above the raw JSON. */
export function ToolSummary({ step }: { step: ToolStep }) {
  const args = asRecord(step.args) ?? {};
  const result = asRecord(step.result) ?? {};
  const error = str(result.error);

  const body = summaryBody(step.name, args, result);
  if (!body && !error) return null;

  return (
    <div className="space-y-1.5 text-[13px] text-zinc-700">
      {error && (
        <div className="flex items-start gap-1.5 rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-800 ring-1 ring-rose-600/15 ring-inset">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}
      {body}
    </div>
  );
}

function summaryBody(
  name: string,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
): ReactNode {
  switch (name) {
    case "search_knowledge_base": {
      const query = str(args.query);
      const category = str(args.category);
      const results = Array.isArray(result.results)
        ? result.results.map(asRecord).filter((r) => r !== null)
        : null;
      return (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Search className="size-3.5 text-zinc-400" />
            <span className="rounded bg-teal-50 px-1.5 py-px font-mono text-xs text-teal-800 ring-1 ring-teal-600/20 ring-inset">
              {query ?? "—"}
            </span>
            <span className="text-xs text-zinc-400">
              in {category ? category.replace(/_/g, " ") : "all categories"}
            </span>
            {results && (
              <span className="text-xs text-zinc-500">
                → {results.length} article{results.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {results && results.length > 0 && (
            <ol className="space-y-0.5 pl-5">
              {results.map((r, i) => (
                <li key={str(r.article_id) ?? i} className="flex items-center gap-1.5 text-xs">
                  <span className="w-3 text-right text-zinc-400 tabular-nums">{i + 1}</span>
                  <FileText className="size-3 shrink-0 text-zinc-400" />
                  <span className="truncate font-medium text-zinc-800">
                    {str(r.title) ?? "Untitled"}
                  </span>
                  {str(r.scope) && (
                    <span className="shrink-0 text-[11px] text-zinc-400">
                      {str(r.scope)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
          {results && results.length === 0 && (
            <p className="pl-5 text-xs text-amber-700">No matching articles.</p>
          )}
        </>
      );
    }
    case "lookup_tenant": {
      const query = str(args.query);
      const contacts = Array.isArray(result.contacts)
        ? result.contacts.map(asRecord).filter((r) => r !== null)
        : [];
      return (
        <>
          <div className="text-xs text-zinc-500">
            Looked up{" "}
            {query ? (
              <span className="font-mono text-zinc-800">{query}</span>
            ) : (
              "the sender"
            )}
            {str(result.searched_by) && ` · by ${str(result.searched_by)}`}
          </div>
          {result.found === false ? (
            <p className="text-xs text-amber-700">
              Not found{str(result.note) ? ` — ${str(result.note)}` : ""}
            </p>
          ) : (
            contacts.map((c, i) => (
              <div key={str(c.contact_id) ?? i} className="flex flex-wrap items-center gap-1.5 text-xs">
                <UserRound className="size-3.5 text-zinc-400" />
                <span className="font-medium text-zinc-900">{str(c.name)}</span>
                {str(c.role) && <span className="text-zinc-400">{str(c.role)}</span>}
                {str(c.unit_label) && (
                  <span className="rounded bg-zinc-100 px-1.5 py-px tabular-nums text-zinc-600">
                    Unit {str(c.unit_label)}
                  </span>
                )}
                {str(c.building_name) && (
                  <span className="text-zinc-500">{str(c.building_name)}</span>
                )}
                {c.is_sender === true && (
                  <span className="rounded bg-sky-50 px-1 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-600/20 ring-inset">
                    SENDER
                  </span>
                )}
              </div>
            ))
          )}
        </>
      );
    }
    case "get_unit_info": {
      const unit = asRecord(result.unit);
      const building = asRecord(result.building);
      const openTickets = Array.isArray(result.open_tickets) ? result.open_tickets.length : null;
      if (!unit) return null;
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
          <span className="font-medium text-zinc-900">Unit {str(unit.label)}</span>
          {building && <span>{str(building.name)}</span>}
          {typeof unit.rooms === "number" && <span>{unit.rooms} rooms</span>}
          {typeof unit.size_sqm === "number" && <span>{unit.size_sqm} m²</span>}
          {openTickets !== null && (
            <span className={cn(openTickets > 0 && "font-medium text-orange-700")}>
              {openTickets} open ticket{openTickets === 1 ? "" : "s"}
            </span>
          )}
        </div>
      );
    }
    case "create_maintenance_ticket": {
      const title = str(result.title) ?? str(args.title);
      const priority = (str(result.priority) ?? str(args.priority)) as TicketPriority | null;
      return (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-medium text-zinc-900">{title ?? "—"}</span>
          {priority && priority in PRIORITIES && <PriorityBadge priority={priority} />}
          {str(result.unit_label) && (
            <span className="text-zinc-500">
              Unit {str(result.unit_label)}
              {str(result.building_name) ? ` · ${str(result.building_name)}` : ""}
            </span>
          )}
        </div>
      );
    }
    case "draft_reply": {
      const reply = str(args.reply);
      const reasoning = str(args.reasoning);
      const confidence = typeof args.confidence === "number" ? args.confidence : null;
      return (
        <>
          {reply && (
            <p className="line-clamp-3 border-l-2 border-emerald-300 pl-2 text-xs leading-relaxed whitespace-pre-wrap text-zinc-700">
              {reply}
            </p>
          )}
          <p className="text-xs text-zinc-500">
            {confidence !== null && (
              <span className="font-medium text-zinc-700">
                {formatConfidence(confidence)} confident
              </span>
            )}
            {reasoning && <> · {reasoning}</>}
          </p>
        </>
      );
    }
    case "handoff_to_human": {
      const reason = str(args.reason);
      const summary = str(args.summary);
      return (
        <>
          {reason && <p className="text-xs font-medium text-amber-800">{reason}</p>}
          {summary && <p className="text-xs leading-relaxed text-zinc-600">{summary}</p>}
        </>
      );
    }
    default:
      return null;
  }
}
