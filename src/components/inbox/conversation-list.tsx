"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Inbox, Loader2, Search, Sparkles, Terminal, X } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNow } from "@/hooks/use-now";
import {
  CHANNELS,
  STATUS_FILTERS,
  type Channel,
  type StatusFilter,
} from "@/lib/inbox";
import { cn } from "@/lib/utils";
import { ConversationRow } from "./conversation-row";

type ChannelFilter = Channel | "all";

const CHANNEL_ITEMS: Record<ChannelFilter, string> = {
  all: "All channels",
  email: CHANNELS.email.label,
  whatsapp: CHANNELS.whatsapp.label,
  phone: CHANNELS.phone.label,
};

export function ConversationList() {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const selectedId = params.conversationId;

  const [status, setStatus] = useState<StatusFilter>("all");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [search, setSearch] = useState("");
  const [simulating, setSimulating] = useState(false);
  // Rows whose lastMessageAt is newer than this get a "just arrived" flash.
  const [mountedAt] = useState(() => Date.now());
  const now = useNow();

  const conversations = useQuery(api.conversations.list, {
    status,
    channel: channel === "all" ? undefined : channel,
  });
  const counts = useQuery(api.conversations.counts, {});

  // Client-side search over what the list query already returned (newest 100).
  const visible = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!conversations || terms.length === 0) return conversations;
    return conversations.filter((c) => {
      const haystack = [
        c.displayName,
        c.handle,
        c.subject,
        c.lastMessagePreview,
        c.contact?.name,
        c.contact?.unitLabel,
        c.contact?.buildingName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [conversations, search]);
  const simulateIncoming = useMutation(api.ingest.simulateIncoming);

  async function handleSimulate() {
    setSimulating(true);
    try {
      const { conversationId } = await simulateIncoming({});
      toast.success("New message received", {
        description: "A simulated tenant message just landed in the inbox.",
        action: {
          label: "Open",
          onClick: () => router.push(`/inbox/${conversationId}`),
        },
      });
      if (status !== "all" && status !== "open") setStatus("all");
      router.push(`/inbox/${conversationId}`);
    } catch (err) {
      toast.error("Couldn't simulate a message", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSimulating(false);
    }
  }

  const isEmptyInbox = counts !== undefined && counts.all === 0;

  return (
    <section
      className={cn(
        "flex w-full min-w-0 shrink-0 flex-col border-r bg-zinc-50/40 md:w-[340px]",
        selectedId && "hidden md:flex",
      )}
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight">Inbox</h1>
          {counts && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {counts.all}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSimulate}
          disabled={simulating}
          className="shadow-xs"
        >
          {simulating ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles className="text-amber-500" />
          )}
          Simulate message
        </Button>
      </div>

      {/* Filters */}
      <div className="shrink-0 space-y-2 border-b px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
            placeholder="Search name, unit, building, message…"
            aria-label="Search conversations"
            className="h-7 bg-white pr-7 pl-7 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div
          role="tablist"
          aria-label="Filter by status"
          className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1"
        >
          {STATUS_FILTERS.map((f) => {
            const active = status === f.value;
            const count = counts?.[f.value];
            return (
              <button
                key={f.value}
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(f.value)}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900",
                )}
              >
                {f.label}
                {count !== undefined && (
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-white/70" : "text-zinc-400",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Select
          items={CHANNEL_ITEMS}
          value={channel}
          onValueChange={(v) => setChannel((v as ChannelFilter | null) ?? "all")}
        >
          <SelectTrigger size="sm" className="h-7 w-full bg-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CHANNEL_ITEMS) as ChannelFilter[]).map((key) => {
              const Icon = key === "all" ? Inbox : CHANNELS[key].icon;
              return (
                <SelectItem key={key} value={key} className="text-xs">
                  <Icon
                    className={cn(
                      "size-3.5",
                      key === "all"
                        ? "text-muted-foreground"
                        : CHANNELS[key].className,
                    )}
                  />
                  {CHANNEL_ITEMS[key]}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Rows */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible === undefined ? (
          <ListSkeleton />
        ) : isEmptyInbox ? (
          <SeedHint />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Inbox className="size-5 text-zinc-300" />
            <p className="mt-2 text-sm font-medium">Nothing here</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {search.trim()
                ? `No conversations match “${search.trim()}”.`
                : "No conversations match this filter."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {visible.map((c) => (
              <li key={c._id}>
                <ConversationRow
                  conversation={c}
                  selected={c._id === selectedId}
                  now={now}
                  fresh={c.lastMessageAt > mountedAt}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-zinc-100">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SeedHint() {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100">
        <Inbox className="size-5 text-zinc-500" />
      </div>
      <p className="mt-3 text-sm font-medium">No conversations yet</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Seed demo buildings, tenants and conversations:
      </p>
      <code className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 py-1.5 font-mono text-[11px] text-zinc-100">
        <Terminal className="size-3 text-zinc-400" />
        npx convex run seed:run
      </code>
      <p className="mt-3 text-xs text-muted-foreground">
        …or hit <span className="font-medium text-foreground">Simulate message</span>.
      </p>
    </div>
  );
}
