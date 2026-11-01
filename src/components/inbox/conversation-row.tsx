"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import {
  CHANNELS,
  STATUSES,
  formatListTime,
  type ConversationListItem,
} from "@/lib/inbox";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { StatusBadge } from "./status-badge";

export function ConversationRow({
  conversation: c,
  selected,
  now,
  fresh,
}: {
  conversation: ConversationListItem;
  selected: boolean;
  now: number;
  fresh: boolean;
}) {
  const channel = CHANNELS[c.channel];
  const ChannelIcon = channel.icon;
  const location = c.contact?.unitLabel
    ? [c.contact.buildingName, `Unit ${c.contact.unitLabel}`]
        .filter(Boolean)
        .join(" · ")
    : c.contact?.buildingName ?? (c.contact ? null : c.handle);
  const showBadge =
    c.status === "awaiting_approval" || c.status === "needs_human";

  return (
    <Link
      href={`/inbox/${c._id}`}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "group relative flex gap-3 px-4 py-3 transition-colors",
        selected
          ? "bg-white shadow-[inset_2px_0_0_0_var(--color-zinc-900)]"
          : "hover:bg-white/80",
      )}
    >
      {fresh && (
        // Re-keyed on every new message so the flash replays live.
        <span
          key={c.lastMessageAt}
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-row-flash"
        />
      )}

      <div className="relative">
        <ContactAvatar name={c.displayName} size="md" />
        <span
          className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-white ring-1 ring-zinc-200"
          title={channel.label}
        >
          <ChannelIcon className={cn("size-2.5", channel.className)} />
        </span>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm",
              c.unread ? "font-semibold text-zinc-950" : "font-medium text-zinc-800",
            )}
          >
            {c.displayName}
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 text-[11px] tabular-nums",
              c.unread ? "font-medium text-zinc-900" : "text-zinc-400",
            )}
          >
            {formatListTime(c.lastMessageAt, now)}
          </span>
        </div>

        {location && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
            <Building2 className="size-3 shrink-0 text-zinc-400" />
            <span className="truncate">{location}</span>
          </div>
        )}

        <div className="mt-1 flex items-center gap-2">
          <p
            className={cn(
              "line-clamp-1 flex-1 text-[13px] leading-snug",
              c.unread ? "text-zinc-800" : "text-zinc-500",
            )}
          >
            {c.subject && c.channel === "email" && (
              <span className="text-zinc-700">{c.subject} — </span>
            )}
            {c.lastMessagePreview}
          </p>
          {c.unread && (
            <span
              className="size-2 shrink-0 rounded-full bg-sky-500"
              aria-label="Unread"
            />
          )}
        </div>

        {showBadge && (
          <div className="mt-1.5">
            <StatusBadge status={c.status} />
          </div>
        )}
        {c.status === "closed" && (
          <span className="sr-only">{STATUSES.closed.label}</span>
        )}
      </div>
    </Link>
  );
}
