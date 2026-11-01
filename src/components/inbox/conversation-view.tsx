"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { SearchX } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThreadHeader } from "./thread-header";
import { MessageThread } from "./message-thread";
import { Composer } from "./composer";
import { ContactPanel } from "./contact-panel";

export function ConversationView({
  conversationId,
}: {
  conversationId: Id<"conversations">;
}) {
  const data = useQuery(api.conversations.get, { conversationId });
  const messages = useQuery(api.messages.listByConversation, {
    conversationId,
  });
  const markRead = useMutation(api.conversations.markRead);
  const [panelOpen, setPanelOpen] = useState(true);

  const unread = data?.conversation.unread;
  useEffect(() => {
    // Opening (or viewing while new messages arrive) marks the thread read.
    if (unread) void markRead({ conversationId }).catch(() => {});
  }, [unread, conversationId, markRead]);

  if (data === null) return <NotFound />;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {data === undefined ? (
          <HeaderSkeleton />
        ) : (
          <ThreadHeader
            conversation={data.conversation}
            contact={data.contact}
            panelOpen={panelOpen}
            onTogglePanel={() => setPanelOpen((o) => !o)}
          />
        )}
        <MessageThread
          messages={messages}
          conversation={data?.conversation}
          contactName={data?.conversation.displayName ?? ""}
        />
        {data && <Composer conversation={data.conversation} />}
      </div>
      {panelOpen && (
        <ContactPanel
          data={data}
          className="hidden xl:flex"
        />
      )}
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
      <Skeleton className="size-8 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
        <SearchX className="size-5" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">Conversation not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted or the data was re-seeded.
        </p>
      </div>
      <Button size="sm" variant="outline" render={<Link href="/inbox" />} nativeButton={false}>
        Back to inbox
      </Button>
    </div>
  );
}
