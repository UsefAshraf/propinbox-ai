"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const BASE_TITLE = "PropInbox";

/**
 * Keeps the browser tab title in sync with the number of unread conversations, e.g. "(3) PropInbox",
 * so new tenant messages are noticeable from another tab. Reuses the inbox list subscription.
 */
export function UnreadTitle() {
  const conversations = useQuery(api.conversations.list, { status: "all" });
  const unread = conversations?.filter((c) => c.unread).length ?? 0;

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) ${BASE_TITLE}` : BASE_TITLE;
  }, [unread]);

  return null;
}
