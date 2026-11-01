"use client";

import { useState, type Ref } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ArrowUp, Loader2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CHANNELS } from "@/lib/inbox";
import { cn } from "@/lib/utils";

export function Composer({
  conversation,
  value: body,
  onChange: setBody,
  textareaRef,
}: {
  conversation: Doc<"conversations">;
  /** Controlled so agent suggestions can fill the composer. */
  value: string;
  onChange: (value: string) => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
}) {
  const sendStaffReply = useMutation(api.messages.sendStaffReply);
  const [sending, setSending] = useState(false);
  const channel = CHANNELS[conversation.channel];
  const ChannelIcon = channel.icon;
  const firstName = conversation.displayName.split(/\s+/)[0];

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendStaffReply({ conversationId: conversation._id, body: text });
      setBody("");
    } catch (err) {
      toast.error("Couldn't send reply", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="shrink-0 border-t bg-white px-4 py-3 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-xs transition-shadow focus-within:border-zinc-300 focus-within:ring-3 focus-within:ring-zinc-900/5">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder={`Reply to ${firstName} via ${channel.label}…`}
            className="field-sizing-content block max-h-48 min-h-14 w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-sm leading-relaxed outline-none placeholder:text-zinc-400"
          />
          <div className="flex items-center gap-2 px-2.5 pb-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
              <ChannelIcon className={cn("size-3", channel.className)} />
              {channel.label}
            </span>
            <span className="truncate text-[11px] text-zinc-400">
              {conversation.handle}
            </span>
            <span className="ml-auto hidden text-[11px] text-zinc-400 sm:inline">
              ⌘/Ctrl + Enter
            </span>
            <Button
              size="sm"
              onClick={send}
              disabled={!body.trim() || sending}
              aria-label="Send reply"
            >
              {sending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
