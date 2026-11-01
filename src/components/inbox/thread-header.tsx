"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHANNELS,
  ROLE_LABELS,
  STATUSES,
  type ContactDetail,
  type ConversationStatus,
} from "@/lib/inbox";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";

const STATUS_ITEMS = Object.fromEntries(
  Object.entries(STATUSES).map(([k, s]) => [k, s.label]),
) as Record<ConversationStatus, string>;

export function ThreadHeader({
  conversation,
  contact,
  panelOpen,
  onTogglePanel,
}: {
  conversation: Doc<"conversations">;
  contact: ContactDetail | null;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const setStatus = useMutation(api.conversations.setStatus);
  const channel = CHANNELS[conversation.channel];
  const ChannelIcon = channel.icon;

  async function changeStatus(status: ConversationStatus) {
    if (status === conversation.status) return;
    try {
      await setStatus({ conversationId: conversation._id, status });
      toast.success(`Marked as ${STATUSES[status].label.toLowerCase()}`);
    } catch (err) {
      toast.error("Couldn't update status", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const closed = conversation.status === "closed";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 md:px-5">
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        render={<Link href="/inbox" aria-label="Back to inbox" />}
        nativeButton={false}
      >
        <ArrowLeft />
      </Button>
      <ContactAvatar
        name={conversation.displayName}
        unknown={!contact}
        size="sm"
        className="size-8"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-sm font-semibold">
            {conversation.displayName}
          </h2>
          <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {contact ? ROLE_LABELS[contact.role] : "Unknown"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ChannelIcon className={cn("size-3", channel.className)} />
          <span>{channel.label}</span>
          <span className="text-zinc-300">·</span>
          <span className="truncate">
            {conversation.subject ?? conversation.handle}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Select
          items={STATUS_ITEMS}
          value={conversation.status}
          onValueChange={(v) => v && changeStatus(v as ConversationStatus)}
        >
          <SelectTrigger size="sm" className="hidden w-44 text-xs sm:flex">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                STATUSES[conversation.status].dot,
              )}
            />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUSES) as ConversationStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                <span className={cn("size-2 rounded-full", STATUSES[s].dot)} />
                {STATUSES[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={closed ? "outline" : "default"}
          onClick={() => changeStatus(closed ? "open" : "closed")}
        >
          {closed ? <RotateCcw /> : <CheckCircle2 />}
          {closed ? "Reopen" : "Close"}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden text-muted-foreground xl:inline-flex"
          onClick={onTogglePanel}
          aria-label={panelOpen ? "Hide contact panel" : "Show contact panel"}
          title={panelOpen ? "Hide contact panel" : "Show contact panel"}
        >
          {panelOpen ? <PanelRightClose /> : <PanelRightOpen />}
        </Button>
      </div>
    </header>
  );
}
