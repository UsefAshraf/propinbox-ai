"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CHANNELS } from "@/lib/inbox";

type Pending = "approve" | "discard" | null;

export function DraftCard({ message }: { message: Doc<"messages"> }) {
  const approveDraft = useMutation(api.messages.approveDraft);
  const discardDraft = useMutation(api.messages.discardDraft);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(message.body);
  const [pending, setPending] = useState<Pending>(null);

  const channelLabel = CHANNELS[message.channel].label;
  const edited = body.trim() !== message.body.trim();

  async function approve() {
    const text = body.trim();
    if (editing && !text) return;
    setPending("approve");
    try {
      await approveDraft({
        messageId: message._id,
        body: editing && edited ? text : undefined,
      });
      toast.success(editing && edited ? "Edited reply sent" : "Reply approved & sent", {
        description: `Delivered via ${channelLabel}.`,
      });
    } catch (err) {
      setPending(null);
      toast.error("Couldn't send reply", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function discard() {
    setPending("discard");
    try {
      await discardDraft({ messageId: message._id });
      toast("Draft discarded", {
        description: "Conversation handed off to a human.",
      });
    } catch (err) {
      setPending(null);
      toast.error("Couldn't discard draft", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="ml-auto w-full max-w-[92%] md:max-w-[80%]">
      <div className="overflow-hidden rounded-xl border border-dashed border-amber-400 bg-amber-50/70 shadow-xs">
        <div className="flex items-center gap-2 border-b border-dashed border-amber-300 bg-amber-100/50 px-3.5 py-2">
          <span className="flex size-5 items-center justify-center rounded-md bg-amber-500/15 text-amber-700">
            <Sparkles className="size-3" />
          </span>
          <span className="text-xs font-semibold text-amber-900">
            Draft reply by AI agent
          </span>
          <span className="ml-auto text-[11px] text-amber-700/80">
            Not sent · needs your approval
          </span>
        </div>

        <div className="px-3.5 py-3">
          {editing ? (
            <Textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void approve();
                }
                if (e.key === "Escape") {
                  setBody(message.body);
                  setEditing(false);
                }
              }}
              className="min-h-32 resize-y bg-white text-sm leading-relaxed"
            />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-zinc-800">
              {message.body}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-amber-300 bg-white/60 px-3.5 py-2">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={approve}
                disabled={pending !== null || !body.trim()}
              >
                {pending === "approve" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Check />
                )}
                Save & send
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setBody(message.body);
                  setEditing(false);
                }}
                disabled={pending !== null}
              >
                <X />
                Cancel
              </Button>
              <span className="ml-auto hidden text-[11px] text-zinc-400 sm:inline">
                ⌘/Ctrl + Enter to send · Esc to cancel
              </span>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={approve}
                disabled={pending !== null}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {pending === "approve" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Check />
                )}
                Approve & send
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                disabled={pending !== null}
              >
                <Pencil />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={discard}
                disabled={pending !== null}
                className="ml-auto text-zinc-500 hover:bg-rose-50 hover:text-rose-700"
              >
                {pending === "discard" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                Discard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
