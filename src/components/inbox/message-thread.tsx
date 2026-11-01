"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { isSameDay } from "date-fns";
import type { Doc } from "@convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { formatDayDivider } from "@/lib/inbox";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { DraftCard } from "./draft-card";

const messageTime = (m: Doc<"messages">) => m.sentAt ?? m._creationTime;

export function MessageThread({
  messages,
  conversation,
  contactName,
  footer,
  footerKey,
}: {
  messages: Doc<"messages">[] | undefined;
  conversation: Doc<"conversations"> | undefined;
  contactName: string;
  /** Rendered after the last message (e.g. the live agent status row). */
  footer?: ReactNode;
  /** Changes whenever the footer grows, so the thread keeps it in view. */
  footerKey?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeen = useRef<string | null>(null);
  const now = useNow(60_000);

  const tail = messages?.at(-1);
  const tailKey = tail
    ? `${tail._id}:${tail.status}:${tail.body.length}:${footerKey ?? ""}`
    : null;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || tailKey === null) return;
    // Jump on first paint, glide for messages that arrive while viewing.
    const behavior = lastSeen.current === null ? "instant" : "smooth";
    lastSeen.current = tailKey;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, [tailKey]);

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/50"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-1 px-4 py-6 md:px-8">
        {messages === undefined ? (
          <ThreadSkeleton />
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No messages in this conversation yet.
          </p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const t = messageTime(m);
            const newDay = !prev || !isSameDay(messageTime(prev), t);
            const grouped =
              !newDay &&
              prev.author === m.author &&
              prev.status !== "draft" &&
              t - messageTime(prev) < 5 * 60_000;
            return (
              <Fragment key={m._id}>
                {newDay && (
                  <div className="my-4 flex items-center gap-3 text-[11px] font-medium text-zinc-400">
                    <div className="h-px flex-1 bg-zinc-200/70" />
                    {formatDayDivider(t, now)}
                    <div className="h-px flex-1 bg-zinc-200/70" />
                  </div>
                )}
                <div className={cn(!grouped && !newDay && "mt-3")}>
                  {m.status === "draft" ? (
                    <DraftCard message={m} />
                  ) : (
                    <MessageBubble
                      message={m}
                      contactName={contactName}
                      showMeta={!grouped}
                      subject={
                        i === 0 && conversation?.channel === "email"
                          ? conversation.subject
                          : undefined
                      }
                    />
                  )}
                </div>
              </Fragment>
            );
          })
        )}
        {messages !== undefined && footer}
      </div>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-16 w-2/3 rounded-2xl" />
      <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
      <Skeleton className="h-20 w-3/5 rounded-2xl" />
      <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
    </div>
  );
}
