"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Building2,
  Inbox,
  Upload,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
};

const NAV: NavItem[] = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/runs", label: "Agent runs", icon: Bot, soon: true },
  { href: "/tickets", label: "Tickets", icon: Wrench, soon: true },
  { href: "/import", label: "Import", icon: Upload, soon: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const counts = useQuery(api.conversations.counts, {});
  const attention = counts
    ? counts.awaiting_approval + counts.needs_human
    : undefined;

  return (
    <aside className="flex w-14 shrink-0 flex-col border-r bg-sidebar lg:w-52">
      <div className="flex h-14 items-center gap-2.5 border-b px-3.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm">
          <Building2 className="size-4" />
        </div>
        <div className="hidden min-w-0 lg:block">
          <div className="text-sm font-semibold tracking-tight">PropInbox</div>
          <div className="truncate text-[11px] leading-tight text-muted-foreground">
            Hausverwaltung
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          const content = (
            <>
              <Icon className="size-4 shrink-0" />
              <span className="hidden flex-1 truncate lg:inline">
                {item.label}
              </span>
              {item.soon ? (
                <span className="hidden rounded bg-zinc-200/70 px-1.5 py-px text-[10px] font-medium text-zinc-500 lg:inline">
                  Soon
                </span>
              ) : item.href === "/inbox" && attention ? (
                <span className="hidden min-w-5 rounded-full bg-amber-100 px-1.5 text-center text-[11px] font-semibold tabular-nums text-amber-800 lg:inline">
                  {attention}
                </span>
              ) : null}
            </>
          );
          const className = cn(
            "flex h-8 items-center justify-center gap-2.5 rounded-md px-2 text-sm lg:justify-start",
            active
              ? "bg-white font-medium text-foreground shadow-xs ring-1 ring-zinc-200"
              : "text-zinc-600",
            item.soon
              ? "cursor-not-allowed text-zinc-400"
              : !active && "hover:bg-zinc-200/50 hover:text-foreground",
          );
          return item.soon ? (
            <span
              key={item.href}
              className={className}
              title={`${item.label} — coming soon`}
              aria-disabled
            >
              {content}
            </span>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={className}
              title={item.label}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t p-3 lg:block">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Live · Convex
        </div>
      </div>
    </aside>
  );
}
