import { format } from "date-fns";
import { Check, Sparkles } from "lucide-react";
import type { Doc } from "@convex/_generated/dataModel";
import { CHANNELS } from "@/lib/inbox";
import { cn } from "@/lib/utils";

export function MessageBubble({
  message: m,
  contactName,
  showMeta,
  subject,
}: {
  message: Doc<"messages">;
  contactName: string;
  showMeta: boolean;
  subject?: string;
}) {
  const inbound = m.direction === "inbound";
  const agent = m.author === "agent";
  const time = format(m.sentAt ?? m._creationTime, "HH:mm");
  const author = inbound ? contactName : agent ? "AI agent" : "You";

  return (
    <div
      className={cn(
        "group flex flex-col",
        inbound ? "items-start" : "items-end",
      )}
    >
      {showMeta && (
        <div
          className={cn(
            "mb-1 flex items-center gap-1.5 px-1 text-[11px] text-zinc-500",
            !inbound && "flex-row-reverse",
          )}
        >
          <span className="font-medium text-zinc-700">{author}</span>
          {agent && (
            <span className="inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1 py-px text-[10px] font-semibold text-indigo-600 ring-1 ring-indigo-200 ring-inset">
              <Sparkles className="size-2.5" />
              AI
            </span>
          )}
          <span>{time}</span>
          {inbound && (
            <span className="text-zinc-400">via {CHANNELS[m.channel].label}</span>
          )}
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words md:max-w-[75%]",
          inbound &&
            "rounded-tl-md border border-zinc-200 bg-white text-zinc-800 shadow-xs",
          !inbound &&
            !agent &&
            "rounded-tr-md bg-zinc-900 text-zinc-50 shadow-sm",
          agent &&
            "rounded-tr-md border border-indigo-200/80 bg-indigo-50 text-indigo-950 shadow-xs",
        )}
        title={showMeta ? undefined : time}
      >
        {subject && (
          <div className="mb-1.5 border-b border-zinc-100 pb-1.5 text-xs font-semibold text-zinc-900">
            {subject}
          </div>
        )}
        {m.body}
      </div>
      {!inbound && m.status === "sent" && showMeta && (
        <div className="mt-0.5 flex items-center gap-0.5 px-1 text-[10px] text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
          <Check className="size-3" /> Sent via {CHANNELS[m.channel].label}
        </div>
      )}
    </div>
  );
}
