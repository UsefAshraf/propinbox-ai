import { MessagesSquare } from "lucide-react";

export function InboxEmptyState() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center gap-4 bg-zinc-50/30 p-8 text-center md:flex">
      <div className="relative">
        <div className="absolute inset-0 -m-3 rounded-full bg-zinc-100/80" />
        <div className="relative flex size-12 items-center justify-center rounded-2xl border bg-white shadow-sm">
          <MessagesSquare className="size-5 text-zinc-500" />
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold">Select a conversation</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Tenant emails, WhatsApp messages and call notes land here. The AI
          agent drafts replies for you to approve.
        </p>
      </div>
    </div>
  );
}
